function slideLen(sl){return finalVerses(sl).map(function(v){return v[0]+' '+v[1];}).join(' ').length;}
function slideMarkup(sl,label,rl,tag,idx){
  var fv=finalVerses(sl),tot=slideLen(sl),long=tot>rl.lungo,bg=state.img.bg;
  var body=fv.map(function(v,k){return '<span class="n">'+v[0]+'</span>'+h(v[1])+(k<fv.length-1?' ':'');}).join('');
  var cls='slide'+(bg?' hasbg':'')+(long?' long':'');
  var style=bg?' style="background-image:linear-gradient(rgba(0,0,0,.2),rgba(0,0,0,.2)),url('+bg.url+')"':'';
  var inner='<span class="stext"><span>'+body+'</span></span><span class="sref">'+h(label)+'</span>'+(fv.length>1?'<span class="tag">2 versetti</span>':'')+(long?'<span class="tag l">Lunga: controlla</span>':'');
  if(tag==='button')return '<button type="button" class="'+cls+'" data-i="'+idx+'"'+style+' aria-label="Ingrandisci: '+h(label)+', versetti '+fv.map(function(v){return v[0];}).join(' e ')+'">'+inner+'</button>';
  return '<div class="'+cls+'"'+style+'>'+inner+'</div>';
}

function emptyState(){
  return '<div class="empty"><h3>Qui vedrai le slide prima di scaricarle</h3>'+
    '<p>Incolla il messaggio nel passo 1. Per ogni passo servono il riferimento e i versetti con il loro numero, così:</p>'+
    '<div class="fmt">Romani 6:5-11\n5 Testo del primo versetto\n6 Testo del secondo versetto</div>'+
    '<p>Puoi incollare più passi di seguito. Quello che non è un passo biblico, come i saluti, viene ignorato.</p></div>';
}

