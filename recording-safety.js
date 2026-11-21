/* Local, incremental recovery store. Each MediaRecorder dataavailable chunk is
 * written independently, so closing the UI does not necessarily erase all data.
 * Playback of interrupted MP4 fragments depends on whether the browser wrote
 * enough container metadata. No cloud service or background recorder is used. */
(function(root){
  const DB='MangoShotRecordingRecoveryV1';
  const VERSION=1;
  function open(){return new Promise((resolve,reject)=>{
    if(!root.indexedDB){reject(new Error('IndexedDB is unavailable'));return;}
    const req=root.indexedDB.open(DB,VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'id'});
      if(!db.objectStoreNames.contains('chunks'))db.createObjectStore('chunks',{keyPath:['id','index']});
    };
    req.onerror=()=>reject(req.error||new Error('Recording storage unavailable'));
    req.onsuccess=()=>resolve(req.result);
  });}
  async function transaction(storeNames,mode,perform){
    const db=await open();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeNames,mode);let result;
      tx.oncomplete=()=>resolve(result);
      tx.onabort=()=>reject(tx.error||new Error('Recording storage transaction aborted'));
      tx.onerror=()=>reject(tx.error||new Error('Recording storage transaction failed'));
      try{perform(tx,value=>{result=value;});}catch(error){try{tx.abort();}catch{}reject(error);}
    });}finally{db.close();}
  }
  function id(){return (root.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2));}
  async function begin(mime){
    const item={id:id(),mime,created:Date.now(),status:'recording',bytes:0};
    await transaction(['sessions'],'readwrite',tx=>tx.objectStore('sessions').put(item));return item;
  }
  async function append(session,number,blob){
    if(!session?.id||!Number.isInteger(number)||number<0||!(blob instanceof Blob)||!blob.size)return;
    await transaction(['chunks'],'readwrite',tx=>tx.objectStore('chunks').put({id:session.id,index:number,blob}));
  }
  async function mark(session,status){
    if(!session)return;
    await transaction(['sessions'],'readwrite',tx=>tx.objectStore('sessions').put({...session,status,updated:Date.now()}));
  }
  async function latest(){
    return transaction(['sessions'],'readonly',(tx,set)=>{
      const req=tx.objectStore('sessions').getAll();
      req.onsuccess=()=>set(req.result.sort((a,b)=>b.created-a.created)[0]||null);
    });
  }
  async function restore(session){
    if(!session?.id)throw new Error('Missing recovery session');
    const parts=await transaction(['chunks'],'readonly',(tx,set)=>{
      const req=tx.objectStore('chunks').getAll();
      req.onsuccess=()=>set(req.result.filter(part=>part.id===session.id).sort((a,b)=>a.index-b.index));
    });
    if(!parts?.length)throw new Error('No flushed video fragments were stored for this session.');
    return new Blob(parts.map(p=>p.blob),{type:session.mime});
  }
  async function discard(session){
    if(!session?.id)return;
    await transaction(['sessions','chunks'],'readwrite',tx=>{
      tx.objectStore('sessions').delete(session.id);
      const store=tx.objectStore('chunks');
      const req=store.openCursor();req.onsuccess=()=>{
        const cursor=req.result;if(!cursor)return;
        if(cursor.value.id===session.id)cursor.delete();cursor.continue();
      };
    });
  }
  root.MangoRecovery={begin,append,mark,latest,restore,discard};
})(typeof globalThis!=='undefined'?globalThis:this);
