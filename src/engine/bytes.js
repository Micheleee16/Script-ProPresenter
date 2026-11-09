function latin1Str(b){var s='';for(var i=0;i<b.length;i++)s+=String.fromCharCode(b[i]);return s;}
function latin1Bytes(s){var u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i)&255;return u;}
function uuid4(){var a=new Uint8Array(16);crypto.getRandomValues(a);a[6]=(a[6]&0x0f)|0x40;a[8]=(a[8]&0x3f)|0x80;var h=Array.prototype.map.call(a,function(x){return ('0'+x.toString(16)).slice(-2);}).join('').toUpperCase();return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);}
var UU=/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/g;
function remap(b){var m={};return latin1Bytes(latin1Str(b).replace(UU,function(k){if(!m[k])m[k]=uuid4();return m[k];}));}

