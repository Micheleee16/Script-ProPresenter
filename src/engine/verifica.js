
// ====================== rilettura finale della presentazione ======================
// Rilegge il file appena costruito e controlla, slide per slide, che contenga proprio
// i versetti previsti (numeri e parole, nello stesso ordine) e il riferimento giusto.
// Restituisce l'elenco dei problemi: vuoto = tutto corrisponde.
function tokens(s){return s.normalize('NFC').toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];}
function sameTokens(a,b){if(a.length!==b.length)return false;for(var i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
function verifyPresentation(bytes,passages,corto,max,imgs){
  var problems=[],top=parse(bytes),grp=null,cues={},expected=[];
  top.forEach(function(x){if(x.f===12&&!grp)grp=x;if(x.f===13)cues[td.decode(path(x.v,1,1))]=x.v;});
  var order=parse(grp.v).filter(function(x){return x.f===2;}).map(function(x){return td.decode(parse(x.v)[0].v);});
  passages.forEach(function(p,pi){
    if(pi>0&&imgs&&imgs.sep)expected.push({sep:true});
    groupWith(p.verses,corto,max,p.ov).forEach(function(sl){
      var a=sl[0][0],z=sl[sl.length-1][0];
      expected.push({name:p.label+':'+a+(z!==a?'-'+z:''),text:tokens(finalVerses(sl).map(function(v){return v[0]+' '+v[1];}).join(' ')),ref:tokens(p.label)});
    });
  });
  if(order.length!==expected.length)return ['La presentazione ha '+order.length+' slide, ne erano previste '+expected.length+'.'];
  var seen={};
  expected.forEach(function(e,i){
    var c=cues[order[i]];
    if(!c){problems.push('Manca la slide '+(i+1)+'.');return;}
    if(seen[order[i]])problems.push('La slide '+(i+1)+' è un duplicato.');seen[order[i]]=1;
    if(e.sep)return;
    var got=tokens(rtfPlain(latin1Str(pick(c,PEL(0).concat([[5,0]]))))),ref=tokens(rtfPlain(latin1Str(pick(c,PEL(1).concat([[5,0]])))));
    if(!sameTokens(got,e.text))problems.push('Il testo della slide '+(i+1)+' ('+e.name+') non corrisponde ai versetti previsti.');
    if(!sameTokens(ref,e.ref))problems.push('Il riferimento della slide '+(i+1)+' ('+e.name+') non corrisponde.');
  });
  return problems;
}
