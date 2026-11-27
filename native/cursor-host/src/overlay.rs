//! Experimental visible desktop overlay, composite recordings only.
//! No capture exclusion; never enable on the clean-master path.
use mangoshot_cursor_host::{Monitor,overlay_model::{dimensions,raster,OverlayStyle}};
use std::{ffi::c_void,io,ptr::{null,null_mut},time::{Duration,Instant}};
type Handle=*mut c_void;
#[repr(C)] #[derive(Default)] struct Point{x:i32,y:i32}
#[repr(C)] struct Size{cx:i32,cy:i32}
#[repr(C)] struct Blend{operation:u8,flags:u8,alpha:u8,format:u8}
#[repr(C)] struct BitmapHeader{size:u32,width:i32,height:i32,planes:u16,bits:u16,compression:u32,image_size:u32,x_ppm:i32,y_ppm:i32,used:u32,important:u32}
#[repr(C)] struct BitmapInfo{header:BitmapHeader,colors:[u32;1]}
#[repr(C)] struct Msg{window:Handle,message:u32,wparam:usize,lparam:isize,time:u32,point:Point,private:u32}
#[link(name="user32")]
extern "system" {
    fn CreateWindowExW(ex:u32,class:*const u16,name:*const u16,style:u32,x:i32,y:i32,w:i32,h:i32,parent:Handle,menu:Handle,instance:Handle,param:Handle)->Handle;
    fn DestroyWindow(window:Handle)->i32;
    fn ShowWindow(window:Handle,command:i32)->i32;
    fn UpdateLayeredWindow(window:Handle,dst:Handle,pos:*const Point,size:*const Size,src:Handle,src_pos:*const Point,key:u32,blend:*const Blend,flags:u32)->i32;
    fn RegisterHotKey(window:Handle,id:i32,mods:u32,vk:u32)->i32;
    fn UnregisterHotKey(window:Handle,id:i32)->i32;
    fn PeekMessageW(msg:*mut Msg,window:Handle,min:u32,max:u32,remove:u32)->i32;
    fn TranslateMessage(msg:*const Msg)->i32;
    fn DispatchMessageW(msg:*const Msg)->isize;
}
#[link(name="gdi32")]
extern "system" {
    fn CreateCompatibleDC(dc:Handle)->Handle;
    fn DeleteDC(dc:Handle)->i32;
    fn CreateDIBSection(dc:Handle,info:*const BitmapInfo,usage:u32,bits:*mut *mut c_void,section:Handle,offset:u32)->Handle;
    fn SelectObject(dc:Handle,object:Handle)->Handle;
    fn DeleteObject(object:Handle)->i32;
}
fn wide(s:&str)->Vec<u16>{s.encode_utf16().chain(Some(0)).collect()}
pub struct Overlay {window:Handle,dc:Handle,bitmap:Handle,old:Handle,bits:*mut u32,len:usize,monitor:Monitor,visible:bool,last:Option<(i32,i32,OverlayStyle)>,last_draw:Option<Instant>,click:Option<Instant>}
impl Overlay {
    pub fn new(m:&Monitor)->io::Result<Self>{
        let len=dimensions(m.width,m.height).ok_or_else(||io::Error::new(io::ErrorKind::InvalidInput,"overlay resolution exceeds preview limit"))?;
        let mut s=Self{window:null_mut(),dc:null_mut(),bitmap:null_mut(),old:null_mut(),bits:null_mut(),len,monitor:m.clone(),visible:false,last:None,last_draw:None,click:None};
        unsafe {
            // LAYERED | TRANSPARENT | NOACTIVATE | TOOLWINDOW | TOPMOST.
            s.window=CreateWindowExW(0x00080000|0x20|0x08000000|0x80|0x8,wide("STATIC").as_ptr(),wide("MangoShot live cursor effects").as_ptr(),0x80000000,m.left,m.top,m.width,m.height,null_mut(),null_mut(),null_mut(),null_mut());
            if s.window.is_null(){return Err(io::Error::last_os_error());}
            s.dc=CreateCompatibleDC(null_mut());if s.dc.is_null(){return Err(io::Error::last_os_error());}
            let info=BitmapInfo{header:BitmapHeader{size:40,width:m.width,height:-m.height,planes:1,bits:32,compression:0,image_size:0,x_ppm:0,y_ppm:0,used:0,important:0},colors:[0]};
            let mut bits=null_mut();s.bitmap=CreateDIBSection(s.dc,&info,0,&mut bits,null_mut(),0);
            if s.bitmap.is_null()||bits.is_null(){return Err(io::Error::last_os_error());}
            let old=SelectObject(s.dc,s.bitmap);if old.is_null()||old as isize == -1{return Err(io::Error::last_os_error());}
            s.old=old;s.bits=bits.cast();
        }
        Ok(s)
    }
    fn hide(&mut self){if self.visible{unsafe{ShowWindow(self.window,0);}self.visible=false;}self.last=None;self.last_draw=None;}
    pub fn draw(&mut self,point:Option<(f64,f64)>,style:&OverlayStyle,click:bool)->io::Result<()>{
        let Some((x,y))=point.filter(|_|style.active()) else {self.click=None;self.hide();return Ok(());};
        let now=Instant::now();if click{self.click=Some(now);}
        let age=self.click.map(|t|t.elapsed().as_millis() as u64);
        let pulse=style.ring&&age.is_some_and(|a|a<450);
        let x=(x*f64::from(self.monitor.width)).floor() as i32;
        let y=(y*f64::from(self.monitor.height)).floor() as i32;
        let changed=self.last.as_ref().map_or(true,|(a,b,s)|*a!=x||*b!=y||s!=style);
        let clear_pulse=age.is_some_and(|a|a>=450);
        if !changed&&!pulse&&!clear_pulse{return Ok(());}
        if self.last_draw.is_some_and(|t|t.elapsed()<Duration::from_millis(33)){return Ok(());}
        if clear_pulse{self.click=None;}
        let p=unsafe{std::slice::from_raw_parts_mut(self.bits,self.len)};
        if !raster(p,self.monitor.width,self.monitor.height,f64::from(x),f64::from(y),style,age){return Err(io::Error::new(io::ErrorKind::InvalidData,"overlay raster rejected"));}
        let pos=Point{x:self.monitor.left,y:self.monitor.top};let src=Point{x:0,y:0};let size=Size{cx:self.monitor.width,cy:self.monitor.height};let blend=Blend{operation:0,flags:0,alpha:255,format:1};
        unsafe{
            if UpdateLayeredWindow(self.window,null_mut(),&pos,&size,self.dc,&src,0,&blend,2)==0{self.hide();return Err(io::Error::last_os_error());}
            if !self.visible{ShowWindow(self.window,4);self.visible=true;}
        }
        self.last=Some((x,y,style.clone()));self.last_draw=Some(now);Ok(())
    }
}
impl Drop for Overlay {fn drop(&mut self){unsafe{
    if !self.window.is_null(){ShowWindow(self.window,0);DestroyWindow(self.window);}
    if !self.old.is_null(){SelectObject(self.dc,self.old);}
    if !self.bitmap.is_null(){DeleteObject(self.bitmap);}
    if !self.dc.is_null(){DeleteDC(self.dc);}
}}}
pub struct Hotkeys(Vec<i32>);
impl Hotkeys {
    pub fn register()->io::Result<Self>{
        let mut s=Self(Vec::new());
        // Register only explicit modifiers; never hook or poll keyboard input.
        for (id,vk) in [(1,0x31),(2,0x32),(3,0x77)] {
            if unsafe{RegisterHotKey(null_mut(),id,0x4000|0x2|0x1,vk)}==0{return Err(io::Error::last_os_error());}
            s.0.push(id);
        }Ok(s)
    }
}
impl Drop for Hotkeys {fn drop(&mut self){for id in self.0.drain(..){unsafe{UnregisterHotKey(null_mut(),id);}}}}
pub fn pump()->Vec<usize>{
    let mut actions=Vec::new();
    for _ in 0..64 {unsafe{
        let mut msg:Msg=std::mem::zeroed();
        if PeekMessageW(&mut msg,null_mut(),0,0,1)==0{break;}
        if msg.message==0x0312 {actions.push(msg.wparam);} else if msg.message!=0x0012{TranslateMessage(&msg);DispatchMessageW(&msg);}
    }}actions
}
