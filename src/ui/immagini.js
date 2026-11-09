// ---------- immagini (si ricordano per la volta dopo, se il browser lo permette) ----------
var DB={
  open:function(){
    return new Promise(function(ok,ko){
      try{
        var q=indexedDB.open('versi',1);
        q.onupgradeneeded=function(){q.result.createObjectStore('img');};
        q.onsuccess=function(){ok(q.result);};
        q.onerror=function(){ko(q.error);};
      }catch(e){ko(e);}
    });
  },
  run:function(mode,fn){
    return DB.open().then(function(db){
      return new Promise(function(ok,ko){
        var tx=db.transaction('img',mode),req=fn(tx.objectStore('img'));
        tx.oncomplete=function(){ok(req&&req.result);db.close();};
        tx.onerror=tx.onabort=function(){ko(tx.error);db.close();};
      });
    });
  },
  get:function(k){return DB.run('readonly',function(s){return s.get(k);});},
  set:function(k,v){return DB.run('readwrite',function(s){return s.put(v,k);});},
  del:function(k){return DB.run('readwrite',function(s){return s['delete'](k);});}
};

function uniqueNames(){var a=state.img.bg,b=state.img.sep;if(a&&b&&a.name===b.name){var m=b.name.match(/^(.*?)(\.[^.]*)?$/);b.name=m[1]+'_2'+(m[2]||'');}}
function paintSlot(k){
  var im=state.img[k],th=$('th-'+k),fn=$('fn-'+k),sl=$('slot-'+k),r=state.res;
  var needed=k==='bg'?!!r:!!(r&&r.passages.length>1);   // l'immagine tra i passi serve solo con più passi
  if(im){
    th.style.backgroundImage='url("'+im.url+'")';th.innerHTML='';
    var bad=Math.abs(im.w/im.h-16/9)>0.02;
    fn.textContent=im.name+' ('+im.w+'×'+im.h+')'+(im.remembered?'\nSalvata dalla volta scorsa.':'')+(bad?'\nNon è 16:9: sullo schermo potrebbe essere tagliata o deformata.':'');
    $('rm-'+k).hidden=false;$('lt-'+k).textContent='Cambia';
    sl.classList.add('filled');sl.classList.toggle('warn',bad);
  }else{
    th.style.backgroundImage='';th.innerHTML=ICON.image;
    fn.textContent=needed?MISSTXT[k]:EMPTYTXT[k];
    $('rm-'+k).hidden=true;$('lt-'+k).textContent='Scegli immagine';
    sl.classList.remove('filled');sl.classList.toggle('warn',needed);
  }
}
function remember(k,im){
  DB.set(k,{name:im.name,type:im.type,bytes:im.bytes,w:im.w,h:im.h}).catch(function(){});
}
function setImage(kind,file,quiet){
  if(!file)return;
  if(!/^image\//.test(file.type||'')&&!/\.(png|jpe?g|gif|webp|heic)$/i.test(file.name)){
    $('fn-'+kind).textContent='"'+file.name+'" non è un\'immagine. Scegli un file PNG o JPG.';
    toast('Quel file non è un\'immagine.');return;
  }
  file.arrayBuffer().then(function(ab){
    var bytes=new Uint8Array(ab),url=URL.createObjectURL(new Blob([bytes],{type:file.type||'image/png'})),img=new Image();
    img.onload=function(){
      var old=state.img[kind];if(old)URL.revokeObjectURL(old.url);
      state.img[kind]={name:file.name.normalize('NFC'),type:file.type||'image/png',bytes:bytes,url:url,w:img.naturalWidth,h:img.naturalHeight,remembered:false};
      state.done=null;uniqueNames();paintSlot('bg');paintSlot('sep');
      replay($('th-'+kind),'pop');
      remember(kind,state.img[kind]);
      render();
    };
    img.onerror=function(){URL.revokeObjectURL(url);$('fn-'+kind).textContent='Non riesco a leggere "'+file.name+'". Scegli un\'immagine PNG o JPG.';toast('Non riesco a leggere quell\'immagine.');};
    img.src=url;
  });
}
function restoreImages(){
  ['bg','sep'].forEach(function(k){
    DB.get(k).then(function(v){
      if(!v||state.img[k])return;
      var bytes=new Uint8Array(v.bytes),url=URL.createObjectURL(new Blob([bytes],{type:v.type||'image/png'}));
      state.img[k]={name:v.name,type:v.type,bytes:bytes,url:url,w:v.w,h:v.h,remembered:true};
      uniqueNames();render();
    }).catch(function(){});
  });
}
function bindSlot(k){
  var sl=$('slot-'+k),depth=0;
  $('f-'+k).addEventListener('change',function(e){setImage(k,e.target.files[0]);e.target.value='';});
  $('rm-'+k).addEventListener('click',function(){
    var im=state.img[k];if(im)URL.revokeObjectURL(im.url);
    state.img[k]=null;state.done=null;DB.del(k).catch(function(){});
    render();
  });
  sl.addEventListener('dragenter',function(e){e.preventDefault();depth++;sl.classList.add('drag');});
  sl.addEventListener('dragover',function(e){e.preventDefault();});
  sl.addEventListener('dragleave',function(){depth=Math.max(0,depth-1);if(!depth)sl.classList.remove('drag');});
  sl.addEventListener('drop',function(e){e.preventDefault();depth=0;sl.classList.remove('drag');if(e.dataTransfer.files[0])setImage(k,e.dataTransfer.files[0]);});
}
