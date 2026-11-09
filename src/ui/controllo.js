function analyze(){
  state.done=null;
  var raw=$('msg').value;
  state.res=raw.trim()?readMessage(raw):null;
  $('msgwrap').classList.toggle('has-text',!!raw.trim());
  paintCount();render();
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
function reconcile(list,items){
  var old={};
  Array.prototype.slice.call(list.children).forEach(function(el){old[el.getAttribute('data-key')]=el;});
  var els=items.map(function(it,i){
    var el=old[it.key];
    if(el){
      delete old[it.key];
      if(el.getAttribute('data-sig')!==it.sig){el.innerHTML=it.html;el.setAttribute('data-sig',it.sig);applyCollapsed(el);}
    }else{
      el=document.createElement('li');
      el.className='pitem enter';
      el.setAttribute('data-key',it.key);el.setAttribute('data-sig',it.sig);
      el.style.setProperty('--d',Math.min(i,6)*70+'ms');
      el.innerHTML=it.html;
      (function(e){setTimeout(function(){e.classList.remove('enter');},1900);})(el);
    }
    el.setAttribute('data-pid',it.pid);el.id='p-'+it.pid;
    return el;
  });
  Object.keys(old).forEach(function(k){old[k].remove();});
  var cur=list.firstElementChild;
  els.forEach(function(el){if(el===cur)cur=cur.nextElementSibling;else list.insertBefore(el,cur);});
}
function applyCollapsed(el){
  var pc=qs('.pc',el),btn=qs('.pc-t[aria-expanded]',el);
  if(pc&&el.getAttribute('data-c')==='1'){pc.classList.add('collapsed');if(btn)btn.setAttribute('aria-expanded','false');}
}
function toggleCard(el,open){
  var pc=qs('.pc',el),btn=qs('.pc-t[aria-expanded]',el);if(!pc||!btn)return;
  var collapse=open===undefined?!pc.classList.contains('collapsed'):!open;
  pc.classList.toggle('collapsed',collapse);btn.setAttribute('aria-expanded',collapse?'false':'true');
  el.setAttribute('data-c',collapse?'1':'0');
}
function goCard(pid){
  var el=$('p-'+pid);if(!el)return;
  toggleCard(el,true);
  var pc=qs('.pc',el);
  el.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
  replay(pc,'flash');
}

function render(){
  var r=state.res,rl=rules(),bgOn=!!state.img.bg,sepOn=!!state.img.sep,plist=$('plist');
  plist.classList.toggle('bg-on',bgOn);
  plist.style.setProperty('--bgimg',bgOn?'url("'+state.img.bg.url+'")':'none');
  plist.style.setProperty('--sepimg',sepOn?'url("'+state.img.sep.url+'")':'none');
  state.flat=[];
  $('empty').hidden=!!r;$('review').hidden=!r;
  var sepNeeded=!!r&&r.passages.length>1;
  $('slot-bg').classList.toggle('miss',!!r&&!bgOn);
  $('slot-sep').classList.toggle('miss',sepNeeded&&!sepOn);
  if(!r){
    reconcile(plist,[]);
    state.counts={err:0,warn:0,slides:0,passages:0};state.issuesSeen=false;
    $('rev-sub').textContent='Appena incolli il messaggio vedi qui l\'anteprima, con lo sfondo vero.';
    mark('m1','',1);mark('m2',bgOn&&sepOn?'done':'',2);mark('m3','',3);mark('m4','',4);
    stepState(1,'');stepState(2,bgOn&&sepOn?'done':'');stepState(3,'');stepState(4,'');
    renderDock();return;
  }

  // ---- punti da controllare ----
  var global=[],cardIssues=[],byPid={},order=[];
  if(!bgOn)global.push({k:'w',ref:'Sfondo dei versetti',msg:'Manca: le slide verranno create senza sfondo.',go:'s-img'});
  if(sepNeeded&&!sepOn)global.push({k:'w',ref:'Immagine tra i passi',msg:'Manca: non ho inserito le slide di separazione tra i passi.',go:'s-img'});
  [['bg','Sfondo dei versetti'],['sep','Immagine tra i passi']].forEach(function(a){
    var im=state.img[a[0]];
    if(im&&Math.abs(im.w/im.h-16/9)>0.02)global.push({k:'w',ref:a[1],msg:'Misura '+im.w+'×'+im.h+', non 16:9: sullo schermo potrebbe essere tagliata o deformata.',go:'s-img'});
  });
  r.warns.forEach(function(w){(byPid[w.pid]=byPid[w.pid]||[]).push(w);});
  r.passages.forEach(function(p){order.push({pid:p.pid,p:p});});
  r.errs.forEach(function(e){order.push({pid:e.pid,e:e});});
  order.sort(function(a,b){return a.pid-b.pid;});

  // ---- schede ----
  var items=[],occ={},nslide=0,ip=0;
  order.forEach(function(o){
    var c,sig;
    if(o.e){
      c={err:true,ref:o.e.ref,msg:o.e.msg};
      cardIssues.push({k:'e',ref:o.e.ref,msg:o.e.msg,pid:o.pid});
      sig='E'+hash(o.e.msg);
      var ek='E|'+o.e.ref;occ[ek]=(occ[ek]||0)+1;
      items.push({key:ek+'#'+occ[ek],sig:sig,pid:o.pid,html:cardHtml(c)});
      return;
    }
    var p=o.p,g=group(p.verses,rl.corto,rl.max),notes=[],slides='';
    (byPid[p.pid]||[]).forEach(function(w){notes.push({k:'w',msg:w.msg});cardIssues.push({k:'w',ref:w.ref,msg:w.msg,pid:p.pid});});
    g.forEach(function(sl,k){
      var t=slideLen(sl),first=sl[0][0],last=sl[sl.length-1][0],ref=p.book+' '+p.chap+':'+first+(sl.length>1?'-'+last:'');
      if(t>rl.lungo){
        var m='La slide è lunga ('+t+' caratteri): controlla che il testo entri nello schermo.';
        notes.push({k:'w',msg:ref+': '+m});cardIssues.push({k:'w',ref:ref,msg:m,pid:p.pid});
      }
      slides+=slideMarkup(sl,p.label,rl,'button',k);
      state.flat.push({sl:sl,label:p.label,pid:p.pid});
    });
    nslide+=g.length;
    c={label:p.label,verses:p.verses.length,slides:g.length,notes:notes,slidesHtml:slides,sepBefore:ip>0,sepOn:sepOn};
    sig=hash(rl.corto+'|'+rl.max+'|'+rl.lungo+'|'+(ip>0?1:0)+(sepOn?1:0)+'|'+JSON.stringify(p.verses)+'|'+JSON.stringify(notes));
    var pk=p.label;occ[pk]=(occ[pk]||0)+1;
    items.push({key:pk+'#'+occ[pk],sig:sig,pid:p.pid,html:cardHtml(c)});
    ip++;
  });
  reconcile(plist,items);
  // le slide ricordano la loro posizione nell'elenco, per l'ingrandimento
  qsa('button.slide',plist).forEach(function(b,i){b.setAttribute('data-i',i);});

  var all=cardIssues.filter(function(x){return x.k==='e';}).concat(global,cardIssues.filter(function(x){return x.k==='w';}));
  var nErr=r.errs.length,nWarn=all.length-nErr;
  state.counts={err:nErr,warn:nWarn,slides:nslide,passages:r.passages.length};

  // ---- riepilogo ----
  var st=nErr?'err':(nWarn?'warn':'ok'),sum=$('sum'),sic=$('sum-ic');
  if(sum.getAttribute('data-state')!==st||!sic.innerHTML){
    sum.setAttribute('data-state',st);
    sic.innerHTML=st==='ok'?ICON.check:(st==='warn'?ICON.warn:ICON.err);
    replay(sic,'pop');
  }
  var summary=r.passages.length?pl(r.passages.length,'passo pronto','passi pronti')+', '+pl(nslide,'slide','slide')+'.':'Nessun passo può essere incluso.';
  $('sum-t').textContent=nErr?'Ci sono errori da correggere':(nWarn?'Controlla questi punti prima di scaricare':'Tutto a posto');
  $('sum-p').textContent=nErr?(summary+' '+(nErr===1?'Un passo è escluso':nErr+' passi sono esclusi')+' dalla presentazione. Correggi il messaggio a sinistra: la pagina si aggiorna da sola.'):summary;
  tween($('st-p'),r.passages.length);tween($('st-s'),nslide);tween($('st-w'),nErr+nWarn);
  $('st-p').parentNode.firstElementChild.textContent=r.passages.length===1?'passo':'passi';
  $('st-w').parentNode.firstElementChild.textContent=(nErr+nWarn)===1?'avviso':'avvisi';
  $('sum-go').hidden=!all.length;
  $('rev-sub').textContent=r.passages.length?'Tocca una slide per ingrandirla. Le schede si possono chiudere.':'Nessuna slide da mostrare.';

  // ---- elenco dei punti ----
  var issd=$('issd');
  issd.hidden=!all.length;
  if(all.length){
    $('iss-n').textContent=pl(all.length,'punto da controllare','punti da controllare');
    $('issues').innerHTML=all.map(function(x){
      var link=x.pid!==undefined?' <a href="#p-'+x.pid+'" data-pid="'+x.pid+'">Vai al passo</a>':(x.go?' <a href="#'+x.go+'" data-go="'+x.go+'">Vai alle immagini</a>':'');
      return '<li class="'+x.k+'">'+(x.k==='e'?ICON.err:ICON.warn)+'<span><b>'+h(x.ref)+'.</b> '+h(x.msg)+link+'</span></li>';
    }).join('');
    if(!state.issuesSeen){issd.open=false;state.issuesSeen=true;}
  }else state.issuesSeen=false;

  // ---- messaggi scartati ----
  $('ign').hidden=!r.ignored.length;
  $('ign-s').textContent='Ho ignorato '+pl(r.ignored.length,'messaggio','messaggi')+' senza riferimenti biblici';
  $('ign-l').innerHTML=r.ignored.map(function(m){return '<li>'+h(m)+'</li>';}).join('');

  // ---- passi in alto ----
  var s1=nErr||!r.passages.length?'bad':'done',s2=bgOn&&sepOn?'done':'attn',s3=nErr?'bad':(nWarn?'attn':'done');
  mark('m1',s1,1);mark('m2',s2,2);mark('m3',s3,3);mark('m4',state.done?'done':'',4);
  stepState(1,s1);stepState(2,s2);stepState(3,s3);stepState(4,state.done?'done':'');
  renderDock();
}

function renderDock(){
  var r=state.res,btn=$('dlbtn'),st=$('dlstatus'),aw=$('ackwrap'),c=state.counts,anyImg=!!(state.img.bg||state.img.sep);
  $('dlsub').textContent=anyImg?'Si scarica un .probundle, con le immagini dentro.':'Si scarica un .pro, senza immagini.';
  $('dlpro').hidden=!anyImg;
  function say(cls,icon,txt){
    var key=cls+'|'+txt;
    if(st._k===key)return;st._k=key;
    st.className='status '+(cls||'');st.innerHTML=(icon||'')+'<span>'+h(txt)+'</span>';
  }
  var s=state.busy?'work':(state.done?'done':'idle');
  btn.setAttribute('data-state',s);
  qs('.dl-t',btn).textContent=s==='work'?'Preparo…':(s==='done'?'Scaricato':'Scarica');
  if(!r){btn.disabled=true;aw.hidden=true;say('','','Incolla un messaggio per poter scaricare.');return;}
  if(!c.passages){
    btn.disabled=true;aw.hidden=true;
    say('bad',ICON.err,r.errs.length?'Nessun passo può essere scaricato: correggi gli errori qui sopra.':'Non ho riconosciuto nessun passo. Scrivi il riferimento, per esempio «Romani 6:5-11», seguito dai versetti.');
    return;
  }
  aw.hidden=!c.err;
  if(c.err)$('acktext').textContent=c.err===1?'Ho letto l\'errore: scarica gli altri passi, senza quello escluso.':'Ho letto gli errori: scarica gli altri passi, senza i '+c.err+' esclusi.';
  btn.disabled=(!!c.err&&!$('ack').checked)||state.busy;
  if(state.done){say('ok',ICON.check,'Scaricato: '+state.done+'. Ora trascinalo in ProPresenter.');return;}
  if(c.err&&!$('ack').checked)say('bad',ICON.err,'Spunta l\'interruttore per scaricare senza il passo con errore.');
  else if(c.warn)say('warn',ICON.warn,pl(c.warn,'punto da controllare','punti da controllare')+' prima di scaricare.');
  else say('ok',ICON.check,'Pronto: '+pl(c.passages,'passo','passi')+', '+pl(c.slides,'slide','slide')+'.');
}
