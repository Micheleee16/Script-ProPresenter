// ---------- scarica ----------
function saveBlob(bytes,name){
  var blob=new Blob([bytes],{type:'application/octet-stream'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}
function download(onlyPro){
  var r=state.res;if(!r||!r.passages.length)return;
  var rl=rules(),nm=nome(),pro=buildPresentation(r.passages,nm,rl.corto,rl.max,state.img),base=nm.replace(/[\/:\\]/g,'-'),files=[],fname;
  if(state.img.bg)files.push({name:MEDIA_ZIP+state.img.bg.name,data:state.img.bg.bytes});
  if(state.img.sep)files.push({name:MEDIA_ZIP+state.img.sep.name,data:state.img.sep.bytes});
  if(onlyPro||!files.length){fname=base+'.pro';saveBlob(pro,fname);}
  else{files.push({name:base+'.pro',data:pro});fname=base+'.probundle';saveBlob(makeZip(files),fname);}
  state.done=fname;mark('m4','done',4);renderDock();
}

