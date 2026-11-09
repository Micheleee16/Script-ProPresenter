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
  if(!r){txt='Nessun testo incollato';cls='chip';}
  else{
    var tot=r.passages.length+r.errs.length;
    if(!tot){txt='Non riconosco nessun passo biblico';cls='chip bad';}
    else{txt=pl(tot,'passo riconosciuto','passi riconosciuti')+(r.errs.length?', '+pl(r.errs.length,'con errore','con errori'):'');cls='chip '+(r.errs.length?'bad':'ok');}
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
      if(t>rl.lungo)notes.push({k:'w',msg:'La slide '+ref+' è lunga ('+t+' caratteri): controlla che il testo entri nello schermo.'});
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
  var head=r.passages.length?pl(r.passages.length,'passo','passi')+', '+pl(nslide,'slide','slide'):'Nessun passo può essere incluso';
  var more=nErr?(nErr===1?'Un passo ha un errore e non sarà nella presentazione. Correggilo nel messaggio: la pagina si aggiorna da sola.':nErr+' passi hanno un errore e non saranno nella presentazione. Correggili nel messaggio: la pagina si aggiorna da sola.')
    :(nWarn?pl(nWarn,'punto da controllare','punti da controllare')+', segnati in giallo qui sotto.':'Tutto a posto. Tutto il testo dei versetti è nelle slide.');
  $('sum-t').textContent=head;$('sum-p').textContent=more;
  var go=$('sum-go');go.hidden=!(nErr||nWarn);go.textContent=nErr?'Vai all\'errore':'Vai al primo';
  $('rev-sub').hidden=!r.passages.length;

  // ---- messaggi scartati ----
  $('ign').hidden=!r.ignored.length;
  $('ign-s').textContent='Ho ignorato '+pl(r.ignored.length,'messaggio','messaggi')+' senza riferimenti biblici';
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
  if(!r){btn.disabled=true;aw.hidden=true;say('','','Incolla un messaggio per poter scaricare.');return;}
  if(!c.passages){
    btn.disabled=true;aw.hidden=true;
    say('bad',ICON.err,r.errs.length?'Nessun passo può essere scaricato: correggi gli errori qui sopra.':'Non ho riconosciuto nessun passo. Scrivi il riferimento, per esempio «Romani 6:5-11», seguito dai versetti.');
    return;
  }
  aw.hidden=!c.err;
  if(c.err)$('acktext').textContent=c.err===1?'Ho letto l\'errore: scarica gli altri passi, senza quello escluso.':'Ho letto gli errori: scarica gli altri passi, senza i '+c.err+' esclusi.';
  btn.disabled=(!!c.err&&!$('ack').checked)||state.busy;
  if(state.done){say('ok',ICON.check,'Scaricato: '+state.done+'. '+(state.verified?'Ho riletto il file: ogni slide contiene il testo previsto. ':'')+'Ora trascinalo in ProPresenter.');return;}
  if(c.err&&!$('ack').checked){say('','','');return;}   // l'interruttore sopra spiega già cosa fare
  var what=pl(c.passages,'passo','passi')+', '+pl(c.slides,'slide','slide');
  if(c.warn)say('warn',ICON.warn,'Pronto: '+what+'. '+pl(c.warn,'punto','punti')+' da controllare.');
  else say('ok',ICON.check,'Pronto: '+what+'.');
}
