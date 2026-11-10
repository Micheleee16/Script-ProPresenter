// ---------- ingrandimento ----------
var viewerOpen=false,viewerClosing=null;
function showSlide(i,dir){
  var n=state.flat.length;if(!n)return;
  i=Math.max(0,Math.min(n-1,i));
  var moved=i!==state.cur;state.cur=i;
  var d=state.flat[i],rl=rules(),vs=$('vslide'),t=slideLen(d.sl);
  $('vtitle').textContent=d.label;
  vs.innerHTML=slideMarkup(d.sl,d.label,rl,'div',0);
  if(moved&&dir){vs.classList.remove('to-next','to-prev');void vs.offsetWidth;vs.classList.add(dir>0?'to-next':'to-prev');}
  $('vinfo').textContent='Slide '+(i+1)+' di '+n+' · '+pl(t,'carattere','caratteri');
  $('vnote').textContent=t>rl.lungo?'Slide lunga':'';
  $('vbar').style.width=((i+1)/n*100)+'%';
  $('vprev').disabled=i===0;$('vnext').disabled=i===n-1;
  // quali correzioni sono possibili su questa slide (solo dentro lo stesso passo)
  var prev=state.flat[i-1],next=state.flat[i+1];
  var canPrev=!!prev&&prev.p===d.p,canNext=!!next&&next.p===d.p,canSplit=d.sl.length>1;
  $('v-pj').hidden=!canPrev;$('v-nj').hidden=!canNext;$('v-sp').hidden=!canSplit;
  $('vedit').hidden=!(canPrev||canNext||canSplit);
}

// ---------- unire e separare i versetti dall'ingrandimento ----------
function setJoin(p,left,joined){
  var key=ovKey(p),ov=state.ov[key]||(state.ov[key]={}),rl=rules();
  var auto=autoJoins(p.verses,rl.corto,rl.max)[left]===true;
  if(joined===auto)delete ov[left];else ov[left]=joined;      // uguale all'automatico = nessuna correzione
  if(!Object.keys(ov).length)delete state.ov[key];
}
function editSlide(kind){
  var d=state.flat[state.cur];if(!d)return;
  var p=d.p,first=d.sl[0][0];
  if(kind==='split')d.sl.slice(0,-1).forEach(function(v){setJoin(p,v[0],false);});
  else if(kind==='next')setJoin(p,d.sl[d.sl.length-1][0],true);
  else if(kind==='prev'){var pv=state.flat[state.cur-1];setJoin(p,pv.sl[pv.sl.length-1][0],true);first=pv.sl[0][0];}
  state.done=null;
  render();
  // resta sulla slide che contiene lo stesso versetto di prima
  var idx=0;
  state.flat.forEach(function(f,i){if(f.p===p&&f.sl.some(function(v){return v[0]===first;}))idx=i;});
  showSlide(idx,0);
  replay($('vslide'),'edited');
}
function bindEdit(){
  $('v-pj').addEventListener('click',function(){editSlide('prev');});
  $('v-sp').addEventListener('click',function(){editSlide('split');});
  $('v-nj').addEventListener('click',function(){editSlide('next');});
}
function openViewer(i){
  var v=$('viewer');if(!v.showModal||viewerOpen)return;
  v.classList.toggle('bg-on',!!state.img.bg);
  v.style.setProperty('--bgimg',state.img.bg?'url("'+state.img.bg.url+'")':'none');
  state.cur=-1;showSlide(i,0);
  v.showModal();viewerOpen=true;
  requestAnimationFrame(function(){requestAnimationFrame(function(){v.classList.add('show');});});
}
function closeViewer(){
  var v=$('viewer');if(!viewerOpen)return;
  viewerOpen=false;v.classList.remove('show');
  clearTimeout(viewerClosing);
  viewerClosing=setTimeout(function(){if(v.open)v.close();},reduced()?0:280);
}
function bindViewer(){
  var v=$('viewer');
  $('vclose').addEventListener('click',closeViewer);
  $('vprev').addEventListener('click',function(){showSlide(state.cur-1,-1);});
  $('vnext').addEventListener('click',function(){showSlide(state.cur+1,1);});
  v.addEventListener('cancel',function(e){e.preventDefault();closeViewer();});
  v.addEventListener('keydown',function(e){
    if(e.key==='ArrowLeft'){e.preventDefault();showSlide(state.cur-1,-1);}
    else if(e.key==='ArrowRight'){e.preventDefault();showSlide(state.cur+1,1);}
  });
  v.addEventListener('click',function(e){if(e.target===v)closeViewer();});
  // scorrimento con il dito
  var x0=null,y0=null;
  $('vstage').addEventListener('touchstart',function(e){x0=e.touches[0].clientX;y0=e.touches[0].clientY;},{passive:true});
  $('vstage').addEventListener('touchend',function(e){
    if(x0===null)return;
    var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;x0=null;
    if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.5)showSlide(state.cur+(dx<0?1:-1),dx<0?1:-1);
  },{passive:true});
}
