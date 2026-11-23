/* Explicitly linked page scroll fallback (no remote clicks or text input). */
(() => {
  if (globalThis.__mangoLinkedTabInstalled) return;
  globalThis.__mangoLinkedTabInstalled=true;
  const api=globalThis.chrome??globalThis.browser;
  function scrollTarget(x,y){
    const px=Math.min(innerWidth-1,Math.max(0,Math.round(x*innerWidth)));
    const py=Math.min(innerHeight-1,Math.max(0,Math.round(y*innerHeight)));
    let element=document.elementFromPoint(px,py);
    while(element&&element!==document.documentElement){
      const styles=getComputedStyle(element);
      if(/auto|scroll|overlay/.test(styles.overflowY)&&element.scrollHeight>element.clientHeight+2)return element;
      element=element.parentElement;
    }
    return window;
  }
  api.runtime.onMessage.addListener((message,_sender,respond)=>{
    if(message?.type!=='MANGO_LINKED_SCROLL')return;
    if(!Number.isFinite(message.dx)||!Number.isFinite(message.dy)||Math.abs(message.dy)>4000||Math.abs(message.dx)>4000||
       !Number.isFinite(message.x)||!Number.isFinite(message.y)||message.x<0||message.x>1||message.y<0||message.y>1){
      respond({ok:false,error:'Invalid scroll request.'});return;
    }
    scrollTarget(message.x,message.y).scrollBy({top:message.dy,left:message.dx,behavior:'instant'});
    respond({ok:true});
  });
})();
