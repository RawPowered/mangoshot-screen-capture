#![cfg_attr(windows, windows_subsystem = "windows")]
#[cfg(windows)]
mod windows_host;

#[cfg(windows)]
fn main() {
    // Browser owns process lifetime and stdio. Never emit diagnostics to stdout.
    if let Err(e) = windows_host::run() { eprintln!("MangoShot native cursor host: {e}"); }
}
#[cfg(not(windows))]
fn main() {
    eprintln!("MangoShot native cursor host currently supports Windows only.");
}
