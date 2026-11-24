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
  // Only a live, explicitly connected recorder port can observe pointer positions.
  // No document text, clicks on other tabs, keystrokes, history, or network.
  api.runtime.onConnect?.addListener(port=>{
    if(port.name!=='mangoshot-cursor-v073'||port.sender?.id!==api.runtime.id)return;
    let alive=true,last=null,at=0;
    const send=m=>{if(alive)try{port.postMessage(m);}catch{dispose();}};
    function leave(){last=null;send({type:'leave'});}
    function move(e,click=false){
      if(!e.isTrusted||e.isPrimary===false||document.visibilityState!=='visible'||!document.hasFocus())return;
      const x=e.clientX/Math.max(1,innerWidth),y=e.clientY/Math.max(1,innerHeight);
      if(x<0||x>1||y<0||y>1){leave();return;}
      last={type:'point',x,y,click:false};
      const t=performance.now();
      if(click||t-at>=33){at=t;send({...last,click});}
    }
    const pointer=e=>move(e),down=e=>{if(e.button===0)move(e,true);};
    const visibility=()=>{if(document.visibilityState!=='visible')leave();};
    const timer=setInterval(()=>{if(last&&document.visibilityState==='visible'&&document.hasFocus())send(last);else if(last)leave();},250);
    function dispose(){
      if(!alive)return;alive=false;clearInterval(timer);last=null;
      window.removeEventListener('pointermove',pointer,true);window.removeEventListener('pointerdown',down,true);
      document.documentElement.removeEventListener('pointerleave',leave);window.removeEventListener('blur',leave);
      document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',dispose);
    }
    window.addEventListener('pointermove',pointer,true);window.addEventListener('pointerdown',down,true);
    document.documentElement.addEventListener('pointerleave',leave);window.addEventListener('blur',leave);
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',dispose,{once:true});
    port.onDisconnect.addListener(dispose);send({type:'ready'});
  });
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
