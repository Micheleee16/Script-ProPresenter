// ---------- scarica ----------
function saveBlob(bytes,name){
  var blob=new Blob([bytes],{type:'application/octet-stream'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=name;
  document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},500);
}
function build(onlyPro){
  var r=state.res,rl=rules(),nm=nome(),pro=buildPresentation(r.passages,nm,rl.corto,rl.max,state.img),base=nm.replace(/[\/:\\]/g,'-'),files=[];
  // rilegge il file appena costruito: se qualcosa non corrisponde al testo previsto, non si scarica
  var problems=verifyPresentation(pro,r.passages,rl.corto,rl.max,state.img);
  if(problems.length)throw new Error('il controllo finale ha trovato una differenza. '+problems[0]);
  if(state.img.bg)files.push({name:MEDIA_ZIP+state.img.bg.name,data:state.img.bg.bytes});
  if(state.img.sep)files.push({name:MEDIA_ZIP+state.img.sep.name,data:state.img.sep.bytes});
  if(onlyPro||!files.length)return {name:base+'.pro',bytes:pro};
  files.push({name:base+'.pro',data:pro});
  return {name:base+'.probundle',bytes:makeZip(files)};
}
function download(onlyPro){
  if(state.mode==='canzoni')return downloadSong();
  var r=state.res;if(!r||!r.passages.length||state.busy)return;
  state.busy=true;renderDock();
  // una breve pausa fa vedere che sta succedendo qualcosa (il lavoro vero è istantaneo)
  setTimeout(function(){
    try{
      var f=build(onlyPro);
      saveBlob(f.bytes,f.name);
      state.done=f.name;state.verified=true;
      toast('Scaricato: '+f.name);
    }catch(e){
      state.done=null;state.verified=false;
      var st=$('dlstatus');st._k='';st.className='status bad';st.innerHTML=ICON.err+'<span>Non scarico il file perché non è sicuro ('+h(e&&e.message||e)+'). Riprova, e se succede ancora avvisa chi mantiene la pagina.</span>';
      state.busy=false;$('dlbtn').setAttribute('data-state','idle');qs('.dl-t',$('dlbtn')).textContent='Scarica';
      return;
    }
    state.busy=false;
    renderDock();
  },reduced()?0:500);
}
