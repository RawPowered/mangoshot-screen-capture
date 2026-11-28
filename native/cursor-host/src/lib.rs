//! Bounded native messaging and monitor-coordinate math. No IO other than the
//! caller-provided message streams; no keyboard hooks, input injection or storage.
use serde::{Deserialize, Serialize};
use std::io::{self, Read, Write};

pub mod overlay_model;

pub const PROTOCOL: u32 = 1;
pub const MAX_MESSAGE: usize = 16 * 1024;
pub const LEASE_MS: u64 = 15_000;
pub const SAMPLE_MS: u64 = 16;
pub const MAX_SESSION_MS: u64 = 12 * 60 * 60 * 1000;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct Monitor {
    pub id: String,
    pub left: i32,
    pub top: i32,
    pub width: i32,
    pub height: i32,
}
impl Monitor {
    pub fn normalized(&self, x: i32, y: i32) -> Option<(f64, f64)> {
        if self.width <= 0 || self.height <= 0 { return None; }
        let x = i64::from(x) - i64::from(self.left);
        let y = i64::from(y) - i64::from(self.top);
        if x < 0 || y < 0 || x >= i64::from(self.width) || y >= i64::from(self.height) { return None; }
        Some((x as f64 / f64::from(self.width), y as f64 / f64::from(self.height)))
    }
}
#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case", deny_unknown_fields)]
pub enum Command {
    Hello { protocol: u32 },
    Start { protocol: u32, session: String, monitor_id: String, #[serde(default)] desktop_overlay: bool, #[serde(default)] shortcuts: bool, #[serde(default)] master: Option<String> },
    Effects { session: String, style: overlay_model::OverlayStyle },
    Heartbeat { session: String },
    Pause { session: String },
    Resume { session: String },
    Stop { session: String },
}
pub fn valid_session(s: &str) -> bool {
    (16..=80).contains(&s.len()) && s.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}
pub fn valid_origin(s: &str) -> bool {
    let Some(id) = s.strip_prefix("chrome-extension://") else { return false; };
    let id = id.strip_suffix('/').unwrap_or(id);
    id.len() == 32 && id.bytes().all(|b| (b'a'..=b'p').contains(&b))
}
pub fn read_command(reader: &mut impl Read) -> io::Result<Option<Command>> {
    let mut header = [0u8; 4];
    match reader.read(&mut header[..1])? { 0 => return Ok(None), _ => reader.read_exact(&mut header[1..])? }
    let len = u32::from_le_bytes(header) as usize;
    if len == 0 || len > MAX_MESSAGE { return Err(io::Error::new(io::ErrorKind::InvalidData, "invalid frame size")); }
    let mut payload = vec![0; len];
    reader.read_exact(&mut payload)?;
    serde_json::from_slice(&payload).map(Some).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}
pub fn write_message(writer: &mut impl Write, message: &impl Serialize) -> io::Result<()> {
    let bytes = serde_json::to_vec(message).map_err(|e| io::Error::new(io::ErrorKind::InvalidData,e))?;
    if bytes.is_empty() || bytes.len() > MAX_MESSAGE { return Err(io::Error::new(io::ErrorKind::InvalidData,"oversized response")); }
    writer.write_all(&(bytes.len() as u32).to_le_bytes())?;
    writer.write_all(&bytes)?;
    writer.flush()
}
// Do not infer a click when the feed begins or a pointer reenters the monitor
// while the button is already held. Polling can miss presses between samples.
#[derive(Default)]
pub struct ClickEdge(Option<bool>);
impl ClickEdge {
    pub fn sample(&mut self, down: Option<bool>) -> bool {
        let click = self.0 == Some(false) && down == Some(true);
        self.0 = down;
        click
    }
}
pub fn expired(age_ms: u64, heartbeat_age_ms: u64) -> bool {
    age_ms >= MAX_SESSION_MS || heartbeat_age_ms >= LEASE_MS
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    #[test] fn monitor_math_and_bounds() {
        let m=Monitor{id:"display".into(),left:-2560,top:-1440,width:2560,height:1440};
        assert_eq!(m.normalized(-1280,-720),Some((0.5,0.5)));
        assert_eq!(m.normalized(-2560,-1440),Some((0.,0.)));
        assert_eq!(m.normalized(0,0),None);
        assert_eq!(m.normalized(-2561,-1440),None);
    }
    #[test] fn framing_and_rejections() {
        let mut buf=vec![];write_message(&mut buf,&json!({"type":"hello","protocol":1})).unwrap();
        assert!(matches!(read_command(&mut &buf[..]).unwrap(),Some(Command::Hello{protocol:1})));
        assert!(read_command(&mut &((MAX_MESSAGE+1) as u32).to_le_bytes()[..]).is_err());
        assert!(read_command(&mut &[1,0,0,0][..]).is_err());
        assert!(read_command(&mut &[][..]).unwrap().is_none());
        let mut bad=vec![];write_message(&mut bad,&json!({"type":"heartbeat","session":"0123456789abcdef","unexpected":1})).unwrap();
        assert!(read_command(&mut &bad[..]).is_err());
    }
    #[test] fn click_edges_and_leases() {
        let mut c=ClickEdge::default();
        assert!(!c.sample(Some(true))); assert!(!c.sample(Some(false)));
        assert!(c.sample(Some(true)));assert!(!c.sample(Some(true)));assert!(!c.sample(None));assert!(!c.sample(Some(true)));
        assert!(!expired(100,LEASE_MS-1));assert!(expired(100,LEASE_MS));assert!(expired(MAX_SESSION_MS,0));
        assert!(valid_session("0123456789abcdef"));assert!(!valid_session("../invalid"));
        assert!(valid_origin("chrome-extension://abcdefghijklmnopabcdefghijklmnop/"));assert!(!valid_origin("https://example.com"));
    }
}
