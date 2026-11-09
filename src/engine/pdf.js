
// ====================== file di testo e PDF ======================
// Legge un file di testo (.txt) e, quando il testo è testo vero, un PDF (Word, Pages, "Stampa in PDF"…).
// Non legge PDF fatti di immagini (scansioni), protetti da password o con struttura insolita:
// in quel caso lo dice, e si può sempre incollare il testo.
var PDF_MACROMAN='ÄÅÇÉÑÖÜáàâäãåçéèêëíìîïñóòôöõúùûü†°¢£§•¶ß®©™´¨≠ÆØ∞±≤≥¥µ∂∑∏π∫ªºΩæø¿¡¬√ƒ≈∆«»… ÀÃÕŒœ–—“”‘’÷◊ÿŸ⁄€‹›ﬁﬂ‡·‚„‰ÂÊÁËÈÍÎÏÌÓÔÒÚÛÙıˆ˜¯˘˙˚¸˝˛ˇ';

function decodeTextFile(bytes){
  var b=bytes;
  if(b.length>=3&&b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF)b=b.subarray(3);
  if(b.length>=2&&b[0]===0xFF&&b[1]===0xFE)return new TextDecoder('utf-16le').decode(b.subarray(2));
  if(b.length>=2&&b[0]===0xFE&&b[1]===0xFF)return new TextDecoder('utf-16be').decode(b.subarray(2));
  try{return new TextDecoder('utf-8',{fatal:true}).decode(b);}
  catch(e){return new TextDecoder('windows-1252').decode(b);}   // file salvati da programmi vecchi
}

