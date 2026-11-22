/* MangoShot Premium Studio v0.6.9 (alpha): local, timestamp-deterministic Canvas materials.
 * No remote dependencies. Optical GL refraction is deliberately NOT claimed here.
 */
(function(root){'use strict';
 const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
 const collections=[
  ['crystal-reveal','Crystal Reveal','Titles','glass','#93e8eb','spinLetters','fade','Prismatic letter assembly'],
  ['obsidian-chrome','Obsidian Chrome','Titles','chrome','#d6e5f3','zoom','slideDown','Forged monochrome metal'],
  ['aurelia-gold','Aurelia Gold','Titles','metal','#edca78','fade','slideDown','Polished gold signature'],
  ['aurora-glass','Aurora Glass','Titles','aurora','#b4e7ff','slideUp','fade','Luminous northern-light glass'],
  ['cinematic-chapter','Cinematic Chapter','Titles','editorial','#ebdfd0','typeIn','fade','Architectural film typography'],
  ['holographic-impact','Holographic Impact','Titles','holo','#8ceaff','pop','zoom','Chromatic energy emphasis'],
  ['floating-glass','Floating Glass Captions','Subtitles','glass','#dbf7ff','fade','fade','Subtle floating glass captions'],
  ['precision-kinetic','Precision Kinetic','Subtitles','chrome','#f0f7ff','typeIn','slideDown','Tracking-led typographic rhythm'],
  ['editorial-whisper','Editorial Whisper','Subtitles','editorial','#f5e6de','slideUp','fade','Quiet editorial lower treatment'],
  ['neon-word-focus','Neon Word Focus','Subtitles','holo','#a9fa63','pop','fade','Controlled accented emphasis'],
  ['cinematic-dialogue','Cinematic Dialogue','Subtitles','metal','#e5e1d9','fade','fade','Fine cinematic caption ribbon'],
  ['minimal-luxe','Minimal Luxe','Subtitles','glass','#fff9e9','slideUp','fade','Elegant low-contrast glass'],
  ['crystal-pointer','Crystal Pointer','Callouts','glass','#a1f2f5','spinLetters','zoom','Art-directed crystalline annotation'],
  ['titanium-inspector','Titanium Inspector','Callouts','chrome','#d8e6e8','slideLeft','slideRight','Engineering-grade feature focus'],
  ['holographic-tag','Holographic Tag','Callouts','holo','#83d7fa','pop','spin','Animated spectral information'],
  ['spotlight-lens','Spotlight Lens','Callouts','aurora','#afe4c0','slideUp','slideDown','Soft lens with guided attention'],
  ['luxury-feature','Luxury Feature Card','Callouts','metal','#f8d595','fade','zoom','Premium product highlight'],
  ['magnetic-annotation','Magnetic Annotation','Callouts','chrome','#f2f4f8','bounce','fade','Magnetic pointer emphasis'],
  ['premium-lower-third','Premium Lower Third','Text','glass','#b5f7e3','slideLeft','fade','Layered branded identifier'],
  ['designer-quote','Designer Quote','Text','editorial','#f4e0d6','fade','fade','Film-editorial quote treatment'],
  ['glass-info','Glass Information Card','Text','glass','#cceefe','slideUp','slideDown','Clean premium metadata'],
  ['platinum-number','Platinum Number','Text','chrome','#f0f6ff','pop','fade','Animated numerical highlight'],
  ['product-spec','Product Specification','Text','holo','#c5fbe9','typeIn','fade','Precision technical specification'],
  ['signature-label','Signature Label','Text','metal','#f6dbad','spinLetters','fade','Refined embossed signature']
 ];
 const catalog=collections.map(([id,name,category,material,accent,enter,exit,description])=>Object.freeze({
  id,name,category,material,accent,enter,exit,description}));
 const byId=Object.fromEntries(catalog.map(x=>[x.id,x]));
 const palettes={
  glass:['#08202b','#29444c','#7ee9ed'],
  chrome:['#080c14','#343e49','#eff6fc'],
  metal:['#16110e','#52432a','#f3d492'],
  aurora:['#091521','#193f47','#9cf6d6'],
  holo:['#081020','#153c58','#80d8ff'],
  editorial:['#191a21','#424047','#f4e9db']
 };
 const validHex=x=>typeof x==='string'&&/^#[0-9a-fA-F]{6}$/.test(x);
 function validate(data){
  if(!data||typeof data!=='object'||Array.isArray(data)||!byId[data.id])throw Error('Invalid premium preset');
  const intensity=data.intensity==null?.7:Number(data.intensity);
  if(!Number.isFinite(intensity)||intensity<0||intensity>1)throw Error('Invalid premium intensity');
  const accent=data.accent==null?byId[data.id].accent:data.accent;
  if(!validHex(accent))throw Error('Invalid premium accent');
  const role=data.role||'primary';
  if(!['primary','secondary'].includes(role))throw Error('Invalid premium role');
  if(data.groupId!=null&&(typeof data.groupId!=='string'||data.groupId.length>100))throw Error('Invalid premium group');
  return {id:data.id,intensity,accent,role,groupId:data.groupId||null};
 }
 function make(kind,id,at,span=4){
  const entry=byId[id];if(!entry)throw Error('Unknown Premium Studio preset');
  const duration=Math.max(.08,span),isSubtitle=entry.category==='Subtitles';
  const callout=entry.category==='Callouts',fontSize=isSubtitle?41:entry.category==='Titles'?76:callout?49:54;
  const motion={
   enter:{type:entry.enter,duration:Math.min(.82,duration*.35),ease:'easeOut'},
   exit:{type:entry.exit,duration:Math.min(.55,duration*.27),ease:'easeInOut'},
   numeric:{type:id==='platinum-number'?'countUp':'none',from:0,to:100,duration:Math.min(2,duration),decimals:0,prefix:'',suffix:id==='platinum-number'?'%':''}
  };
  const l=root.MangoGraphics.create(callout?'callout':'text','none',at,{
   name:entry.name,preset:'none',text:callout?'FEATURE DETAIL':isSubtitle?'Premium subtitle':
    entry.category==='Text'?'Precision in every frame':'YOUR TITLE',
   x:isSubtitle?.16:callout?.56:.12,
   y:isSubtitle?.77:callout?.36:entry.category==='Text'?.72:.31,
   width:isSubtitle?.68:callout?.38:.76,
   fontSize,font:entry.material==='editorial'?'serif':entry.material==='chrome'?'display':'sans',
   weight:entry.material==='editorial'?'600':'800',
   color:entry.material==='metal'?'#fcebc9':'#f8fcff',
   background:'transparent',outlineWidth:0,shadow:4,align:callout?'left':'center',
   motion,premium:{id,intensity:.74,accent:entry.accent,role:'primary'},
   end:Math.max(at+.08,at+duration)
  });return l;
 }
 function secondary(primary){
  const entry=byId[primary.premium.id];
  if(!entry||!['Titles','Callouts'].includes(entry.category))return null;
  const copy=root.MangoGraphics.create('text','none',primary.start,{
   name:entry.name+' · Detail',preset:'none',track:primary.track,
   start:primary.start,end:primary.end,x:primary.x,y:Math.min(.89,primary.y+(entry.category==='Titles'?.145:.18)),
   width:primary.width,fontSize:29,font:'sans',weight:'500',color:'#e5f2f4',
   background:'transparent',outlineWidth:0,shadow:2,
   text:entry.category==='Titles'?'STUDIO EDITION':'Detailed feature insight',
   align:primary.align,fadeIn:.05,fadeOut:.05,
   motion:{enter:{type:'fade',duration:.6,ease:'easeOut'},exit:{type:'fade',duration:.3,ease:'easeIn'},numeric:{type:'none',from:0,to:100,duration:2,decimals:0,prefix:'',suffix:''}},
   premium:{...primary.premium,role:'secondary'}
  });return copy;
 }
 function path(ctx,x,y,w,h,r){
  r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
 }
 function paint(ctx,layer,rect){
  if(!layer.premium)return false;
  const conf=validate(layer.premium),preset=byId[conf.id];
  const [dark,mid,shine]=palettes[preset.material];
  const {x,y,width,height,scale,seconds}=rect;
  const intensity=conf.intensity;
  const time=Math.max(0,seconds-layer.start);
  const offset=((time*.18)%1)*width,edge=12*scale;
  ctx.save();
  const pane=preset.category!=='Titles'||preset.material!=='editorial';
  if(pane){
   const bg=ctx.createLinearGradient(x,y,x+width,y+height);
   bg.addColorStop(0,dark);bg.addColorStop(.48,mid);bg.addColorStop(1,dark);
   ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=18*scale;ctx.shadowOffsetY=6*scale;
   path(ctx,x,y,width,height,18*scale);ctx.globalAlpha*=.75+.16*intensity;ctx.fillStyle=bg;ctx.fill();
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   const glow=ctx.createLinearGradient(x,y,x+width,y+height);
   glow.addColorStop(0,'rgba(255,255,255,.52)');glow.addColorStop(.20,'rgba(255,255,255,.05)');
   glow.addColorStop(.65,'rgba(255,255,255,.10)');glow.addColorStop(1,'rgba(255,255,255,.65)');
   path(ctx,x+edge*.45,y+edge*.4,width-edge*.9,height-edge*.8,15*scale);
   ctx.strokeStyle=glow;ctx.lineWidth=2*scale;ctx.stroke();
   ctx.strokeStyle=conf.accent;ctx.globalAlpha*=.45+.35*intensity;
   path(ctx,x+2*scale,y+2*scale,width-4*scale,height-4*scale,15*scale);ctx.lineWidth=1.1*scale;ctx.stroke();
   // Restrained product-grade luminance, avoids costly per-frame textures.
   ctx.globalAlpha*=.52;ctx.fillStyle=conf.accent;ctx.fillRect(x+width*.08,y+2*scale,width*.22,2*scale);
   ctx.fillRect(x+width*.72,y+height-4*scale,width*.18,1.3*scale);
  }
  ctx.globalAlpha=clamp(layer.opacity,0,1);
  if(preset.material==='chrome'||preset.material==='metal'){
   const metal=ctx.createLinearGradient(x,y,x+width,y);
   metal.addColorStop(0,'rgba(255,255,255,.0)');metal.addColorStop(.25,'rgba(255,255,255,.14)');
   metal.addColorStop(.5,'rgba(255,255,255,.03)');metal.addColorStop(.78,'rgba(255,255,255,.23)');
   metal.addColorStop(1,'rgba(255,255,255,.0)');
   ctx.fillStyle=metal;ctx.fillRect(x,y,width,4*scale);
   ctx.strokeStyle=conf.accent;ctx.lineWidth=2.3*scale;
   ctx.beginPath();ctx.moveTo(x+8*scale,y+height-3*scale);ctx.lineTo(x+width*.4,y+height-3*scale);ctx.stroke();
  }
  if(preset.material==='holo'||preset.material==='aurora'){
   const bloom=ctx.createLinearGradient(x,y,x+width,y+height);
   bloom.addColorStop(0,'rgba(95,228,255,.01)');
   bloom.addColorStop(.4,'rgba(90,230,196,.20)');
   bloom.addColorStop(.7,'rgba(190,120,255,.16)');
   bloom.addColorStop(1,'rgba(255,255,255,.01)');
   ctx.globalAlpha*=.7*intensity;ctx.fillStyle=bloom;path(ctx,x,y,width,height,18*scale);ctx.fill();
   ctx.globalAlpha=clamp(layer.opacity,0,1);
  }
  if(preset.material==='glass'||preset.material==='holo'){
   const beam=ctx.createLinearGradient(x+offset-70*scale,y,x+offset+90*scale,y+height);
   beam.addColorStop(0,'rgba(255,255,255,0)');
   beam.addColorStop(.5,'rgba(255,255,255,.17)');
   beam.addColorStop(1,'rgba(255,255,255,0)');
   ctx.save();path(ctx,x,y,width,height,18*scale);ctx.clip();
   ctx.globalAlpha*=.8*intensity;ctx.fillStyle=beam;ctx.fillRect(x,y,width,height);
   ctx.restore();
  }
  if(preset.material==='editorial'){
   ctx.strokeStyle=conf.accent;ctx.lineWidth=1.5*scale;
   ctx.beginPath();ctx.moveTo(x+width*.25,y-8*scale);ctx.lineTo(x+width*.75,y-8*scale);ctx.stroke();
  }
  if(layer.kind==='callout'&&conf.role==='primary'){
   ctx.lineWidth=2*scale;ctx.strokeStyle=conf.accent;ctx.globalAlpha*=.9;
   ctx.beginPath();ctx.moveTo(x+width*.62,y+height);
   ctx.lineTo(x+width*.67,y+height+25*scale);ctx.lineTo(x+width*.73,y+height);
   ctx.stroke();
  }
  ctx.restore();
  return true;
 }
 function textFill(ctx,layer,rect){
  if(!layer.premium)return null;
  const conf=validate(layer.premium),preset=byId[conf.id],{x,y,width,height}=rect;
  if(preset.material==='chrome'||preset.material==='metal'){
   const g=ctx.createLinearGradient(x,y,x,y+height);
   g.addColorStop(0,preset.material==='metal'?'#fff6da':'#ffffff');
   g.addColorStop(.36,conf.accent);g.addColorStop(.54,'#5a686e');
   g.addColorStop(.66,conf.accent);g.addColorStop(1,'#fffaf1');
   return g;
  }
  return null;
 }
 root.MangoPremium={catalog,byId,validate,make,secondary,paint,textFill};
})(typeof globalThis!=='undefined'?globalThis:this);
