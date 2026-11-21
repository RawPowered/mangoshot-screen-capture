/* Local-only transfer of the last recording to Clip Studio. No remote upload. */
(() => {
  const dbName='MangoShotLocalClipsV1';
  function open() {return new Promise((resolve,reject)=>{
    const req=indexedDB.open(dbName,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('clips'))req.result.createObjectStore('clips');};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });}
  async function run(mode,fn){const db=await open();try{return await new Promise((resolve,reject)=>{
    const tx=db.transaction('clips',mode),store=tx.objectStore('clips'),request=fn(store);
    let value;request.onsuccess=()=>{value=request.result;};
    tx.oncomplete=()=>resolve(value);
    tx.onerror=()=>reject(tx.error||new Error('Storage transaction failed.'));
    tx.onabort=()=>reject(tx.error||new Error('Storage transaction was cancelled.'));
  });}finally{db.close();}}
  globalThis.MangoClips={
    save:async(blob)=>{if(!(blob instanceof Blob)||!blob.size)throw new Error('No recording to save.');return run('readwrite',s=>s.put({blob,created:Date.now()},'latest'));},
    load:async()=>run('readonly',s=>s.get('latest')),
    clear:async()=>run('readwrite',s=>s.delete('latest'))
  };
})();
