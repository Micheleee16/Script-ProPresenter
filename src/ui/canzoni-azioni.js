// ---------- azioni sulle sezioni ----------
function songEditApply(newLines){
  const G=state.song,m=G.model,ed=state.editing;
  if(!m||!ed)return;
  const info=ed.side==='it'?m.itInfo:m.enInfo,box=$(ed.side==='it'?'c-it':'c-en');
  pushUndo();
  box.value=editSongText(box.value.replace(/\r/g,''),info.lib,ed.key,ed.i,newLines);
  state.editing=null;state.done=null;
  analyzeSong();
}
function songEdit(act,btn){
  const ed=state.editing,box=btn.closest('.editor'),inp=box&&qs('.ed-in',box);
  if(act==='ed-cancel'){state.editing=null;renderSong();return;}
  if(!ed||!inp)return;
  const m=state.song.model,info=ed.side==='it'?m.itInfo:m.enInfo,old=info.lib[ed.key].lines[ed.i];
  if(act==='ed-merge'){
    const side=ed.side,boxT=$(side==='it'?'c-it':'c-en');
    pushUndo();
    boxT.value=mergeSongLines(boxT.value.replace(/\r/g,''),info.lib,ed.key,ed.i);
    state.editing=null;state.done=null;analyzeSong();return;
  }
  if(act==='ed-save'){
    const v=inp.value.replace(/\s+/g,' ').trim();
    if(!v){toast('La riga non può essere vuota');return;}
    if(v===old){state.editing=null;renderSong();return;}
    songEditApply([v]);
  }else if(act==='ed-split'){
    const pos=inp.selectionStart,a=inp.value.slice(0,pos).replace(/\s+/g,' ').trim(),b=inp.value.slice(pos).replace(/\s+/g,' ').trim();
    if(!a||!b){toast('Metti il cursore tra due parole');inp.focus();return;}
    songEditApply([a,b]);
  }
}
function songAct(act,id,btn){
  let G=state.song,m=G.model,idx=-1;
  G.order.forEach(function(o,i){if(o.id===id)idx=i;});
  if(idx<0||!m)return;
  const o=G.order[idx];
  pushUndo();
  if(act==='up'&&idx>0){G.order.splice(idx-1,2,G.order[idx],G.order[idx-1]);G.touched=true;}
  else if(act==='down'&&idx<G.order.length-1){G.order.splice(idx,2,G.order[idx+1],G.order[idx]);G.touched=true;}
  else if(act==='dup'){G.order.splice(idx+1,0,{id:'b'+(++G.uid),key:o.key});G.touched=true;}
  else if(act==='del'){G.order.splice(idx,1);G.touched=true;}
  state.done=null;renderSong();
}
function songFirstProblem(){
  const el=qs('#c-list .pc.err')||qs('#c-list .pc.has-warn')||qs('#c-info');
  if(el)el.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
  const pc=el&&el.classList&&el.classList.contains('pc')?el:null;if(pc)replay(pc,'flash');
}
function songOrderFromHeader(){
  const G=state.song,m=G.model;if(!m||!m.arrangement)return;
  const missing=[],order=[];
  m.arrangement.keys.forEach(function(k){
    if(!m.secs[k]){if(BLANK_TYPES[k.replace(/\d+$/,'')]){G.extra[k]=1;ensureSec(m,k);}else{if(missing.indexOf(k)<0)missing.push(k);return;}}
    order.push({id:'b'+(++G.uid),key:k});
  });
  pushUndo();G.order=order;G.touched=true;state.done=null;renderSong();
  if(missing.length)toast('Sezioni mancanti: '+missing.map(function(k){return secName(k.replace(/\d+$/,''),parseInt((k.match(/\d+$/)||[0])[0],10)||0);}).join(', ')+'.');
}
