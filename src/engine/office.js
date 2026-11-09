
// ====================== zip, Word (.docx) e file da WhatsApp ======================
// Un lettore minimo di zip, quanto basta per un documento Word (.docx) o per l'esportazione di una chat
// di WhatsApp (un .zip con dentro _chat.txt).
function zipList(b){
  var i=b.length-22;
  while(i>=0&&!(b[i]===0x50&&b[i+1]===0x4b&&b[i+2]===5&&b[i+3]===6))i--;
  if(i<0)throw new Error('Questo non sembra un file zip.');
  var dv=new DataView(b.buffer,b.byteOffset,b.byteLength),n=dv.getUint16(i+10,true),p=dv.getUint32(i+16,true),out=[];
  if(n===0xffff||p===0xffffffff)throw new Error('Questo zip è troppo grande per la pagina.');
  for(var k=0;k<n;k++){
    if(p+46>b.length||dv.getUint32(p,true)!==0x02014b50)break;
    var flag=dv.getUint16(p+8,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),nm=b.subarray(p+46,p+46+nl),name;
    try{name=new TextDecoder('utf-8',{fatal:true}).decode(nm);}catch(e){name=latin1Str(nm);}
    out.push({name:name,flag:flag,method:dv.getUint16(p+10,true),csize:dv.getUint32(p+20,true),usize:dv.getUint32(p+24,true),lho:dv.getUint32(p+42,true)});
    p+=46+nl+el+cl;
  }
  return out;
}
function zipRead(b,e){
  var dv=new DataView(b.buffer,b.byteOffset,b.byteLength),l=e.lho;
  if(l+30>b.length||dv.getUint32(l,true)!==0x04034b50)return Promise.reject(new Error('Lo zip è danneggiato.'));
  var start=l+30+dv.getUint16(l+26,true)+dv.getUint16(l+28,true),data=b.subarray(start,start+e.csize);
  if(e.method===0)return Promise.resolve(data);
  if(e.method!==8)return Promise.reject(new Error('Lo zip usa una compressione che non so leggere.'));
  if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('Questo browser non sa aprire il file.'));
  return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer().then(function(x){return new Uint8Array(x);});
}
function xmlText(s){
  return s.replace(/&#x([0-9a-fA-F]+);/g,function(m,h){return String.fromCodePoint(parseInt(h,16));})
    .replace(/&#(\d+);/g,function(m,d){return String.fromCodePoint(parseInt(d,10));})
    .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
}
// Il testo di word/document.xml: un paragrafo per riga, a capo e tabulazioni rispettati
function docxXmlToText(xml){
  var out=[],cur='';
  var re=/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<w:cr\s*\/>|<\/w:p>/g,m;
  while((m=re.exec(xml))){
    if(m[0]==='</w:p>'){out.push(cur);cur='';}
    else if(m[1]!==undefined)cur+=xmlText(m[1]);
    else if(/^<w:tab/.test(m[0]))cur+=' ';
    else cur+='\n';
  }
  if(cur)out.push(cur);
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trim();
}
function docxToText(bytes){
  return Promise.resolve().then(function(){
    var es=zipList(bytes),e=es.filter(function(x){return x.name==='word/document.xml';})[0];
    if(!e)throw new Error('Non è un documento Word.');
    return zipRead(bytes,e).then(function(d){return docxXmlToText(new TextDecoder('utf-8').decode(d));});
  });
}
// Dentro uno zip: il testo della chat di WhatsApp (_chat.txt) o, in mancanza, il primo file di testo
function zipTextFile(bytes){
  return Promise.resolve().then(function(){
    var es=zipList(bytes).filter(function(x){return !/(^|\/)__MACOSX\//.test(x.name)&&!/\/$/.test(x.name);});
    var e=es.filter(function(x){return /(^|\/)_chat\.txt$/i.test(x.name);})[0]||es.filter(function(x){return /\.txt$/i.test(x.name);}).sort(function(a,b){return b.usize-a.usize;})[0];
    if(!e)throw new Error('Nello zip non trovo un file di testo (per WhatsApp: esporta la chat "senza media").');
    return zipRead(bytes,e).then(function(d){return decodeTextFile(d);});
  });
}
// Qualunque file: PDF, Word, zip o testo. Restituisce {text, unknown}
function fileToText(name,bytes){
  var head=latin1Str(bytes.subarray(0,5)),n=(name||'').toLowerCase();
  if(head==='%PDF-'||/\.pdf$/.test(n))return pdfToText(bytes);
  if(head.slice(0,2)==='PK'||/\.(zip|docx)$/.test(n)){
    if(/\.docx$/.test(n)||(function(){try{return zipList(bytes).some(function(x){return x.name==='word/document.xml';});}catch(e){return false;}})())
      return docxToText(bytes).then(function(t){return {text:t,unknown:[]};});
    return zipTextFile(bytes).then(function(t){return {text:t,unknown:[]};});
  }
  return Promise.resolve({text:decodeTextFile(bytes),unknown:[]});
}
