//! Shared bounded overlay raster model. Pixels are premultiplied BGRA on Windows.
use serde::Deserialize;
pub const MAX_PIXELS: usize = 8_294_400;
#[derive(Clone,Debug,PartialEq,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct OverlayStyle {
    pub spotlight: bool, pub ring: bool, pub radius: f64, pub dim: f64,
    pub feather: f64, pub color: String,
}
impl Default for OverlayStyle {
    fn default()->Self { Self{spotlight:false,ring:false,radius:9.,dim:0.55,feather:0.35,color:"#d0ff87".into()} }
}
impl OverlayStyle {
    pub fn valid(&self)->bool {
        (3.0..=25.0).contains(&self.radius) && (0.0..=0.85).contains(&self.dim)
            && (0.0..=0.9).contains(&self.feather) && self.color.len()==7
            && self.color.starts_with('#') && self.color[1..].bytes().all(|b|b.is_ascii_hexdigit())
    }
    pub fn active(&self)->bool { self.spotlight&&self.dim>0.0||self.ring }
}
pub fn dimensions(w:i32,h:i32)->Option<usize> {
    if w<=0||h<=0{return None;}
    (w as usize).checked_mul(h as usize).filter(|&n|n<=MAX_PIXELS)
}
fn byte(v:f64)->u32{(v.clamp(0.,1.)*255.).round() as u32}
fn blend_black(alpha:f64,rgb:u32,opacity:f64)->u32 {
    let a=byte(opacity+alpha*(1.-opacity));
    let r=byte(((rgb>>16)&255) as f64/255.*opacity);
    let g=byte(((rgb>>8)&255) as f64/255.*opacity);
    let b=byte((rgb&255) as f64/255.*opacity);
    (a<<24)|(r<<16)|(g<<8)|b
}
pub fn raster(pixels:&mut[u32],w:i32,h:i32,x:f64,y:f64,s:&OverlayStyle,age_ms:Option<u64>)->bool {
    if dimensions(w,h)!=Some(pixels.len())||!s.valid()||!x.is_finite()||!y.is_finite()
        ||x<0.||x>=f64::from(w)||y<0.||y>=f64::from(h){return false;}
    let dim=if s.spotlight{s.dim}else{0.};
    pixels.fill(byte(dim)<<24);
    if !s.active(){return true;}
    let base=f64::from(w.min(h));
    let r=base*s.radius/100.;let stroke=(base*0.003).max(2.);
    let inner=r*(1.-s.feather);let ring=(stroke*2.).max(r*0.32);
    let pulse=age_ms.filter(|a|*a<450).map(|a|{let f=a as f64/450.;(r*(0.32+0.55*f),1.-f)});
    let extent=(r.max(ring)+stroke+2.).ceil();
    let lo_x=(x-extent).floor().max(0.) as usize;
    let hi_x=(x+extent).ceil().min(f64::from(w)-1.) as usize;
    let lo_y=(y-extent).floor().max(0.) as usize;
    let hi_y=(y+extent).ceil().min(f64::from(h)-1.) as usize;
    let rgb=u32::from_str_radix(&s.color[1..],16).unwrap_or(0);
    for iy in lo_y..=hi_y { for ix in lo_x..=hi_x {
        let d=((ix as f64+0.5-x).powi(2)+(iy as f64+0.5-y).powi(2)).sqrt();
        let a=if d<=inner{0.}else{dim*((d-inner)/(r-inner).max(0.01)).clamp(0.,1.)};
        let coverage=|radius:f64| (stroke/2.+0.5-(d-radius).abs()).clamp(0.,1.);
        let opacity=if s.ring { let main=coverage(ring);let extra=pulse.map_or(0.,|(rad,alpha)|coverage(rad)*alpha); main+extra*(1.-main) }else{0.};
        pixels[iy*w as usize+ix]=blend_black(a,rgb,opacity);
    }}
    true
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn bounded_premultiplied_pixels(){
        assert_eq!(dimensions(3840,2160),Some(MAX_PIXELS));assert!(dimensions(7680,4320).is_none());assert!(dimensions(-1,10).is_none());
        let mut s=OverlayStyle{spotlight:true,ring:false,..Default::default()};let mut p=vec![0;200*100];
        assert!(raster(&mut p,200,100,100.,50.,&s,None));assert_eq!(p[50*200+100],0);assert_eq!(p[0]>>24,140);
        s.ring=true;s.color="#ff6020".into();assert!(raster(&mut p,200,100,100.,50.,&s,Some(100)));
        assert!(p.iter().any(|v|v&0x00ffffff!=0));
        assert!(p.iter().all(|v|{let a=v>>24;((v>>16)&255)<=a&&((v>>8)&255)<=a&&(v&255)<=a}));
        s.dim=2.;assert!(!raster(&mut p,200,100,100.,50.,&s,None));
    }
}
