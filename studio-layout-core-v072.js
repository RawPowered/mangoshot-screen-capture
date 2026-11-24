/* MangoShot v0.7.2 — pure viewport geometry and semantic stacking contract. */
(function(root){'use strict';
 const layers=Object.freeze({media:0,ink:10,selection:20,handle:30,inline:40,workspace:100,inspector:120,resizer:140,chrome:200,menu:400,tool:420,context:440,modal:600});
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const finite=(n,f=0)=>Number.isFinite(n)?n:f;
 function place(anchor,panel,viewport,mode='down',options={}){
  const gap=Math.max(0,finite(options.gap,6)),padding=Math.max(0,finite(options.padding,8));
  const vx=finite(viewport.left),vy=finite(viewport.top);
  const vw=Math.max(1,finite(viewport.width,1)),vh=Math.max(1,finite(viewport.height,1));
  const px=Math.min(padding,Math.max(0,(vw-1)/2)),py=Math.min(padding,Math.max(0,(vh-1)/2));
  const l=vx+px,r=vx+vw-px,t=vy+py,b=vy+vh-py;
  const w=Math.max(1,Math.min(Math.max(1,finite(panel.width,1)),r-l));
  const natural=Math.max(1,finite(panel.height,1));
  const al=finite(anchor.left,l),ar=finite(anchor.right,al),at=finite(anchor.top,t),ab=finite(anchor.bottom,at);
  let x=al,y=ab+gap,maxHeight=b-t,side='down';
  if(mode==='right'){
   const right=r-ar-gap,left=al-l-gap;
   side=right>=w||right>=left?'right':'left';
   x=side==='right'?ar+gap:al-gap-w;y=at;
  }else if(mode==='point'){
   side='point';x=al;y=at;
   if(x+w>r)x=al-w;
   if(y+natural>b)y=at-natural;
  }else if(mode==='free'){
   side='free';x=al;y=at;
  }else{
   const below=b-ab-gap,above=at-t-gap;
   side=below>=natural||below>=above?'down':'up';
   const room=side==='down'?below:above;
   // If the anchor fills the viewport, use the available viewport rather
   // than rendering an inaccessible zero-height menu.
   maxHeight=room>32?Math.min(b-t,room):b-t;
   x=options.align==='end'?ar-w:al;
   y=side==='down'?ab+gap:at-gap-Math.min(natural,maxHeight);
  }
  const h=Math.max(1,Math.min(natural,maxHeight));
  return {left:clamp(x,l,r-w),top:clamp(y,t,b-h),width:w,height:h,maxHeight,side};
 }
 root.MangoStudioLayoutV072=Object.freeze({layers,place});
 if(typeof module==='object'&&module.exports)module.exports=root.MangoStudioLayoutV072;
})(typeof globalThis!=='undefined'?globalThis:this);
