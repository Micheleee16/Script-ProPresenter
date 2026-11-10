// ---------- controlli prima di scaricare ----------
// Un elenco unico, nella barra in basso: cosa è a posto (✓), cosa conviene guardare (⚠), cosa blocca (✗),
// e le scelte neutre (•), come l'assenza dello sfondo.
function checkItems(){
  const items=[],c=state.counts;
  const add=(k,t)=>items.push({k:k,t:t});
  if(state.mode==='canzoni'){
    const v=state.song.view;
    if(!v||!v.blocks.length)return items;
    v.errors.forEach((e)=>add('err',e));
    if(!v.errors.length)add('ok',pl(v.blocks.length,'sezione','sezioni')+' · '+pl(v.slides,'slide','slide'));
    if(v.nMis)add('warn',v.nMis===1?'1 sezione con righe italiane e inglesi non in pari':v.nMis+' sezioni con righe italiane e inglesi non in pari');
    const other=v.nWarn-v.nMis;
    if(other>0)add('warn',pl(other,'altro punto','altri punti')+' da guardare nell\'elenco');
    if(!v.nWarn&&!v.errors.length)add('ok','Righe italiane e inglesi in pari, nessun avviso');
    add('info',$('c-video').checked?'Video di sfondo: '+($('c-vname').value||'senza nome'):'Nessun video di sfondo');
    add('info','File: '+nome()+'.pro');
    return items;
  }
  const r=state.res;
  if(!r)return items;
  if(c.err)add('err',pl(c.err,'passo con errore','passi con errore')+': '+(c.err===1?'sarà escluso':'saranno esclusi'));
  if(c.passages)add('ok',pl(c.passages,'passo','passi')+' · '+pl(c.slides,'slide','slide'));
  else add('err','Nessun passo riconosciuto');
  if(c.passages){
    if(r.warns.length)add('warn',pl(r.warns.length,'avviso','avvisi')+' sul testo: controlla l\'inizio dei versetti');
    else add('ok','Nessun testo perso o dubbio');
    if(state.nFit)add('warn',pl(state.nFit,'slide','slide')+(state.nFit===1?' non entra':' non entrano')+' nel riquadro (stima)');
    else add('ok','Tutte le slide entrano nel riquadro (stima)');
    add('info',state.img.bg?'Sfondo: '+state.img.bg.name:'Slide senza sfondo');
    if(c.passages>1)add('info',state.img.sep?'Stacco tra i passi: '+state.img.sep.name:'Nessuno stacco tra i passi');
    add('info','File: '+nome()+'.pro');
  }
  return items;
}
function renderChecks(){
  const box=$('checks'),items=checkItems();
  box.hidden=!items.length;
  if(!items.length)return;
  const nErr=items.filter((i)=>i.k==='err').length,nWarn=items.filter((i)=>i.k==='warn').length;
  const sum=nErr?pl(nErr,'blocco','blocchi'):(nWarn?pl(nWarn,'punto','punti')+' da controllare':'tutto a posto');
  box.setAttribute('data-state',nErr?'err':(nWarn?'warn':'ok'));
  $('checks-s').textContent='Controlli prima di scaricare · '+sum;
  const icon={ok:ICON.check,warn:ICON.warn,err:ICON.err,info:'<span class="dot" aria-hidden="true"></span>'};
  const label={ok:'A posto: ',warn:'Da controllare: ',err:'Blocca: ',info:''};
  $('checks-l').innerHTML=items.map((i)=>'<li class="ck-'+i.k+'">'+icon[i.k]+'<span><span class="sr">'+label[i.k]+'</span>'+h(i.t)+'</span></li>').join('');
}
