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
  $('lead').textContent=m==='canzoni'?'Incolla il testo italiano e quello inglese di una canzone e scarica le slide per ProPresenter.':'Incolla il messaggio del pastore e scarica le slide dei versetti per ProPresenter.';
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

function bindMessage(){
  var tm=null,wrap=$('msgwrap'),dep=0;
  $('msg').addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(analyze,150);});
  $('clear').addEventListener('click',function(){$('msg').value='';state.ov={};analyze();$('msg').focus();});
  $('paste').addEventListener('click',function(){
    function fail(){$('msg').focus();toast('Non posso leggere gli appunti da qui: clicca nel riquadro e premi '+(isMac()?'⌘V':'Ctrl+V')+'.');}
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(x){
        if(!x||!x.trim()){toast('Gli appunti sono vuoti.');return;}
        $('msg').value=x;analyze();$('msg').focus();
      }).catch(fail);
    }else fail();
  });
  // un file di testo trascinato sul riquadro viene letto
  function hasFiles(e){return e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0;}
  wrap.addEventListener('dragenter',function(e){if(!hasFiles(e))return;e.preventDefault();dep++;wrap.classList.add('drag');});
  wrap.addEventListener('dragover',function(e){if(hasFiles(e))e.preventDefault();});
  wrap.addEventListener('dragleave',function(){dep=Math.max(0,dep-1);if(!dep)wrap.classList.remove('drag');});
  wrap.addEventListener('drop',function(e){
    dep=0;wrap.classList.remove('drag');
    var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
    if(!f)return;
    e.preventDefault();
    if(!/^text\//.test(f.type)&&!/\.txt$/i.test(f.name)){toast('Trascina un file di testo (.txt), oppure incolla il messaggio.');return;}
    f.text().then(function(t){$('msg').value=t;analyze();});
  });
}

function bindRules(){
  ['corto','max','lungo'].forEach(function(id){$(id).addEventListener('input',function(){saveRules();state.done=null;render();});});
  $('reset').addEventListener('click',function(){['corto','max','lungo'].forEach(function(k){$(k).value=DEFAULTS[k];});saveRules();state.done=null;render();});
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
  analyze();restoreImages();
  if(store('versi.modo')==='canzoni')setMode('canzoni');
  else if(window.matchMedia&&window.matchMedia('(hover:hover)').matches)$('msg').focus();
  window.__versi={readMessage:readMessage,group:group,buildPresentation:buildPresentation,analyze:analyze,makeZip:makeZip};
})();
