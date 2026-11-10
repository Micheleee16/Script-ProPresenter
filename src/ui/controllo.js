function analyze(){
  state.done=null;
  var raw=$('msg').value;
  state.res=raw.trim()?readMessage(raw):null;
  $('msgwrap').classList.toggle('has-text',!!raw.trim());
  paintCount();render();
  draftQueue();
}

function paintCount(){
  var c=$('count'),r=state.res,txt,cls;
  if(!r){txt='';cls='count';}
  else{
    var tot=r.passages.length+r.errs.length;
    if(!tot){txt='Nessun passo riconosciuto';cls='count bad';}
    else{txt=pl(tot,'passo','passi')+(r.errs.length?' · '+pl(r.errs.length,'con errore','con errori'):'');cls='count '+(r.errs.length?'bad':'ok');}
  }
  var changed=c.textContent!==txt;
  c.textContent=txt;c.className=cls;
  if(changed&&r)replay(c,'bump');
}

// Aggiorna l'elenco dei passi senza ricrearlo: le schede già presenti restano com'erano
// (stato aperto/chiuso compreso) e solo quelle nuove entrano con l'animazione.
function reconcile(list,items,prefix){
  var old={};
  Array.prototype.slice.call(list.children).forEach(function(el){old[el.getAttribute('data-key')]=el;});
  var els=items.map(function(it,i){
    var el=old[it.key];
    if(el){
      delete old[it.key];
      if(el.getAttribute('data-sig')!==it.sig){el.innerHTML=it.html;el.setAttribute('data-sig',it.sig);}
    }else{
      el=document.createElement('li');
      el.className='pitem enter';
      el.setAttribute('data-key',it.key);el.setAttribute('data-sig',it.sig);
      el.style.setProperty('--d',Math.min(i,6)*70+'ms');
      el.innerHTML=it.html;
      (function(e){setTimeout(function(){e.classList.remove('enter');},1900);})(el);
    }
    el.setAttribute('data-pid',it.pid);el.id=(prefix||'p-')+it.pid;
    return el;
  });
  Object.keys(old).forEach(function(k){old[k].remove();});
  var cur=list.firstElementChild;
  els.forEach(function(el){if(el===cur)cur=cur.nextElementSibling;else list.insertBefore(el,cur);});
}
function goCard(pid){
  var el=$('p-'+pid);if(!el)return;
  el.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
  replay(qs('.pc',el),'flash');
}

