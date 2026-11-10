// ====================== libri della Bibbia ======================
const BOOKS=[["Genesi","gen ge gn"],["Esodo","eso es ex"],["Levitico","lev le lv"],["Numeri","num nu nm"],["Deuteronomio","deu de dt"],["Giosuè","gios giosue gs"],["Giudici","giud gdc"],["Rut","rut ru"],["1 Samuele","1sam 1sa 1sm"],["2 Samuele","2sam 2sa 2sm"],["1 Re","1re 1r"],["2 Re","2re 2r"],["1 Cronache","1cr 1cron 1cronache"],["2 Cronache","2cr 2cron 2cronache"],["Esdra","esd esdra"],["Neemia","nee neemia ne"],["Ester","est ester"],["Giobbe","gb giob giobbe"],["Salmi","sal salmo salmi sl"],["Proverbi","pro prov proverbi pr"],["Ecclesiaste","ecc eccl ecclesiaste"],["Cantico dei Cantici","cant cantico ct"],["Isaia","is isa isaia"],["Geremia","ger geremia"],["Lamentazioni","lam lamentazioni"],["Ezechiele","ez ezech ezechiele"],["Daniele","dan daniele dn"],["Osea","os osea"],["Gioele","gl gioele"],["Amos","am amos"],["Abdia","abd abdia"],["Giona","gn giona"],["Michea","mic michea"],["Naum","na naum"],["Abacuc","abac abacuc"],["Sofonia","sof sofonia"],["Aggeo","agg aggeo"],["Zaccaria","zac zaccaria"],["Malachia","mal malachia"],["Matteo","mt mat matteo"],["Marco","mr mc mar marco"],["Luca","lu lc luc luca"],["Giovanni","gv gio giov giovanni"],["Atti","at att atti"],["Romani","ro rom romani rm"],["1 Corinzi","1co 1cor 1corinzi"],["2 Corinzi","2co 2cor 2corinzi"],["Galati","ga gal galati"],["Efesini","ef efe efes efesini"],["Filippesi","fil filip filippesi fp"],["Colossesi","col colos colossesi"],["1 Tessalonicesi","1te 1tes 1tess 1tessalonicesi"],["2 Tessalonicesi","2te 2tes 2tess 2tessalonicesi"],["1 Timoteo","1ti 1tim 1timoteo"],["2 Timoteo","2ti 2tim 2timoteo"],["Tito","tit tito"],["Filemone","fm filem filemone"],["Ebrei","eb ebr ebrei"],["Giacomo","gc giac giacomo"],["1 Pietro","1pt 1pi 1pie 1pietro"],["2 Pietro","2pt 2pi 2pie 2pietro"],["1 Giovanni","1gv 1gio 1giov 1giovanni"],["2 Giovanni","2gv 2gio 2giov 2giovanni"],["3 Giovanni","3gv 3gio 3giov 3giovanni"],["Giuda","gd giuda"],["Apocalisse","ap apoc apocalisse"]];
const ALIAS={};
BOOKS.forEach(function(b){ALIAS[b[0].toLowerCase().replace(/\s/g,'')]=b[0];b[1].split(' ').forEach(function(a){ALIAS[a]=b[0];});});
function canonBook(s){
  const k=s.toLowerCase().replace(/[\s\.]/g,'').normalize('NFC');
  if(ALIAS[k])return ALIAS[k];
  if(k.length<3)return null;
  let set={},n=0;
  Object.keys(ALIAS).forEach(function(a){if(a.indexOf(k)===0&&!set[ALIAS[a]]){set[ALIAS[a]]=1;n++;}});
  return n===1?Object.keys(set)[0]:null;
}


