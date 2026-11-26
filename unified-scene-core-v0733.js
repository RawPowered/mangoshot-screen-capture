/* One local scene, one camera and one depth buffer. A scene is a single 2D
 * composition layer containing independently editable opaque XYZ meshes.
 * Object geometry never stores an independent camera or foreground polygon. */
(function(root){'use strict';
 const S=root.MangoSpatialArrowV0730;if(!S)return;
 const MAX_OBJECTS=8,copy=S.copy,exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
 const id=()=>root.crypto?.randomUUID?.()||'object-'+Date.now()+'-'+Math.random().toString(36).slice(2);
 const nameFor=kind=>kind[0].toUpperCase()+kind.slice(1);
 function geometry(value){const g=S.check(value);delete g.camera;delete g.occlusion;return g;}
 function pose(g,camera){if(!g||typeof g!=='object'||Object.hasOwn(g,'camera')||Object.hasOwn(g,'occlusion'))throw Error('Scene objects share the scene camera and foreground polygons.');return S.check({...g,camera});}
 function check(value){
  const keys=['mode','shape','camera','objects'];if(value&&Object.hasOwn(value,'occlusion'))keys.push('occlusion');
  if(!exact(value,keys)||value.mode!=='scene'||value.shape!=='scene'||!Array.isArray(value.objects)||value.objects.length<1||value.objects.length>MAX_OBJECTS)throw Error('A scene requires 1–8 editable objects.');
  const camera=S.checkCamera(value.camera),ids=new Set(),objects=value.objects.map(o=>{
   if(!exact(o,['id','name','visible','locked','geometry'])||typeof o.id!=='string'||!/^[\w-]{1,90}$/.test(o.id)||ids.has(o.id)||typeof o.name!=='string'||!o.name.trim()||o.name.length>64||typeof o.visible!=='boolean'||typeof o.locked!=='boolean')throw Error('Invalid or duplicate scene object.');
   ids.add(o.id);return {id:o.id,name:o.name.trim(),visible:o.visible,locked:o.locked,geometry:geometry(pose(o.geometry,camera))};
  });
  const out={mode:'scene',shape:'scene',camera,objects};if(Object.hasOwn(value,'occlusion')){const m=S.checkOcclusion(value.occlusion);if(m.length)out.occlusion=m;}return out;
 }
 function object(kind='arrow'){const g=geometry({...S.defaults(),shape:kind,points:S.shapePoints(kind)});return {id:id(),name:nameFor(kind),visible:true,locked:false,geometry:g};}
 function defaults(){return check({mode:'scene',shape:'scene',camera:S.defaultCamera(),objects:[object()]});}
 function selectedPose(scene,objectId){const o=scene.objects.find(o=>o.id===objectId);if(!o)throw Error('Scene object not found.');return {...pose(o.geometry,scene.camera),...(scene.occlusion?.length?{occlusion:copy(scene.occlusion)}:{})};}
 function replace(scene,objectId,raw){const v=S.check(raw),next=copy(scene),o=next.objects.find(o=>o.id===objectId);if(!o)throw Error('Scene object not found.');const g=geometry(v);
  if(o.locked&&JSON.stringify(g)!==JSON.stringify(o.geometry))throw Error('Object is locked.');
  o.geometry=g;next.camera=v.camera;if(v.occlusion?.length)next.occlusion=v.occlusion;else delete next.occlusion;return check(next);
 }
 function addObject(scene,kind){const n=copy(scene),o=object(kind);if(n.objects.length>=MAX_OBJECTS)throw Error('Maximum eight scene objects.');n.objects.push(o);return check(n);}
 function duplicate(scene,objectId){const n=copy(scene),o=n.objects.find(o=>o.id===objectId);if(!o||o.locked)throw Error('Select an unlocked object.');if(n.objects.length>=MAX_OBJECTS)throw Error('Maximum eight scene objects.');const a={...copy(o),id:id(),name:(o.name.slice(0,58)+' copy'),locked:false};n.objects.push(a);return check(n);}
 function remove(scene,objectId){const n=copy(scene),o=n.objects.find(o=>o.id===objectId);if(!o||o.locked||n.objects.length<=1)throw Error('Cannot remove a locked or last object.');n.objects=n.objects.filter(o=>o.id!==objectId);return check(n);}
 function update(scene,objectId,patch){const n=copy(scene),o=n.objects.find(o=>o.id===objectId);if(!o||Object.keys(patch).some(k=>!['name','visible','locked'].includes(k)))throw Error('Invalid scene object update.');if(o.locked&&Object.hasOwn(patch,'name'))throw Error('Object is locked.');Object.assign(o,patch);return check(n);}
 function entries(scene){const v=check(scene);return v.objects.filter(o=>o.visible).map(o=>({id:o.id,value:pose(o.geometry,v.camera)}));}
 const api=Object.freeze({MAX_OBJECTS,copy,check,geometry,pose,defaults,selectedPose,replace,addObject,duplicate,remove,update,entries});
 root.MangoUnifiedSceneV0733=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
