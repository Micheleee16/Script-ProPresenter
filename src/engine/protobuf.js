// ====================== formato ProPresenter (Protocol Buffers) ======================
var te = new TextEncoder(), td = new TextDecoder('utf-8');
function b64ToBytes(b64){var s=atob(b64.replace(/\s+/g,'')),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u;}
function concat(parts){var n=0,i;for(i=0;i<parts.length;i++)n+=parts[i].length;var o=new Uint8Array(n),p=0;for(i=0;i<parts.length;i++){o.set(parts[i],p);p+=parts[i].length;}return o;}
function rv(b,i){var r=0n,s=0n;for(;;){var c=b[i++];r|=BigInt(c&0x7f)<<s;s+=7n;if(!(c&0x80))return [r,i];}}
function wv(n){n=BigInt(n);var o=[];for(;;){var c=Number(n&0x7fn);n>>=7n;if(n>0n)o.push(c|0x80);else{o.push(c);break;}}return Uint8Array.from(o);}
function parse(b){
  var i=0,out=[];
  while(i<b.length){
    var k=rv(b,i);i=k[1];var key=k[0],f=Number(key>>3n),t=Number(key&7n),v;
    if(t===0){var r=rv(b,i);v=r[0];i=r[1];}
    else if(t===1){v=b.subarray(i,i+8);i+=8;}
    else if(t===5){v=b.subarray(i,i+4);i+=4;}
    else if(t===2){var l=rv(b,i);i=l[1];var len=Number(l[0]);v=b.subarray(i,i+len);i+=len;}
    else throw new Error('formato non riconosciuto');
    out.push({f:f,t:t,v:v});
  }
  return out;
}
function ser(fs){
  var out=[];
  fs.forEach(function(x){
    out.push(wv((BigInt(x.f)<<3n)|BigInt(x.t)));
    if(x.t===0)out.push(wv(x.v));
    else if(x.t===2){out.push(wv(x.v.length));out.push(x.v);}
    else out.push(x.v);
  });
  return concat(out);
}
function path(b){for(var i=1;i<arguments.length;i++){var f=arguments[i],fs=parse(b),hit=null;for(var j=0;j<fs.length;j++)if(fs[j].f===f){hit=fs[j];break;}if(!hit)throw new Error('campo '+f);b=hit.v;}return b;}
// Come path(), ma con l'n-esimo campo ripetuto: pick(b,[[campo,n],[campo,n],...])
function pick(b,p){
  for(var i=0;i<p.length;i++){
    var fs=parse(b),c=-1,hit=null;
    for(var j=0;j<fs.length;j++)if(fs[j].f===p[i][0]){c++;if(c===p[i][1]){hit=fs[j];break;}}
    if(!hit)throw new Error('percorso non trovato');
    b=hit.v;
  }
  return b;
}
function edit(b,p,fn){
  var fs=parse(b),f=p[0][0],n=p[0][1],c=-1;
  for(var i=0;i<fs.length;i++){
    if(fs[i].f===f){c++;if(c===n){fs[i].v=(p.length===1)?fn(fs[i].v):edit(fs[i].v,p.slice(1),fn);return ser(fs);}}
  }
  throw new Error('percorso non trovato');
}
