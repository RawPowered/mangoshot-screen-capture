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
 function render(value,width,height){
  const v=S.check(value),[w,h]=dimensions(width,height),key=JSON.stringify([v,w,h]);
  const old=cache.get(key);if(old){cache.delete(key);cache.set(key,old);hits++;return old.canvas;}
  const {canvas:c,gl,program,vao,buffers,uniforms:u}=requireRenderer(),m=S.mesh(v),b=S.camera(v.camera,w,h);
  if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(0,0,0,0);gl.clearDepth(1);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(program);gl.bindVertexArray(vao);
  for(const [i,data] of [m.positions,m.normals].entries()){gl.bindBuffer(gl.ARRAY_BUFFER,buffers[i]);gl.bufferData(gl.ARRAY_BUFFER,data,gl.DYNAMIC_DRAW);}
  const f=(k,n)=>gl.uniform1f(u[k],n),vec=(k,n)=>gl.uniform3fv(u[k],n);
  vec('eye',b.eye);vec('rightAxis',b.right);vec('upAxis',b.up);vec('forwardAxis',b.forward);f('tanHalf',b.t);f('aspect',b.aspect);f('nearZ',S.NEAR);f('farZ',S.FAR);f('orthoScale',b.ortho?b.distance*b.t:0);
  vec('baseColor',[1,3,5].map(i=>parseInt(v.color.slice(i,i+2),16)/255));const a=v.light*Math.PI/180;vec('light',S.add(S.add(S.mul(b.right,Math.cos(a)),S.mul(b.up,-Math.sin(a))),S.mul(b.forward,-.85)));f('gloss',v.material==='matte'?.06:v.material==='metal'?.72:.95);
  gl.drawArrays(gl.TRIANGLES,0,m.positions.length/3);if(gl.getError()!==gl.NO_ERROR||gl.isContextLost())throw Error('Spatial 3D draw failed.');
  const out=root.document.createElement('canvas');out.width=w;out.height=h;out.getContext('2d').drawImage(c,0,0);
  while(cache.size&&(cache.size>=6||cachedPixels+w*h>CACHE_PIXELS))drop(cache.keys().next().value);
  cache.set(key,{canvas:out,pixels:w*h});cachedPixels+=w*h;draws++;return out;
 }
 function paint(q,value,b,opacity=1){
  if(!b||![b.x,b.y,b.width,b.height].every(Number.isFinite)||b.width<=0||b.height<=0)return false;
  const m=q.getTransform?.(),sx=m?Math.hypot(m.a,m.b):1,sy=m?Math.hypot(m.c,m.d):1;
  // Use the larger device scale in both dimensions so nonuniform 2D transforms
  // do not alter the camera's aspect or geometry.
  const scale=Math.max(.05,sx,sy),c=render(value,b.width*scale,b.height*scale);
  q.save();try{q.globalAlpha*=Math.max(0,Math.min(1,opacity));q.drawImage(c,b.x,b.y,b.width,b.height);}finally{q.restore();}return true;
 }
 function stats(){return {backend:'WebGL2 / depth-tested triangles',draws,hits,cachedPixels,entries:cache.size};}
 function clear(){for(const k of [...cache.keys()])drop(k);}
 root.MangoSpatialRendererV0730=Object.freeze({render,paint,requireRenderer,stats,clear,dimensions});
})(typeof globalThis!=='undefined'?globalThis:this);
