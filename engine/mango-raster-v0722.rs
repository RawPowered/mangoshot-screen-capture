//! Local MangoEngine raster kernel, ABI 1. Dependency-free; no unsafe code.
use std::cell::RefCell;
const MAX: usize = 16_000_000;
thread_local! { static BUFFER: RefCell<Vec<u8>> = RefCell::new(Vec::new()); }
fn reserve(v: &mut Vec<u8>, len: usize) -> bool {
    if v.try_reserve_exact(len.saturating_sub(v.len())).is_err() { return false; }
    v.resize(len,0); true
}
fn round(n:i64,d:i64)->i64 {(n+d/2).div_euclid(d)}
fn valid(w:usize,h:usize,op:u32,amount:u32,n:usize)->bool {
    w>0 && h>0 && w.checked_mul(h).filter(|p|*p<=MAX).and_then(|p|p.checked_mul(4))==Some(n) && op<=2 && amount<=100
}
fn filter(src:&[u8],out:&mut [u8],w:usize,h:usize,op:u32,amount:u32) {
    let amt=amount as i64;
    for y in 0..h { for x in 0..w {
        let i=(y*w+x)*4; let alpha=src[i+3]; out[i+3]=alpha;
        if alpha==0 || amount==0 {out[i..i+3].copy_from_slice(&src[i..i+3]);continue;}
        if op==0 {
            let l=(77*i64::from(src[i])+150*i64::from(src[i+1])+29*i64::from(src[i+2])+128)>>8;
            for k in 0..3 {out[i+k]=round(i64::from(src[i+k])*(100-amt)+l*amt,100) as u8;}continue;
        }
        let mut sum=[0i64;3];let mut weights=0i64;
        for dy in -1isize..=1 {for dx in -1isize..=1 {
            let nx=(x as isize+dx).clamp(0,w as isize-1) as usize;
            let ny=(y as isize+dy).clamp(0,h as isize-1) as usize;
            let j=(ny*w+nx)*4;let wt=(if dx==0{2}else{1})*(if dy==0{2}else{1})*i64::from(src[j+3]);
            weights+=wt;for k in 0..3 {sum[k]+=wt*i64::from(src[j+k]);}
        }}
        for k in 0..3 {let orig=i64::from(src[i+k]);let low=if weights>0{round(sum[k],weights)}else{orig};
            out[i+k]=round(if op==1{orig*(100-amt)+low*amt}else{orig*(100+amt)-low*amt},100).clamp(0,255) as u8;}
    }}
}
#[no_mangle]pub extern "C" fn mango_abi()->u32{1}
#[no_mangle]pub extern "C" fn mango_prepare(len:usize)->usize {
    if len==0||len>MAX*4||len%4!=0{return 0;}
    BUFFER.with(|c|{let mut v=c.borrow_mut();if !reserve(&mut v,len){return 0;}v.as_mut_ptr() as usize})
}
#[no_mangle]pub extern "C" fn mango_filter(w:usize,h:usize,op:u32,amount:u32)->u32 {
    BUFFER.with(|c|{let mut v=c.borrow_mut();let n=v.len();if !valid(w,h,op,amount,n){return 0;}
        let mut out=Vec::new();if !reserve(&mut out,n){return 0;}filter(&v,&mut out,w,h,op,amount);v.copy_from_slice(&out);1})
}
#[no_mangle]pub extern "C" fn mango_clear(){BUFFER.with(|c|*c.borrow_mut()=Vec::new());}
#[cfg(test)]mod tests {
    use super::*;
    #[test]fn alpha_gray(){let p=[255,0,0,17,0,255,0,128,0,0,255,0];let mut out=[0;12];filter(&p,&mut out,3,1,0,100);assert_eq!(out,[77,77,77,17,149,149,149,128,0,0,255,0]);}
    #[test]fn no_hidden_rgb_bleed(){let p=[255,0,0,255,0,255,0,0];let mut out=[0;8];filter(&p,&mut out,2,1,1,100);assert_eq!(p,out);}
    #[test]fn identity_and_bounds(){let p=[20,30,40,1];let mut out=[0;4];for op in 0..=2{filter(&p,&mut out,1,1,op,100);assert_eq!(p,out);}assert!(!valid(usize::MAX,2,0,100,4));assert_eq!(mango_prepare(MAX*4+4),0);assert_ne!(mango_prepare(4),0);assert_eq!(mango_filter(1,2,0,100),0);mango_clear();}
}
