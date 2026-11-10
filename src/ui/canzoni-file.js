// ---------- file ----------
function readSongFile(f){
  return f.arrayBuffer().then(function(ab){return fileToText(f.name,new Uint8Array(ab));}).then(function(r){return {name:f.name,text:r.text,unknown:r.unknown};});
}
function songSetSource(side,r){
  const box=$(side==='it'?'c-it':'c-en'),src=$('src-'+side);
  if(box.value.trim())pushUndo();
  box.value=r.text;state.editing=null;
  src.hidden=false;src.textContent=r.name;
  state.song.fix[side]=r.unknown||[];
  analyzeSong();
  if((r.unknown||[]).length)setTimeout(function(){$('fx-'+side).scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});},150);
}
// più file insieme: si capisce quale è italiano e quale inglese
function loadSongFiles(files,side){
  files=Array.prototype.slice.call(files||[]);if(!files.length)return;
  Promise.all(files.map(function(f){return readSongFile(f).catch(function(e){toast(f.name+': '+(e&&e.message||'non riesco a leggerlo'));return null;});})).then(function(rs){
    rs=rs.filter(Boolean);if(!rs.length)return;
    if(rs.length===1){songSetSource(side,rs[0]);toast('Caricato: '+rs[0].name);return;}
    const used={};
    rs.forEach(function(r){r.lang=guessLang(r.text,r.name);});
    rs.forEach(function(r){if(r.lang&&!used[r.lang]){used[r.lang]=r;}});
    if(!used.it&&!used.en){toast('Non capisco quale è italiano e quale inglese: caricali uno alla volta.');return;}
    if(used.it)songSetSource('it',used.it);if(used.en)songSetSource('en',used.en);
    toast('Caricati italiano e inglese');
  });
}
// lettere del PDF che non si leggono: si mostrano le parole e una proposta da confermare
const FIX_MARK=/\{\?\d+\}/;
function songFixHtml(list){
  const rows=list.map(function(u,i){
    return '<div class="fx-row"><span class="fx-ctx">'+u.ctx.map(h).join(' · ')+'</span><span class="fx-arrow">→</span><input class="fx-in" type="text" data-i="'+i+'" value="'+h(u.suggest||'')+'" aria-label="Lettere al posto di '+h(u.mark)+'" spellcheck="false"><span class="fx-prev" data-i="'+i+'"></span></div>';
  }).join('');
  return '<b>Lettere del PDF da confermare</b>'+rows+'<div class="fx-act"><button type="button" class="btn small primary" data-act="fx-apply">Conferma</button></div>';
}
function songFixPreview(box,list){
  qsa('.fx-prev',box).forEach(function(sp){
    const i=parseInt(sp.getAttribute('data-i'),10),u=list[i],v=(qs('.fx-in[data-i="'+i+'"]',box)||{}).value||'';
    sp.textContent=u.ctx.slice(0,2).map(function(w){return w.split(u.mark).join(v);}).join(' · ');
  });
}
function songFixRender(side){
  const G=state.song,box=$('fx-'+side),text=$(side==='it'?'c-it':'c-en').value;
  const list=(G.fix[side]||[]).filter(function(u){return text.indexOf(u.mark)>=0;});
  G.fix[side]=list;
  box.hidden=!list.length;
  if(!list.length){box.innerHTML='';box._k='';return;}
  const k=JSON.stringify(list.map(function(u){return u.mark+u.ctx.join('')+u.suggest;}));
  if(box._k!==k){box._k=k;box.innerHTML=songFixHtml(list);}
  songFixPreview(box,list);
}
function songFixApply(side){
  let G=state.song,box=$('fx-'+side),list=G.fix[side]||[],boxText=$(side==='it'?'c-it':'c-en'),t=boxText.value;
  for(let i=0;i<list.length;i++){
    const v=((qs('.fx-in[data-i="'+i+'"]',box)||{}).value||'').trim();
    if(!v){toast('Scrivi le lettere per «'+list[i].ctx[0]+'»');return;}
  }
  pushUndo();
  list.forEach(function(u,i){const v=qs('.fx-in[data-i="'+i+'"]',box).value.trim();t=t.split(u.mark).join(v);});
  boxText.value=t;G.fix[side]=[];state.done=null;analyzeSong();
}
