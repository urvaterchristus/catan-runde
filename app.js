import {sameGame,exportExchangeData,deletionIds} from './exchange.js';
import {importPCGames} from './legacy.js';
import {statistics} from './statistics.js';
import {FIELDS,makeDemo,createGame,today,updateResult,candidates,awardOwner,chooseAward,points,review,confirmGame,winners} from './model.js';

const KEY='catan-runde-local-v1';
const root=document.querySelector('#app');
const dialog=document.querySelector('#new-game');
let fileMode='import';
let state,view='overview',toastTimer,saveError='';
const e=(value)=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const game=()=>state.games.find(g=>g.id===state.activeGameId);
const actor=()=>game().players.find(p=>p.id===state.actorId);
const formatDate=d=>new Intl.DateTimeFormat('de-DE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${d}T12:00:00`));
const avatar=p=>`<span class="avatar" style="--avatar:${e(p.color)}" aria-hidden="true">${e(p.name.slice(0,1))}</span>`;

function persist(){
  try {localStorage.setItem(KEY,JSON.stringify(state));saveError='';return true;}
  catch {saveError='Dein Browser konnte die Eingaben nicht dauerhaft speichern. Bitte exportiere die Daten, bevor du die Seite schließt.';return false;}
}
function toast(message){const el=document.querySelector('#toast');el.textContent=message;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),4200);}
function submitted(g){return g.players.filter(p=>g.results[p.id].status==='submitted').length;}
function connection(){return navigator.onLine?'Nur auf diesem Gerät · keine Cloud-Verbindung':'Ohne Internet · nur auf diesem Gerät';}
function banner(g){return `<div class="game-banner"><div class="row"><div><span class="section-kicker">Catan Classic · Partie ${state.games.indexOf(g)+1}</span><h2>${e(g.place||'Unsere Spielrunde')}</h2><div class="game-meta"><span>${e(formatDate(g.date))}</span><span>${g.players.length} Spieler</span>${g.country?`<span>${e(g.country)}</span>`:''}</div></div><span class="number" aria-hidden="true">${String(state.games.indexOf(g)+1).padStart(2,'0')}</span></div></div>`;}
function render(){
  if(!game()){renderEmpty();return;}
  const g=game(),p=actor(),done=submitted(g),host=true;
  if(!g||!p) throw Error('Ungültiger lokaler Spielstand.');
  root.innerHTML=`<header class="topbar"><div class="top-inner"><a class="brand" href="#overview" aria-label="Catan Runde – Spielübersicht"><span class="brand-mark" aria-hidden="true">C</span><span class="brand-text">Catan Runde<span class="brand-sub">Classic · Am Spieltisch</span></span></a><div class="top-label"><span>◇</span><span>Eure Runde. Eure Ergebnisse.</span></div></div></header>
    
    <div class="shell"><div class="page-heading"><div><p class="eyebrow">Gemeinsam am Spieltisch</p><h1>Unsere Partie</h1><p class="subtle">Du erfasst die Werte für alle Spieler.</p></div><button class="button" data-action="new"><span aria-hidden="true">＋</span> Neue Partie</button></div>
    <div class="workspace"><aside class="sidebar"><div class="identity"><label for="actor">Werte eintragen für</label><select id="actor">${g.players.map(x=>`<option value="${e(x.id)}" ${x.id===p.id?'selected':''}>${e(x.name)}${x.id===g.hostId?' · Spielleitung':''}</option>`).join('')}</select><p class="subtle">Wähle den Spieler, dessen Werte du eintragen möchtest.</p></div>
    <nav class="nav" aria-label="Partie"><button data-view="stats" class="${view==='stats'?'active':''}">Statistiken</button><button data-view="overview" class="${view==='overview'?'active':''}" ${view==='overview'?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">▦</span> Übersicht <span class="count">${done}/${g.players.length}</span></button><button data-view="entry" class="${view==='entry'?'active':''}" ${view==='entry'?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">✎</span> Spielerwerte</button><button data-view="review" class="${view==='review'?'active':''}" ${view==='review'?'aria-current="page"':''}><span class="nav-icon" aria-hidden="true">✓</span> ${g.status==='confirmed'?'Ergebnis':'Prüfen'}</button></nav>
    <div class="select-game"><label for="game-select">Lokale Partien</label><select id="game-select">${state.games.map((x,i)=>`<option value="${e(x.id)}" ${x.id===g.id?'selected':''}>${i+1} · ${e(x.place||'Spielrunde')}${x.status==='confirmed'?' ✓':''}</option>`).join('')}</select></div>
    <div class="sidebar-note"><strong>Alles an einem Tisch.</strong>Werte eingeben, Eingabe abschließen und gemeinsam prüfen.<div class="connection ${navigator.onLine?'':'offline'}">${connection()}</div><button class="muted-link" data-action="export">Lokale Daten exportieren</button></div></aside>
    <main id="main" tabindex="-1">${saveError?`<div class="error-list" role="alert">${e(saveError)}</div>`:''}${view==='stats'?statsView():view==='overview'?overview(g,p):view==='entry'?entry(g,p):reviewView(g,p,host)}</main></div>
    <footer class="footer"><span>Auf diesem Handy · Version 0.6.2</span><span><button class="muted-link" data-action="export">Sicherung exportieren ↓</button> <button class="muted-link" data-action="import">JSON / PC-Spiele importieren</button> <button class="muted-link" data-action="sync">OneDrive-Datei abgleichen</button> <button class="muted-link" data-action="pc-export">Abgleichdatei speichern</button></span></footer></div>`;
}
function renderEmpty(){root.innerHTML=`<main class="shell" id="main" tabindex="-1"><section class="panel"><p class="eyebrow">Catan Runde · Auf deinem Handy</p><h1>${view==='stats'?'Statistiken':'Dein Spieleabend'}</h1><p>Erstelle eine Partie und trage die Werte für alle Spieler ein. Ohne Anmeldung, auch offline.</p><div class="actions"><button class="button primary" data-action="new">Neue Partie</button><button class="button" data-view="stats">Statistiken</button><button class="button" data-action="import">JSON / PC-Spiele importieren</button></div><p class="subtle">Deine Spiele bleiben auf diesem Gerät. Exportiere regelmäßig eine Sicherung, damit du sie bei einem Handywechsel wieder importieren kannst.</p></section>${view==='stats'?statsView():''}</main>`;}
function statsView(){const s=statistics(state.games);return `<section class="panel"><p class="eyebrow">Deine Spielstatistik</p><h2>${s.games} ${s.games===1?'abgeschlossene Partie':'abgeschlossene Partien'}</h2><p class="subtle">Offene Partien zählen noch nicht. Spieler werden anhand ihres Namens zusammengefasst (Groß-/Kleinschreibung wird ignoriert). Verwende für dieselbe Person immer denselben Namen.</p>${s.players.length?`<div style="overflow-x:auto"><table class="review-table"><thead><tr><th>Spieler</th><th>Spiele</th><th>Siege</th><th>Siegquote</th><th>Ø SP</th><th>Beste SP</th></tr></thead><tbody>${s.players.map(p=>`<tr><td>${e(p.name)}</td><td>${p.games}</td><td>${p.wins}</td><td>${Math.round(100*p.wins/p.games)} %</td><td>${(p.total/p.games).toLocaleString('de-DE',{maximumFractionDigits:1})}</td><td>${p.best}</td></tr>`).join('')}</tbody></table></div><p class="subtle">Bei einem geteilten Höchststand erhält jeder beteiligte Spieler einen Sieg. Es zählen die bestätigten Endstände.</p>`:'<p>Nach deiner ersten abgeschlossenen Partie erscheinen hier Spiele, Siege, Siegquote und Siegpunkte je Spieler.</p>'}</section>`;}
function overview(g,p){
  const done=submitted(g),closed=g.status==='confirmed';
  return `${banner(g)}${closed?`<div class="notice success">Die Partie ist bestätigt. Alle Eingaben sind gesperrt.${g.legacy?' Importiert aus dem PC-Programm; ursprüngliche Punkte und Sieger bleiben erhalten.':''}</div>`:''}<section class="panel" aria-labelledby="round-title"><div class="panel-header"><h2 id="round-title">Am Tisch</h2><span class="chip ${done===g.players.length?'green':'gold'}">${done} von ${g.players.length} fertig</span></div><p class="subtle">${closed?'Euer Ergebnis steht fest.':'Für welche Spieler sind die Werte schon vollständig?'}</p><div class="progress-track" role="progressbar" aria-label="Abgeschlossene Eingaben" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${g.players.length}"><div class="progress-fill" style="width:${done/g.players.length*100}%"></div></div>
    <div class="players">${g.players.map(x=>`<div class="player-row">${avatar(x)}<div class="player-info"><div class="player-name">${e(x.name)}</div><div class="player-role">${[x.id===g.hostId?'Spielleitung':'',x.id===g.startPlayerId?'Startspieler':''].filter(Boolean).join(' · ')||'Mitspieler'}</div></div><button class="button small" data-player="${e(x.id)}">${g.results[x.id].status==='submitted'?'Werte ansehen':'Werte eintragen'}</button></div>`).join('')}</div>
    <div class="panel-footer"><p class="subtle">${closed?'Gespeichert auf diesem Gerät.':g.results[p.id].status==='submitted'?'Eingabe gespeichert. Wähle den nächsten Spieler. Bis zur Bestätigung kannst du sie bearbeiten.':'Wähle einen Spieler und erfasse dessen Endstand.'}</p><button class="button primary" data-view="${closed?'review':'entry'}">${closed?'Ergebnis ansehen':g.results[p.id].status==='submitted'?'Spielerwerte ansehen':'Spielerwerte eintragen'} <span aria-hidden="true">→</span></button></div></section>
    <section class="panel"><div class="panel-header"><h2>So geht’s weiter</h2></div><p class="subtle">${closed?'Du kannst jetzt eine neue Partie anlegen oder das Ergebnis ansehen.':true?'Sobald alle fertig sind, prüfst du die Bonuskarten und Siegpunkte. Danach kannst du die Partie bestätigen.':'Sobald alle fertig sind, prüft die Spielleitung die Bonuskarten und bestätigt die Partie.'}</p>${!closed?'<button class="muted-link" data-view="review">Zur Abschlusskontrolle →</button>':''}${g.rules||g.tags||g.notes?`<details><summary>Angaben zur Partie</summary><p class="subtle">${e([g.rules,g.tags,g.notes].filter(Boolean).join(' · '))}</p></details>`:''}</section>
    ${state.games.length>1?`<section class="panel"><h2>Weitere Partien</h2><div class="history-list" style="margin-top:18px">${state.games.filter(x=>x.id!==g.id).map(x=>`<button class="history-item" data-game="${e(x.id)}"><span><strong>${e(x.place||'Spielrunde')}</strong><small>${e(formatDate(x.date))}</small></span><span class="chip ${x.status==='confirmed'?'green':''}">${x.status==='confirmed'?'Bestätigt':'Offen'}</span></button>`).join('')}</div></section>`:''}`;
}
function stepper(field,v,locked){const [key,label,max,help]=field;return `<div class="stepper-row"><div><label class="stepper-label" for="value-${key}">${label}</label><div class="stepper-help" id="help-${key}">${help}</div></div><div class="stepper"><button type="button" data-step="-1" data-field="${key}" aria-label="${label} verringern" ${locked?'disabled':''}>−</button><input id="value-${key}" name="${key}" type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${v[key]??''}" aria-describedby="help-${key}" required ${locked?'disabled':''}><button type="button" data-step="1" data-field="${key}" aria-label="${label} erhöhen" ${locked?'disabled':''}>+</button></div></div>`;}
function entry(g,p){
  const r=g.results[p.id],locked=g.status==='confirmed';
  return `<div class="section-intro"><p class="eyebrow">${e(p.name)} · Werte erfassen</p><h2>Werte für ${e(p.name)}</h2><p class="subtle">Trage den Stand dieses Spielers am Spielende ein.</p></div>${locked?'<div class="notice success">Diese Partie ist bestätigt. Deine Werte sind jetzt schreibgeschützt.</div>':''}
    <form id="entry-form"><section class="panel"><div class="panel-header"><h2>Spielbrett</h2><span class="chip" id="entry-badge">${r.status==='submitted'?'✓ Eingabe fertig':'Entwurf'}</span></div>${FIELDS.filter(f=>f[0]!=='finale_siegpunkte').map(f=>stepper(f,r.values,locked)).join('')}</section>
    <section class="panel"><div class="panel-header"><h2>Endstand</h2></div>${stepper(FIELDS.find(f=>f[0]==='finale_siegpunkte'),r.values,locked)}<div class="total-card"><div><strong>Aus deinen Werten berechnet</strong><p>Inklusive vorläufiger Bonuskarten. Prüfe die Bonuskarten vor dem Abschluss.</p></div><span class="total-number" id="calculated">${points(g,p.id)}</span></div><div id="entry-errors" role="alert"></div><div class="save-bar"><div><p class="subtle" id="save-status">${r.updatedAt?'Auf diesem Gerät gespeichert.':'Startwerte · noch nicht abgeschlossen.'}</p><p class="subtle">${connection()}</p></div>${locked?'<button type="button" class="button" data-view="review">Zum Ergebnis →</button>':`<button class="button primary" type="submit">${r.status==='submitted'?'Eingabe erneut abschließen':'Eingabe abschließen'} <span aria-hidden="true">✓</span></button>`}</div></section></form>`;
}
function awardBox(g,kind,host){
  const list=candidates(g,kind),owner=g.players.find(p=>p.id===awardOwner(g,kind)),title=kind==='road'?'Längste Handelsstraße':'Größte Rittermacht';
  const key=kind==='road'?'handelsstrasse':'ritter';
  return `<div class="award-box"><div class="award-title">${title} · +2 SP</div><strong>${owner?e(owner.name):list.length?'Gleichstand offen':'Noch kein Besitzer'}</strong>${list.length>1?`<p>Wer besitzt die Karte am Spielende?</p><select aria-label="Besitzer: ${title}" data-award="${kind}" ${!host||g.status==='confirmed'?'disabled':''}><option value="">Bitte auswählen</option>${list.map(p=>`<option value="${e(p.id)}" ${owner?.id===p.id?'selected':''}>${e(p.name)}</option>`).join('')}</select>`:`<p>${list.length?`${g.results[list[0].id].values[key]} ${kind==='road'?'Straßen':'Ritter'} · aus den Eingaben ermittelt`:kind==='road'?'Ab einer Länge von 5 Straßen.':'Ab 3 ausgespielten Rittern.'}</p>`}</div>`;
}
function reviewView(g,p,host){
  const r=review(g),closed=g.status==='confirmed';
  return `<div class="section-intro"><p class="eyebrow">${closed?'Abgeschlossene Partie':'Gemeinsame Abschlusskontrolle'}</p><h2>${closed?'Das Ergebnis steht.':'Ein letzter Blick.'}</h2><p class="subtle">${closed?'Gespeichert auf diesem Gerät.':host?'Prüfe die Werte, bevor du die Partie bestätigst.':'Die Spielleitung prüft und bestätigt eure Partie.'}</p></div>
    ${closed?`<div class="winner"><p class="eyebrow">${winners(g).length>1?'Gemeinsamer Höchststand':'Gewonnen'}</p><h2>${e(winners(g).map(x=>x.name).join(' & '))}</h2><p>${g.results[winners(g)[0].id].values.finale_siegpunkte} Siegpunkte · ${e(formatDate(g.date))}</p></div>`:''}
    <section class="panel"><div class="panel-header"><h2>Siegpunkte</h2><span class="chip ${closed?'green':'gold'}">${closed?'✓ Bestätigt':`${submitted(g)}/${g.players.length} fertig`}</span></div><table class="review-table"><thead><tr><th scope="col">Spieler</th><th scope="col">Eingetragen</th><th scope="col">Berechnet</th></tr></thead><tbody>${g.players.map(x=>`<tr><td><div class="name-cell">${avatar(x)}<span><strong>${e(x.name)}</strong><small class="player-role" style="display:block">${g.results[x.id].status==='submitted'?'Fertig':'Entwurf'}</small></span></div></td><td class="score">${g.results[x.id].values.finale_siegpunkte??'–'}</td><td class="${g.results[x.id].values.finale_siegpunkte!==points(g,x.id)?'diff':''}">${Number.isFinite(points(g,x.id))?points(g,x.id):'–'}</td></tr>`).join('')}</tbody></table></section>
    <section class="panel"><div class="panel-header"><h2>Die Bonuskarten</h2></div><div class="award-grid">${awardBox(g,'road',host)}${awardBox(g,'army',host)}</div><p class="subtle" style="margin-top:14px;font-size:12px">Berechnung wie in deiner bisherigen App. Bei Gleichstand wählst du den Besitzer der Karte.</p></section>
    ${closed?`<div class="notice success">Die Partie ist abgeschlossen. ${g.mismatchAccepted?'Abweichende Siegpunkte wurden ausdrücklich übernommen.':'Alle Siegpunkte stimmen überein.'}</div>`:`<section class="panel"><h2>Partie bestätigen</h2><div id="review-errors" role="alert"></div>${r.blockers.length?`<div class="notice"><strong>Noch offen</strong><ul>${r.blockers.map(x=>`<li>${e(x)}</li>`).join('')}</ul></div>`:'<div class="notice success">Alle Eingaben sind vollständig und die Bonuskarten zugeordnet.</div>'}
    ${r.mismatches.length?`<div class="notice"><strong>Siegpunkte weichen ab</strong><p>${r.mismatches.map(x=>`${e(x.name)}: ${g.results[x.id].values.finale_siegpunkte} eingetragen, ${points(g,x.id)} berechnet`).join('<br>')}</p></div>${host?'<label class="check"><input type="checkbox" id="accept-mismatch">Ich habe die Abweichungen geprüft. Die eingetragenen Endstände sollen gelten.</label>':''}`:''}
    <div class="save-bar"><p class="subtle">${host?'Nach der Bestätigung sind alle Eingaben gesperrt.':'Nur die Spielleitung kann diese Partie bestätigen.'}</p><button class="button primary" data-action="confirm" ${!host||r.blockers.length?'disabled':''}>Partie bestätigen ✓</button></div></section>`}`;
}
function navigate(target){view=target;render();document.querySelector('#main').focus({preventScroll:true});}
function showNew(){
  dialog.innerHTML=`<form id="new-form"><h2 id="new-title">Eine neue Partie</h2><p class="lead">Du trägst alle Spieler ein. Die Partie wird auf diesem Handy gespeichert.</p><div class="form-grid"><label class="field">Datum<input name="date" type="date" value="${today()}" required></label><label class="field">Ort<input name="place" placeholder="z. B. Bei Anna" maxlength="80"></label><label class="field full">Land<input name="country" placeholder="z. B. Deutschland" maxlength="80"></label><label class="field">Spieler 1<input name="p1" value="" required maxlength="40" autocomplete="off"></label><label class="field">Spieler 2<input name="p2" value="" required maxlength="40" autocomplete="off"></label><label class="field">Spieler 3 · optional<input name="p3" value="" maxlength="40" autocomplete="off"></label><label class="field">Spieler 4 · optional<input name="p4" value="" maxlength="40" autocomplete="off"></label><label class="field full">Startspieler<select name="start"><option value="0">Spieler 1</option><option value="1">Spieler 2</option><option value="2">Spieler 3</option><option value="3">Spieler 4</option></select></label></div><details><summary>Regeln, Tags und Notizen</summary><div class="form-grid"><label class="field full">Hausregeln<input name="rules" maxlength="300" placeholder="Mit Komma trennen"></label><label class="field full">Tags<input name="tags" maxlength="200" placeholder="#Spieleabend"></label><label class="field full">Notizen<textarea name="notes" rows="2" maxlength="1000"></textarea></label></div></details><div id="new-errors" role="alert"></div><div class="actions"><button type="button" class="button" data-action="cancel-new">Abbrechen</button><button type="submit" class="button primary">Partie anlegen</button></div></form>`;
  dialog.showModal();
}
function readEntry(){return Object.fromEntries(FIELDS.map(([key])=>{const input=document.querySelector(`[name="${key}"]`);return [key,input.value===''?null:Number(input.value)];}));}
function saveDraft(){
  const g=game();
  updateResult(g,state.actorId,readEntry());const ok=persist();
  document.querySelector('#calculated').textContent=Number.isFinite(points(g,state.actorId))?points(g,state.actorId):'–';
  document.querySelector('#entry-badge').textContent='Entwurf';
  document.querySelector('#save-status').textContent=ok?'Entwurf auf diesem Gerät gespeichert.':saveError;
  document.querySelector('#entry-form button[type="submit"]').textContent='Eingabe abschließen ✓';
  document.querySelector('#entry-errors').innerHTML='';
}
function chooseVersion(local,remote){return new Promise(resolve=>{
 const describe=g=>g.players.map(p=>`${p.name}: ${g.results[p.id].values.finale_siegpunkte} SP`).join(' · ');
 dialog.innerHTML=`<form id="merge-form"><h2>Unterschiedliche Spielstände</h2><p>${e(local.date)} · ${e(local.place)}</p><label class="field">Welche Version soll gelten?<select name="version" required><option value="">Bitte auswählen</option><option value="local">Stand auf diesem Handy behalten</option><option value="remote">Stand aus der ausgewählten Datei übernehmen</option></select></label><h3>Auf diesem Handy</h3><p>${e(describe(local))}</p><details><summary>Alle Daten auf dem Handy</summary><pre style="white-space:pre-wrap">${e(JSON.stringify(local,null,2))}</pre></details><h3>Aus der Datei</h3><p>${e(describe(remote))}</p><details><summary>Alle Daten aus der Datei</summary><pre style="white-space:pre-wrap">${e(JSON.stringify(remote,null,2))}</pre></details><div class="actions"><button class="button primary" type="submit">Auswahl übernehmen</button><button class="button" type="button" id="merge-cancel">Gesamten Abgleich abbrechen</button></div></form>`;
 const finish=value=>{dialog.removeEventListener('submit',submit);dialog.removeEventListener('cancel',cancel);dialog.close();resolve(value);};
 const submit=event=>{if(event.target.id!=='merge-form')return;event.preventDefault();finish(new FormData(event.target).get('version'));};
 const cancel=event=>{event.preventDefault();finish(null);};
 dialog.addEventListener('submit',submit);dialog.addEventListener('cancel',cancel);dialog.querySelector('#merge-cancel').onclick=()=>finish(null);dialog.showModal();
});}
function exportExchange(){try{const data=exportExchangeData(state);if(!data.games.length&&!data.deletedIds.length)throw Error('Noch keine abgeschlossenen Partien vorhanden.');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='catan_abgleich.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Abgleichdatei speichern und in OneDrive ablegen. Erst danach ist sie auf dem PC verfügbar.');}catch(err){toast(err.message);}}
function exportData(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`catan-sicherung-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Lokale Daten als JSON exportiert.');}
root.addEventListener('click',event=>{
  const b=event.target.closest('button');if(!b||b.disabled)return;
  try {
    if(b.dataset.player){state.actorId=b.dataset.player;persist();navigate('entry');return;}
    if(b.dataset.action==='sync'){fileMode='sync';document.querySelector('#backup-file').click();return;}
    if(b.dataset.action==='pc-export'){exportExchange();return;}
    if(b.dataset.action==='import'){fileMode='import';document.querySelector('#backup-file').click();return;}
    if(b.dataset.view){navigate(b.dataset.view);return;}
    if(b.dataset.game){state.activeGameId=b.dataset.game;state.actorId=game().hostId;persist();navigate('overview');return;}
    if(b.dataset.step){const input=document.querySelector(`[name="${b.dataset.field}"]`);input.value=String(Math.max(0,Math.min(Number(input.max),Number(input.value)+Number(b.dataset.step))));saveDraft();return;}
    if(b.dataset.action==='new')showNew();
    if(b.dataset.action==='export')exportData();
    if(b.dataset.action==='confirm'){confirmGame(game(),game().hostId,Boolean(document.querySelector('#accept-mismatch')?.checked));const ok=persist();render();toast(ok?'Partie bestätigt und auf diesem Gerät gespeichert.':'Bestätigt, aber nicht gespeichert. Bitte Daten exportieren.');}
  }catch(err){const box=document.querySelector('#review-errors');if(box){box.className='error-list';box.textContent=err.message;}else toast(err.message);}
});
root.addEventListener('change',event=>{
  const input=event.target;
  if(input.id==='actor'){state.actorId=input.value;persist();render();}
  if(input.id==='game-select'){state.activeGameId=input.value;state.actorId=game().hostId;persist();navigate('overview');}
  if(input.dataset.award){try{chooseAward(game(),game().hostId,input.dataset.award,input.value||null);persist();render();}catch(err){toast(err.message);}}
});
root.addEventListener('input',event=>{if(event.target.matches('#entry-form input[type="number"]'))saveDraft();});
root.addEventListener('submit',event=>{
  if(event.target.id!=='entry-form')return;event.preventDefault();
  try{updateResult(game(),state.actorId,readEntry(),{submit:true});const ok=persist();navigate('overview');toast(ok?'Eingabe gespeichert. Wähle den nächsten Spieler.':'Eingabe abgeschlossen, aber nicht gespeichert. Bitte exportieren.');}
  catch(err){const box=document.querySelector('#entry-errors');box.className='error-list';box.textContent=err.message;box.scrollIntoView({block:'nearest'});}
});
dialog.addEventListener('click',event=>{if(event.target.closest('[data-action="cancel-new"]'))dialog.close();});
dialog.addEventListener('submit',event=>{
  if(event.target.id!=='new-form')return;
  event.preventDefault();const data=new FormData(event.target);
  try {
    const slots=[1,2,3,4].map(n=>String(data.get(`p${n}`)).trim());
    const chosen=Number(data.get('start'));
    if(!slots[chosen])throw Error('Der gewählte Startspieler benötigt einen Namen.');
    const g=createGame({names:slots.filter(Boolean),date:String(data.get('date')),place:String(data.get('place')),country:String(data.get('country')),rules:String(data.get('rules')||''),tags:String(data.get('tags')||''),notes:String(data.get('notes')||'')});
    g.startPlayerId=g.players[slots.slice(0,chosen).filter(Boolean).length].id;
    state.games.push(g);state.activeGameId=g.id;state.actorId=g.hostId;const ok=persist();dialog.close();navigate('overview');toast(ok?'Deine neue Partie ist angelegt.':'Partie angelegt, aber nicht gespeichert. Bitte exportieren.');
  } catch(err){const box=document.querySelector('#new-errors');box.className='error-list';box.textContent=err.message;}
});
window.addEventListener('hashchange',()=>{if(location.hash==='#overview')navigate('overview');});
for(const event of ['online','offline'])window.addEventListener(event,()=>{document.querySelectorAll('.connection').forEach(el=>{el.textContent=connection();el.classList.toggle('offline',!navigator.onLine);});toast(connection());});
document.querySelector('#backup-file')?.addEventListener('change',async event=>{
 const file=event.target.files[0];if(!file)return;
 try{
  if(file.size>5*1024*1024)throw Error('Die Sicherung ist zu groß (maximal 5 MB).');
  let data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
  if(data?.format==='catan-exchange-v2'){const removed=deletionIds(data.deletedIds);data={...await importPCGames(data.games),deletedIds:removed};}
  if(Array.isArray(data))data=await importPCGames(data);
  if(data.schemaVersion!==1||!Array.isArray(data.games))throw Error('Keine gültige Catan-Sicherung.');
  const removed=deletionIds(state.deletedIds||[],data.deletedIds||[]);
  const incoming=[],replacements=new Map();const ids=new Set(state.games.map(g=>g.id));
  for(const g of data.games){
   if(!g||typeof g.id!=='string'||!Array.isArray(g.players)||!['open','confirmed'].includes(g.status))throw Error('Ungültige Partie in der Sicherung.');
   if(g.legacy?.source==='catan-pc'){const verified=(await importPCGames([g.legacy.raw])).games[0];if(JSON.stringify(verified)!==JSON.stringify(g))throw Error('Die importierte PC-Partie wurde verändert. Bitte die Originaldatei verwenden.');}
   else createGame({names:g.players.map(p=>p.name),date:g.date});
   const ps=new Set(g.players.map(p=>p.id));
   if(ps.size!==g.players.length||!ps.has(g.hostId)||!ps.has(g.startPlayerId))throw Error('Ungültige Spielerzuordnung.');
   for(const p of g.players){
    const r=g.results?.[p.id];if(typeof p.id!=='string'||!r||!['draft','submitted'].includes(r.status))throw Error('Spielerwerte fehlen.');
    for(const [k,,max] of FIELDS)if(r.values?.[k]!==null&&(!Number.isInteger(r.values?.[k])||r.values[k]<0||r.values[k]>max))throw Error('Ungültige Spielerwerte.');
   }
   if(!g.awards||!['road','army'].every(k=>g.awards[k]===null||ps.has(g.awards[k])))throw Error('Ungültige Bonuskarten.');
   if(!g.legacy&&g.status==='confirmed'&&review(g).blockers.length)throw Error('Abgeschlossene Partie enthält unvollständige Werte.');
   if(removed.includes(g.id))continue;
   if(ids.has(g.id)){
    const old=state.games.find(x=>x.id===g.id);if(!old)throw Error('Doppelte Partie in der Datei.');
    const equal=(g.status==='confirmed'&&old.status==='confirmed')?sameGame(old,g):JSON.stringify(old)===JSON.stringify(g);
    if(!equal){const choice=await chooseVersion(old,g);if(choice==='remote')replacements.set(g.id,g);else if(choice!=='local')throw Error('Abgleich abgebrochen. Es wurde nichts geändert.');}continue;
   }
   ids.add(g.id);incoming.push(g);
  }
  const next={...state,deletedIds:removed,games:[...state.games.filter(g=>!removed.includes(g.id)).map(g=>replacements.get(g.id)||g),...incoming]};if(!next.games.some(g=>g.id===next.activeGameId)){next.activeGameId=next.games[0]?.id||null;next.actorId=next.games[0]?.hostId||null;view="overview";}
  if(fileMode==='sync'||removed.length)localStorage.setItem(KEY+'-vor-abgleich',JSON.stringify(state));
  localStorage.setItem(KEY,JSON.stringify(next));state=next;render();toast(fileMode==='sync'?`${incoming.length} Partien übernommen. Jetzt „Abgleichdatei speichern“ wählen und die Datei wieder in OneDrive ablegen.`:`${incoming.length} Partien importiert.`);
 }catch(err){toast('Import fehlgeschlagen: '+err.message);}finally{event.target.value='';}
});
function init(){
  const raw=localStorage.getItem(KEY);
  state=raw?JSON.parse(raw):{schemaVersion:1,games:[],activeGameId:null,actorId:null};
  if(state.schemaVersion!==1||!Array.isArray(state.games))throw Error('Der lokale Spielstand ist nicht mit dieser Version kompatibel.');
  render();
  if(!raw){persist();if(saveError)render();}
  const context=document.modelContext;
  if(context?.registerTool&&location.hash==='#local'){
    const lifetime=new AbortController();
    const tools=[
      {name:'read_catan_round',description:'Read the active local demo round, players, submission status and points. No cloud data.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:true},execute:()=>({id:game().id,status:game().status,players:game().players.map(p=>({name:p.name,status:game().results[p.id].status,points:points(game(),p.id)}))})},
      {name:'navigate_catan_view',description:'Open an existing view of the local Catan prototype. Does not submit or change results.',inputSchema:{type:'object',properties:{view:{type:'string',enum:['overview','entry','review']}},required:['view'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(!input||!['overview','entry','review'].includes(input.view))throw Error('Invalid view');navigate(input.view);return {view};}}
    ];
    for(const tool of tools){try{Promise.resolve(context.registerTool(tool,{signal:lifetime.signal})).catch(()=>{});}catch{}}
    window.addEventListener('pagehide',()=>lifetime.abort(),{once:true});
  }
}
try{init();}catch(err){root.innerHTML=`<main class="shell"><section class="panel"><h1>Lokale Daten nicht lesbar</h1><p>${e(err.message)}</p><p>Vorhandene Daten wurden nicht überschrieben. Bitte bewahre sie auf und lass den Fehler prüfen.</p></section></main>`;}
