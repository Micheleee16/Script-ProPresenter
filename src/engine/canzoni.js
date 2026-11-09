
// ====================== canzoni: lettura dei testi ======================
// Si leggono due testi (italiano e inglese), ciascuno diviso in sezioni (Verse 1, Chorus, Bridge…).
// Non si traduce e non si corregge niente: si riordinano solo le righe ricevute.
var SEC_TYPES={verse:'Verse',prechorus:'PreChorus',chorus:'Chorus',bridge:'Bridge',outro:'Outro',intro:'Intro',inst:'Instrumental',tag:'Tag'};
var SEC_WORDS={intro:'intro',verse:'verse',strofa:'verse',prechorus:'prechorus',preritornello:'prechorus',chorus:'chorus',ritornello:'chorus',inciso:'chorus',bridge:'bridge',ponte:'bridge',outro:'outro',ending:'outro',finale:'outro',interlude:'inst',instrumental:'inst',strumentale:'inst',inst:'inst',tag:'tag'};
var SEC_HEAD=/^(intro|verse|strofa|pre[\s-]?chorus|pre[\s-]?ritornello|chorus|ritornello|inciso|bridge|ponte|outro|ending|finale|interlude|instrumental|strumentale|inst|tag)\s*(\d+)?\s*(?:[×x*]\s*(\d+))?\s*(?:[:\-–—]\s*(.*))?$/i;
var CHORD_TOK=/^(?:[A-G](?:#|b)?(?:maj|Maj|MAJ|min|Min|dim|aug|sus|add|m|M)?\d*(?:\/[A-G](?:#|b)?)?)+$/;

// Una riga di soli accordi (EsusD, C#MajB, G D Em C): non è testo da cantare.
function isChordLine(l){
  var t=l.trim().split(/\s+/);
  if(!t.length||t.length>8||l.length>60)return false;
  return t.every(function(x){return CHORD_TOK.test(x)&&(x.length<=2||/[#\d\/]|(?:[A-G])b|sus|maj|Maj|MAJ|min|Min|dim|aug|add|m/.test(x));});
}
function secName(type,n){return type==='verse'?'Verse '+(n||1):SEC_TYPES[type]+(n?' '+n:'');}
function sectionHeader(line){
  var m=line.trim().match(SEC_HEAD);
  if(!m)return null;
  var rest=m[4];
  if(rest&&!isChordLine(rest)&&!/^\(?\s*[×x*]\s*\d+\s*\)?$/i.test(rest))return null;
  var type=SEC_WORDS[m[1].toLowerCase().replace(/[\s-]+/g,'')]||'verse';
  var n=m[2]?parseInt(m[2],10):(type==='verse'?1:0);
  return {type:type,n:n,key:type+(n||''),name:secName(type,n),count:m[3]?parseInt(m[3],10):1};
}
// Sigle dell'ordine: Intro, V1, PC, C×2, Inst, B×3, Outro×2…
var ARR_TOK=/^(intro|inst|interlude|instrumental|outro|ending|tag|pc|pre-?chorus|c|chorus|b|bridge|v\s*\d+|verse\s*\d*)(?:\s*[×x*]\s*(\d+))?$/i;
function arrToken(t){
  var m=t.trim().match(ARR_TOK);if(!m)return null;
  var w=m[1].toLowerCase().replace(/\s+/g,''),type,n=0;
  if(/^v(erse)?\d*$/.test(w)){type='verse';n=parseInt(w.replace(/\D/g,''),10)||1;}
  else if(w==='pc'||/^pre-?chorus$/.test(w))type='prechorus';
  else if(w==='c'||w==='chorus')type='chorus';
  else if(w==='b'||w==='bridge')type='bridge';
  else if(w==='outro'||w==='ending')type='outro';
  else if(w==='intro')type='intro';
  else if(w==='tag')type='tag';
  else type='inst';
  return {key:type+(n||''),count:m[2]?parseInt(m[2],10):1};
}
function arrangementOf(l){
  var parts=l.split(/\s[-–—]\s/),src=parts.length>1?parts[parts.length-1]:l,prefix=parts.length>1?parts.slice(0,-1).join(' - '):'';
  var toks=src.split(/\s*,\s*/);
  if(toks.length<3)return null;
  var list=[];
  for(var i=0;i<toks.length;i++){var a=arrToken(toks[i]);if(!a)return null;for(var r=0;r<a.count;r++)list.push(a.key);}
  return {src:src.trim(),prefix:prefix,keys:list};
}
function cleanTitle(l){return l.split(/\s+[–—-]\s+|\s*\[/)[0].trim();}
function sameLines(a,b){
  var f=function(x){return x.map(function(s){return s.replace(/\s+/g,' ').trim().toLowerCase();}).join('\n');};
  return f(a)===f(b);
}

// Legge un testo: titolo, ordine indicato (se c'è), sezioni nell'ordine in cui compaiono,
// righe di accordi tolte, righe che non appartengono a nessuna sezione.
function parseSongText(raw,lang){
  var title='',arr=null,occ=[],cur=null,chords=[],strays=[],warns=[];
  raw.replace(/\r/g,'').split('\n').forEach(function(l0,idx){
    var l=l0.replace(/ /g,' ').trim();
    if(!l)return;
    if(/^\d{1,3}$/.test(l))return;                         // numero di pagina
    var a=arrangementOf(l);
    if(a){if(!arr)arr=a;if(!title&&a.prefix)title=cleanTitle(a.prefix);return;}
    if(/^\[[^\]]*\]$/.test(l))return;                      // [VIVE WORSHIP]
    var h=sectionHeader(l);
    if(h){cur={type:h.type,n:h.n,key:h.key,name:h.name,count:h.count,lines:[],src:[]};occ.push(cur);return;}
    if(isChordLine(l)){chords.push(l);return;}
    if(!cur){if(!title)title=cleanTitle(l);else strays.push(l);return;}
    cur.lines.push(l);cur.src.push(idx);
  });
  var lib={},order=[];
  occ.forEach(function(o){
    var s=lib[o.key];
    if(!s)lib[o.key]={key:o.key,type:o.type,name:o.name,lines:o.lines.slice(),srcs:[o.src]};
    else if(o.lines.length){
      if(!s.lines.length){s.lines=o.lines.slice();s.srcs=[o.src];}
      else if(sameLines(s.lines,o.lines))s.srcs.push(o.src);
      else warns.push(lang+': "'+o.name+'" compare più volte con testo diverso. Uso la prima volta.');
    }
    for(var r=0;r<o.count;r++)order.push(o.key);
  });
  return {title:title,arrangement:arr,lib:lib,order:order,chords:chords,strays:strays,warns:warns};
}

// ====================== abbinamento delle righe ======================
// Una "slide" è un gruppo di righe italiane con il gruppo di righe inglesi che le traduce.
// itJ[i] = true: la riga i e la i+1 stanno nella stessa slide (lo stesso per enJ).
function cumFrac(lines){
  var tot=0,c=[],s=0;lines.forEach(function(l){tot+=l.length+1;});
  lines.forEach(function(l){s+=l.length+1;c.push(s/tot);});
  return c;
}
// Proposta iniziale: righe in pari numero = una slide per riga. Altrimenti si uniscono righe
// del lato più lungo (in proporzione alla lunghezza del testo) fino ad avere lo stesso numero di slide.
function defaultJoins(itL,enL){
  var n=itL.length,m=enL.length,itJ=[],enJ=[],i;
  for(i=0;i<n-1;i++)itJ.push(false);
  for(i=0;i<m-1;i++)enJ.push(false);
  if(!n||!m||n===m)return {itJ:itJ,enJ:enJ};
  var lg=n>m?itL:enL,sh=n>m?enL:itL,J=n>m?itJ:enJ,k=sh.length,cl=cumFrac(lg),cs=cumFrac(sh),splits=[],last=-1;
  for(var j=0;j<k-1;j++){
    var best=-1,bd=9,maxI=lg.length-2-(k-2-j);
    for(i=last+1;i<=maxI;i++){var d=Math.abs(cl[i]-cs[j]);if(d<bd){bd=d;best=i;}}
    splits.push(best);last=best;
  }
  for(i=0;i<lg.length-1;i++)J[i]=splits.indexOf(i)<0;
  return {itJ:itJ,enJ:enJ};
}
function chunksOf(lines,joins){
  var out=[],cur=[];
  lines.forEach(function(l,i){cur.push(l);if(!joins[i]||i===lines.length-1){out.push(cur);cur=[];}});
  return out;
}

// Mette insieme i due testi: sezioni con le righe italiane e inglesi e l'ordine iniziale.
// L'ordine iniziale è quello del testo inglese (ripetizioni comprese); se manca, quello italiano.
function makeSong(it,en){
  var secs={},keys=[],warns=it.warns.concat(en.warns);
  function add(k){if(keys.indexOf(k)<0)keys.push(k);}
  en.order.forEach(add);it.order.forEach(add);
  keys.forEach(function(k){
    var a=it.lib[k],b=en.lib[k],base=a||b,j=defaultJoins(a?a.lines:[],b?b.lines:[]);
    secs[k]={key:k,type:base.type,name:base.name,it:a?a.lines.slice():[],en:b?b.lines.slice():[],hasIt:!!a,hasEn:!!b,itJ:j.itJ,enJ:j.enJ};
  });
  var order=en.order.length?en.order.slice():it.order.slice();
  return {title:en.title||it.title,secs:secs,order:order,arrangement:en.arrangement||it.arrangement,chords:en.chords.concat(it.chords),strays:en.strays.concat(it.strays),warns:warns};
}
// Le slide di una sezione, oppure il motivo per cui non si può farle.
// Ogni slide ha UNA riga italiana. Se una riga inglese traduce più righe italiane, le slide
// di quelle righe hanno la stessa riga inglese nelle note.
function sectionSlides(s){
  if(!s.it.length&&!s.en.length)return {blank:true,slides:[],error:null};
  if(!s.hasIt||!s.it.length)return {slides:[],error:'Manca il testo italiano di "'+s.name+'".'};
  if(!s.hasEn||!s.en.length)return {slides:[],error:'Manca il testo inglese di "'+s.name+'".'};
  var a=chunksOf(s.it,s.itJ),b=chunksOf(s.en,s.enJ);
  if(a.length!==b.length)return {slides:[],error:'"'+s.name+'": ci sono '+a.length+' gruppi di righe italiane e '+b.length+' di righe inglesi. Devono essere uguali: unisci o separa le righe.',counts:[a.length,b.length]};
  var out=[];
  a.forEach(function(c,i){c.forEach(function(l){out.push({it:[l],en:b[i]});});});
  return {slides:out,error:null};
}
// I blocchi della canzone, pronti per costruire il file (o con l'elenco degli errori).
function songBlocks(song){
  var blocks=[],errors=[];
  song.order.forEach(function(k,i){
    var s=song.secs[k];
    if(!s){errors.push('La sezione "'+k+'" non esiste.');return;}
    var r=sectionSlides(s);
    if(r.error)errors.push(r.error);
    blocks.push({key:k,name:s.name,type:s.type,blank:!!r.blank,slides:r.slides,error:r.error});
  });
  return {blocks:blocks,errors:errors.filter(function(e,i,a){return a.indexOf(e)===i;})};
}
// Quante righe italiane entrano in una slide: la casella è alta due righe, circa 26 lettere ciascuna.
function slideFit(itLines){
  var rows=0;itLines.forEach(function(l){rows+=Math.max(1,Math.ceil(l.length/26));});
  return rows;
}

// Sostituisce nel testo la riga j di una sezione (in tutte le copie uguali) con una o più righe nuove:
// serve per correggere una parola o per spezzare una riga in due, direttamente dalla tabella.
// lib = la libreria di parseSongText del testo; raw = il testo da cui è stata letta (senza \r).
function editSongText(raw,lib,key,j,newLines){
  var s=lib[key];if(!s||!s.srcs)return raw;
  var lines=raw.split('\n'),old=s.lines[j],clean=function(x){return (x||'').replace(/\u00a0/g,' ').trim();},at=[];
  s.srcs.forEach(function(src){if(src[j]!==undefined&&clean(lines[src[j]])===clean(old))at.push(src[j]);});
  at.sort(function(a,b){return b-a;});
  at.forEach(function(i){Array.prototype.splice.apply(lines,[i,1].concat(newLines));});
  return lines.join('\n');
}
