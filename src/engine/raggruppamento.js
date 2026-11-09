// ====================== regola per dividere in slide ======================
function vlen(v){return (v[0]+' '+v[1]).length;}
function group(verses,corto,max){
  var out=[],i=0;
  while(i<verses.length){
    var a=verses[i];
    if(i+1<verses.length){
      var b=verses[i+1];
      if(vlen(a)<corto&&vlen(a)+1+vlen(b)<=max){out.push([a,b]);i+=2;continue;}
    }
    out.push([a]);i++;
  }
  return out;
}

