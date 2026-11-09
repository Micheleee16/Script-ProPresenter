// ---------- ingrandimento ----------
function showSlide(i){
  var n=state.flat.length;if(!n)return;
  i=Math.max(0,Math.min(n-1,i));state.cur=i;
  var d=state.flat[i],rl=rules();
  $('vtitle').textContent=d.label;
  $('vslide').innerHTML=slideMarkup(d.sl,d.label,rl,'div');
  $('vinfo').textContent='Slide '+(i+1)+' di '+n+', '+slideLen(d.sl)+' caratteri';
  $('vprev').disabled=i===0;$('vnext').disabled=i===n-1;
}
$('out').addEventListener('click',function(e){
  var b=e.target.closest?e.target.closest('button.slide'):null;if(!b)return;
  var v=$('viewer');if(!v.showModal)return;
  showSlide(parseInt(b.getAttribute('data-i'),10));v.showModal();
});
$('vclose').addEventListener('click',function(){$('viewer').close();});
$('vprev').addEventListener('click',function(){showSlide(state.cur-1);});
$('vnext').addEventListener('click',function(){showSlide(state.cur+1);});
$('viewer').addEventListener('keydown',function(e){if(e.key==='ArrowLeft'){e.preventDefault();showSlide(state.cur-1);}else if(e.key==='ArrowRight'){e.preventDefault();showSlide(state.cur+1);}});
$('viewer').addEventListener('click',function(e){if(e.target===$('viewer'))$('viewer').close();});

