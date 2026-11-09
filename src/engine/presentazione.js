// ====================== costruzione della presentazione ======================
function verseRtf(hdr,vs){
  vs=vs.slice();var L=vs[vs.length-1];vs[vs.length-1]=[L[0],L[1].replace(/\s+$/,'').replace(/,+$/,'').replace(/\s+$/,'')];
  var s=hdr+'\\f0\\fs80 \\cf2 '+vs[0][0]+'\n\\fs120  '+esc(vs[0][1]),plain=vs[0][0]+' '+vs[0][1];
  for(var i=1;i<vs.length;i++){s+=' \n\\fs80 \\up0 '+vs[i][0]+'\n\\fs120 \\up0 \\\'a0'+esc(vs[i][1]);plain+=' '+vs[i][0]+' '+vs[i][1];}
  return [s+'}',plain];
}
function refRtf(hdr,label){return [hdr+'\\f0\\fs160 \\cf2 '+esc(label)+'}',label];}
var MEDIA_URL='file:///Users/michele/Documents/ProPresenter/Media/Assets/';
var MEDIA_ZIP='/Users/michele/Documents/ProPresenter/Media/Assets/';
function dropNth(b,f,n){var c=-1,out=[];parse(b).forEach(function(x){if(x.f===f){c++;if(c===n)return;}out.push(x);});return ser(out);}
function setMedia(b,name){
  var url=te.encode(MEDIA_URL+encodeURIComponent(name)),rel=te.encode('Media/Assets/'+name),A=[[10,1],[20,0],[5,0]];
  b=edit(b,A.concat([[2,0],[1,0]]),function(){return url;});
  b=edit(b,A.concat([[2,0],[4,0],[2,0]]),function(){return rel;});
  b=edit(b,A.concat([[5,0],[2,0],[1,0],[1,0]]),function(){return url;});
  b=edit(b,A.concat([[5,0],[2,0],[1,0],[4,0],[2,0]]),function(){return rel;});
  b=edit(b,[[10,0],[3,0],[2,0]],function(){return te.encode(name);});
  return b;
}
function PEL(i){return [[10,0],[23,0],[2,0],[1,0],[1,i],[1,0],[13,0]];}
function buildCue(tpl,name,vs,label,hdr,mediaName){
  var b=remap(tpl);
  b=edit(b,[[2,0]],function(){return te.encode(name);});
  if(vs){
    var r=verseRtf(hdr,vs);
    b=edit(b,PEL(0).concat([[5,0]]),function(){return latin1Bytes(r[0]);});
    b=edit(b,PEL(0).concat([[3,0],[13,0],[1,0],[2,0]]),function(){return r[1].length;});
    r=refRtf(hdr,label);
    b=edit(b,PEL(1).concat([[5,0]]),function(){return latin1Bytes(r[0]);});
    b=edit(b,PEL(1).concat([[3,0],[13,0],[1,0],[2,0]]),function(){return r[1].length;});
  }
  if(mediaName===null){b=dropNth(b,10,1);b=edit(b,[[10,0]],function(x){return dropNth(x,3,0);});}   // nessuna immagine: niente azione di sfondo, niente etichetta
  else if(mediaName)b=setMedia(b,mediaName);
  return b;
}
function buildPresentation(passages,nome,corto,max,imgs){
  imgs=imgs||{bg:null,sep:null};
  var top=parse(b64ToBytes(TEMPLATE_B64)),grp=null,i;
  top.forEach(function(x){if(x.f===12&&!grp)grp=x;});
  var order=parse(grp.v).filter(function(x){return x.f===2;}).map(function(x){return td.decode(parse(x.v)[0].v);});
  var cues={};
  top.forEach(function(x){if(x.f===13)cues[td.decode(path(x.v,1,1))]=x.v;});
  function C(k){return cues[order[k]];}
  var tplVerse=C(2),tplSep=C(11);
  var el0=parse(path(tplVerse,10,23,2,1)).filter(function(x){return x.f===1;})[0].v;
  var hdr=latin1Str(path(el0,1,13,5)).split('\\f0\\fs80')[0];
  var nw=[];
  passages.forEach(function(p,pi){
    if(pi>0&&imgs.sep)nw.push(buildCue(tplSep,'Separatore',null,null,null,imgs.sep.name));
    group(p.verses,corto,max).forEach(function(sl){
      var a=sl[0][0],z=sl[sl.length-1][0];
      nw.push(buildCue(tplVerse,p.book+' '+p.chap+':'+a+(z!==a?'-'+z:''),sl,p.label,hdr,imgs.bg?imgs.bg.name:null));
    });
  });
  var out=[],ins=false;
  top.forEach(function(x){
    if(x.f===2)out.push({f:2,t:2,v:ser([{f:1,t:2,v:te.encode(uuid4())}])});
    else if(x.f===3)out.push({f:3,t:2,v:te.encode(nome)});
    else if(x.f===12){
      var g=parse(x.v),items=[{f:1,t:2,v:remap(g[0].v)}];
      nw.forEach(function(c){items.push({f:2,t:2,v:ser([{f:1,t:2,v:path(c,1,1)}])});});
      out.push({f:12,t:2,v:ser(items)});
    }
    else if(x.f===13){if(!ins){nw.forEach(function(c){out.push({f:13,t:2,v:c});});ins=true;}}
    else out.push(x);
  });
  return ser(out);
}

