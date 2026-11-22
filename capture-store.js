/* Local-only screenshot handoff. Valid in extension pages and background workers.
   One database per extension origin; never sends image data off-device. */
(function(root){
  const DB='MangoShotCaptureHandoffV1', STORE='captures';
  function open(){return new Promise((resolve,reject)=>{
    if(!root.indexedDB) return reject(new Error('Local capture storage is unavailable.'));
    const req=root.indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||new Error('Cannot open local capture storage.'));
  });}
  async function transact(mode,action){const db=await open();try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let value;
    tx.oncomplete=()=>resolve(value);
    tx.onerror=()=>reject(tx.error||new Error('Capture storage failed.'));
    tx.onabort=()=>reject(tx.error||new Error('Capture storage interrupted.'));
    try{action(store,result=>{value=result;});}catch(error){try{tx.abort();}catch{}reject(error);}
  });}finally{db.close();}}
  function valid(id){return typeof id==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(id);}
  function png(data){return typeof data==='string'&&data.startsWith('data:image/png;base64,')&&data.length>100;}
  async function save(id,meta,frames){
    if(!valid(id))throw new Error('Invalid capture ID.');
    if(!meta||!Number.isInteger(meta.frames)||meta.frames<1||meta.frames>40||
       !Array.isArray(frames)||frames.length!==meta.frames||
       frames.some((f,i)=>f.index!==i||!png(f.dataUrl))) throw new Error('Incomplete screenshot data.');
    const item={id,created:Date.now(),meta,frames};
    await transact('readwrite',store=>store.put(item,id));return id;
  }
  async function load(id){if(!valid(id))throw new Error('Invalid capture ID.');
    return transact('readonly',(store,set)=>{const req=store.get(id);req.onsuccess=()=>set(req.result||null);});}
  async function remove(id){if(!valid(id))return;
    return transact('readwrite',store=>store.delete(id));}
  root.MangoCaptureStore={save,load,remove,valid,png};
})(globalThis);
