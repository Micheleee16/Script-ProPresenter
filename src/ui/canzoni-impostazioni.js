// ---------- impostazioni: video di sfondo e colori ----------
const VIDEO_STD='Sfondo 1.mov',COL_DEF={intro:'#999999',inst:'#999999',outro:'#cc2929'};
function hexToRgba(x){const n=parseInt(x.slice(1),16);return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,1];}
function songOpts(){
  const G=state.song,i=G.videoInfo,colors={};
  ['intro','inst','outro'].forEach(function(k){const v=($('c-col-'+k).value||'').toLowerCase();if(v&&v!==COL_DEF[k])colors[k]=hexToRgba(v);});
  return {video:$('c-video').checked,videoInfo:i&&i.name&&i.name!==VIDEO_STD?i:null,colors:colors};
}
function paintVideoInfo(){
  const i=state.song.videoInfo,name=$('c-vname').value.trim()||VIDEO_STD,el=$('c-vinfo');
  if(name===VIDEO_STD)el.textContent='';
  else if(i&&i.duration>0)el.textContent='Durata '+i.duration.toFixed(1).replace('.',',')+' s · '+i.w+'×'+i.h;
  else el.textContent='Durata e dimensioni del modello: controlla in ProPresenter che parta.';
}
function setVideoInfo(info){
  state.song.videoInfo=info&&info.name&&info.name!==VIDEO_STD?info:null;
  store('versi.videoFile',state.song.videoInfo?JSON.stringify(state.song.videoInfo):null);
  state.done=null;paintVideoInfo();renderDock();
}
function readVideoMeta(file){
  return new Promise(function(ok){
    let v=document.createElement('video'),url=URL.createObjectURL(file),done=false;
    function fin(r){if(done)return;done=true;URL.revokeObjectURL(url);ok(r);}
    v.preload='metadata';v.muted=true;
    v.onloadedmetadata=function(){fin(isFinite(v.duration)&&v.videoWidth?{duration:v.duration,w:v.videoWidth,h:v.videoHeight}:null);};
    v.onerror=function(){fin(null);};
    setTimeout(function(){fin(null);},4000);
    v.src=url;
  });
}
function bindSongSettings(){
  const G=state.song;
  try{const vi=JSON.parse(store('versi.videoFile')||'null');if(vi&&vi.name){G.videoInfo=vi;$('c-vname').value=vi.name;}}catch(e){}
  paintVideoInfo();
  $('c-vname').addEventListener('input',function(){const n=$('c-vname').value.trim();setVideoInfo(n&&n!==VIDEO_STD?{name:n}:null);});
  $('c-vfile').addEventListener('change',function(e){
    const f=e.target.files[0];e.target.value='';if(!f)return;
    const name=f.name.normalize('NFC');
    readVideoMeta(f).then(function(m){
      $('c-vname').value=name;
      setVideoInfo({name:name,duration:m?m.duration:0,w:m?m.w:0,h:m?m.h:0});
      if(!m)toast('Durata del video non leggibile: uso il nome');
    });
  });
  try{const cs=JSON.parse(store('versi.colori')||'null');if(cs)Object.keys(COL_DEF).forEach(function(k){if(/^#[0-9a-f]{6}$/i.test(cs[k]||''))$('c-col-'+k).value=cs[k];});}catch(e){}
  Object.keys(COL_DEF).forEach(function(k){$('c-col-'+k).addEventListener('input',function(){
    const o={};Object.keys(COL_DEF).forEach(function(j){o[j]=$('c-col-'+j).value;});store('versi.colori',JSON.stringify(o));state.done=null;renderDock();
  });});
  $('c-col-reset').addEventListener('click',function(){Object.keys(COL_DEF).forEach(function(k){$('c-col-'+k).value=COL_DEF[k];});store('versi.colori',null);state.done=null;renderDock();});
}
function paintViews(){
  qsa('#c-views button').forEach(function(b){b.setAttribute('aria-pressed',b.getAttribute('data-v')===state.song.vista?'true':'false');});
}
function bindSongViews(){
  const v=store('versi.vistaCanzoni');if(v==='preview')state.song.vista='preview';
  paintViews();
  qsa('#c-views button').forEach(function(b){b.addEventListener('click',function(){
    state.editing=null;state.song.vista=b.getAttribute('data-v');store('versi.vistaCanzoni',state.song.vista);paintViews();renderSong();
  });});
  $('c-undo').addEventListener('click',songUndo);
  document.addEventListener('keydown',function(e){
    if(state.mode!=='canzoni'||!(e.ctrlKey||e.metaKey)||e.shiftKey||e.key.toLowerCase()!=='z')return;
    const t=e.target;if(t&&(t.tagName==='TEXTAREA'||t.tagName==='INPUT'))return;
    if(state.song.undo.length){e.preventDefault();songUndo();}
  });
}
function bindSong(){
  bindSongSettings();bindSongViews();
  let tm=null;
  ['c-it','c-en'].forEach(function(id){$(id).addEventListener('input',function(){state.editing=null;const sd=id==='c-it'?'it':'en';if(!$(id).value.trim()){$('src-'+sd).hidden=true;}clearTimeout(tm);tm=setTimeout(analyzeSong,200);});});
  ['it','en'].forEach(function(sd){
    $('cf-'+sd).addEventListener('change',function(e){loadSongFiles(e.target.files,sd);e.target.value='';});
    let fd=qs('.field[data-side="'+sd+'"]'),dep=0;
    fd.addEventListener('dragenter',function(e){if(!e.dataTransfer||Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')<0)return;e.preventDefault();dep++;fd.classList.add('drag');});
    fd.addEventListener('dragover',function(e){if(e.dataTransfer&&Array.prototype.indexOf.call(e.dataTransfer.types||[],'Files')>=0)e.preventDefault();});
    fd.addEventListener('dragleave',function(){dep=Math.max(0,dep-1);if(!dep)fd.classList.remove('drag');});
    fd.addEventListener('drop',function(e){
      dep=0;fd.classList.remove('drag');
      if(!e.dataTransfer||!e.dataTransfer.files||!e.dataTransfer.files.length)return;
      e.preventDefault();e.stopPropagation();loadSongFiles(e.dataTransfer.files,sd);
    });
    $('fx-'+sd).addEventListener('click',function(e){if(e.target.closest&&e.target.closest('[data-act="fx-apply"]'))songFixApply(sd);});
    $('fx-'+sd).addEventListener('input',function(){songFixPreview($('fx-'+sd),state.song.fix[sd]||[]);});
  });
  $('c-clear').addEventListener('click',function(){
    const G=state.song;if($('c-it').value.trim()||$('c-en').value.trim())pushUndo();state.editing=null;G.fix={it:[],en:[]};$('src-it').hidden=true;$('src-en').hidden=true;$('c-it').value='';$('c-en').value='';G.touched=false;G.order=null;G.extra={};
    analyzeSong();$('c-it').focus();
  });
  $('c-list').addEventListener('click',function(e){
    const b=e.target.closest?e.target.closest('button[data-act]'):null;if(!b||b.disabled)return;
    const act=b.getAttribute('data-act'),li=b.closest('li');
    if(act==='edit'){
      let key=null;state.song.order.forEach(function(o){if(li&&o.id===li.getAttribute('data-key'))key=o.key;});
      state.editing={key:key,side:b.getAttribute('data-side'),i:parseInt(b.getAttribute('data-i'),10)};
      renderSong();
      const inp=qs('#c-list .ed-in');if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);}
      return;
    }
    if(act.indexOf('ed-')===0){songEdit(act,b);return;}
    if(li)songAct(act,li.getAttribute('data-key'),b);
  });
  $('c-list').addEventListener('keydown',function(e){
    const inp=e.target.closest?e.target.closest('.ed-in'):null;if(!inp)return;
    if(e.key==='Enter'){e.preventDefault();songEdit('ed-save',qs('[data-act="ed-save"]',inp.closest('.editor')));}
    else if(e.key==='Escape'){e.preventDefault();state.editing=null;renderSong();}
  });
  $('c-add-btn').addEventListener('click',function(){
    const G=state.song,m=G.model,k=$('c-add').value;if(!m||!k)return;
    pushUndo();
    if(!m.secs[k]){G.extra[k]=1;ensureSec(m,k);}
    G.order.push({id:'b'+(++G.uid),key:k});G.touched=true;state.done=null;renderSong();
    const last=$('c-list').lastElementChild;if(last)last.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'center'});
  });
  $('c-ord-en').addEventListener('click',function(){const G=state.song;pushUndo();G.touched=false;G.order=null;state.done=null;analyzeSong();});
  $('c-ord-hd').addEventListener('click',songOrderFromHeader);
  $('c-sum-go').addEventListener('click',songFirstProblem);
  $('c-video').addEventListener('change',function(){store('versi.video',$('c-video').checked?'1':'0');state.done=null;renderDock();});
  $('c-video').checked=store('versi.video')!=='0';
}

