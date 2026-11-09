
// ====================== canzoni: costruzione della presentazione ======================
// Riproduce la struttura della canzone di esempio: un gruppo per ogni sezione (con il suo colore),
// una slide per ogni coppia di righe. L'italiano è in MAIUSCOLO nella casella, l'inglese nelle note.
var RTF_BR='\\\n';
function tplSong(){
  var top=parse(b64ToBytes(SONG_TEMPLATE_B64)),groups=[],cues={};
  top.forEach(function(x){
    if(x.f===12)groups.push(x.v);
    if(x.f===13)cues[td.decode(path(x.v,1,1))]=x.v;
  });
  function cueOf(g,n){return cues[td.decode(parse(parse(groups[g]).filter(function(x){return x.f===2;})[n].v)[0].v)];}
  function nameOf(g){var h=parse(parse(groups[g])[0].v).filter(function(x){return x.f===2;})[0];return h?td.decode(h.v):'';}
  function groupNamed(name,withLink){
    var found=-1;
    for(var i=0;i<groups.length;i++){
      if(nameOf(i)!==name)continue;
      var hasLink=parse(parse(groups[i])[0].v).some(function(x){return x.f===5;});
      if(found<0||(withLink&&hasLink))found=i;
    }
    return found;
  }
  return {top:top,groups:groups,cueOf:cueOf,nameOf:nameOf,groupNamed:groupNamed};
}
var SONG_COLOR_GREY=[0.6,0.6,0.6,1];
function f32(n){var v=new DataView(new ArrayBuffer(4));v.setFloat32(0,n,true);return new Uint8Array(v.buffer);}
function colorMsg(c){return ser([{f:1,t:5,v:f32(c[0])},{f:2,t:5,v:f32(c[1])},{f:3,t:5,v:f32(c[2])},{f:4,t:5,v:f32(c[3])}]);}
// Intestazione di un gruppo, copiata da un gruppo del modello (colore e identificativo compresi)
function songHeader(T,block){
  var type=block.type,name=block.name,protoName,keepLink=false,color=null;
  if(type==='verse'){protoName=block.name==='Verse 1'?'Verse 1':'Verse 2';keepLink=block.name==='Verse 1';}
  else if(type==='prechorus'||type==='chorus'||type==='bridge'||type==='tag'){protoName=SEC_TYPES[type];keepLink=name===protoName;}
  else{protoName='Tag';if(type!=='outro')color=SONG_COLOR_GREY;}
  var g=T.groupNamed(protoName,keepLink);
  if(g<0)g=T.groupNamed('Verse 1',false);
  var fields=parse(parse(T.groups[g])[0].v),out=[];
  fields.forEach(function(x){
    if(x.f===1)out.push({f:1,t:2,v:ser([{f:1,t:2,v:te.encode(uuid4())}])});
    else if(x.f===2)out.push({f:2,t:2,v:te.encode(name)});
    else if(x.f===3&&color)out.push({f:3,t:2,v:colorMsg(color)});
    else if(x.f===5){if(keepLink)out.push(x);}
    else out.push(x);
  });
  return ser(out);
}
var SONG_IT_PATH=[[10,0],[23,0],[2,0],[1,0],[1,1],[1,0],[13,0]];
var SONG_NOTE_PATH=[[10,0],[23,0],[2,0],[2,0],[1,0]];
function songCue(proto,sl){
  var b=remap(proto);
  if(!sl)return b;
  var it=sl.it.map(function(l){return l.toUpperCase();}),en=sl.en;
  var rtf0=latin1Str(pick(b,SONG_IT_PATH.concat([[5,0]]))),hdr=rtf0.split('\\f0\\b')[0];
  var rtf=hdr+'\\f0\\b\\fs160 \\cf2 '+it.map(esc).join(RTF_BR)+'}';
  b=edit(b,SONG_IT_PATH.concat([[5,0]]),function(){return latin1Bytes(rtf);});
  b=edit(b,SONG_IT_PATH.concat([[3,0],[13,0],[1,0],[2,0]]),function(){return it.join('\n').length;});
  var n0=latin1Str(pick(b,SONG_NOTE_PATH)),nh=n0.split('\\f0\\fs')[0];
  var note=nh+'\\f0\\fs48 \\cf2 '+en.map(esc).join(RTF_BR)+'}';
  b=edit(b,SONG_NOTE_PATH,function(){return latin1Bytes(note);});
  return b;
}
// blocks: da songBlocks().blocks. opts: {video: true/false}. Restituisce i byte del .pro
function buildSongFile(blocks,nome,opts){
  opts=opts||{};
  var T=tplSong(),lyric=T.cueOf(T.groupNamed('Verse 1',false),0),blank=T.cueOf(T.groupNamed('Tag',false),0),video=T.cueOf(0,0);
  var cuesOut=[],groupsOut=[];
  function addGroup(headerBytes,cues){
    var items=[{f:1,t:2,v:headerBytes}];
    cues.forEach(function(c){cuesOut.push(c);items.push({f:2,t:2,v:ser([{f:1,t:2,v:path(c,1,1)}])});});
    groupsOut.push(ser(items));
  }
  if(opts.video!==false){
    var vc=edit(remap(video),[[2,0]],function(){return te.encode('Sfondo 1.mov');});
    var h0=parse(parse(T.groups[0])[0].v).map(function(x){return x.f===1?{f:1,t:2,v:ser([{f:1,t:2,v:te.encode(uuid4())}])}:x;});
    addGroup(ser(h0),[vc]);
  }
  blocks.forEach(function(bl){
    var cs=bl.blank?[songCue(blank,null)]:bl.slides.map(function(sl){return songCue(lyric,sl);});
    addGroup(songHeader(T,bl),cs);
  });
  var out=[],ins=false;
  T.top.forEach(function(x){
    if(x.f===2)out.push({f:2,t:2,v:ser([{f:1,t:2,v:te.encode(uuid4())}])});
    else if(x.f===3)out.push({f:3,t:2,v:te.encode(nome)});
    else if(x.f===12){if(!ins){groupsOut.forEach(function(g){out.push({f:12,t:2,v:g});});cuesOut.forEach(function(c){out.push({f:13,t:2,v:c});});ins=true;}}
    else if(x.f===13){}
    else out.push(x);
  });
  return ser(out);
}

