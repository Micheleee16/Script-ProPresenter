// ---------- immagini ----------
function uniqueNames(){var a=state.img.bg,b=state.img.sep;if(a&&b&&a.name===b.name){var m=b.name.match(/^(.*?)(\.[^.]*)?$/);b.name=m[1]+'_2'+(m[2]||'');}}
function paintSlot(k){
  var im=state.img[k],th=$('th-'+k),fn=$('fn-'+k),sl=$('slot-'+k);
  if(im){th.style.backgroundImage='url('+im.url+')';th.textContent='';fn.textContent=im.name+' ('+im.w+'×'+im.h+')';$('rm-'+k).hidden=false;sl.classList.add('filled');$('lt-'+k).textContent='Cambia immagine';}
  else{th.style.backgroundImage='';th.textContent='nessuna immagine';fn.textContent=EMPTYTXT[k];$('rm-'+k).hidden=true;sl.classList.remove('filled');$('lt-'+k).textContent='Scegli immagine';}
}
function setImage(kind,file){
  if(!file)return;
  file.arrayBuffer().then(function(ab){
    var bytes=new Uint8Array(ab),url=URL.createObjectURL(new Blob([bytes],{type:file.type||'image/png'})),img=new Image();
    img.onload=function(){
      var old=state.img[kind];if(old)URL.revokeObjectURL(old.url);
      state.img[kind]={name:file.name.normalize('NFC'),bytes:bytes,url:url,w:img.naturalWidth,h:img.naturalHeight};
      state.done=null;uniqueNames();paintSlot('bg');paintSlot('sep');render();
    };
    img.onerror=function(){URL.revokeObjectURL(url);$('fn-'+kind).textContent='Non riesco a leggere "'+file.name+'". Scegli un\'immagine PNG o JPG.';};
    img.src=url;
  });
}
['bg','sep'].forEach(function(k){
  $('f-'+k).addEventListener('change',function(e){setImage(k,e.target.files[0]);e.target.value='';});
  $('rm-'+k).addEventListener('click',function(){var im=state.img[k];if(im)URL.revokeObjectURL(im.url);state.img[k]=null;state.done=null;paintSlot(k);render();});
  var sl=$('slot-'+k);
  sl.addEventListener('dragover',function(e){e.preventDefault();sl.classList.add('drag');});
  sl.addEventListener('dragleave',function(){sl.classList.remove('drag');});
  sl.addEventListener('drop',function(e){e.preventDefault();sl.classList.remove('drag');if(e.dataTransfer.files[0])setImage(k,e.dataTransfer.files[0]);});
});
window.addEventListener('dragover',function(e){e.preventDefault();});
window.addEventListener('drop',function(e){e.preventDefault();});

