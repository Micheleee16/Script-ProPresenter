function analyze(){
  state.done=null;
  var raw=$('msg').value;
  state.res=raw.trim()?readMessage(raw):null;
  paintCount();render();
}
function paintCount(){
  var c=$('count'),r=state.res;
  if(!r){c.textContent='Nessun testo incollato';c.className='count';return;}
  var tot=r.passages.length+r.errs.length;
  if(!tot){c.textContent='Non riconosco nessun passo biblico';c.className='count bad';return;}
  c.textContent=pl(tot,'passo riconosciuto','passi riconosciuti')+(r.errs.length?', '+pl(r.errs.length,'con errore','con errori'):'');
  c.className='count '+(r.errs.length?'bad':'ok');
}

function render(){
  var r=state.res,rl=rules(),out=$('out'),bgOn=!!state.img.bg,sepOn=!!state.img.sep;
  $('slot-bg').classList.toggle('miss',!!r&&!bgOn);$('slot-sep').classList.toggle('miss',!!r&&!sepOn);
  state.flat=[];
  if(!r){
    out.innerHTML=emptyState();
    state.counts={err:0,warn:0,slides:0,passages:0};
    mark('m1','',1);mark('m2',bgOn&&sepOn?'done':'',2);mark('m3','',3);mark('m4','',4);
    renderDock();return;
  }
  var items=[],pidKnown={};
  r.passages.forEach(function(p){pidKnown[p.pid]=true;});
  r.errs.forEach(function(x){items.push({k:'e',ref:x.ref,msg:x.msg});});
  if(!bgOn)items.push({k:'w',ref:'Sfondo dei versetti',msg:'Manca: le slide verranno create senza sfondo.'});
  if(!sepOn)items.push({k:'w',ref:'Immagine tra i passi',msg:r.passages.length>1?'Manca: non ho inserito le slide di separazione tra i passi.':'Manca. Serve solo se i passi sono più di uno.'});
  [['bg','Sfondo dei versetti'],['sep','Immagine tra i passi']].forEach(function(a){var im=state.img[a[0]];if(im&&Math.abs(im.w/im.h-16/9)>0.02)items.push({k:'w',ref:a[1],msg:'Misura '+im.w+'×'+im.h+', non 16:9: sullo schermo potrebbe essere tagliata o deformata.'});});
  r.warns.forEach(function(x){items.push({k:'w',ref:x.ref,msg:x.msg,pid:x.pid});});
  var nslide=0,warnByPid={},html='';
  r.passages.forEach(function(p,pi){
    var g=group(p.verses,rl.corto,rl.max);nslide+=g.length;
    var slides='';
    g.forEach(function(sl){
      var idx=state.flat.length;state.flat.push({sl:sl,label:p.label});
      var t=slideLen(sl);
      if(t>rl.lungo)items.push({k:'w',ref:p.book+' '+p.chap+':'+sl[0][0]+(sl.length>1?'-'+sl[sl.length-1][0]:''),msg:'La slide è lunga ('+t+' caratteri): controlla che il testo entri nello schermo.',pid:p.pid});
      slides+=slideMarkup(sl,p.label,rl,'button',idx);
    });
    p.__g=g.length;p.__slides=slides;
  });
  items.forEach(function(x){if(x.k==='w'&&x.pid!==undefined)warnByPid[x.pid]=(warnByPid[x.pid]||0)+1;});
  var nErr=items.filter(function(x){return x.k==='e';}).length,nWarn=items.length-nErr;
  state.counts={err:nErr,warn:nWarn,slides:nslide,passages:r.passages.length};
  // riepilogo
  var cls=nErr?'err':(nWarn?'warn':'ok'),icon=nErr?ICON.err:(nWarn?ICON.warn:ICON.ok);
  var title=nErr?'Ci sono errori da correggere':(nWarn?'Controlla questi punti prima di scaricare':'Tutto a posto');
  var summary=r.passages.length?pl(r.passages.length,'passo pronto','passi pronti')+', '+pl(nslide,'slide','slide')+'.':'Nessun passo può essere incluso.';
  var sub=nErr?(summary+' '+(nErr===1?'Un passo è escluso':nErr+' passi sono esclusi')+' dalla presentazione. Correggi il messaggio a sinistra: la pagina si aggiorna da sola.'):summary;
  html+='<div class="banner '+cls+'" role="status"><span class="ic">'+icon+'</span><div><h3>'+title+'</h3><p>'+h(sub)+'</p>';
  if(items.length){
    html+='<ul class="issues">';
    items.slice().sort(function(a,b){return a.k===b.k?0:(a.k==='e'?-1:1);}).forEach(function(x){
      html+='<li class="'+x.k+'">'+(x.k==='e'?ICON.err:ICON.warn)+'<span><b>'+h(x.ref)+'.</b> '+h(x.msg)+(x.pid!==undefined&&pidKnown[x.pid]?' <a href="#p-'+x.pid+'">Vai al passo</a>':'')+'</span></li>';
    });
    html+='</ul>';
  }
  html+='</div></div>';
  // passi e slide
  r.passages.forEach(function(p,pi){
    if(pi>0)html+=sepOn?'<div class="sep"><span class="t" style="background-image:url('+state.img.sep.url+')"></span>Immagine tra i passi<hr></div>':'<div class="sep none"><span class="t"></span>Qui andrebbe l\'immagine tra i passi, ma manca<hr></div>';
    html+='<article class="passage" id="p-'+p.pid+'"><div class="ph"><h3>'+h(p.label)+'</h3><span class="meta">'+pl(p.verses.length,'versetto','versetti')+' in '+pl(p.__g,'slide','slide')+'</span>'+(warnByPid[p.pid]?'<span class="chip warn">Da controllare</span>':'')+'</div><div class="slides">'+p.__slides+'</div></article>';
  });
  if(r.ignored.length)html+='<details class="ignored"><summary>Ho ignorato '+pl(r.ignored.length,'messaggio','messaggi')+' senza riferimenti biblici</summary><ul>'+r.ignored.map(function(m){return '<li>'+h(m)+'</li>';}).join('')+'</ul></details>';
  out.innerHTML=html;
  mark('m1',nErr||!r.passages.length?'bad':'done',1);
  mark('m2',bgOn&&sepOn?'done':'attn',2);
  mark('m3',nErr?'bad':(nWarn?'attn':'done'),3);
  mark('m4',state.done?'done':'',4);
  renderDock();
}

