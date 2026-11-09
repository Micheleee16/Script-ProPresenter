function slideLen(sl){return finalVerses(sl).map(function(v){return v[0]+' '+v[1];}).join(' ').length;}

// k = posizione della slide nel suo passo (serve solo per scaglionare l'animazione)
function slideMarkup(sl,label,rl,tag,k){
  var fv=finalVerses(sl),long=slideLen(sl)>rl.lungo;
  var body=fv.map(function(v,j){return '<span class="n">'+v[0]+'</span>'+h(v[1])+(j<fv.length-1?' ':'');}).join('');
  var cls='slide'+(long?' long':'');
  var inner='<span class="stext"><span>'+body+'</span></span><span class="sref">'+h(label)+'</span>'+(fv.length>1?'<span class="tag">2 versetti</span>':'')+(long?'<span class="tag l">Lunga: controlla</span>':'');
  if(tag==='button')return '<button type="button" class="'+cls+'" style="--i:'+Math.min(k,14)+'" aria-label="Ingrandisci: '+h(label)+', versetti '+fv.map(function(v){return v[0];}).join(' e ')+'">'+inner+'</button>';
  return '<div class="'+cls+'">'+inner+'</div>';
}

function noteHtml(n){return '<li class="note'+(n.k==='e'?' e':'')+'">'+(n.k==='e'?ICON.err:ICON.warn)+'<span>'+(n.html||h(n.msg))+'</span></li>';}

// una "scheda" è un passo con le sue slide, oppure un passo escluso per errore
function cardHtml(c){
  var sep='';
  if(c.sepBefore)sep=c.sepOn
    ?'<div class="sep"><span class="t"></span>Immagine tra i passi</div>'
    :'<div class="sep none"><span class="t"></span>Qui andrebbe l\'immagine tra i passi, ma manca</div>';
  if(c.err)return sep+'<article class="pc err"><header class="pc-h"><h3>'+h(c.ref)+'</h3><span class="meta">Non sarà nella presentazione</span></header><ul class="notes">'+noteHtml({k:'e',msg:c.msg})+'</ul></article>';
  return sep+'<article class="pc'+(c.notes.length?' has-warn':'')+'">'+
    '<header class="pc-h"><h3>'+h(c.label)+'</h3><span class="meta">'+pl(c.verses,'versetto','versetti')+' · '+pl(c.slides,'slide','slide')+(c.edited?' · divisione modificata a mano':'')+'</span>'+(c.edited?'<button type="button" class="link pc-reset">Ripristina la divisione automatica</button>':'')+'</header>'+
    (c.notes.length?'<ul class="notes">'+c.notes.map(noteHtml).join('')+'</ul>':'')+
    '<div class="slides">'+c.slidesHtml+'</div></article>';
}
