/* True WebGL2 triangle rasterization with a depth attachment, perspective clipping,
 * normals and local lighting. The compositor receives a transparent rendered surface.
 * Bounded cache stores completed RGBA surfaces, not GPU scene state. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730,MAX_PIXELS=9000000,CACHE_PIXELS=18000000,MAX_SIDE=4096;
 if(!S)return;
 let state=null,cache=new Map(),cachedPixels=0,draws=0,hits=0;
 const vertex='#version 300 es\nprecision highp float;\nin vec3 position; in vec3 normal;\nuniform vec3 eye,rightAxis,upAxis,forwardAxis;\nuniform float tanHalf,aspect,nearZ,farZ,orthoScale;\nout vec3 N;out vec3 P;\nvoid main(){vec3 d=position-eye;float z=dot(d,forwardAxis);float x=dot(d,rightAxis),y=dot(d,upAxis);if(orthoScale>0.0){gl_Position=vec4(x/(orthoScale*aspect),y/orthoScale,2.0*(z-nearZ)/(farZ-nearZ)-1.0,1.0);}else{gl_Position=vec4(x/(tanHalf*aspect),y/tanHalf,((farZ+nearZ)*z-2.0*farZ*nearZ)/(farZ-nearZ),z);} N=normal;P=position;}';
 const fragment='#version 300 es\nprecision highp float;\nin vec3 N;in vec3 P;uniform vec3 eye,baseColor,light;uniform float gloss;out vec4 outColor;\nvoid main(){vec3 n=normalize(N),l=normalize(light),v=normalize(eye-P),h=normalize(l+v);float diffuse=max(dot(n,l),0.0);float spec=pow(max(dot(n,h),0.0),mix(12.0,70.0,gloss))*gloss;vec3 c=baseColor*(0.28+0.72*diffuse)+vec3(spec*0.7);outColor=vec4(clamp(c,0.0,1.0),1.0);}';
 function make(){
  const c=root.document.createElement('canvas');c.width=c.height=8;
  const gl=c.getContext('webgl2',{alpha:true,antialias:true,depth:true,premultipliedAlpha:true,preserveDrawingBuffer:true});
  if(!gl||!gl.getContextAttributes()?.depth)throw Error('Spatial 3D requires WebGL2 with a depth buffer. Enable browser graphics acceleration.');
  function shader(kind,src){const s=gl.createShader(kind);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('Spatial shader compilation failed: '+log);}return s;}
  const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Spatial shader link failed.');
  const vao=gl.createVertexArray();gl.bindVertexArray(vao);
  const buffers=['position','normal'].map(name=>{const b=gl.createBuffer(),a=gl.getAttribLocation(program,name);gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,3,gl.FLOAT,false,0,0);return b;});
  const uniforms=Object.fromEntries(['eye','rightAxis','upAxis','forwardAxis','tanHalf','aspect','nearZ','farZ','orthoScale','baseColor','light','gloss'].map(n=>[n,gl.getUniformLocation(program,n)]));
  c.addEventListener('webglcontextlost',e=>{e.preventDefault();});
  c.addEventListener('webglcontextrestored',()=>{if(state?.canvas===c)state=null;});
  return {canvas:c,gl,program,vao,buffers,uniforms};
 }
 function requireRenderer(){if(!state)state=make();if(state.gl.isContextLost())throw Error('3D graphics context lost. Restore browser graphics before editing or exporting.');return state;}
 function drop(k){const e=cache.get(k);if(!e)return;cache.delete(k);cachedPixels-=e.pixels;e.canvas.width=e.canvas.height=1;}
 function dimensions(w,h){if(!Number.isFinite(w)||!Number.isFinite(h)||w<=0||h<=0)throw Error('Invalid spatial viewport.');const s=Math.min(1,MAX_SIDE/w,MAX_SIDE/h,Math.sqrt(MAX_PIXELS/(w*h)));return [Math.max(1,Math.round(w*s)),Math.max(1,Math.round(h*s))];}
 function render(value,width,height,progress=1,transient=false,reveals=null,transforms=null){
  const scene=value?.mode==='scene',Q=root.MangoUnifiedSceneV0733,v=scene?Q.check(value):S.check(value),[w,h]=dimensions(width,height);if(typeof progress!=='number'||!Number.isFinite(progress)||progress<0||progress>1)throw Error('Invalid path reveal.');if(reveals!==null&&(!scene||typeof reveals!=='object'||Array.isArray(reveals)||Object.keys(reveals).some(id=>!v.objects.some(o=>o.id===id)||typeof reveals[id]!=='number'||!Number.isFinite(reveals[id])||reveals[id]<0||reveals[id]>1)))throw Error('Invalid per-object reveal map.');const rigid=root.MangoRigidMotionV0736;if(transforms!==null&&(!scene||!rigid||typeof transforms!=='object'||Array.isArray(transforms)||Object.keys(transforms).some(id=>!v.objects.some(o=>o.id===id))))throw Error('Invalid scene transform map.');if(transforms)for(const t of Object.values(transforms))rigid.check(t);const key=JSON.stringify([v,w,h,progress,reveals,transforms]);
  const old=transient?null:cache.get(key);if(old){cache.delete(key);cache.set(key,old);hits++;return old.canvas;}
  const {canvas:c,gl,program,vao,buffers,uniforms:u}=requireRenderer(),objects=scene?Q.entries(v):[{id:null,value:v}],b=S.camera(v.camera,w,h);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);gl.bindVertexArray(vao);
  const f=(k,n)=>gl.uniform1f(u[k],n),vec=(k,n)=>gl.uniform3fv(u[k],n);
  vec('eye',b.eye);vec('rightAxis',b.right);vec('upAxis',b.up);vec('forwardAxis',b.forward);f('tanHalf',b.t);f('aspect',b.aspect);f('nearZ',S.NEAR);f('farZ',S.FAR);f('orthoScale',b.ortho?b.distance*b.t:0);
  // Do not clear the depth attachment between objects. Independent materials,
  // world-space vertices and a single shared camera produce actual occlusion.
  for(const entry of objects){const o=entry.value,p=reveals&&Object.hasOwn(reveals,entry.id)?reveals[entry.id]:progress,m=S.mesh(o,p);if(transforms&&Object.hasOwn(transforms,entry.id))rigid.mesh(m,transforms[entry.id]);
   for(const [i,data] of [m.positions,m.normals].entries()){gl.bindBuffer(gl.ARRAY_BUFFER,buffers[i]);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);}
   vec('baseColor',[1,3,5].map(i=>parseInt(o.color.slice(i,i+2),16)/255));const a=o.light*Math.PI/180;vec('light',S.add(S.add(S.mul(b.right,Math.cos(a)),S.mul(b.up,-Math.sin(a))),S.mul(b.forward,-.85)));f('gloss',o.material==='matte'?.06:o.material==='metal'?.72:.95);
   gl.drawArrays(gl.TRIANGLES,0,m.positions.length/3);
  }if(gl.getError()!==gl.NO_ERROR||gl.isContextLost())throw Error('Spatial 3D draw failed.');
  const out=root.document.createElement('canvas');out.width=w;out.height=h;const g=out.getContext('2d');g.drawImage(c,0,0);
  if(v.occlusion?.length){g.save();try{g.globalCompositeOperation='destination-out';g.fillStyle='#ffffff';for(const poly of v.occlusion){g.beginPath();poly.forEach(([x,y],i)=>i?g.lineTo(x*w,y*h):g.moveTo(x*w,y*h));g.closePath();g.fill('evenodd');}}finally{g.restore();}}
  draws++;if(transient)return out;
  while(cache.size&&(cache.size>=6||cachedPixels+w*h>CACHE_PIXELS))drop(cache.keys().next().value);
  cache.set(key,{canvas:out,pixels:w*h});cachedPixels+=w*h;return out;
 }
 function paint(q,value,b,opacity=1,progress=1,transient=false,reveals=null,transforms=null){
  if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)return false;
  const m=q.getTransform?.(),sx=m?Math.hypot(m.a,m.b):1,sy=m?Math.hypot(m.c,m.d):1;
  // Use the larger device scale in both dimensions so nonuniform 2D transforms
  // do not alter the camera's aspect or geometry.
  const scale=Math.max(.05,sx,sy),c=render(value,b.width*scale,b.height*scale,progress,transient,reveals,transforms);
  q.save();try{q.globalAlpha*=Math.max(0,Math.min(1,opacity));q.drawImage(c,b.x,b.y,b.width,b.height);}finally{q.restore();if(transient)c.width=c.height=1;}return true;
 }
 function hit(value,b,x,y,pad=6){if(!b||b.width<=0||b.height<=0||x<b.x-pad||y<b.y-pad||x>b.x+b.width+pad||y>b.y+b.height+pad)return false;
  const factor=Math.min(1,512/b.width,512/b.height),c=render(value,b.width*factor,b.height*factor),px=(x-b.x)*c.width/b.width,py=(y-b.y)*c.height/b.height,r=Math.max(2,Math.ceil(pad*factor)),left=Math.max(0,Math.floor(px-r)),top=Math.max(0,Math.floor(py-r)),right=Math.min(c.width,Math.ceil(px+r)),bottom=Math.min(c.height,Math.ceil(py+r));if(right<=left||bottom<=top)return false;
  const a=c.getContext('2d').getImageData(left,top,right-left,bottom-top).data;for(let i=3;i<a.length;i+=4)if(a[i]>20)return true;return false;
 }
 function stats(){return {backend:'WebGL2 / depth-tested triangles',draws,hits,cachedPixels,entries:cache.size};}
 function clear(){for(const k of [...cache.keys()])drop(k);}
 root.MangoSpatialRendererV0730=Object.freeze({render,paint,hit,requireRenderer,stats,clear,dimensions});
})(typeof globalThis!=='undefined'?globalThis:this);
