// ---------- tema ----------
var TEMI=['auto','light','dark'];
function applyTheme(m){
  var root=document.documentElement,b=$('theme');
  if(m==='light'||m==='dark')root.setAttribute('data-theme',m);else root.removeAttribute('data-theme');
  b.innerHTML=ICON[m==='light'?'sun':(m==='dark'?'moon':'auto')];
  var lbl={auto:'Tema automatico',light:'Tema chiaro',dark:'Tema scuro'}[m];
  b.setAttribute('aria-label',lbl+'. Tocca per cambiare.');b.title=lbl;b.setAttribute('data-m',m);
}

// ---------- versetti o canzoni ----------
function setMode(m){
  state.mode=m;store('versi.modo',m==='canzoni'?'canzoni':null);
  qsa('.m-bibbia').forEach(function(el){el.hidden=m!=='bibbia';});
  qsa('.m-canzoni').forEach(function(el){el.hidden=m!=='canzoni';});
  $('tab-bibbia').setAttribute('aria-selected',m==='bibbia'?'true':'false');
  $('tab-canzoni').setAttribute('aria-selected',m==='canzoni'?'true':'false');
  $('hero-t').textContent=m==='canzoni'?'Canzoni':'Versetti';
  state.done=null;
  if(!state.nameTouched){
    var t=state.song.model&&state.song.model.title;
    $('nome').value=m==='canzoni'?(t?t+' - ITA + ENG':'Canzone - ITA + ENG'):defaultName();
  }
  if(m==='canzoni')analyzeSong();else analyze();
}
function bindModes(){
  var tabs=[$('tab-bibbia'),$('tab-canzoni')];
  $('tab-bibbia').addEventListener('click',function(){setMode('bibbia');});
  $('tab-canzoni').addEventListener('click',function(){setMode('canzoni');});
  tabs.forEach(function(t,i){
    t.addEventListener('keydown',function(e){
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
      e.preventDefault();var n=tabs[(i+1)%2];n.focus();n.click();
    });
  });
}

function firstProblem(){
  var el=qs('#plist .pc.err')||qs('#plist .pc.has-warn');
  if(el)goCard(el.parentNode.getAttribute('data-pid'));
}

function loadBibleFile(f){
  f.arrayBuffer().then(function(ab){return fileToText(f.name,new Uint8Array(ab));}).then(function(r){
    $('msg').value=r.text;analyze();
    toast('Caricato: '+f.name+(r.unknown&&r.unknown.length?'. Nel PDF ci sono lettere illeggibili.':''));
  }).catch(function(e){toast(f.name+': '+(e&&e.message||'non riesco a leggerlo'));});
}

// ---------- bozza ----------
function restoreDraft(d){
  var G=state.song;
  $('msg').value=d.msg||'';$('c-it').value=d.it||'';$('c-en').value=d.en||'';
  G.order=d.order||null;G.touched=!!d.touched;G.extra=d.extra||{};G.uid=d.uid||0;G.fix=d.fix||{it:[],en:[]};
  [['it',d.srcIt],['en',d.srcEn]].forEach(function(a){if(a[1]){$('src-'+a[0]).hidden=false;$('src-'+a[0]).textContent=a[1];}});
  if(d.nome){$('nome').value=d.nome;state.nameTouched=true;}
  var when=new Date(d.t).toLocaleString('it-IT',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  var what=d.mode==='canzoni'?(d.title||'Canzone'):'Versetti';
  $('resume-t').textContent='Ripreso: '+what+' · '+when;
  $('resume').hidden=false;
}
function bindResume(){
  $('resume-x').innerHTML=ICON.x;
  $('resume-x').addEventListener('click',function(){$('resume').hidden=true;});
  $('resume-no').addEventListener('click',function(){
    var G=state.song;
    store(DRAFT_KEY,null);
    $('msg').value='';$('c-it').value='';$('c-en').value='';
    $('src-it').hidden=true;$('src-en').hidden=true;
    G.order=null;G.touched=false;G.extra={};G.fix={it:[],en:[]};G.undo=[];state.editing=null;state.nameTouched=false;
    $('nome').value=state.mode==='canzoni'?'Canzone - ITA + ENG':defaultName();
    $('resume').hidden=true;
    if(state.mode==='canzoni')analyzeSong();else analyze();
  });
}
function bindMessage(){
  var tm=null,wrap=$('msgwrap'),dep=0;
  $('msg').addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(analyze,150);});
  $('clear').addEventListener('click',function(){$('msg').value='';state.ov={};analyze();$('msg').focus();});
  $('paste').addEventListener('click',function(){
    function fail(){$('msg').focus();toast('Premi '+(isMac()?'⌘V':'Ctrl+V')+' nel riquadro.');}
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(x){
        if(!x||!x.trim()){toast('Appunti vuoti.');return;}
        $('msg').value=x;analyze();$('msg').focus();
      }).catch(fail);
    }else fail();
  });
  $('bf-msg').addEventListener('change',function(e){var f=e.target.files[0];e.target.value='';if(f)loadBibleFile(f);});
  // un file trascinato sul riquadro viene letto
  function hasFiles(e){return e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0;}
  wrap.addEventListener('dragenter',function(e){if(!hasFiles(e))return;e.preventDefault();dep++;wrap.classList.add('drag');});
  wrap.addEventListener('dragover',function(e){if(hasFiles(e))e.preventDefault();});
  wrap.addEventListener('dragleave',function(){dep=Math.max(0,dep-1);if(!dep)wrap.classList.remove('drag');});
  wrap.addEventListener('drop',function(e){
    dep=0;wrap.classList.remove('drag');
    var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
    if(!f)return;
    e.preventDefault();
    loadBibleFile(f);
  });
}

