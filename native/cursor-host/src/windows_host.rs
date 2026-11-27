//! Windows 10/11 native host. Physical monitor coordinates only, while a
//! confirmed recording lease is alive. Explicit visible composite-only overlay
//! and registered hotkeys are optional. No keyboard hooks, logging or injection.
#[path = "overlay.rs"]
mod overlay;
use mangoshot_cursor_host::overlay_model::OverlayStyle;
use mangoshot_cursor_host::{expired, read_command, valid_origin, valid_session, write_message, ClickEdge, Command, Monitor, PROTOCOL, SAMPLE_MS};
use serde_json::json;
use std::{ffi::c_void, io::{self, Write}, sync::mpsc::{self, RecvTimeoutError}, thread, time::{Duration, Instant}};

#[repr(C)]
#[derive(Clone, Copy, Default)]
struct Rect { left: i32, top: i32, right: i32, bottom: i32 }
#[repr(C)]
#[derive(Default)]
struct Point { x: i32, y: i32 }
#[repr(C)]
struct MonitorInfo { size: u32, monitor: Rect, work: Rect, flags: u32, device: [u16; 32] }
type Handle = *mut c_void;
type EnumProc = unsafe extern "system" fn(Handle, Handle, *mut Rect, isize) -> i32;
#[link(name = "user32")]
extern "system" {
    fn SetThreadDpiAwarenessContext(context: Handle) -> Handle;
    fn EnumDisplayMonitors(dc: Handle, clip: *const Rect, callback: Option<EnumProc>, data: isize) -> i32;
    fn GetMonitorInfoW(monitor: Handle, info: *mut MonitorInfo) -> i32;
    fn GetPhysicalCursorPos(point: *mut Point) -> i32;
    fn GetAsyncKeyState(key: i32) -> i16;
    fn GetSystemMetrics(index: i32) -> i32;
    fn MessageBoxW(owner: Handle, text: *const u16, caption: *const u16, kind: u32) -> i32;
}
#[derive(Clone)]
struct Display { handle: Handle, monitor: Monitor }
fn monitor(handle: Handle) -> Option<Monitor> {
    let mut info = MonitorInfo { size: std::mem::size_of::<MonitorInfo>() as u32, monitor: Rect::default(), work: Rect::default(), flags: 0, device: [0;32] };
    if unsafe { GetMonitorInfoW(handle, &mut info) } == 0 { return None; }
    let r=info.monitor;let width=r.right.checked_sub(r.left)?;let height=r.bottom.checked_sub(r.top)?;
    if width<=0 || height<=0 { return None; }
    let end=info.device.iter().position(|x|*x==0).unwrap_or(info.device.len());
    let id=String::from_utf16_lossy(&info.device[..end]);if id.is_empty(){return None;}
    Some(Monitor{id,left:r.left,top:r.top,width,height})
}
unsafe extern "system" fn collect(handle: Handle, _: Handle, _: *mut Rect, data: isize) -> i32 {
    let result = &mut *(data as *mut Vec<Display>);
    if result.len()>=32 { return 0; }
    if let Some(monitor)=monitor(handle) { result.push(Display{handle,monitor}); }
    1
}
fn displays() -> io::Result<Vec<Display>> {
    let mut result: Vec<Display>=Vec::new();
    if unsafe { EnumDisplayMonitors(std::ptr::null_mut(), std::ptr::null(), Some(collect), &mut result as *mut _ as isize) } == 0 || result.is_empty() {
        return Err(io::Error::new(io::ErrorKind::Other,"monitor enumeration failed"));
    }
    result.sort_by(|a,b|a.monitor.id.cmp(&b.monitor.id));
    Ok(result)
}
fn confirm(m: &Monitor,desktop_overlay:bool,shortcuts:bool) -> bool {
    let mut text=format!("Allow MangoShot to sample cursor position and primary mouse-button presses ONLY on {} ({} x {}, origin {}, {}) for this screen recording?\n\nChoose No to cancel. Tracking stops when the recording session closes, pauses, switches source or loses its lease.",m.id,m.width,m.height,m.left,m.top);
    if desktop_overlay {text.push_str("\n\nEXPERIMENTAL: visible mouse effects on this monitor may be permanently captured in the composite recording. Not for clean-master recordings.");}
    if shortcuts {text.push_str("\n\nRegister Ctrl+Alt+1 (spotlight), Ctrl+Alt+2 (ring), Ctrl+Alt+F8 (disconnect native tracking) until this session ends.");}
    let wide:Vec<u16>=text.encode_utf16().chain(Some(0)).collect();
    let title:Vec<u16>="MangoShot recording permission".encode_utf16().chain(Some(0)).collect();
    // YESNO | ICONQUESTION | DEFBUTTON2 | SETFOREGROUND
    unsafe { MessageBoxW(std::ptr::null_mut(),wide.as_ptr(),title.as_ptr(),0x0000_0004|0x20|0x100|0x10000) == 6 }
}
fn ms(t: Instant) -> u64 { t.elapsed().as_millis().min(u64::MAX as u128) as u64 }
struct Session { id:String, display:Display, start:Instant, heartbeat:Instant, next:Instant, sequence:u64, click:ClickEdge, overlay:Option<overlay::Overlay>, hotkeys:Option<overlay::Hotkeys>, style:OverlayStyle }
// Bounded asynchronous stdout: a blocked browser reader must not hold the UI
// thread or keep a visible overlay alive after the session lease expires.
struct Out { tx:mpsc::SyncSender<Vec<u8>>, pending:Vec<u8> }
impl Write for Out {
    fn write(&mut self,bytes:&[u8])->io::Result<usize>{if self.pending.len()+bytes.len()>mangoshot_cursor_host::MAX_MESSAGE+4{return Err(io::Error::new(io::ErrorKind::InvalidData,"message too large"));}self.pending.extend_from_slice(bytes);Ok(bytes.len())}
    fn flush(&mut self)->io::Result<()>{if self.pending.is_empty(){return Ok(());}self.tx.try_send(std::mem::take(&mut self.pending)).map_err(|_|io::Error::new(io::ErrorKind::BrokenPipe,"native output stalled"))}
}
fn error(out:&mut impl Write, code:&str)->io::Result<()> { write_message(out,&json!({"type":"error","code":code})) }
fn sample(s:&mut Session,out:&mut impl Write)->io::Result<bool>{
    if expired(ms(s.start),ms(s.heartbeat)) { write_message(out,&json!({"type":"ended","session":s.id,"reason":"lease_expired"}))?;return Ok(false); }
    if monitor(s.display.handle).as_ref()!=Some(&s.display.monitor) {
        write_message(out,&json!({"type":"ended","session":s.id,"reason":"monitor_changed"}))?;return Ok(false);
    }
    let mut p=Point::default();
    let pos=if unsafe {GetPhysicalCursorPos(&mut p)}!=0 {s.display.monitor.normalized(p.x,p.y)} else {None};
    let click=s.click.sample(pos.map(|_|unsafe {let button=if GetSystemMetrics(23)!=0 {0x02}else{0x01};GetAsyncKeyState(button)<0}));
    for action in overlay::pump(){if s.hotkeys.is_some(){match action {
        1|2 => write_message(out,&json!({"type":"hotkey","session":s.id,"action":if action==1{"spotlight"}else{"ring"}}))?,
        3 => {s.overlay.take();write_message(out,&json!({"type":"ended","session":s.id,"reason":"hotkey_disconnect"}))?;return Ok(false);},
        _ => {}
    }}}
    if let Some(overlay)=s.overlay.as_mut(){if overlay.draw(pos,&s.style,click).is_err(){s.overlay.take();error(out,"overlay_render_failed")?;return Ok(false);}}
    s.sequence+=1;
    let (x,y)=pos.map_or((None,None),|(x,y)|(Some(x),Some(y)));
    write_message(out,&json!({"type":"sample","session":s.id,"seq":s.sequence,"elapsed_ms":ms(s.start),"x":x,"y":y,"click":click}))?;
    s.next=Instant::now()+Duration::from_millis(SAMPLE_MS);
    Ok(true)
}
pub fn run()->io::Result<()> {
    // Chrome/Edge enforce exact allowed_origins via the installed manifest.
    // The argv check also prevents ordinary accidental CLI launch.
    if !std::env::args().nth(1).as_deref().is_some_and(valid_origin) {return Err(io::Error::new(io::ErrorKind::PermissionDenied,"native messaging caller required"));}
    // Per-monitor DPI aware v2; fail closed rather than mix logical/physical units.
    if unsafe {SetThreadDpiAwarenessContext(-4isize as Handle)}.is_null() {return Err(io::Error::new(io::ErrorKind::Other,"per-monitor DPI context unavailable"));}
    let (tx,rx)=mpsc::sync_channel::<Option<Command>>(32);
    thread::spawn(move||{let stdin=io::stdin();let mut reader=stdin.lock();loop{match read_command(&mut reader){Ok(Some(c))=>{if tx.send(Some(c)).is_err(){break;}},_=>{let _=tx.send(None);break;}}}});
    let (output_tx,output_rx)=mpsc::sync_channel::<Vec<u8>>(32);
    thread::spawn(move||{let stdout=io::stdout();let mut writer=stdout.lock();while let Ok(bytes)=output_rx.recv(){if writer.write_all(&bytes).and_then(|_|writer.flush()).is_err(){break;}}});
    let mut out=Out{tx:output_tx,pending:Vec::new()};let mut hello=false;let mut session:Option<Session>=None;
    loop {
        let wait=session.as_ref().map(|s|s.next.saturating_duration_since(Instant::now())).unwrap_or(Duration::from_secs(30));
        match rx.recv_timeout(wait) {
            Ok(None)|Err(RecvTimeoutError::Disconnected)=>break,
            Ok(Some(Command::Hello{protocol})) if !hello && session.is_none() => {
                if protocol!=PROTOCOL {error(&mut out,"protocol_mismatch")?;break;}
                let monitors:Vec<_>=displays()?.into_iter().map(|d|d.monitor).collect();
                write_message(&mut out,&json!({"type":"hello","protocol":PROTOCOL,"platform":"windows","monitors":monitors,"sample_hz_target":60,"overlays":true,"overlay_mode":"composite-only","global_shortcuts":true,"shortcut_mode":"registered-toggle"}))?;hello=true;
            }
            Ok(Some(Command::Start{protocol,session:id,monitor_id,desktop_overlay,shortcuts,master})) if hello && session.is_none() => {
                if protocol!=PROTOCOL || !valid_session(&id) || desktop_overlay&&master.as_deref()!=Some("composite") {error(&mut out,"invalid_start")?;break;}
                let Some(display)=displays()?.into_iter().find(|d|d.monitor.id==monitor_id) else {error(&mut out,"monitor_unavailable")?;break;};
                if !confirm(&display.monitor,desktop_overlay,shortcuts){error(&mut out,"user_declined")?;break;}
                if monitor(display.handle).as_ref()!=Some(&display.monitor){error(&mut out,"monitor_changed")?;break;}
                // If the port closed during the consent prompt, exit before reading a pointer.
                match rx.try_recv(){Ok(Some(_))|Ok(None)|Err(mpsc::TryRecvError::Disconnected)=>break,Err(mpsc::TryRecvError::Empty)=>{}}
                let overlay=if desktop_overlay {match overlay::Overlay::new(&display.monitor){Ok(v)=>Some(v),Err(_)=>{error(&mut out,"overlay_unavailable")?;break;}}}else{None};
                let hotkeys=if shortcuts {match overlay::Hotkeys::register(){Ok(v)=>Some(v),Err(_)=>{error(&mut out,"hotkey_conflict")?;break;}}}else{None};
                write_message(&mut out,&json!({"type":"started","session":id,"monitor":display.monitor,"desktop_overlay":desktop_overlay,"shortcuts":shortcuts}))?;
                let now=Instant::now();
                session=Some(Session{id,display,start:now,heartbeat:now,next:now,sequence:0,click:ClickEdge::default(),overlay,hotkeys,style:OverlayStyle::default()});
            }
            Ok(Some(Command::Heartbeat{session:id})) => {
                if let Some(s)=session.as_mut().filter(|s|s.id==id){if expired(ms(s.start),ms(s.heartbeat)){write_message(&mut out,&json!({"type":"ended","session":s.id,"reason":"lease_expired"}))?;break;}s.heartbeat=Instant::now();}else{error(&mut out,"invalid_session")?;break;}
            }
            Ok(Some(Command::Effects{session:id,style})) => {
                if let Some(s)=session.as_mut().filter(|s|s.id==id&&s.overlay.is_some()) {if !style.valid()||expired(ms(s.start),ms(s.heartbeat)){error(&mut out,"invalid_effects")?;break;}s.style=style;}else{error(&mut out,"overlay_not_authorized")?;break;}
            }
            Ok(Some(Command::Stop{session:id})) => {
                if session.as_ref().is_some_and(|s|s.id==id){write_message(&mut out,&json!({"type":"ended","session":id,"reason":"stopped"}))?;}break;
            }
            Ok(Some(_))=>{error(&mut out,"invalid_command")?;break;}
            Err(RecvTimeoutError::Timeout)=>{if session.is_none(){break;}}
        }
        if let Some(s)=session.as_mut(){if Instant::now()>=s.next && !sample(s,&mut out)?{break;}}
    }
    Ok(())
}