function renderDock(){
  var r=state.res,btn=$('dlbtn'),st=$('dlstatus'),aw=$('ackwrap'),c=state.counts,anyImg=!!(state.img.bg||state.img.sep);
  $('dlsub').textContent=anyImg?'Presentazione con le immagini (.probundle)':'Presentazione (.pro)';
  $('dlpro').hidden=!anyImg;
  function say(cls,icon,txt){st.className='status '+cls;st.innerHTML=(icon?icon:'')+h(txt);}
  if(!r){btn.disabled=true;aw.hidden=true;say('','','Incolla un messaggio per poter scaricare.');return;}
  if(!c.passages){btn.disabled=true;aw.hidden=true;say('bad',ICON.err,r.errs.length?'Nessun passo può essere scaricato: correggi gli errori qui sopra.':'Non ho riconosciuto nessun passo. Scrivi il riferimento, per esempio «Romani 6:5-11», seguito dai versetti.');return;}
  aw.hidden=!c.err;
  if(c.err)$('acktext').textContent=c.err===1?'Ho letto l\'errore: scarica gli altri passi, senza quello escluso.':'Ho letto gli errori: scarica gli altri passi, senza i '+c.err+' esclusi.';
  btn.disabled=!!c.err&&!$('ack').checked;
  if(state.done){say('ok',ICON.ok,'Scaricato: '+state.done+'. Ora trascinalo in ProPresenter.');return;}
  if(c.err&&!$('ack').checked)say('bad',ICON.err,'Spunta la casella per scaricare senza il passo con errore.');
  else if(c.warn)say('warn',ICON.warn,pl(c.warn,'punto da controllare','punti da controllare')+' prima di scaricare.');
  else say('ok',ICON.ok,'Pronto: '+pl(c.passages,'passo','passi')+', '+pl(c.slides,'slide','slide')+'.');
}