function bindRules(){
  ['corto','max'].forEach(function(id){$(id).addEventListener('input',function(){saveRules();state.done=null;render();});});
  $('reset').addEventListener('click',function(){['corto','max'].forEach(function(k){$(k).value=DEFAULTS[k];});saveRules();state.done=null;render();});
}

function bindOutput(){
  $('plist').addEventListener('click',function(e){
    var rs=e.target.closest?e.target.closest('.pc-reset'):null;
    if(rs){
      var pid=parseInt(rs.closest('li').getAttribute('data-pid'),10),p=state.res&&state.res.passages.filter(function(x){return x.pid===pid;})[0];
      if(p){delete state.ov[ovKey(p)];state.done=null;render();}
      return;
    }
    var b=e.target.closest?e.target.closest('button.slide'):null;
    if(b)openViewer(parseInt(b.getAttribute('data-i'),10));
  });
  $('sum-go').addEventListener('click',firstProblem);
  $('ack').addEventListener('change',renderDock);
  $('nome').addEventListener('input',function(){state.nameTouched=true;state.done=null;renderDock();});
  $('dlbtn').addEventListener('click',function(){download(false);});
  $('dlpro').addEventListener('click',function(){download(true);});
  bindEdit();
  $('theme').addEventListener('click',function(){
    var cur=$('theme').getAttribute('data-m')||'auto',nx=TEMI[(TEMI.indexOf(cur)+1)%TEMI.length];
    applyTheme(nx);store('versi.tema',nx==='auto'?null:nx);
  });
}

// ---------- avvio ----------
(function(){
  $('vclose').innerHTML=ICON.x;$('vprev').innerHTML=ICON.left;$('vnext').innerHTML=ICON.right;
  qs('.i-down').innerHTML=ICON.down;qs('.i-spin').innerHTML=ICON.spin;qs('.i-ok').innerHTML=ICON.check;
  var m=store('versi.tema');applyTheme(m==='light'||m==='dark'?m:'auto');
  $('nome').value=defaultName();loadRules();
  window.addEventListener('dragover',function(e){e.preventDefault();});
  window.addEventListener('drop',function(e){e.preventDefault();});
  ['bg','sep'].forEach(bindSlot);
  bindMessage();bindRules();bindOutput();bindViewer();bindSong();bindModes();
  var topBar=$('top');
  function onScroll(){topBar.classList.toggle('scrolled',window.scrollY>4);}
  window.addEventListener('scroll',onScroll,{passive:true});onScroll();
  bindResume();
  var draft=draftLoad();
  if(draft)restoreDraft(draft);
  analyze();restoreImages();
  var startMode=draft?draft.mode:store('versi.modo');
  if(startMode==='canzoni')setMode('canzoni');
  else if(!draft&&window.matchMedia&&window.matchMedia('(hover:hover)').matches)$('msg').focus();
  window.__versi={readMessage:readMessage,group:group,buildPresentation:buildPresentation,analyze:analyze,makeZip:makeZip};
})();
