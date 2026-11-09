var CP={0x20AC:0x80,0x201A:0x82,0x0192:0x83,0x201E:0x84,0x2026:0x85,0x2020:0x86,0x2021:0x87,0x02C6:0x88,0x2030:0x89,0x0160:0x8A,0x2039:0x8B,0x0152:0x8C,0x017D:0x8E,0x2018:0x91,0x2019:0x92,0x201C:0x93,0x201D:0x94,0x2022:0x95,0x2013:0x96,0x2014:0x97,0x02DC:0x98,0x2122:0x99,0x0161:0x9A,0x203A:0x9B,0x0153:0x9C,0x017E:0x9E,0x0178:0x9F};
function hex2(n){return ('0'+n.toString(16)).slice(-2);}
function esc(s){
  var o='';
  for(var i=0;i<s.length;i++){
    var c=s.charAt(i),cc=s.charCodeAt(i);
    if(c==='\\'||c==='{'||c==='}')o+='\\'+c;
    else if(cc<128)o+=c;
    else if(cc>=0xA0&&cc<=0xFF)o+="\\'"+hex2(cc);
    else if(CP[cc]!==undefined)o+="\\'"+hex2(CP[cc]);
    else o+='\\uc0\\u'+(cc>32767?cc-65536:cc)+' ';
  }
  return o;
}


// Il contrario di esc(): dal testo RTF di una slide al testo semplice.
var CPR={};Object.keys(CP).forEach(function(u){CPR[CP[u]]=+u;});
function rtfPlain(s){
  var i=s.indexOf('\\cf');if(i<0)i=s.indexOf('\\f0\\fs');if(i>=0)s=s.slice(i);   // salta l'intestazione (font e colori): il testo comincia al primo \cf
  var o='',m,re=/\\uc0\\u(-?\d+) ?|\\'([0-9a-fA-F]{2})|\\([\\{}])|\\[a-zA-Z]+-?\d* ?|[{}]|([^\\{}]+)/g;
  while((m=re.exec(s))){
    if(m[1]!==undefined){var n=+m[1];o+=String.fromCharCode(n<0?n+65536:n);}
    else if(m[2]!==undefined){var c=parseInt(m[2],16);o+=String.fromCharCode(CPR[c]||c);}
    else if(m[3]!==undefined)o+=m[3];
    else if(m[4]!==undefined)o+=m[4];
  }
  return o;
}
