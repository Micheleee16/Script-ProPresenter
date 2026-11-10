// ---------- canzoni ----------
const SONG_COL={verse:'#5aa9ff',prechorus:'#cc298c',chorus:'#b04dff',bridge:'#3fc1e6',outro:'#d33a3a',tag:'#d33a3a',intro:'#9aa3ad',inst:'#9aa3ad'};
const BLANK_TYPES={intro:1,inst:1,tag:1};

// Quante righe occuperà una riga italiana sulla slide: si misura con il carattere vero (Helvetica Neue Bold 80)
// nella casella larga 1920 punti. Se il carattere non c'è, ci si avvicina con Arial/Helvetica.
let fitCache={},fitCtx=null;
function fitLines(text){
  const up=String(text).toUpperCase();
  if(fitCache[up]!==undefined)return fitCache[up];
  let n;
  try{
    fitCtx=fitCtx||document.createElement('canvas').getContext('2d');
    fitCtx.font='700 80px "Helvetica Neue",Helvetica,Arial,sans-serif';
    let words=up.split(/\s+/),cur='';n=1;
    words.forEach(function(w){const t=cur?cur+' '+w:w;if(fitCtx.measureText(t).width>1840&&cur){n++;cur=w;}else cur=t;});
  }catch(e){n=slideFit([text]);}
  return (fitCache[up]=n);
}
function songPreviewHtml(s,r){
  let out='<div class="sprev">';
  r.slides.forEach(function(sl){
    const rows=fitLines(sl.it[0]),long=rows>2;
    out+='<figure class="sp'+(long?' long':'')+'"><div class="sl"><span class="sl-it">'+h(sl.it[0].toUpperCase())+'</span><span class="sl-lb">SONGS</span>'+(long?'<span class="sl-tag">'+rows+' righe: non entra</span>':'')+'</div><figcaption>'+h(sl.en.join(' / '))+'</figcaption></figure>';
  });
  return out+'</div>';
}
function dockSay(cls,icon,txt){
  const st=$('dlstatus'),key=cls+'|'+txt;
  if(st._k===key)return;st._k=key;
  st.className='status '+(cls||'');st.innerHTML=(icon||'')+'<span>'+h(txt)+'</span>';
}
// ---------- annulla ----------
function snapshot(){const G=state.song;return {it:$('c-it').value,en:$('c-en').value,order:JSON.stringify(G.order),touched:G.touched,extra:JSON.stringify(G.extra),fix:JSON.stringify(G.fix)};}
function pushUndo(){const G=state.song;G.undo.push(snapshot());if(G.undo.length>40)G.undo.shift();paintUndo();}
function paintUndo(){$('c-undo').hidden=!state.song.undo.length;}
function songUndo(){
  const G=state.song,s=G.undo.pop();if(!s)return;
  $('c-it').value=s.it;$('c-en').value=s.en;G.order=JSON.parse(s.order);G.touched=s.touched;G.extra=JSON.parse(s.extra);G.fix=JSON.parse(s.fix);
  state.editing=null;state.done=null;paintUndo();analyzeSong();toast('Annullato');
}
function ensureSec(m,key){
  if(m.secs[key])return m.secs[key];
  const type=key.replace(/\d+$/,''),n=parseInt((key.match(/\d+$/)||[0])[0],10)||0;
  if(!SEC_TYPES[type])return null;
  return (m.secs[key]={key:key,type:type,name:secName(type,n),it:[],en:[],hasIt:false,hasEn:false,itJ:[],enJ:[]});
}
function autoOrder(keys){const occ={};return keys.map(function(k){occ[k]=(occ[k]||0)+1;return {id:k+'#'+occ[k],key:k};});}

// ---------- lettura dei testi ----------
function analyzeSong(){
  const G=state.song,itT=$('c-it').value,enT=$('c-en').value;
  state.done=null;
  songFixRender('it');songFixRender('en');
  $('c-wrap').classList.toggle('has-text',!!(itT.trim()||enT.trim()));
  if(!itT.trim()&&!enT.trim()){G.model=null;G.view=null;renderSong();return;}
  const it=parseSongText(itT,'Italiano'),en=parseSongText(enT,'Inglese'),m=makeSong(it,en);
  m.itInfo=it;m.enInfo=en;
  Object.keys(G.extra).forEach(function(k){ensureSec(m,k);});
  if(!G.touched||!G.order)G.order=autoOrder(m.order);
  else G.order=G.order.filter(function(o){return m.secs[o.key];});
  G.model=m;
  if(!state.nameTouched&&m.title)$('nome').value=m.title+' - ITA + ENG';
  renderSong();
}

