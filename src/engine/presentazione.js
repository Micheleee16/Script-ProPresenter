// ====================== costruzione della presentazione ======================
function verseRtf(hdr,vs){
  vs=finalVerses(vs);
  let s=hdr+'\\f0\\fs80 \\cf2 '+vs[0][0]+'\n\\fs120  '+esc(vs[0][1]),plain=vs[0][0]+' '+vs[0][1];
  for(let i=1;i<vs.length;i++){s+=' \n\\fs80 \\up0 '+vs[i][0]+'\n\\fs120 \\up0 \\\'a0'+esc(vs[i][1]);plain+=' '+vs[i][0]+' '+vs[i][1];}
  return [s+'}',plain];
}
function refRtf(hdr,label){return [hdr+'\\f0\\fs160 \\cf2 '+esc(label)+'}',label];}
const MEDIA_URL='file:///Users/michele/Documents/ProPresenter/Media/Assets/';
const MEDIA_ZIP='/Users/michele/Documents/ProPresenter/Media/Assets/';
function dropNth(b,f,n){let c=-1,out=[];parse(b).forEach(function(x){if(x.f===f){c++;if(c===n)return;}out.push(x);});return ser(out);}
function f64(n){const v=new DataView(new ArrayBuffer(8));v.setFloat64(0,n,true);return new Uint8Array(v.buffer);}
// Il template ricorda larghezza e altezza dell'immagine originale: vanno aggiornate con quelle dell'immagine caricata.
function setMediaSize(b,w,h){
  return edit(b,[[10,1],[20,0],[5,0],[5,0],[1,0],[5,0]],function(x){return ser(parse(x).map(function(y){return y.f===1?{f:1,t:1,v:f64(w)}:y.f===2?{f:2,t:1,v:f64(h)}:y;}));});
}
function setMedia(b,name,w,h){
  const url=te.encode(MEDIA_URL+encodeURIComponent(name)),rel=te.encode('Media/Assets/'+name),A=[[10,1],[20,0],[5,0]];
  b=edit(b,A.concat([[2,0],[1,0]]),function(){return url;});
  b=edit(b,A.concat([[2,0],[4,0],[2,0]]),function(){return rel;});
  b=edit(b,A.concat([[5,0],[2,0],[1,0],[1,0]]),function(){return url;});
  b=edit(b,A.concat([[5,0],[2,0],[1,0],[4,0],[2,0]]),function(){return rel;});
  b=edit(b,[[10,0],[3,0],[2,0]],function(){return te.encode(name);});
  if(w>0&&h>0)b=setMediaSize(b,w,h);
  return b;
}
function PEL(i){return [[10,0],[23,0],[2,0],[1,0],[1,i],[1,0],[13,0]];}
function buildCue(tpl,name,vs,label,hdr,media){   // media: {name,w,h}, oppure null = nessuna immagine
  let b=remap(tpl);
  b=edit(b,[[2,0]],function(){return te.encode(name);});
  if(vs){
    let r=verseRtf(hdr,vs);
    b=edit(b,PEL(0).concat([[5,0]]),function(){return latin1Bytes(r[0]);});
    b=edit(b,PEL(0).concat([[3,0],[13,0],[1,0],[2,0]]),function(){return r[1].length;});
    r=refRtf(hdr,label);
    b=edit(b,PEL(1).concat([[5,0]]),function(){return latin1Bytes(r[0]);});
    b=edit(b,PEL(1).concat([[3,0],[13,0],[1,0],[2,0]]),function(){return r[1].length;});
  }
  if(media===null){b=dropNth(b,10,1);b=edit(b,[[10,0]],function(x){return dropNth(x,3,0);});}   // nessuna immagine: niente azione di sfondo, niente etichetta
  else if(media)b=setMedia(b,media.name,media.w,media.h);
  return b;
}
/**
 * Costruisce il file .pro dei versetti partendo dal modello incorporato.
 * @param {Array} passages passi letti dal messaggio
 * @param {string} nome nome della presentazione
 * @param {number} corto  @param {number} max regole di divisione
 * @param {{bg:Object|null,sep:Object|null}} imgs immagine di sfondo e immagine tra i passi
 * @returns {Uint8Array} il file .pro
 */
function buildPresentation(passages,nome,corto,max,imgs){
  imgs=imgs||{bg:null,sep:null};
  let top=parse(b64ToBytes(TEMPLATE_B64)),grp=null,i;
  top.forEach(function(x){if(x.f===12&&!grp)grp=x;});
  const order=parse(grp.v).filter(function(x){return x.f===2;}).map(function(x){return td.decode(parse(x.v)[0].v);});
  const cues={};
  top.forEach(function(x){if(x.f===13)cues[td.decode(path(x.v,1,1))]=x.v;});
  function C(k){return cues[order[k]];}
  const tplVerse=C(2),tplSep=C(11);
  const el0=parse(path(tplVerse,10,23,2,1)).filter(function(x){return x.f===1;})[0].v;
  const hdr=latin1Str(path(el0,1,13,5)).split('\\f0\\fs80')[0];
  const nw=[];
  passages.forEach(function(p,pi){
    if(pi>0&&imgs.sep)nw.push(buildCue(tplSep,'Separatore',null,null,null,imgs.sep));
    groupWith(p.verses,corto,max,p.ov).forEach(function(sl){
      const a=sl[0][0],z=sl[sl.length-1][0];
      nw.push(buildCue(tplVerse,p.book+' '+p.chap+':'+a+(z!==a?'-'+z:''),sl,p.label,hdr,imgs.bg||null));
    });
  });
  let out=[],ins=false;
  top.forEach(function(x){
    if(x.f===2)out.push({f:2,t:2,v:ser([{f:1,t:2,v:te.encode(uuid4())}])});
    else if(x.f===3)out.push({f:3,t:2,v:te.encode(nome)});
    else if(x.f===12){
      const g=parse(x.v),items=[{f:1,t:2,v:remap(g[0].v)}];
      nw.forEach(function(c){items.push({f:2,t:2,v:ser([{f:1,t:2,v:path(c,1,1)}])});});
      out.push({f:12,t:2,v:ser(items)});
    }
    else if(x.f===13){if(!ins){nw.forEach(function(c){out.push({f:13,t:2,v:c});});ins=true;}}
    else out.push(x);
  });
  return ser(out);
}


