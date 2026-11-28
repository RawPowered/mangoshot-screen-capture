/* Local, incremental recovery store. Each MediaRecorder dataavailable chunk is
 * written independently, so closing the UI does not necessarily erase all data.
 * Playback of interrupted MP4 fragments depends on whether the browser wrote
 * enough container metadata. No cloud service or background recorder is used. */
(function(root){
  const DB='MangoShotRecordingRecoveryV1';
  const VERSION=2;
  function open(){return new Promise((resolve,reject)=>{
    if(!root.indexedDB){reject(new Error('IndexedDB is unavailable'));return;}
    const req=root.indexedDB.open(DB,VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'id'});
      if(!db.objectStoreNames.contains('chunks'))db.createObjectStore('chunks',{keyPath:['id','index']});
      if(!db.objectStoreNames.contains('cursor'))db.createObjectStore('cursor',{keyPath:'id'});
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
  async function begin(mime,sessionId=id()){
    if(typeof sessionId!=='string'||!/^[\w-]{1,90}$/.test(sessionId))throw Error('Invalid recovery identity');
    const item={id:sessionId,mime,created:Date.now(),status:'recording',bytes:0};
    await transaction(['sessions'],'readwrite',tx=>tx.objectStore('sessions').put(item));return item;
  }
  async function append(session,number,blob,checkpoint=null){
    if(!session?.id||!Number.isSafeInteger(number)||number<0||!(blob instanceof Blob)||!blob.size)throw Error('Invalid recording fragment');
    if(checkpoint&&(!Number.isFinite(checkpoint.seconds)||checkpoint.seconds<0||checkpoint.seconds>86400||!checkpoint.trace))throw Error('Invalid recovery checkpoint');
    const stores=checkpoint?['sessions','chunks','cursor']:['sessions','chunks'];
    await transaction(stores,'readwrite',tx=>{
      const sessions=tx.objectStore('sessions'),req=sessions.get(session.id);
      req.onsuccess=()=>{if(!req.result||req.result.status==='finished'){tx.abort();return;}
        tx.objectStore('chunks').put({id:session.id,index:number,blob});
        if(checkpoint)tx.objectStore('cursor').put({id:session.id,index:number,seconds:checkpoint.seconds,trace:checkpoint.trace,complete:false});
      };
    });
  }
  async function mark(session,status,cursorTrace=null){
    if(!session)return;
    await transaction(['sessions','cursor'],'readwrite',tx=>{const sessions=tx.objectStore('sessions'),req=sessions.get(session.id);
      req.onsuccess=()=>{if(!req.result||req.result.status==='finished'&&status!=='finished')return;
        sessions.put({...session,status,updated:Date.now()});
        if(status==='finished'&&cursorTrace)tx.objectStore('cursor').put({id:session.id,trace:cursorTrace,complete:true});
        // Interrupted recordings keep their last atomic chunk/telemetry checkpoint.
      };
    });
  }
  async function restoreCheckpoint(session){
    if(!session?.id)return null;
    return transaction(['cursor','chunks'],'readonly',(tx,set)=>{const req=tx.objectStore('cursor').get(session.id);
      req.onsuccess=()=>{const item=req.result;if(!item?.trace){set(null);return;}
        if(session.status==='finished'&&(item.complete===true||item.complete===undefined)){set({trace:item.trace,complete:true});return;}
        if(item.complete!==false||!Number.isSafeInteger(item.index)||item.index<0||!Number.isFinite(item.seconds)||item.seconds<0||item.seconds>86400){set(null);return;}
        const chunk=tx.objectStore('chunks').get([session.id,item.index]);chunk.onsuccess=()=>set(chunk.result?.blob?.size?{trace:item.trace,complete:false,seconds:item.seconds,index:item.index}:null);
      };
    });
  }
  async function restoreCursor(session){return (await restoreCheckpoint(session))?.trace||null;}
  async function list(){
    return transaction(['sessions'],'readonly',(tx,set)=>{
      const req=tx.objectStore('sessions').getAll();
      req.onsuccess=()=>set(req.result.sort((a,b)=>b.created-a.created));
    });
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
      const store=tx.objectStore('chunks'),range=root.IDBKeyRange?.bound([session.id,0],[session.id,Number.MAX_SAFE_INTEGER]);const req=range?store.getAll(range):store.getAll();
      req.onsuccess=()=>set(req.result.filter(part=>part.id===session.id).sort((a,b)=>a.index-b.index));
    });
    if(!parts?.length)throw new Error('No flushed video fragments were stored for this session.');
    if(parts.some((p,i)=>p.index!==i||!p.blob?.size))throw Error('Recovery has missing video fragments; refusing to assemble a misleading file.');
    return new Blob(parts.map(p=>p.blob),{type:session.mime});
  }
  async function discard(session){
    if(!session?.id)return;
    await transaction(['sessions','chunks','cursor'],'readwrite',tx=>{
      tx.objectStore('sessions').delete(session.id);tx.objectStore('cursor').delete(session.id);
      const store=tx.objectStore('chunks');
      const req=store.openCursor();req.onsuccess=()=>{
        const cursor=req.result;if(!cursor)return;
        if(cursor.value.id===session.id)cursor.delete();cursor.continue();
      };
    });
  }
  async function clearAll(){await transaction(['sessions','chunks','cursor'],'readwrite',tx=>{
    tx.objectStore('cursor').clear();tx.objectStore('sessions').clear();tx.objectStore('chunks').clear();
  });}
  root.MangoRecovery={begin,append,mark,list,latest,restore,restoreCursor,restoreCheckpoint,discard,clearAll};
})(typeof globalThis!=='undefined'?globalThis:this);
