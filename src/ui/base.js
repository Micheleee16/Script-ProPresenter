// ====================== interfaccia ======================
var $=function(id){return document.getElementById(id);};
function h(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function pl(n,u,p){return n+' '+(n===1?u:p);}
var SV='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
var ICON={ok:SV+'<path d="M4 10.5l4 4 8-9"/></svg>',warn:SV+'<path d="M10 3.2l7.6 13.3H2.4z"/><path d="M10 8.4v3.8M10 14.6v.01"/></svg>',err:SV+'<circle cx="10" cy="10" r="7.4"/><path d="M10 6.2v4.6M10 13.6v.01"/></svg>'};
var EMPTYTXT={bg:'Senza sfondo, le slide restano scure.',sep:'Senza immagine, i passi si susseguono senza stacco.'};
var DEFAULTS={corto:120,max:200,lungo:240};
var state={res:null,img:{bg:null,sep:null},flat:[],cur:0,done:null,counts:{err:0,warn:0,slides:0,passages:0}};

function rules(){
  function v(id,d){var n=parseInt($(id).value,10);return n>0?n:d;}
  return {corto:v('corto',DEFAULTS.corto),max:v('max',DEFAULTS.max),lungo:v('lungo',DEFAULTS.lungo)};
}
function saveRules(){try{localStorage.setItem('versi.regole',JSON.stringify(rules()));}catch(e){}}
function loadRules(){try{var r=JSON.parse(localStorage.getItem('versi.regole')||'null');if(r){['corto','max','lungo'].forEach(function(k){if(r[k]>0)$(k).value=r[k];});}}catch(e){}}
function defaultName(){var d=new Date();function p(n){return ('0'+n).slice(-2);}return 'Versi '+p(d.getDate())+'-'+p(d.getMonth()+1)+'-'+d.getFullYear();}
function nome(){return ($('nome').value||'').trim()||defaultName();}
function mark(id,st,n){var el=$(id);el.className='mark'+(st?' '+st:'');el.innerHTML=st==='done'?ICON.ok:(st==='attn'||st==='bad'?'!':n);}

