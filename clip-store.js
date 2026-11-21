/* Local clip handoff: immutable recording IDs prevent stale latest-recording races. */
(()=>{
 const name='MangoShotLocalClipsV1';
 function open(){return new Promise((resolve,reject)=>{
  const req=indexedDB.open(name,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('clips'))req.result.createObjectStore('clips');};
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('Clip storage unavailable'));
 });}
 async function run(mode,perform){const db=await open();try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction('clips',mode),store=tx.objectStore('clips');let result;
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error||new Error('Clip transaction failed'));
  tx.onabort=()=>reject(tx.error||new Error('Clip transaction cancelled'));
  try{perform(store,value=>{result=value;});}catch(error){try{tx.abort();}catch{}reject(error);}
 });}finally{db.close();}}
 const makeId=()=>globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2);
 const validId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,90}$/.test(id);
 async function save(blob,id=makeId()){
  if(!(blob instanceof Blob)||!blob.size)throw new Error('No recording to save');
  if(!validId(id))throw new Error('Invalid recording ID');
  const item={id,blob,created:Date.now(),bytes:blob.size};
  await run('readwrite',(store)=>{store.put(item,'recording:'+id);store.put({id,created:item.created},'latest');});
  return id;
 }
 async function load(id=null){
  if(id!==null&&!validId(id))throw new Error('Invalid recording ID');
  return run('readonly',(store,set)=>{
   if(id){const req=store.get('recording:'+id);req.onsuccess=()=>set(req.result||null);return;}
   const req=store.get('latest');req.onsuccess=()=>{
    const latest=req.result;if(!latest){set(null);return;}
    // v0.3-v0.5.1 legacy store placed a full blob at latest.
    if(latest.blob){set(latest);return;}
    const record=store.get('recording:'+latest.id);record.onsuccess=()=>set(record.result||null);
   };
  });
 }
 async function clear(){return run('readwrite',store=>{
  // Explicitly clear clip handoff cache; recording-recovery database is separate.
  store.clear();
 });}
 globalThis.MangoClips={save,load,clear};
})();