// Quale lingua è un testo? 'it', 'en' oppure null se non si capisce.
function guessLang(text,fileName){
  var n=(fileName||'').toLowerCase();
  if(/(^|[^a-z])(ita|italiano|italian)([^a-z]|$)/.test(n))return 'it';
  if(/(^|[^a-z])(eng|english|inglese|lyrics)([^a-z]|$)/.test(n))return 'en';
  var IT={il:1,lo:1,la:1,le:1,gli:1,un:1,una:1,che:1,di:1,del:1,della:1,non:1,mi:1,ti:1,ci:1,tu:1,sei:1,per:1,con:1,ma:1,come:1,e:1,sono:1,mio:1,tuo:1,tua:1,nel:1,al:1,da:1,ogni:1,sempre:1},
      EN={the:1,you:1,and:1,of:1,to:1,is:1,are:1,my:1,your:1,with:1,that:1,in:1,for:1,it:1,we:1,be:1,i:1,all:1,have:1,when:1,was:1,every:1},
      w=(text.toLowerCase().match(/[a-zà-ÿ']+/g)||[]),a=0,b=0;
  w.forEach(function(x){if(IT[x])a++;if(EN[x])b++;});
  if(a>b*1.3)return 'it';
  if(b>a*1.3)return 'en';
  return null;
}

// ---------- lettura degli oggetti PDF ----------
function PdfLex(s){this.s=s;this.i=0;}
PdfLex.prototype.ws=function(){
  var s=this.s,c;
  for(;;){
    c=s.charCodeAt(this.i);
    if(c===32||c===10||c===13||c===9||c===12||c===0)this.i++;
    else if(c===37){while(this.i<s.length&&s.charCodeAt(this.i)!==10&&s.charCodeAt(this.i)!==13)this.i++;}
    else break;
  }
};
var PDF_NUM=/[+-]?(?:\d+\.?\d*|\.\d+)/y, PDF_REF=/\s+(\d+)\s+R(?![A-Za-z0-9])/y, PDF_DELIM=/[\s\/\[\]<>(){}%]/;
// Un valore: numero, {n:nome}, {s:stringa}, {r:riferimento}, {d:dizionario}, [array] oppure {k:parola chiave/operatore}
PdfLex.prototype.value=function(){
  this.ws();
  var s=this.s,c=s.charAt(this.i),j,v;
  if(this.i>=s.length)return undefined;
  if(c==='/'){
    j=this.i+1;while(j<s.length&&!PDF_DELIM.test(s.charAt(j)))j++;
    v=s.slice(this.i+1,j).replace(/#([0-9a-fA-F]{2})/g,function(m,h){return String.fromCharCode(parseInt(h,16));});
    this.i=j;return {n:v};
  }
  if(c==='('){
    var depth=1,o='';j=this.i+1;
    while(j<s.length&&depth>0){
      c=s.charAt(j);
      if(c==='\\'){
        var d=s.charAt(j+1);j+=2;
        if(d==='n')o+='\n';else if(d==='r')o+='\r';else if(d==='t')o+='\t';else if(d==='b')o+='\b';else if(d==='f')o+='\f';
        else if(/[0-7]/.test(d)){var oc=d;while(oc.length<3&&/[0-7]/.test(s.charAt(j))){oc+=s.charAt(j);j++;}o+=String.fromCharCode(parseInt(oc,8)&255);}
        else if(d==='\r'){if(s.charAt(j)==='\n')j++;}
        else if(d!=='\n')o+=d;
        continue;
      }
      if(c==='(')depth++;else if(c===')'){depth--;if(!depth){j++;break;}}
      o+=c;j++;
    }
    this.i=j;return {s:o};
  }
  if(c==='<'){
    if(s.charAt(this.i+1)==='<'){
      this.i+=2;var map={};
      for(;;){
        this.ws();
        if(this.i>=s.length)break;
        if(s.charAt(this.i)==='>'&&s.charAt(this.i+1)==='>'){this.i+=2;break;}
        var k=this.value();if(!k||k.n===undefined){continue;}
        map[k.n]=this.value();
      }
      return {d:map};
    }
    j=s.indexOf('>',this.i);if(j<0)j=s.length;
    var hex=s.slice(this.i+1,j).replace(/\s+/g,'');if(hex.length%2)hex+='0';
    o='';for(var q=0;q<hex.length;q+=2)o+=String.fromCharCode(parseInt(hex.substr(q,2),16));
    this.i=j+1;return {s:o};
  }
  if(c==='['){
    this.i++;var arr=[];
    for(;;){
      this.ws();
      if(this.i>=s.length)break;
      if(s.charAt(this.i)===']'){this.i++;break;}
      v=this.value();if(v===undefined)break;arr.push(v);
    }
    return arr;
  }
  if(c===']'||c==='>'||c===')'||c==='{'||c==='}'){this.i++;return {k:c};}
  PDF_NUM.lastIndex=this.i;
  var m=PDF_NUM.exec(s);
  if(m&&(this.i+m[0].length>=s.length||PDF_DELIM.test(s.charAt(this.i+m[0].length)))){
    this.i+=m[0].length;v=parseFloat(m[0]);
    if(Number.isInteger(v)&&v>=0&&/^\d+$/.test(m[0])){PDF_REF.lastIndex=this.i;var r=PDF_REF.exec(s);if(r){this.i+=r[0].length;return {r:v};}}
    return v;
  }
  j=this.i;while(j<s.length&&!PDF_DELIM.test(s.charAt(j)))j++;
  if(j===this.i)j++;
  v=s.slice(this.i,j);this.i=j;return {k:v};
};

function pdfLatin1(bytes){var o='',n=8192;for(var i=0;i<bytes.length;i+=n)o+=String.fromCharCode.apply(null,bytes.subarray(i,i+n));return o;}
function pdfInflate(bytes){
  if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('Questo browser non sa aprire il PDF.'));
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer().then(function(b){return new Uint8Array(b);});
}

function PdfDoc(bytes){
  this.bytes=bytes;this.s=pdfLatin1(bytes);this.objs={};this.cache={};this.unk=[];
  var re=/(\d+)\s+(\d+)\s+obj\b/g,m,s=this.s;
  while((m=re.exec(s))){
    var lex=new PdfLex(s);lex.i=re.lastIndex;
    var val=lex.value(),o={v:val,stream:null};
    lex.ws();
    if(s.substr(lex.i,6)==='stream'){
      var st=lex.i+6;if(s.charAt(st)==='\r')st++;if(s.charAt(st)==='\n')st++;
      var en=s.indexOf('endstream',st);if(en<0)en=s.length;
      var e2=en;if(s.charAt(e2-1)==='\n')e2--;if(s.charAt(e2-1)==='\r')e2--;
      o.stream=bytes.subarray(st,e2);re.lastIndex=en+9;
    }
    this.objs[m[1]]=o;
  }
}
PdfDoc.prototype.get=function(v){var n=0;while(v&&v.r!==undefined&&n++<20){var o=this.objs[v.r];v=o?o.v:undefined;}return v;};
PdfDoc.prototype.dict=function(v){v=this.get(v);return v&&v.d?v.d:null;};
PdfDoc.prototype.name=function(v){v=this.get(v);return v&&v.n!==undefined?v.n:null;};
PdfDoc.prototype.arr=function(v){v=this.get(v);return Array.isArray(v)?v:null;};
PdfDoc.prototype.num=function(v,d){v=this.get(v);return typeof v==='number'?v:d;};
PdfDoc.prototype.streamOf=function(ref){
  var self=this,o=ref&&ref.r!==undefined?this.objs[ref.r]:null;
  if(!o||!o.stream)return Promise.resolve(null);
  var d=o.v&&o.v.d||{},f=this.get(d.Filter),filters=[];
  if(Array.isArray(f))filters=f.map(function(x){return self.name(x);});else if(f&&f.n)filters=[f.n];
  var p=Promise.resolve(o.stream);
  filters.forEach(function(n){
    p=p.then(function(b){
      if(n==='FlateDecode'||n==='Fl')return pdfInflate(b);
      throw new Error('Il PDF usa una compressione ('+n+') che non so leggere.');
    });
  });
  return p;
};
// le pagine, nell'ordine, con le risorse (anche ereditate)
PdfDoc.prototype.pages=function(){
  var self=this,out=[],root=null,m=/\/Root\s+(\d+)\s+\d+\s+R/.exec(this.s);
  if(m)root=this.dict({r:parseInt(m[1],10)});
  if(!root)for(var id in this.objs){var d=this.dict({r:id});if(d&&this.name(d.Type)==='Catalog'){root=d;break;}}
  function walk(node,res,depth){
    var d=self.dict(node);if(!d||depth>40)return;
    var r=d.Resources!==undefined?d.Resources:res;
    if(self.name(d.Type)==='Pages'||d.Kids){(self.arr(d.Kids)||[]).forEach(function(k){walk(k,r,depth+1);});}
    else out.push({d:d,res:r});
  }
  if(root&&root.Pages)walk(root.Pages,null,0);
  if(!out.length)for(var id2 in this.objs){var dd=this.dict({r:id2});if(dd&&this.name(dd.Type)==='Page')out.push({d:dd,res:dd.Resources});}
  return out;
};

// ---------- font: da codice del carattere a testo e larghezza ----------
function pdfCMap(text){
  var map={},one=true,m,re;
  var cs=/begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(text);if(cs&&cs[1].length>2)one=false;
  function utf(h){if(h.length<=2)return String.fromCharCode(parseInt(h,16));var o='';for(var i=0;i+3<h.length+0;i+=4)o+=String.fromCharCode(parseInt(h.substr(i,4),16));return o;}
  re=/beginbfchar([\s\S]*?)endbfchar/g;
  while((m=re.exec(text))){var p=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g,x;while((x=p.exec(m[1])))map[parseInt(x[1],16)]=utf(x[2]);}
  re=/beginbfrange([\s\S]*?)endbfrange/g;
  while((m=re.exec(text))){
    var q=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]+>)/g,y;
    while((y=q.exec(m[1]))){
      var lo=parseInt(y[1],16),hi=parseInt(y[2],16),dst=y[3];
      if(dst.charAt(0)==='['){var items=dst.match(/<([0-9a-fA-F]+)>/g)||[];for(var k=0;k<items.length&&lo+k<=hi;k++)map[lo+k]=utf(items[k].slice(1,-1));}
      else{var h=dst.slice(1,-1),base=utf(h);for(var c=lo;c<=hi&&c-lo<65536;c++)map[c]=base.slice(0,-1)+String.fromCharCode(base.charCodeAt(base.length-1)+(c-lo));}
    }
  }
  return {map:map,one:one};
}
function pdfFont(doc,ref){
  var key=ref&&ref.r!==undefined?ref.r:null;
  if(key!==null&&doc.cache[key])return Promise.resolve(doc.cache[key]);
  var f=doc.dict(ref),font={bytes:1,map:null,enc:null,widths:null,first:0,dw:500,w2:null,doc:doc,unk:{}};
  if(!f)return Promise.resolve(font);
  var sub=doc.name(f.Subtype),base=(doc.name(f.BaseFont)||''),enc=f.Encoding?doc.get(f.Encoding):null;
  var encName=enc&&enc.n?enc.n:(enc&&enc.d&&enc.d.BaseEncoding?doc.name(enc.d.BaseEncoding):null);
  if(encName==='MacRomanEncoding')font.enc='mac';else if(encName==='WinAnsiEncoding')font.enc='win';
  if(/Courier/i.test(base))font.dw=600;
  if(sub==='Type0'){
    font.bytes=2;
    var df=(doc.arr(f.DescendantFonts)||[])[0],dd=doc.dict(df);
    if(dd){font.dw=doc.num(dd.DW,1000);var w=doc.arr(dd.W);if(w){font.w2={};var i=0;while(i<w.length){var c=doc.num(w[i],0),n2=doc.get(w[i+1]);if(Array.isArray(n2)){n2.forEach(function(x,k){font.w2[c+k]=doc.num(x,0);});i+=2;}else{var last=doc.num(n2,c),wv=doc.num(w[i+2],0);for(var cc=c;cc<=last&&cc-c<70000;cc++)font.w2[cc]=wv;i+=3;}}}}
  }else{
    font.first=doc.num(f.FirstChar,0);
    var wa=doc.arr(f.Widths);if(wa)font.widths=wa.map(function(x){return doc.num(x,0);});
  }
  var p=f.ToUnicode?doc.streamOf(f.ToUnicode):Promise.resolve(null);
  return p.then(function(b){
    if(b){var cm=pdfCMap(pdfLatin1(b));font.map=cm.map;if(sub!=='Type0'&&!cm.one)font.bytes=2;}
    if(key!==null)doc.cache[key]=font;
    return font;
  });
}
// Alcuni font (Calibri di Word) hanno un solo carattere per "tt", "tti", "fi"…, e il PDF non dice quali lettere sono.
// Non si indovina: si segna con un segnaposto {?1}, {?2}… e si propone una lettura (dalla larghezza del carattere)
// che la persona conferma. La proposta sceglie la prima, in ordine di frequenza, che ha una larghezza simile.
var PDF_LIGS=['tt','tti','ti','ff','fi','fl','ffi','ffl'];
function pdfLigSuggest(font,code){
  if(!font.widths||!font.map)return null;
  var cw={};
  Object.keys(font.map).forEach(function(c){var t=font.map[c],i=c-font.first;if(t.length===1&&i>=0&&i<font.widths.length&&!(t in cw))cw[t]=font.widths[i];});
  var i=code-font.first,w=i>=0&&i<font.widths.length?font.widths[i]:0;
  if(!w)return null;
  for(var n=0;n<PDF_LIGS.length;n++){
    var c=PDF_LIGS[n],sum=0,ok=true;
    for(var k=0;k<c.length;k++){if(cw[c.charAt(k)]===undefined){ok=false;break;}sum+=cw[c.charAt(k)];}
    if(ok&&Math.abs(sum-w)/w<0.12)return c;
  }
  return null;
}
// i caratteri di una stringa del PDF: [{t: testo, w: larghezza in millesimi, sp: è uno spazio}]
function pdfGlyphs(font,str){
  var out=[],step=font.bytes;
  for(var i=0;i+step<=str.length;i+=step){
    var code=step===2?(str.charCodeAt(i)<<8)|str.charCodeAt(i+1):str.charCodeAt(i),t;
    if(font.map&&font.map[code]!==undefined)t=font.map[code];
    else if(font.map){
      if(code===32)t=' ';
      else{
        var u=font.unk[code];
        if(!u){u=font.unk[code]={mark:'{?'+(font.doc.unk.length+1)+'}',suggest:pdfLigSuggest(font,code)};font.doc.unk.push(u);}
        t=u.mark;                                          // il PDF non dice che lettera è: si segna, non si indovina
      }
    }
    else if(font.enc==='mac'&&code>=128)t=PDF_MACROMAN.charAt(code-128);
    else if(font.enc==='win'&&code>=128)t=new TextDecoder('windows-1252').decode(Uint8Array.of(code));
    else t=code>=32?String.fromCharCode(code):'';
    var w=step===2?(font.w2&&font.w2[code]!==undefined?font.w2[code]:font.dw)
      :(font.widths&&code>=font.first&&code-font.first<font.widths.length?font.widths[code-font.first]:(code===32?250:font.dw));
    out.push({t:t,w:w,sp:code===32&&step===1});
  }
  return out;
}

// ---------- il testo di una pagina ----------
function pdfMul(a,b){return [a[0]*b[0]+a[1]*b[2],a[0]*b[1]+a[1]*b[3],a[2]*b[0]+a[3]*b[2],a[2]*b[1]+a[3]*b[3],a[4]*b[0]+a[5]*b[2]+b[4],a[4]*b[1]+a[5]*b[3]+b[5]];}
function pdfPageFragments(content,fonts){
  var lex=new PdfLex(content),stack=[],ops=[],ctm=[1,0,0,1,0,0],tm=[1,0,0,1,0,0],tlm=[1,0,0,1,0,0],font=null,size=1,tc=0,tw=0,th=1,tl=0,rise=0,frags=[],v;
  function show(str){
    if(!font)return;
    var gl=pdfGlyphs(font,str),t='',x0=pdfMul(tm,ctm),adv=0;
    gl.forEach(function(g){
      t+=g.t;
      var tx=((g.w/1000)*size+tc+(g.sp?tw:0))*th;
      tm=pdfMul([1,0,0,1,tx,0],tm);
    });
    var x1=pdfMul(tm,ctm);
    if(t)frags.push({x:x0[4],y:x0[5]+rise,end:x1[4],fs:Math.abs(size*Math.hypot(x0[2],x0[3]))||size,t:t});
  }
  function move(tx,ty){tlm=pdfMul([1,0,0,1,tx,ty],tlm);tm=tlm.slice();}
  while((v=lex.value())!==undefined){
    if(!(v&&v.k!==undefined&&!/^[\]>)}{]$/.test(v.k))){ops.push(v);continue;}
    var op=v.k,a=ops,n=a.length;
    if(op==='q')stack.push(ctm.slice());
    else if(op==='Q'){if(stack.length)ctm=stack.pop();}
    else if(op==='cm'&&n>=6)ctm=pdfMul(a.slice(n-6),ctm);
    else if(op==='BT'){tm=[1,0,0,1,0,0];tlm=tm.slice();}
    else if(op==='Tf'&&n>=2){font=fonts[a[n-2].n]||null;size=a[n-1];}
    else if(op==='Tc')tc=a[n-1];else if(op==='Tw')tw=a[n-1];else if(op==='Tz')th=a[n-1]/100;else if(op==='TL')tl=a[n-1];else if(op==='Ts')rise=a[n-1];
    else if(op==='Td'&&n>=2)move(a[n-2],a[n-1]);
    else if(op==='TD'&&n>=2){tl=-a[n-1];move(a[n-2],a[n-1]);}
    else if(op==='Tm'&&n>=6){tm=a.slice(n-6);tlm=tm.slice();}
    else if(op==='T*')move(0,-tl);
    else if(op==='Tj'&&n>=1&&a[n-1].s!==undefined)show(a[n-1].s);
    else if(op==="'"&&n>=1&&a[n-1].s!==undefined){move(0,-tl);show(a[n-1].s);}
    else if(op==='"'&&n>=3&&a[n-1].s!==undefined){tw=a[n-3];tc=a[n-2];move(0,-tl);show(a[n-1].s);}
    else if(op==='TJ'&&n>=1&&Array.isArray(a[n-1])){
      a[n-1].forEach(function(it){
        if(it&&it.s!==undefined)show(it.s);
        else if(typeof it==='number')tm=pdfMul([1,0,0,1,-it/1000*size*th,0],tm);
      });
    }
    else if(op==='BI'){var e=content.indexOf('EI',lex.i);lex.i=e<0?content.length:e+2;}
    ops=[];
  }
  return frags;
}
// da frammenti sparsi a righe di testo, nell'ordine in cui si leggono
function pdfLines(frags){
  var explicitSpaces=frags.some(function(f){return /\s/.test(f.t);});   // se gli spazi ci sono già, non se ne inventano
  frags.sort(function(a,b){return Math.abs(a.y-b.y)<0.35*Math.max(a.fs,b.fs)?a.x-b.x:b.y-a.y;});
  var lines=[],cur=null;
  frags.forEach(function(f){
    if(cur&&Math.abs(f.y-cur.y)<0.35*Math.max(f.fs,cur.fs)){cur.f.push(f);}
    else{cur={y:f.y,fs:f.fs,f:[f]};lines.push(cur);}
  });
  var out=[],prev=null;
  lines.forEach(function(l){
    l.f.sort(function(a,b){return a.x-b.x;});
    var s='',p=null;
    l.f.forEach(function(f){
      if(p){
        var gap=f.x-p.end,ps=/\s$/.test(s),ns=/^\s/.test(f.t);
        if(!explicitSpaces&&gap>0.18*Math.min(p.fs,f.fs)&&!ps&&!ns)s+=' ';
      }
      s+=f.t;p=f;
    });
    if(prev&&(prev.y-l.y)>1.9*Math.max(prev.fs,l.fs)*1.2)out.push('');
    out.push(s.replace(/[ \t]+$/,''));prev=l;
  });
  return out;
}
// Il testo di un PDF, pagina dopo pagina. Restituisce una promessa con {text, unknown}:
// unknown = lettere che il PDF non permette di leggere, segnate nel testo con {?1}, {?2}…
function pdfToText(buf){
  var bytes=buf instanceof Uint8Array?buf:new Uint8Array(buf);
  return Promise.resolve().then(function(){
    var head=pdfLatin1(bytes.subarray(0,1024));
    if(head.indexOf('%PDF-')<0)throw new Error('Questo non sembra un PDF.');
    var doc=new PdfDoc(bytes);
    if(/\/Encrypt\b/.test(doc.s.slice(-4096)))throw new Error('Il PDF è protetto da password.');
    if(/\/Type\s*\/ObjStm/.test(doc.s))throw new Error('Questo PDF ha una struttura che non so leggere.');
    var pages=doc.pages(),texts=[];
    if(!pages.length)throw new Error('Non trovo pagine nel PDF.');
    return pages.reduce(function(chain,pg){
      return chain.then(function(){
        var res=doc.dict(pg.res),fd=res&&doc.dict(res.Font),names=fd?Object.keys(fd):[],fonts={};
        return names.reduce(function(c2,nm){return c2.then(function(){return pdfFont(doc,fd[nm]).then(function(ft){fonts[nm]=ft;});});},Promise.resolve())
          .then(function(){
            var cont=pg.d.Contents,refs=Array.isArray(doc.get(cont))?doc.get(cont):[cont];
            return refs.reduce(function(c3,r){return c3.then(function(acc){return doc.streamOf(r).then(function(b){return acc+(b?pdfLatin1(b)+'\n':'');});});},Promise.resolve(''));
          })
          .then(function(content){texts.push(pdfLines(pdfPageFragments(content,fonts)).join('\n'));});
      });
    },Promise.resolve()).then(function(){
      var t=texts.join('\n\n').replace(/\n{3,}/g,'\n\n').trim();
      if(!/[\p{L}]{3}/u.test(t))throw new Error('Nel PDF non trovo testo: forse è una scansione. Incolla il testo a mano.');
      t=t.normalize('NFKC').replace(/\u00a0/g,' ');
      var unknown=[];
      doc.unk.forEach(function(u){
        var re=new RegExp('[^\\s]*'+u.mark.replace(/[{}?]/g,'\\$&')+'[^\\s]*','g'),m,ctx=[];
        while((m=re.exec(t))&&ctx.length<3)if(ctx.indexOf(m[0])<0)ctx.push(m[0]);
        if(ctx.length)unknown.push({mark:u.mark,suggest:u.suggest,ctx:ctx});
      });
      return {text:t,unknown:unknown};
    });
  });
}
