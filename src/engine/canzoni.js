
// ====================== canzoni: lettura dei testi ======================
// Si leggono due testi (italiano e inglese), ciascuno diviso in sezioni (Verse 1, Chorus, Bridge…).
// Non si traduce e non si corregge niente: si riordinano solo le righe ricevute.
const SEC_TYPES={verse:'Verse',prechorus:'PreChorus',chorus:'Chorus',bridge:'Bridge',outro:'Outro',intro:'Intro',inst:'Instrumental',tag:'Tag'};
const SEC_WORDS={intro:'intro',verse:'verse',strofa:'verse',prechorus:'prechorus',preritornello:'prechorus',chorus:'chorus',ritornello:'chorus',inciso:'chorus',bridge:'bridge',ponte:'bridge',outro:'outro',ending:'outro',finale:'outro',interlude:'inst',instrumental:'inst',strumentale:'inst',inst:'inst',tag:'tag'};
const SEC_HEAD=/^(intro|verse|strofa|pre[\s-]?chorus|pre[\s-]?ritornello|chorus|ritornello|inciso|bridge|ponte|outro|ending|finale|interlude|instrumental|strumentale|inst|tag)\s*(\d+)?\s*(?:[×x*]\s*(\d+))?\s*(?:[:\-–—]\s*(.*))?$/i;
const CHORD_TOK=/^(?:[A-G](?:#|b)?(?:maj|Maj|MAJ|min|Min|dim|aug|sus|add|m|M)?\d*(?:\/[A-G](?:#|b)?)?)+$/;

// Una riga di soli accordi (EsusD, C#MajB, G D Em C): non è testo da cantare.
function isChordLine(l){
  const t=l.trim().split(/\s+/);
  if(!t.length||t.length>8||l.length>60)return false;
  return t.every(function(x){return CHORD_TOK.test(x)&&(x.length<=2||/[#\d\/]|(?:[A-G])b|sus|maj|Maj|MAJ|min|Min|dim|aug|add|m/.test(x));});
}
function secName(type,n){return type==='verse'?'Verse '+(n||1):SEC_TYPES[type]+(n?' '+n:'');}
function sectionHeader(line){
  const m=line.trim().match(SEC_HEAD);
  if(!m)return null;
  const rest=m[4];
  if(rest&&!isChordLine(rest)&&!/^\(?\s*[×x*]\s*\d+\s*\)?$/i.test(rest))return null;
  const type=SEC_WORDS[m[1].toLowerCase().replace(/[\s-]+/g,'')]||'verse';
  const n=m[2]?parseInt(m[2],10):(type==='verse'?1:0);
  return {type:type,n:n,key:type+(n||''),name:secName(type,n),count:m[3]?parseInt(m[3],10):1};
}
// Sigle dell'ordine: Intro, V1, PC, C×2, Inst, B×3, Outro×2…
const ARR_TOK=/^(intro|inst|interlude|instrumental|outro|ending|tag|pc|pre-?chorus|c|chorus|b|bridge|v\s*\d+|verse\s*\d*)(?:\s*[×x*]\s*(\d+))?$/i;
function arrToken(t){
  const m=t.trim().match(ARR_TOK);if(!m)return null;
  let w=m[1].toLowerCase().replace(/\s+/g,''),type,n=0;
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
function arrList(src){
  const toks=src.split(/\s*,\s*/);
  if(toks.length<3)return null;
  const list=[];
  for(let i=0;i<toks.length;i++){const t=arrToken(toks[i]);if(!t)return null;for(let r=0;r<t.count;r++)list.push(t.key);}
  return list;
}
// Una riga con l'ordine ("Intro, V1, PC, C×2…"), anche preceduta dal titolo ("Taste and See - Intro, V1, …")
function arrangementOf(l){
  let re=/\s*[-–—]\s+/g,m,cands=[{prefix:'',src:l}];
  while((m=re.exec(l)))cands.push({prefix:l.slice(0,m.index),src:l.slice(m.index+m[0].length)});
  for(let i=0;i<cands.length;i++){const k=arrList(cands[i].src);if(k)return {src:cands[i].src.trim(),prefix:cands[i].prefix.trim(),keys:k};}
  return null;
}
function cleanTitle(l){return l.split(/\s+[–—-]\s+|\s*\[/)[0].trim();}
function sameLines(a,b){
  const f=function(x){return x.map(function(s){return s.replace(/\s+/g,' ').trim().toLowerCase();}).join('\n');};
  return f(a)===f(b);
}

// Legge un testo: titolo, ordine indicato (se c'è), sezioni nell'ordine in cui compaiono,
// righe di accordi tolte, righe che non appartengono a nessuna sezione.
function parseSongText(raw,lang){
  let title='',arr=null,occ=[],cur=null,chords=[],strays=[],warns=[];
  // una riga con l'ordine può andare a capo (succede nei PDF): "… B×2," e poi "Outro×2"
  const rows=raw.replace(/\r/g,'').split('\n').map(function(t,i){return {t:t.replace(/\u00a0/g,' ').trim(),idx:i};});
  for(let r=0;r<rows.length-1;r++){
    if(!/,$/.test(rows[r].t))continue;
    let nx=r+1;while(nx<rows.length&&!rows[nx].t)nx++;
    if(nx<rows.length&&arrangementOf(rows[r].t+' '+rows[nx].t)){rows[r].t+=' '+rows[nx].t;rows[nx].t='';}
  }
  rows.forEach(function(row){
    const l=row.t,idx=row.idx;
    if(!l)return;
    if(/^\d{1,3}$/.test(l))return;                         // numero di pagina
    const a=arrangementOf(l);
    if(a){if(!arr)arr=a;if(!title&&a.prefix)title=cleanTitle(a.prefix);return;}
    if(/^\[[^\]]*\]$/.test(l))return;                      // [VIVE WORSHIP]
    const h=sectionHeader(l);
    if(h){cur={type:h.type,n:h.n,key:h.key,name:h.name,count:h.count,lines:[],src:[]};occ.push(cur);return;}
    if(isChordLine(l)){chords.push(l);return;}
    if(!cur){if(!title)title=cleanTitle(l);else strays.push(l);return;}
    cur.lines.push(l);cur.src.push(idx);
  });
  const lib={},order=[];
  occ.forEach(function(o){
    const s=lib[o.key];
    if(!s)lib[o.key]={key:o.key,type:o.type,name:o.name,lines:o.lines.slice(),srcs:[o.src]};
    else if(o.lines.length){
      if(!s.lines.length){s.lines=o.lines.slice();s.srcs=[o.src];}
      else if(sameLines(s.lines,o.lines))s.srcs.push(o.src);
      else warns.push(lang+': "'+o.name+'" compare più volte con testo diverso. Uso la prima volta.');
    }
    for(let r=0;r<o.count;r++)order.push(o.key);
  });
  return {title:title,arrangement:arr,lib:lib,order:order,chords:chords,strays:strays,warns:warns};
}

// ====================== abbinamento delle righe ======================
// Una "slide" è un gruppo di righe italiane con il gruppo di righe inglesi che le traduce.
// itJ[i] = true: la riga i e la i+1 stanno nella stessa slide (lo stesso per enJ).
function cumFrac(lines){
  let tot=0,c=[],s=0;lines.forEach(function(l){tot+=l.length+1;});
  lines.forEach(function(l){s+=l.length+1;c.push(s/tot);});
  return c;
}
// Proposta iniziale: righe in pari numero = una slide per riga. Altrimenti si uniscono righe
// del lato più lungo (in proporzione alla lunghezza del testo) fino ad avere lo stesso numero di slide.
function defaultJoins(itL,enL){
  let n=itL.length,m=enL.length,itJ=[],enJ=[],i;
  for(i=0;i<n-1;i++)itJ.push(false);
  for(i=0;i<m-1;i++)enJ.push(false);
  if(!n||!m||n===m)return {itJ:itJ,enJ:enJ};
  let lg=n>m?itL:enL,sh=n>m?enL:itL,J=n>m?itJ:enJ,k=sh.length,cl=cumFrac(lg),cs=cumFrac(sh),splits=[],last=-1;
  for(let j=0;j<k-1;j++){
    let best=-1,bd=9,maxI=lg.length-2-(k-2-j);
    for(i=last+1;i<=maxI;i++){const d=Math.abs(cl[i]-cs[j]);if(d<bd){bd=d;best=i;}}
    splits.push(best);last=best;
  }
  for(i=0;i<lg.length-1;i++)J[i]=splits.indexOf(i)<0;
  return {itJ:itJ,enJ:enJ};
}
function chunksOf(lines,joins){
  let out=[],cur=[];
  lines.forEach(function(l,i){cur.push(l);if(!joins[i]||i===lines.length-1){out.push(cur);cur=[];}});
  return out;
}

// Mette insieme i due testi: sezioni con le righe italiane e inglesi e l'ordine iniziale.
// L'ordine iniziale è quello del testo inglese (ripetizioni comprese); se manca, quello italiano.
function makeSong(it,en){
  const secs={},keys=[],warns=it.warns.concat(en.warns);
  function add(k){if(keys.indexOf(k)<0)keys.push(k);}
  en.order.forEach(add);it.order.forEach(add);
  keys.forEach(function(k){
    const a=it.lib[k],b=en.lib[k],base=a||b,j=defaultJoins(a?a.lines:[],b?b.lines:[]);
    secs[k]={key:k,type:base.type,name:base.name,it:a?a.lines.slice():[],en:b?b.lines.slice():[],hasIt:!!a,hasEn:!!b,itJ:j.itJ,enJ:j.enJ};
  });
  const order=en.order.length?en.order.slice():it.order.slice();
  return {title:en.title||it.title,secs:secs,order:order,arrangement:en.arrangement||it.arrangement,chords:en.chords.concat(it.chords),strays:en.strays.concat(it.strays),warns:warns};
}
// Le slide di una sezione, oppure il motivo per cui non si può farle.
// Ogni slide ha UNA riga italiana. Se le righe sono in pari numero, ognuna ha la sua riga inglese.
// Se non lo sono, l'abbinamento è una proposta (in proporzione alla lunghezza) e si segna dove le righe
// non corrispondono: in quel caso una riga inglese che ne traduce più d'una italiane è ripetuta nelle note di ognuna.
function sectionSlides(s){
  if(!s.it.length&&!s.en.length)return {blank:true,slides:[],groups:[],mismatch:[],counts:[0,0],error:null};
  if(!s.hasIt||!s.it.length)return {slides:[],groups:[],mismatch:[],counts:[s.it.length,s.en.length],error:'Manca il testo italiano di "'+s.name+'".'};
  if(!s.hasEn||!s.en.length)return {slides:[],groups:[],mismatch:[],counts:[s.it.length,s.en.length],error:'Manca il testo inglese di "'+s.name+'".'};
  let j=defaultJoins(s.it,s.en),a=chunksOf(s.it,j.itJ),b=chunksOf(s.en,j.enJ),groups=[],slides=[],ia=0,ib=0;
  a.forEach(function(c,i){
    groups.push({it:c,en:b[i],itFrom:ia+1,itTo:ia+c.length,enFrom:ib+1,enTo:ib+b[i].length});
    c.forEach(function(l){slides.push({it:[l],en:b[i]});});
    ia+=c.length;ib+=b[i].length;
  });
  return {slides:slides,groups:groups,mismatch:groups.filter(function(g){return g.it.length!==g.en.length;}),counts:[s.it.length,s.en.length],error:null};
}
// I blocchi della canzone, pronti per costruire il file (o con l'elenco degli errori).
function songBlocks(song){
  const blocks=[],errors=[];
  song.order.forEach(function(k,i){
    const s=song.secs[k];
    if(!s){errors.push('La sezione "'+k+'" non esiste.');return;}
    const r=sectionSlides(s);
    if(r.error)errors.push(r.error);
    blocks.push({key:k,name:s.name,type:s.type,blank:!!r.blank,slides:r.slides,error:r.error});
  });
  return {blocks:blocks,errors:errors.filter(function(e,i,a){return a.indexOf(e)===i;})};
}
// Quante righe italiane entrano in una slide: la casella è alta due righe, circa 26 lettere ciascuna.
function slideFit(itLines){
  let rows=0;itLines.forEach(function(l){rows+=Math.max(1,Math.ceil(l.length/26));});
  return rows;
}

// Sostituisce nel testo la riga j di una sezione (in tutte le copie uguali) con una o più righe nuove:
// serve per correggere una parola o per spezzare una riga in due, direttamente dalla tabella.
// lib = la libreria di parseSongText del testo; raw = il testo da cui è stata letta (senza \r).
function editSongText(raw,lib,key,j,newLines){
  const s=lib[key];if(!s||!s.srcs)return raw;
  const lines=raw.split('\n'),old=s.lines[j],clean=function(x){return (x||'').replace(/\u00a0/g,' ').trim();},at=[];
  s.srcs.forEach(function(src){if(src[j]!==undefined&&clean(lines[src[j]])===clean(old))at.push(src[j]);});
  at.sort(function(a,b){return b-a;});
  at.forEach(function(i){Array.prototype.splice.apply(lines,[i,1].concat(newLines));});
  return lines.join('\n');
}

// Unisce la riga j di una sezione con la successiva (in tutte le copie uguali): serve quando una riga
// è stata spezzata di troppo, per far tornare i conti con l'altra lingua.
function mergeSongLines(raw,lib,key,j){
  const s=lib[key];if(!s||!s.srcs||j+1>=s.lines.length)return raw;
  const lines=raw.split('\n'),clean=function(x){return (x||'').replace(/\u00a0/g,' ').trim();},at=[];
  s.srcs.forEach(function(src){
    if(src[j]!==undefined&&src[j+1]!==undefined&&clean(lines[src[j]])===clean(s.lines[j])&&clean(lines[src[j+1]])===clean(s.lines[j+1]))at.push([src[j],src[j+1]]);
  });
  at.sort(function(x,y){return y[0]-x[0];});
  at.forEach(function(p){lines[p[0]]=clean(lines[p[0]])+' '+clean(lines[p[1]]);lines.splice(p[1],1);});
  return lines.join('\n');
}

