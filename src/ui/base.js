// ====================== interfaccia: strumenti comuni ======================
var $=function(id){return document.getElementById(id);};
var qs=function(s,r){return (r||document).querySelector(s);};
var qsa=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));};
function h(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pl(n,u,p){return n+' '+(n===1?u:p);}
function reduced(){return !!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);}

function svg(d,cls){return '<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';}
var ICON={
  check:svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  warn:svg('<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.4v.01"/>'),
  err:svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5M12 15.8v.01"/>'),
  plus:svg('<path d="M12 5v14M5 12h14"/>'),
  x:svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  image:svg('<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10.5" r="1.6"/><path d="M4 17l4.5-4.5 3.5 3.5 3-3 5 4.5"/>'),
  paste:svg('<rect x="6" y="5" width="12" height="16" rx="2.5"/><path d="M9.5 5V4a1 1 0 011-1h3a1 1 0 011 1v1M9.5 11h5M9.5 15h3"/>'),
  message:svg('<path d="M4 6.5A2.5 2.5 0 016.5 4h11A2.5 2.5 0 0120 6.5v8a2.5 2.5 0 01-2.5 2.5H11l-4.5 3.5V17H6.5A2.5 2.5 0 014 14.5z"/><path d="M8 9h8M8 12.5h5"/>'),
  down:svg('<path d="M12 4v11M7.5 11l4.5 4.5 4.5-4.5M5 20h14"/>'),
  chev:svg('<path d="M7 10l5 5 5-5"/>'),
  left:svg('<path d="M14.5 6l-6 6 6 6"/>'),
  right:svg('<path d="M9.5 6l6 6-6 6"/>'),
  sliders:svg('<path d="M5 7h9M18 7h1M5 17h1M10 17h9"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>'),
  sun:svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
  moon:svg('<path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z"/>'),
  auto:svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor" stroke="none"/>'),
  up:svg('<path d="M7 14l5-5 5 5"/>'),
  copy:svg('<rect x="8.5" y="8.5" width="11" height="11" rx="2.2"/><path d="M5 15V6.7A2.2 2.2 0 017.2 4.5H15"/>'),
  trash:svg('<path d="M5 7h14M10 11v5.5M14 11v5.5M7 7l.8 12h8.4L17 7M9.5 7V4.8h5V7"/>'),
  pen:svg('<path d="M4.5 19.5l3.6-.9L19 7.7l-2.7-2.7L5.4 15.9z"/><path d="M14.6 6.7l2.7 2.7"/>'),
  spin:svg('<path d="M12 3.5a8.5 8.5 0 108.5 8.5" opacity=".95"/>')
};
var EMPTYTXT={bg:'Senza sfondo, le slide restano scure.',sep:'Senza immagine, i passi si susseguono senza stacco.'};
var MISSTXT={bg:'Manca: le slide saranno senza sfondo.',sep:'Manca: tra un passo e l\'altro non ci sarà nessuna immagine.'};
var DEFAULTS={corto:120,max:200,lungo:240};
var state={editing:null,mode:'bibbia',nameTouched:false,song:{vista:'table',undo:[],videoInfo:null,colors:null,fix:{it:[],en:[]},model:null,order:null,touched:false,uid:0,view:null,video:true,extra:{}},res:null,img:{bg:null,sep:null},flat:[],cur:0,done:null,busy:false,verified:false,ov:{},counts:{err:0,warn:0,slides:0,passages:0}};

// ---------- memoria del browser (può non essere disponibile: la pagina funziona lo stesso) ----------
function store(k,v){
  try{
    if(v===undefined)return localStorage.getItem(k);
    if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);
  }catch(e){}
  return null;
}
function rules(){
  function v(id,d){var n=parseInt($(id).value,10);return n>0?n:d;}
  return {corto:v('corto',DEFAULTS.corto),max:v('max',DEFAULTS.max),lungo:v('lungo',DEFAULTS.lungo)};
}
function saveRules(){store('versi.regole',JSON.stringify(rules()));}
function loadRules(){
  try{var r=JSON.parse(store('versi.regole')||'null');if(r){['corto','max','lungo'].forEach(function(k){if(r[k]>0)$(k).value=r[k];});}}catch(e){}
}
function defaultName(){var d=new Date();function p(n){return ('0'+n).slice(-2);}return 'Versi '+p(d.getDate())+'-'+p(d.getMonth()+1)+'-'+d.getFullYear();}
function nome(){return ($('nome').value||'').trim()||defaultName();}

// ---------- piccoli effetti ----------
function replay(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);}
var toastTimer=null;
function toast(msg){
  var t=$('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(function(){t.classList.remove('show');},3400);
}
function hash(s){var x=5381,i;for(i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;return (x>>>0).toString(36);}
function isMac(){return /Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent||'');}

// Le correzioni a mano alla divisione delle slide valgono per un passo con quel testo preciso:
// se il testo cambia (o arriva un messaggio diverso) tornano a zero.
function ovKey(p){return p.label+'|'+hash(JSON.stringify(p.verses));}

// ---------- bozza: il lavoro in corso si salva da solo nel browser ----------
var DRAFT_KEY='versi.bozza',draftTimer=null;
function draftQueue(){clearTimeout(draftTimer);draftTimer=setTimeout(draftWrite,500);}
function draftWrite(){
  var G=state.song,d={v:1,t:Date.now(),mode:state.mode,msg:$('msg').value,it:$('c-it').value,en:$('c-en').value,
    srcIt:$('src-it').hidden?'':$('src-it').textContent,srcEn:$('src-en').hidden?'':$('src-en').textContent,
    order:G.order,touched:G.touched,extra:G.extra,uid:G.uid,fix:G.fix,nome:state.nameTouched?$('nome').value:null,
    title:G.model&&G.model.title||''};
  if(!d.msg.trim()&&!d.it.trim()&&!d.en.trim()){store(DRAFT_KEY,null);return;}
  var t=d.t;d.t=0;var sig=hash(JSON.stringify(d));d.t=t;d.sig=sig;
  try{var old=JSON.parse(store(DRAFT_KEY)||'null');if(old&&old.sig===sig){return;}}catch(e){}
  store(DRAFT_KEY,JSON.stringify(d));
}
function draftLoad(){
  try{
    var d=JSON.parse(store(DRAFT_KEY)||'null');
    if(!d||d.v!==1||Date.now()-d.t>30*864e5)return null;
    if(!String(d.msg||'').trim()&&!String(d.it||'').trim()&&!String(d.en||'').trim())return null;
    return d;
  }catch(e){return null;}
}