function render(){
  var r=state.res,rl=rules(),bgOn=!!state.img.bg,sepOn=!!state.img.sep,plist=$('plist');
  plist.classList.toggle('bg-on',bgOn);
  plist.style.setProperty('--bgimg',bgOn?'url("'+state.img.bg.url+'")':'none');
  plist.style.setProperty('--sepimg',sepOn?'url("'+state.img.sep.url+'")':'none');
  state.flat=[];
  $('empty').hidden=!!r;$('review').hidden=!r;
  paintSlot('bg');paintSlot('sep');
  if(!r){
    reconcile(plist,[]);
    state.counts={err:0,warn:0,slides:0,passages:0};
    renderDock();return;
  }

  var byPid={},order=[];
  r.warns.forEach(function(w){(byPid[w.pid]=byPid[w.pid]||[]).push(w);});
  r.passages.forEach(function(p){order.push({pid:p.pid,p:p});});
  r.errs.forEach(function(e){order.push({pid:e.pid,e:e});});
  order.sort(function(a,b){return a.pid-b.pid;});

  var items=[],occ={},nslide=0,ip=0,nWarn=0;
  order.forEach(function(o){
    if(o.e){
      var ek='E|'+o.e.ref;occ[ek]=(occ[ek]||0)+1;
      items.push({key:ek+'#'+occ[ek],sig:'E'+hash(o.e.msg),pid:o.pid,html:cardHtml({err:true,ref:o.e.ref,msg:o.e.msg})});
      return;
    }
    var p=o.p;p.ov=state.ov[ovKey(p)];
    var g=groupWith(p.verses,rl.corto,rl.max,p.ov),notes=[],slides='';
    (byPid[p.pid]||[]).forEach(function(w){notes.push({k:'w',msg:w.msg});});
    g.forEach(function(sl,k){
      var t=slideLen(sl),first=sl[0][0],last=sl[sl.length-1][0],ref=p.book+' '+p.chap+':'+first+(sl.length>1?'-'+last:'');
      if(t>rl.lungo)notes.push({k:'w',msg:'Slide '+ref+': lunga ('+t+' caratteri)'});
      slides+=slideMarkup(sl,p.label,rl,'button',k);
      state.flat.push({sl:sl,label:p.label,pid:p.pid,p:p});
    });
    nslide+=g.length;nWarn+=notes.length;
    var c={label:p.label,verses:p.verses.length,slides:g.length,notes:notes,slidesHtml:slides,sepBefore:ip>0,sepOn:sepOn,edited:!!p.ov};
    var sig=hash(rl.corto+'|'+rl.max+'|'+rl.lungo+'|'+(ip>0?1:0)+(sepOn?1:0)+'|'+JSON.stringify(p.verses)+'|'+JSON.stringify(notes)+'|'+JSON.stringify(p.ov||{}));
    var pk=p.label;occ[pk]=(occ[pk]||0)+1;
    items.push({key:pk+'#'+occ[pk],sig:sig,pid:p.pid,html:cardHtml(c)});
    ip++;
  });
  reconcile(plist,items);
  qsa('button.slide',plist).forEach(function(b,i){b.setAttribute('data-i',i);});

  var nErr=r.errs.length;
  state.counts={err:nErr,warn:nWarn,slides:nslide,passages:r.passages.length};

  // ---- una sola riga di riepilogo ----
  var st=nErr?'err':(nWarn?'warn':'ok'),sum=$('sum'),sic=$('sum-ic');
  if(sum.getAttribute('data-state')!==st||!sic.innerHTML){
    sum.setAttribute('data-state',st);
    sic.innerHTML=st==='ok'?ICON.check:(st==='warn'?ICON.warn:ICON.err);
    replay(sic,'pop');
  }
  var head=r.passages.length?pl(r.passages.length,'passo','passi')+' · '+pl(nslide,'slide','slide'):'Nessun passo incluso';
  var more=nErr?(nErr===1?'1 passo con errore: escluso':nErr+' passi con errore: esclusi'):(nWarn?pl(nWarn,'punto','punti')+' da controllare':'Tutto a posto');
  $('sum-t').textContent=head;$('sum-p').textContent=more;
  var go=$('sum-go');go.hidden=!(nErr||nWarn);go.textContent=nErr?'Vai all\'errore':'Vai al primo';

  // ---- messaggi scartati ----
  $('ign').hidden=!r.ignored.length;
  $('ign-s').textContent=pl(r.ignored.length,'messaggio ignorato','messaggi ignorati');
  $('ign-l').innerHTML=r.ignored.map(function(m){return '<li>'+h(m)+'</li>';}).join('');
  renderDock();
}

function renderDock(){
  if(state.mode==='canzoni')return renderDockSong();
  var r=state.res,btn=$('dlbtn'),st=$('dlstatus'),aw=$('ackwrap'),c=state.counts,anyImg=!!(state.img.bg||state.img.sep);
  function say(cls,icon,txt){
    var key=cls+'|'+txt;
    if(st._k===key)return;st._k=key;
    st.className='status '+(cls||'');st.innerHTML=(icon||'')+'<span>'+h(txt)+'</span>';
  }
  var s=state.busy?'work':(state.done?'done':'idle');
  btn.setAttribute('data-state',s);
  qs('.dl-t',btn).textContent=s==='work'?'Preparo…':(s==='done'?'Scaricato':'Scarica');
  $('dlpro').hidden=!(anyImg&&r&&c.passages);
  if(!r){btn.disabled=true;aw.hidden=true;say('','','');return;}
  if(!c.passages){
    btn.disabled=true;aw.hidden=true;
    say('bad',ICON.err,r.errs.length?'Correggi gli errori per scaricare.':'Nessun passo riconosciuto.');
    return;
  }
  aw.hidden=!c.err;
  if(c.err)$('acktext').textContent=c.err===1?'Scarica senza il passo con errore':'Scarica senza i '+c.err+' passi con errore';
  btn.disabled=(!!c.err&&!$('ack').checked)||state.busy;
  if(state.done){say('ok',ICON.check,(state.verified?'Scaricato e controllato':'Scaricato')+'. Trascinalo in ProPresenter.');return;}
  if(c.err&&!$('ack').checked){say('','','');return;}   // l'interruttore sopra spiega già cosa fare
  if(c.warn)say('warn',ICON.warn,pl(c.warn,'punto','punti')+' da controllare');
  else say('ok',ICON.check,'Pronto');
}
