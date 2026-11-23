/* Pure virtual-camera math: zoom and crop are baked into recorded output. */
(function (root) {
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
 const camera=()=>({zoom:1,cx:.5,cy:.5});
 function fit(state) {
   const zoom=clamp(Number(state.zoom)||1,1,6),half=1/(zoom*2);
   return {zoom,cx:clamp(Number(state.cx)||.5,half,1-half),cy:clamp(Number(state.cy)||.5,half,1-half)};
 }
 function anchor(state,nextZoom,point){
   const s=fit(state),z=clamp(nextZoom,1,6),x=clamp(point.x,0,1)-.5,y=clamp(point.y,0,1)-.5;
   return fit({zoom:z,cx:s.cx+x/s.zoom-x/z,cy:s.cy+y/s.zoom-y/z});
 }
 function box(state,a,b){
   const s=fit(state),x1=clamp(Math.min(a.x,b.x),0,1),y1=clamp(Math.min(a.y,b.y),0,1);
   const x2=clamp(Math.max(a.x,b.x),0,1),y2=clamp(Math.max(a.y,b.y),0,1);
   const side=Math.max(x2-x1,y2-y1);
   if(side<.03)return s;
   return fit({zoom:Math.min(6,s.zoom/side),cx:s.cx+((x1+x2)/2-.5)/s.zoom,cy:s.cy+((y1+y2)/2-.5)/s.zoom});
 }
 function crop(state,w,h){const s=fit(state),cw=w/s.zoom,ch=h/s.zoom;return {sx:(s.cx-.5/s.zoom)*w,sy:(s.cy-.5/s.zoom)*h,sw:cw,sh:ch};}
 root.MangoCamera={camera,fit,anchor,box,crop};
})(typeof globalThis!=='undefined'?globalThis:this);
