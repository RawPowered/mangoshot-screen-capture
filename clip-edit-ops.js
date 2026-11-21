/* Sequence-time edit algebra. Source files are immutable; units are seconds. */
(function(root){
  const EPS=0.001,CUT_EPS=0.04;
  const length=parts=>parts.reduce((n,c)=>n+c.end-c.start,0);
  function range(parts,a,b){
    if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<a||b>length(parts)+EPS)
      throw new Error('Invalid sequence time range.');
    return [Math.max(0,a),Math.min(length(parts),b)];
  }
  function split(parts,at){
    if(!Number.isFinite(at)||at<=CUT_EPS||at>=length(parts)-CUT_EPS)return parts.map(x=>({...x}));
    let cursor=0,result=[];
    for(const p of parts){const end=cursor+p.end-p.start;
      if(at>cursor+CUT_EPS&&at<end-CUT_EPS){const pivot=p.start+(at-cursor);result.push({start:p.start,end:pivot},{start:pivot,end:p.end});}
      else result.push({...p});cursor=end;
    }
    return result;
  }
  function remove(parts,a,b){
    [a,b]=range(parts,a,b);if(b-a<EPS)return parts.map(x=>({...x}));
    let cursor=0,result=[];
    for(const p of parts){const d=p.end-p.start,end=cursor+d;
      const left=Math.max(0,Math.min(d,a-cursor));
      const right=Math.max(0,Math.min(d,end-b));
      if(left>=EPS)result.push({start:p.start,end:p.start+left});
      if(right>=EPS)result.push({start:p.end-right,end:p.end});
      cursor=end;
    }
    return result;
  }
  function trim(parts,a,b){[a,b]=range(parts,a,b);if(b-a<EPS)return [];
    let cursor=0,result=[];
    for(const p of parts){const d=p.end-p.start,end=cursor+d;
      const lo=Math.max(cursor,a),hi=Math.min(end,b);
      if(hi-lo>=EPS)result.push({start:p.start+(lo-cursor),end:p.start+(hi-cursor)});
      cursor=end;
    }
    return result;
  }
  function toSource(parts,t){if(!Number.isFinite(t)||t<0)return null;
    let n=0;for(const p of parts){const d=p.end-p.start;
      if(t<n+d)return p.start+t-n;n+=d;
    }
    return parts.length&&t<=n+EPS?parts[parts.length-1].end:null;
  }
  function toOutput(parts,src){if(!Number.isFinite(src))return null;
    let n=0;for(const p of parts){if(src>=p.start-EPS&&src<=p.end+EPS)return n+Math.max(0,src-p.start);
      n+=p.end-p.start;
    }
    return null;
  }
  root.MangoEditOps={length,split,remove,trim,toSource,toOutput};
})(typeof globalThis!=='undefined'?globalThis:this);