// ---------- che cosa mostrare ----------
function songView(G){
  let m=G.model,blocks=[],items=[],errors=[],slides=0,nWarn=0,nMis=0,misSig=[],seen={};
  G.order.forEach(function(o,i){
    const s=m.secs[o.key],r=sectionSlides(s),notes=[],first=!seen[o.key];seen[o.key]=1;
    if(r.error){if(first)notes.push({k:'e',msg:r.error});if(errors.indexOf(r.error)<0)errors.push(r.error);}
    else{
      if(r.mismatch.length&&first){notes.push(songMismatchNote(s,r));nWarn++;nMis++;misSig.push(s.key+r.counts.join('/'));}
      r.slides.forEach(function(sl,j){
      const rows=fitLines(sl.it[0]);
      if(rows>2&&first){
        notes.push({k:'w',msg:'Slide '+(j+1)+': la riga va su '+rows+' righe'});
        nWarn++;
      }
      });
    }
    slides+=r.blank?1:r.slides.length;
    blocks.push({key:o.key,name:s.name,type:s.type,blank:!!r.blank,slides:r.slides,error:r.error});
    items.push({o:o,s:s,r:r,notes:notes,i:i,n:G.order.length,first:first});
  });
  let pend=0;
  Object.keys(m.secs).forEach(function(k){m.secs[k].it.concat(m.secs[k].en).forEach(function(l){if(FIX_MARK.test(l))pend++;});});
  if(pend){const msg='Ci sono lettere del PDF da confermare ({?1}…)';if(errors.indexOf(msg)<0)errors.push(msg);}
  const info=[];
  if(m.chords.length)info.push(pl(m.chords.length,'riga di accordi tolta','righe di accordi tolte')+' ('+m.chords.filter(function(c,i,a){return a.indexOf(c)===i;}).slice(0,6).join(', ')+')');
  if(m.strays.length){nWarn++;info.push('Righe fuori da una sezione: "'+m.strays.slice(0,3).join('" · "')+'"');}
  m.warns.forEach(function(w){nWarn++;info.push(w);});
  return {items:items,blocks:blocks,errors:errors,slides:slides,nWarn:nWarn,nMis:nMis,misSig:misSig.join('|'),info:info};
}

