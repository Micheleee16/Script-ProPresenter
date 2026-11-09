// ---------- scarica ----------
function saveBlob(bytes,name){
  var blob=new Blob([bytes],{type:'application/octet-stream'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}
function build(onlyPro){
  var r=state.res,rl=rules(),nm=nome(),pro=buildPresentation(r.passages,nm,rl.corto,rl.max,state.img),base=nm.replace(/[\/:\\]/g,'-'),files=[];
  if(state.img.bg)files.push({name:MEDIA_ZIP+state.img.bg.name,data:state.img.bg.bytes});
  if(state.img.sep)files.push({name:MEDIA_ZIP+state.img.sep.name,data:state.img.sep.bytes});
  if(onlyPro||!files.length)return {name:base+'.pro',bytes:pro};
  files.push({name:base+'.pro',data:pro});
  return {name:base+'.probundle',bytes:makeZip(files)};
}
function download(onlyPro){
  var r=state.res;if(!r||!r.passages.length||state.busy)return;
  state.busy=true;renderDock();
  // una breve pausa fa vedere che sta succedendo qualcosa (il lavoro vero è istantaneo)
  setTimeout(function(){
    try{
      var f=build(onlyPro);
      saveBlob(f.bytes,f.name);
      state.done=f.name;
      toast('Scaricato: '+f.name);
    }catch(e){
      state.done=null;
      var st=$('dlstatus');st._k='';st.className='status bad';st.innerHTML=ICON.err+'<span>Non sono riuscito a creare il file ('+h(e&&e.message||e)+'). Riprova, e se succede ancora avvisa chi mantiene la pagina.</span>';
      state.busy=false;$('dlbtn').setAttribute('data-state','idle');qs('.dl-t',$('dlbtn')).textContent='Scarica';
      return;
    }
    state.busy=false;
    mark('m4','done',4);stepState(4,'done');renderDock();
  },reduced()?0:500);
}