// ====================== rilettura finale della canzone ======================
function verifySongFile(bytes,blocks,opts){
  opts=opts||{};
  var problems=[],top=parse(bytes),groups=[],cues={};
  top.forEach(function(x){if(x.f===12)groups.push(x.v);if(x.f===13)cues[td.decode(path(x.v,1,1))]=x.v;});
  var first=opts.video!==false?1:0;
  if(groups.length!==blocks.length+first)return ['Il file ha '+groups.length+' gruppi, ne erano previsti '+(blocks.length+first)+'.'];
  var seen={};
  blocks.forEach(function(bl,i){
    var g=parse(groups[i+first]),hdr=parse(g[0].v),nm=hdr.filter(function(x){return x.f===2;})[0];
    if(!nm||td.decode(nm.v)!==bl.name)problems.push('Il gruppo '+(i+1)+' non si chiama "'+bl.name+'".');
    var refs=g.filter(function(x){return x.f===2;}).map(function(x){return td.decode(parse(x.v)[0].v);});
    var want=bl.blank?1:bl.slides.length;
    if(refs.length!==want){problems.push('"'+bl.name+'" ha '+refs.length+' slide, ne erano previste '+want+'.');return;}
    refs.forEach(function(id,j){
      var c=cues[id];if(!c){problems.push('Manca una slide di "'+bl.name+'".');return;}
      if(seen[id])problems.push('Una slide di "'+bl.name+'" è duplicata.');seen[id]=1;
      if(bl.blank)return;
      var sl=bl.slides[j];
      var it=tokens(rtfPlain(latin1Str(pick(c,SONG_IT_PATH.concat([[5,0]]))))),en=tokens(rtfPlain(latin1Str(pick(c,SONG_NOTE_PATH))));
      if(!sameTokens(it,tokens(sl.it.map(function(l){return l.toUpperCase();}).join(' '))))problems.push('Il testo italiano della slide '+(j+1)+' di "'+bl.name+'" non corrisponde.');
      if(!sameTokens(en,tokens(sl.en.join(' '))))problems.push('Il testo inglese della slide '+(j+1)+' di "'+bl.name+'" non corrisponde.');
    });
  });
  return problems;
}
