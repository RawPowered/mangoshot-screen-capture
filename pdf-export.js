/* Dependency-free A4 multipage PDF: each screenshot strip becomes a JPEG XObject. */
(() => {
  const encoder=new TextEncoder();
  const enc=value=>encoder.encode(value);
  const A4={width:595.28,height:841.89,margin:24};
  const jpeg=canvas=>new Promise((resolve,reject)=>canvas.toBlob(blob=>
    blob?blob.arrayBuffer().then(buffer=>resolve(new Uint8Array(buffer))).catch(reject):reject(new Error('JPEG encoding failed')),
    'image/jpeg',0.94));
  async function fromCanvas(source){
    if(!source?.width||!source?.height)throw new Error('No screenshot to export.');
    const {width,height,margin}=A4,drawWidth=width-2*margin,drawHeight=height-2*margin;
    const stripHeight=Math.max(1,Math.floor(source.width*drawHeight/drawWidth));
    const count=Math.ceil(source.height/stripHeight);
    if(count>100)throw new Error('Screenshot exceeds the 100-page PDF limit.');
    const chunks=[],offsets=[0];let position=0;
    function push(value){const bytes=typeof value==='string'?enc(value):value;chunks.push(bytes);position+=bytes.byteLength;}
    function object(id,content){offsets[id]=position;push(id+' 0 obj\n');push(content);push('\nendobj\n');}
    push('%PDF-1.4\n%MangoShot\n');
    object(1,'<< /Type /Catalog /Pages 2 0 R >>');
    const ids=Array.from({length:count},(_,i)=>(3+i*3)+' 0 R').join(' ');
    object(2,'<< /Type /Pages /Kids [ '+ids+' ] /Count '+count+' >>');
    const slice=document.createElement('canvas');slice.width=source.width;
    for(let i=0;i<count;i++){
      const y=i*stripHeight;
      const h=Math.min(stripHeight,source.height-y);
      slice.height=h;
      const cx=slice.getContext('2d',{alpha:false});
      cx.fillStyle='#fff';cx.fillRect(0,0,source.width,h);
      cx.drawImage(source,0,y,source.width,h,0,0,source.width,h);
      const bytes=await jpeg(slice);
      const imageId=5+i*3,pageId=3+i*3,streamId=4+i*3;
      const points=h/source.width*drawWidth;
      const command='q\n'+drawWidth.toFixed(2)+' 0 0 '+points.toFixed(2)+' '+margin+' '+(height-margin-points).toFixed(2)+' cm\n/Img Do\nQ\n';
      const commandBytes=enc(command);
      object(pageId,'<< /Type /Page /Parent 2 0 R /MediaBox [0 0 '+width+' '+height+'] /Resources << /XObject << /Img '+imageId+' 0 R >> >> /Contents '+streamId+' 0 R >>');
      offsets[streamId]=position;push(streamId+' 0 obj\n<< /Length '+commandBytes.length+' >>\nstream\n');push(commandBytes);push('endstream\nendobj\n');
      offsets[imageId]=position;
      push(imageId+' 0 obj\n<< /Type /XObject /Subtype /Image /Width '+source.width+' /Height '+h+' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+bytes.length+' >>\nstream\n');
      push(bytes);push('\nendstream\nendobj\n');
    }
    const xref=position,total=3+count*3;
    push('xref\n0 '+total+'\n0000000000 65535 f \n');
    for(let i=1;i<total;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');
    push('trailer\n<< /Size '+total+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF\n');
    return new Blob(chunks,{type:'application/pdf'});
  }
  globalThis.MangoPDF={fromCanvas};
})();
