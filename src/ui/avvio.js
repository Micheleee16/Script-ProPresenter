// ---------- collegamenti ----------
$('nome').value=defaultName();loadRules();
var tm=null;
$('msg').addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(analyze,150);});
['corto','max','lungo'].forEach(function(id){$(id).addEventListener('input',function(){saveRules();state.done=null;render();});});
$('reset').addEventListener('click',function(){['corto','max','lungo'].forEach(function(k){$(k).value=DEFAULTS[k];});saveRules();state.done=null;render();});
$('ack').addEventListener('change',renderDock);
$('nome').addEventListener('input',function(){state.done=null;mark('m4','',4);renderDock();});
$('dlbtn').addEventListener('click',function(){download(false);});
$('dlpro').addEventListener('click',function(){download(true);});
$('clear').addEventListener('click',function(){$('msg').value='';analyze();$('msg').focus();});
$('paste').addEventListener('click',function(){
  function fail(){$('msg').focus();var c=$('count');c.textContent='Non riesco a leggere gli appunti: clicca nel riquadro e premi Cmd+V.';c.className='count bad';}
  if(navigator.clipboard&&navigator.clipboard.readText){navigator.clipboard.readText().then(function(x){$('msg').value=x;analyze();$('msg').focus();}).catch(fail);}else fail();
});
paintSlot('bg');paintSlot('sep');analyze();
$('msg').focus();
window.__versi={readMessage:readMessage,group:group,buildPresentation:buildPresentation,analyze:analyze,makeZip:makeZip};
