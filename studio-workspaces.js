/* MangoShot workspaces: keep presentational controls independent of edit engine. */
(()=>{
 const root=document.body;
 if(!root?.classList?.contains('studio-clip'))return;
 const buttons=[...document.querySelectorAll('[data-workspace]')];
 const valid=new Set(['edit','graphics','timeline']);
 const storeKey='MangoShotClipWorkspaceV1';
 const status=document.getElementById('workspace-status');
 function setWorkspace(name){
   if(!valid.has(name))return false;
   root.dataset.workspace=name;
   for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.workspace===name));
   if(status)status.textContent='Workspace: '+name[0].toUpperCase()+name.slice(1);
   try{window.localStorage?.setItem(storeKey,name);}catch{}
   return true;
 }
 for(const button of buttons)button.addEventListener('click',()=>setWorkspace(button.dataset.workspace));
 let stored='edit';try{stored=window.localStorage?.getItem(storeKey)||'edit';}catch{}
 setWorkspace(valid.has(stored)?stored:'edit');
 const quick=[['quick-text','add-text'],['quick-callout','add-callout']];
 for(const [from,to] of quick){const button=document.getElementById(from),target=document.getElementById(to);
  button?.addEventListener('click',()=>{if(target&&!target.disabled)target.click();else {
   const st=document.getElementById('status');if(st)st.textContent='Import a video before adding graphics.';
  }});
 }
 window.addEventListener('keydown',event=>{
   if(event.ctrlKey||event.altKey||event.metaKey||!event.shiftKey)return;
   if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return;
   const map={'1':'edit','2':'graphics','3':'timeline'};
   if(map[event.key]){event.preventDefault();setWorkspace(map[event.key]);}
 },true);
})();
