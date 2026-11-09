// ====================== lettura del messaggio ======================
var WA=/\[\d{1,2}:\d{2},\s*\d{1,2}\/\d{1,2}\/\d{2,4}\][^:\n\[]{0,40}:/g;
var HEADSRC='^[ \\t«“"]*((?:[1-3]\\s?)?[A-Za-zÀ-ÿ]{2,}\\.?)\\s*(\\d{1,3})\\s*[:,]\\s*(\\d{1,3})?(?:\\s*[-–]\\s*(\\d{1,3}))?';
function norm(t){return t.split(/\s+/).filter(Boolean).join(' ');}
function cleanText(t){return norm(t).replace(/^[«» ]+|[«» ]+$/g,'');}
var PUNCT=/[\.;:,!?»”)"’'…]$/;

function findStarts(body,s,e,warn){
  var starts=[[s,0]],pos=0,n=s+1,loose=[];
  for(;;){
    if(e&&n>e)break;
    var re=new RegExp('(^|\\s)'+n+'\\s+(?=\\S)','g'),cands=[],m;
    re.lastIndex=pos;
    while((m=re.exec(body))){
      var idx=m.index+m[1].length;
      var before=body.slice(0,idx).replace(/\s+$/,'');
      var punct=before===''||/\n\s*$/.test(body.slice(0,idx))||PUNCT.test(before);
      cands.push({idx:idx,end:m.index+m[0].length,punct:punct});
    }
    if(!cands.length)break;
    var pick=cands[0];
    if(cands.length>1){
      var firstP=null;for(var i=0;i<cands.length;i++)if(cands[i].punct){firstP=cands[i];break;}
      if(firstP)pick=firstP;
      if(pick.punct)warn('Il numero '+n+' compare '+cands.length+' volte nel testo. Ho scelto quello dopo la punteggiatura: controlla che il versetto '+n+' inizi nel punto giusto.');
      else warn('Il numero '+n+' compare '+cands.length+' volte nel testo e nessuno segue una punteggiatura o un a capo. Ho scelto il primo: controlla che il versetto '+n+' inizi nel punto giusto.');
    }else if(!pick.punct){
      loose.push(n);
    }
    starts.push([n,pick.idx]);pos=pick.end;n++;
  }
  if(loose.length)warn((loose.length===1?'Il versetto '+loose[0]+' inizia':'I versetti '+loose.join(', ')+' iniziano')+' dopo una parola senza punteggiatura né a capo. Controlla che '+(loose.length===1?'quel numero sia':'quei numeri siano')+' davvero '+(loose.length===1?'l\'inizio del versetto':'l\'inizio dei versetti')+' (e non, per esempio, "'+loose[0]+' volte").');
  return starts;
}

// Parole del testo ricevuto che non sono finite nei versetti, nell'ordine in cui compaiono.
// I versetti sono pezzi del testo ricevuto, quindi si cercano come sequenza: ogni parola del testo
// che non è la prossima parola attesa di un versetto è rimasta fuori.
function leftover(body,verses){
  var vw=[];
  verses.forEach(function(v){(v[1].normalize('NFC').toLowerCase().match(/[\p{L}\p{M}]+/gu)||[]).forEach(function(w){vw.push(w);});});
  var re=/[\p{L}\p{M}]+/gu,m,j=0,total=0,left=0,runs=[],start=-1,end=-1,prevLeft=false;
  while((m=re.exec(body))){
    total++;
    var w=m[0].normalize('NFC').toLowerCase();
    if(j<vw.length&&w===vw[j]){j++;if(prevLeft){runs.push(norm(body.slice(start,end)));prevLeft=false;}}
    else{left++;if(!prevLeft){start=m.index;prevLeft=true;}end=m.index+m[0].length;}
  }
  if(prevLeft)runs.push(norm(body.slice(start,end)));
  return {total:total,left:left,runs:runs};
}

function readMessage(raw){
  var warns=[],errs=[],ignored=[],out=[],pid=0,m,cw=0,cl=0;
  raw=raw.replace(/\r/g,'');
  var msgs=[],last=0;
  WA.lastIndex=0;
  while((m=WA.exec(raw))){msgs.push(raw.slice(last,m.index));last=m.index+m[0].length;}
  msgs.push(raw.slice(last));
  msgs.forEach(function(t){
    var heads=[],hre=new RegExp(HEADSRC,'gm'),h;
    while((h=hre.exec(t))){var b=canonBook(h[1]);if(b)heads.push({m:h,b:b,start:h.index,end:h.index+h[0].length});if(h[0].length===0)hre.lastIndex++;}
    if(!heads.length){if(t.trim())ignored.push(norm(t).slice(0,90));return;}
    var pre=t.slice(0,heads[0].start),postLast=t.slice(heads[heads.length-1].end),preForLast=null;
    if(pre.trim().length>20&&heads.length===1&&postLast.trim().length<3)preForLast=pre;
    heads.forEach(function(hd,i){
      var id=pid++;
      var end=i+1<heads.length?heads[i+1].start:t.length;
      var body=t.slice(hd.end,end);
      if(preForLast!==null&&i===heads.length-1)body=preForLast;
      var chap=parseInt(hd.m[2],10),s=hd.m[3]?parseInt(hd.m[3],10):1,e=hd.m[4]?parseInt(hd.m[4],10):null;
      body=body.replace(new RegExp('^\\s*'+s+'\\s+'),'');
      var nome=hd.b+' '+chap+':'+s+(e&&e!==s?'-'+e:'');
      var pw=[];   // avvisi del passo: si registrano solo se il passo viene incluso, con il riferimento definitivo
      var W=function(msg){pw.push(msg);};
      if(preForLast!==null&&i===heads.length-1)W('Il riferimento è scritto dopo il testo: ho usato come versetti il testo che lo precede. Controlla che sia giusto.');
      var E=function(msg){errs.push({pid:id,ref:nome,msg:msg});};
      var starts=findStarts(body,s,e,W),verses=[];
      for(var j=0;j<starts.length;j++){
        var num=starts[j][0],st=starts[j][1],nxt=j+1<starts.length?starts[j+1][1]:body.length,txt=body.slice(st,nxt);
        if(j===starts.length-1){
          txt=txt.split(/\n[ \t]*\n/)[0];   // quello che segue una riga vuota non è del versetto: lo segnala il controllo sul testo perso
        }
        if(j>0)txt=txt.replace(new RegExp('^'+num+'\\s+'),'');
        verses.push([num,cleanText(txt)]);
      }
      var lastn=verses[verses.length-1][0];
      var lab=hd.b+' '+chap+':'+s+(lastn!==s?'-'+lastn:'');
      if(e&&e>s&&verses.length===1){E('Mancano i numeri dei versetti: ne servono '+(e-s+1)+' (dal '+s+' al '+e+'). Scrivi il numero davanti a ogni versetto. Questo passo non sarà nella presentazione. Testo ricevuto: "'+verses[0][1].slice(0,90)+'".');return;}
      if(e&&lastn!==e){E('Ho trovato i versetti dal '+s+' al '+lastn+', ma ne servono fino al '+e+'. Controlla che il versetto '+(lastn+1)+' abbia il suo numero davanti. Questo passo non sarà nella presentazione.');return;}
      if(!e&&verses.length>1){nome=lab;W('Il riferimento non dice fino a che versetto arriva: ho riconosciuto i versetti dal '+s+' al '+lastn+'. Controlla che ci siano tutti.');}
      if(verses.some(function(v){return !v[1];})){E('Un versetto è vuoto. Questo passo non sarà nella presentazione.');return;}
      verses.forEach(function(v){if(/\d/.test(v[1]))W('Il versetto '+v[0]+' contiene una cifra: controlla che non sia un numero di versetto.');});
      var lo=leftover(body,verses);cw+=lo.total;cl+=lo.left;
      if(lo.left){
        var shown=lo.runs.slice(0,3).map(function(x){return '"'+(x.length>70?x.slice(0,70)+'…':x)+'"';}).join(' · ')+(lo.runs.length>3?' · …':'');
        W('Nel messaggio c\'è del testo che non è finito nelle slide ('+lo.left+(lo.left===1?' parola':' parole')+'): '+shown+'. Se fa parte di un versetto, togli la riga vuota o aggiungi il numero; se non serve, ignora questo avviso.');
      }
      pw.forEach(function(msg){warns.push({pid:id,ref:nome,msg:msg});});
      out.push({pid:id,book:hd.b,chap:chap,verses:verses,label:lab});
    });
  });
  return {passages:out,warns:warns,errs:errs,ignored:ignored,check:{words:cw,left:cl}};
}

