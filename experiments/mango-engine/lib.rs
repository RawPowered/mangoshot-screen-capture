//! Isolated MangoEngine Rust/Wasm feasibility kernel. No production integration.
//! Owned scratch buffer, bounded allocation, no unsafe code, no dependencies.
use std::cell::RefCell;
const LIMIT: usize = 64 * 1024 * 1024;
thread_local! { static BUFFER: RefCell<Vec<u8>> = RefCell::new(Vec::new()); }
fn grayscale(rgba: &mut [u8]) {
    for pixel in rgba.chunks_exact_mut(4) {
        let y = ((77 * u32::from(pixel[0]) + 150 * u32::from(pixel[1])
            + 29 * u32::from(pixel[2]) + 128) >> 8) as u8;
        pixel[0] = y; pixel[1] = y; pixel[2] = y;
    }
}
#[no_mangle]
pub extern "C" fn mango_prepare(len: usize) -> usize {
    if len == 0 || len > LIMIT || len % 4 != 0 { return 0; }
    BUFFER.with(|cell| {
        let mut data = cell.borrow_mut();
        let additional = len.saturating_sub(data.len());
        if data.try_reserve_exact(additional).is_err() { return 0; }
        data.resize(len, 0);
        data.as_mut_ptr() as usize
    })
}
#[no_mangle]
pub extern "C" fn mango_grayscale(len: usize) -> u32 {
    BUFFER.with(|cell| {
        let mut data = cell.borrow_mut();
        if len == 0 || len != data.len() { return 0; }
        grayscale(&mut data);
        1
    })
}
#[no_mangle]
pub extern "C" fn mango_clear() { BUFFER.with(|cell| *cell.borrow_mut() = Vec::new()); }
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn preserves_alpha_and_luma() {
        let mut p = [255,0,0,17,0,255,0,128,0,0,255,255];
        grayscale(&mut p);
        assert_eq!(p,[77,77,77,17,149,149,149,128,29,29,29,255]);
    }
    #[test] fn bounded_buffer() {
        assert_eq!(mango_prepare(0),0);assert_eq!(mango_prepare(3),0);
        assert_eq!(mango_prepare(LIMIT+4),0);
        assert_ne!(mango_prepare(16),0);assert_eq!(mango_grayscale(12),0);
        assert_eq!(mango_grayscale(16),1);mango_clear();assert_eq!(mango_grayscale(16),0);
    }
}
