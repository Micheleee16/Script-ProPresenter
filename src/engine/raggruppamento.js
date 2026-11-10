// ====================== regola per dividere in slide ======================
// Quello che finisce davvero sulla slide: l'ultimo versetto perde spazi e virgole finali.
function finalVerses(sl){sl=sl.slice();const L=sl[sl.length-1];sl[sl.length-1]=[L[0],L[1].replace(/\s+$/,'').replace(/,+$/,'').replace(/\s+$/,'')];return sl;}
function vlen(v){return (v[0]+' '+v[1]).length;}
function group(verses,corto,max){
  let out=[],i=0;
  while(i<verses.length){
    const a=verses[i];
    if(i+1<verses.length){
      const b=verses[i+1];
      if(vlen(a)<corto&&vlen(a)+1+vlen(b)<=max){out.push([a,b]);i+=2;continue;}
    }
    out.push([a]);i++;
  }
  return out;
}


// Quali versetti la divisione automatica mette insieme: {numero del versetto a sinistra: true}
function autoJoins(verses,corto,max){
  const j={};
  group(verses,corto,max).forEach(function(sl){for(let k=0;k<sl.length-1;k++)j[sl[k][0]]=true;});
  return j;
}
// Divisione automatica con le correzioni fatte a mano.
// ov = {numero del versetto a sinistra: true (uniti) oppure false (separati)}
function groupWith(verses,corto,max,ov){
  if(!ov)return group(verses,corto,max);
  let auto=autoJoins(verses,corto,max),out=[],cur=[verses[0]];
  for(let i=1;i<verses.length;i++){
    const left=verses[i-1][0],joined=ov[left]!==undefined?ov[left]:auto[left]===true;
    if(joined)cur.push(verses[i]);else{out.push(cur);cur=[verses[i]];}
  }
  out.push(cur);
  return out;
}

