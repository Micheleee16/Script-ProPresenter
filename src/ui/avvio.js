// ---------- tema ----------
var TEMI=['auto','light','dark'];
function applyTheme(m){
  var root=document.documentElement,b=$('theme');
  if(m==='light'||m==='dark')root.setAttribute('data-theme',m);else root.removeAttribute('data-theme');
  b.innerHTML=ICON[m==='light'?'sun':(m==='dark'?'moon':'auto')];
  var lbl={auto:'Tema automatico',light:'Tema chiaro',dark:'Tema scuro'}[m];
  b.setAttribute('aria-label',lbl+'. Tocca per cambiare.');b.title=lbl;b.setAttribute('data-m',m);
}

// ---------- punti di partenza ----------
function firstProblem(){
  var el=qs('#plist .pc.err')||qs('#plist .pc.has-warn');
  if(el){goCard(el.parentNode.getAttribute('data-pid'));return;}
  var s=$('s-img');s.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
}

function bindMessage(){
  var tm=null,wrap=$('msgwrap'),dep=0;
  $('msg').addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(analyze,150);});
  $('clear').addEventListener('click',function(){$('msg').value='';analyze();$('msg').focus();});
  $('paste').addEventListener('click',function(){
    function fail(){$('msg').focus();toast('Non posso leggere gli appunti da qui: clicca nel riquadro e premi '+(isMac()?'⌘V':'Ctrl+V')+'.');}
    if(navigator.clipboard&&navigator.clipboard.readText){
      navigator.clipboard.readText().then(function(x){
        if(!x||!x.trim()){toast('Gli appunti sono vuoti.');return;}
        $('msg').value=x;analyze();$('msg').focus();
      }).catch(fail);
    }else fail();
  });
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
    var t=e.target.closest?e.target.closest('.pc-t[aria-expanded]'):null;
    if(t){toggleCard(t.closest('li'));return;}
    var b=e.target.closest?e.target.closest('button.slide'):null;
    if(b)openViewer(parseInt(b.getAttribute('data-i'),10));
  });
  $('issues').addEventListener('click',function(e){
    var a=e.target.closest?e.target.closest('a'):null;if(!a)return;
    e.preventDefault();
    if(a.hasAttribute('data-pid'))goCard(a.getAttribute('data-pid'));
    else{var g=$(a.getAttribute('data-go'));if(g)g.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});}
  });
  $('sum-go').addEventListener('click',firstProblem);
  $('ack').addEventListener('change',renderDock);
  $('nome').addEventListener('input',function(){state.done=null;mark('m4','',4);stepState(4,'');renderDock();});
  $('dlbtn').addEventListener('click',function(){download(false);});
  $('dlpro').addEventListener('click',function(){download(true);});
  $('theme').addEventListener('click',function(){
    var cur=$('theme').getAttribute('data-m')||'auto',nx=TEMI[(TEMI.indexOf(cur)+1)%TEMI.length];
    applyTheme(nx);store('versi.tema',nx==='auto'?null:nx);
  });
}

// ---------- avvio ----------
(function(){
  $('hint-ic').innerHTML=ICON.message;$('paste-ic').innerHTML=ICON.paste;
  $('vclose').innerHTML=ICON.x;$('vprev').innerHTML=ICON.left;$('vnext').innerHTML=ICON.right;
  $('rm-bg').innerHTML=ICON.x;$('rm-sep').innerHTML=ICON.x;
  qs('.i-down').innerHTML=ICON.down;qs('.i-spin').innerHTML=ICON.spin;qs('.i-ok').innerHTML=ICON.check;
  $('rules-ic').innerHTML=ICON.sliders;$('rules-chev').innerHTML=ICON.chev;$('iss-chev').innerHTML=ICON.chev;
  var m=store('versi.tema');applyTheme(m==='light'||m==='dark'?m:'auto');
  $('nome').value=defaultName();loadRules();
  window.addEventListener('dragover',function(e){e.preventDefault();});
  window.addEventListener('drop',function(e){e.preventDefault();});
  ['bg','sep'].forEach(bindSlot);
  bindMessage();bindRules();bindOutput();bindViewer();
  paintSlot('bg');paintSlot('sep');
  analyze();restoreImages();
  if(window.matchMedia&&window.matchMedia('(hover:hover)').matches)$('msg').focus();
  window.__versi={readMessage:readMessage,group:group,buildPresentation:buildPresentation,analyze:analyze,makeZip:makeZip};
})();