function lineHtml(side,key,gi,text,shown){
  const ed=state.editing,m=state.song.model,sc=m&&m.secs[key],last=!sc||gi>=(side==='it'?sc.it.length:sc.en.length)-1;
  if(ed&&ed.key===key&&ed.side===side&&ed.i===gi)
    return '<span class="editor"><input class="ed-in" type="text" value="'+h(text)+'" aria-label="Modifica la riga" spellcheck="false"><span class="ed-btns"><button type="button" class="btn small primary" data-act="ed-save">Salva</button><button type="button" class="btn small" data-act="ed-split">Spezza qui</button><button type="button" class="btn small" data-act="ed-merge"'+(last?' disabled':'')+'>Unisci con la successiva</button><button type="button" class="btn small ghost" data-act="ed-cancel">Annulla</button></span><span class="ed-hint">Cursore dove andare a capo, poi «Spezza qui». Invio salva, Esc annulla.</span></span>';
  return '<button type="button" class="ln" data-act="edit" data-side="'+side+'" data-i="'+gi+'" title="Correggi o spezza la riga" aria-label="Correggi o spezza la riga: '+h(text)+'"><span class="tx">'+h(shown)+'</span><span class="pen">'+ICON.pen+'</span></button>';
}
function songPairsHtml(s,r){
  let out='<div class="pairs"><div class="ph" style="grid-area:1/1">Slide (italiano)</div><div class="ph" style="grid-area:1/2">Note (inglese)</div>',row=2,slideNo=0,k;
  r.groups.forEach(function(g){
    const rows=g.it.length,mis=g.it.length!==g.en.length,cls=mis?' mis':'';
    g.it.forEach(function(l,j){
      out+='<div class="cell it'+cls+'" style="grid-area:'+(row+j)+'/1"><span class="no">'+(++slideNo)+'</span>'+lineHtml('it',s.key,g.itFrom-1+j,l,l.toUpperCase())+'</div>';
    });
    let html='<div class="cell en'+cls+'" style="grid-area:'+row+'/2/span '+rows+'">';
    g.en.forEach(function(l,j){html+=lineHtml('en',s.key,g.enFrom-1+j,l,l);});
    if(mis)html+='<span class="mtag">'+(g.it.length>g.en.length?pl(g.it.length,'riga italiana','righe italiane')+' per '+pl(g.en.length,'riga inglese','righe inglesi'):pl(g.en.length,'riga inglese','righe inglesi')+' per '+pl(g.it.length,'riga italiana','righe italiane'))+'</span>';
    out+=html+'</div>';
    row+=rows;
  });
  return out+'</div>';
}
function misRange(a,b){return a===b?String(a):a+'-'+b;}
function cut(t){t=String(t);return t.length>38?t.slice(0,38)+'…':t;}
// dove le righe non corrispondono, in parole
function songMismatchNote(s,r){
  const items=r.mismatch.map(function(g){
    const it=g.it.map(function(l){return '«'+cut(l)+'»';}).join(' · '),en=g.en.map(function(l){return '«'+cut(l)+'»';}).join(' · ');
    return g.it.length>g.en.length
      ?'Righe italiane '+misRange(g.itFrom,g.itTo)+' ('+it+') ↔ riga inglese '+misRange(g.enFrom,g.enTo)+' ('+en+')'
      :'Righe inglesi '+misRange(g.enFrom,g.enTo)+' ('+en+') ↔ riga italiana '+misRange(g.itFrom,g.itTo)+' ('+it+')';
  });
  return {k:'w',html:'<b>'+r.counts[0]+' righe italiane, '+r.counts[1]+' inglesi</b><ul class="mis-l">'+items.map(function(x){return '<li>'+h(x)+'</li>';}).join('')+'</ul><span class="mis-h">Tocca una riga per spezzarla o unirla.</span>'};
}
function songCardHtml(c){
  const s=c.s,btn=function(act,label,icon,dis){return '<button type="button" class="ib" data-act="'+act+'" aria-label="'+label+': '+h(s.name)+'" title="'+label+'"'+(dis?' disabled':'')+'>'+icon+'</button>';};
  const acts='<span class="acts">'+btn('up','Sposta su',ICON.up,c.i===0)+btn('down','Sposta giù','<span class="flip">'+ICON.up+'</span>',c.i===c.n-1)+btn('dup','Duplica',ICON.copy,false)+btn('del','Elimina',ICON.trash,false)+'</span>';
  const meta=c.r.blank?'slide vuota':(c.r.error?'da sistemare':pl(c.r.slides.length,'slide','slide'));
  const body=c.r.blank?'':(c.first?(state.song.vista==='preview'?songPreviewHtml(s,c.r):songPairsHtml(s,c.r)):'<p class="same">Come la prima «'+h(s.name)+'»</p>');
  const notes=c.notes.length?'<ul class="notes">'+c.notes.map(noteHtml).join('')+'</ul>':'';
  const cls=c.notes.some(function(n){return n.k==='e';})?' err':(c.notes.length?' has-warn':'')+(c.first?'':' copy');
  return '<article class="pc song'+cls+'" style="--sc:'+(SONG_COL[s.type]||'#9aa3ad')+'"><header class="pc-h"><h3>'+h(s.name)+'</h3><span class="meta">'+meta+'</span>'+acts+'</header>'+notes+body+'</article>';
}

