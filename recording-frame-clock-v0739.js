/* One outstanding tick; worker cadence does not depend on document repaint. */
let running=false,timer=null;function tick(){if(running)postMessage('frame');}onmessage=e=>{if(e.data==='start'){running=true;clearTimeout(timer);tick();}else if(e.data==='next'&&running){clearTimeout(timer);timer=setTimeout(tick,32);}else if(e.data==='stop'){running=false;clearTimeout(timer);close();}};