function renderSong(){
  const G=state.song,m=G.model;
  let itN=0,enN=0;
  $('c-empty').hidden=!!m;$('c-review').hidden=!m;
  if(!m){
    reconcile($('c-list'),[],'c-');
    $('c-count').textContent='';$('c-count').className='count';
    G.view=null;state.counts={err:0,warn:0,slides:0,passages:0};renderDock();paintUndo();draftQueue();return;
  }
  const v=G.view=songView(G);
  itN=Object.keys(m.itInfo.lib).length;enN=Object.keys(m.enInfo.lib).length;
  $('c-count').textContent='IT '+pl(itN,'sezione','sezioni')+' · EN '+pl(enN,'sezione','sezioni');
  $('c-count').className='count '+(itN&&enN?'ok':'');

  // elenco delle sezioni
  const items=v.items.map(function(c,idx){
    const sig=hash(JSON.stringify([c.s.name,c.s.it,c.s.en,c.r.error,c.notes,c.i,c.n,c.first,state.song.vista,state.editing&&state.editing.key===c.s.key?state.editing:0]));
    return {key:c.o.id,sig:sig,pid:idx,html:songCardHtml(c)};
  });
  reconcile($('c-list'),items,'c-');

  // riepilogo
  const nErr=v.errors.length,nWarn=v.nWarn,st=nErr?'err':(nWarn?'warn':'ok'),sum=$('c-sum'),sic=$('c-sum-ic');
  if(sum.getAttribute('data-state')!==st||!sic.innerHTML){
    sum.setAttribute('data-state',st);
    sic.innerHTML=st==='ok'?ICON.check:(st==='warn'?ICON.warn:ICON.err);
    replay(sic,'pop');
  }
  $('c-sum-t').textContent=v.blocks.length?pl(v.blocks.length,'sezione','sezioni')+' · '+pl(v.slides,'slide','slide'):'Nessuna sezione';
  $('c-sum-p').textContent=nErr?v.errors[0]:(nWarn?pl(nWarn,'punto','punti')+' da controllare':'Tutto a posto');
  $('c-sum-go').hidden=!(nErr||nWarn);

  // aggiungere sezioni, cambiare ordine
  let sel=$('c-add'),keep=sel.value,opts='';
  Object.keys(m.secs).forEach(function(k){opts+='<option value="'+h(k)+'">'+h(m.secs[k].name)+'</option>';});
  ['intro','inst','tag'].forEach(function(k){if(!m.secs[k])opts+='<option value="'+k+'">'+h(secName(k,0))+'</option>';});
  if(sel._o!==opts){sel.innerHTML=opts;sel._o=opts;if(keep)sel.value=keep;}
  const curKeys=G.order.map(function(o){return o.key;}).join(',');
  const arr=m.arrangement,arrKeys=arr?arr.keys.join(','):'';
  $('c-ord-en').hidden=!G.touched;
  $('c-ord-hd').hidden=!(arr&&arrKeys!==curKeys);
  $('c-ord-hd').title=arr?'Ordine indicato: '+arr.src:'';

  // note
  $('c-info').hidden=!v.info.length;
  $('c-info-s').textContent=pl(v.info.length,'nota','note');
  $('c-info-l').innerHTML=v.info.map(function(x){return '<li>'+h(x)+'</li>';}).join('');
  state.counts={err:nErr,warn:nWarn,slides:v.slides,passages:v.blocks.length};
  renderDock();
  paintUndo();draftQueue();
}

// ---------- barra Scarica ----------
function renderDockSong(){
  const G=state.song,btn=$('dlbtn'),v=G.view;
  $('dlpro').hidden=true;
  const s=state.busy?'work':(state.done?'done':'idle');
  const mis=v&&v.nMis?v.nMis:0;
  if(v&&G.misSigSeen!==v.misSig){G.misSigSeen=v.misSig;$('ack').checked=false;}      // righe cambiate: la conferma vale da capo
  $('ackwrap').hidden=!mis;
  if(mis)$('acktext').textContent=mis===1?'Ho controllato le righe: scarica comunque':'Ho controllato le '+mis+' sezioni: scarica comunque';
  btn.setAttribute('data-state',s);
  qs('.dl-t',btn).textContent=s==='work'?'Preparo…':(s==='done'?'Scaricato':'Scarica');
  if(!v||!v.blocks.length){btn.disabled=true;dockSay('','','');return;}
  if(v.errors.length){btn.disabled=true;dockSay('bad',ICON.err,v.errors[0]);return;}
  btn.disabled=state.busy||(mis>0&&!$('ack').checked);
  if(mis&&!$('ack').checked&&!state.done){dockSay('warn',ICON.warn,'Righe non in pari: conferma per scaricare');return;}
  if(state.done){dockSay('ok',ICON.check,(state.verified?'Scaricato e controllato':'Scaricato')+'. Trascinalo in ProPresenter.');return;}
  if(v.nWarn)dockSay('warn',ICON.warn,pl(v.nWarn,'punto','punti')+' da controllare');
  else dockSay('ok',ICON.check,'Pronto');
}
function downloadSong(){
  const G=state.song,v=G.view;
  if(!v||v.errors.length||!v.blocks.length||state.busy||(v.nMis&&!$('ack').checked))return;
  state.busy=true;renderDock();
  setTimeout(function(){
    try{
      const nm=nome(),o=songOpts(),bytes=buildSongFile(v.blocks,nm,o);
      const problems=verifySongFile(bytes,v.blocks,{video:o.video});
      if(problems.length)throw new Error('il controllo finale ha trovato una differenza. '+problems[0]);
      const fname=nm.replace(/[\/:\\]/g,'-')+'.pro';
      saveBlob(bytes,fname);state.done=fname;state.verified=true;toast('Scaricato');
    }catch(e){
      state.done=null;state.verified=false;
      const st=$('dlstatus');st._k='';st.className='status bad';st.innerHTML=ICON.err+'<span>Non scarico il file perché non è sicuro ('+h(e&&e.message||e)+'). Riprova, e se succede ancora avvisa chi mantiene la pagina.</span>';
      state.busy=false;$('dlbtn').setAttribute('data-state','idle');qs('.dl-t',$('dlbtn')).textContent='Scarica';
      return;
    }
    state.busy=false;renderDock();
  },reduced()?0:500);
}

