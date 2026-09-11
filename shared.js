import * as cloud from './cloud.js';
import {FIELDS,COLORS,today,points,candidates,awardOwner,review,validateValues,winners} from './model.js';
const root=document.querySelector('#app');
let displayedUserId=null,historyFilter='all';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let screen='lobby',games=[],active=null,invite=null,busy=false,message='',notice='',poll,inviteLink='',compareReady=false;
const user=()=>cloud.session()?.user;
const draftKey=()=>`catan-drafts-${user()?.id}`;
const cacheKey=()=>`catan-games-${user()?.id}`;
function drafts(){try{return JSON.parse(localStorage.getItem(draftKey())||'{}');}catch{return {};}}
function storeDraft(gid,d){const all=drafts();all[gid]=d;localStorage.setItem(draftKey(),JSON.stringify(all));}
function clearDraft(gid){const all=drafts();delete all[gid];localStorage.setItem(draftKey(),JSON.stringify(all));}
function normalize(row){
 const ps=row.catan_players.sort((a,b)=>a.position-b.position);
 return {id:row.id,date:row.played_on,place:row.place,country:row.country,rules:row.rules,tags:row.tags,notes:row.notes,status:row.status,serverRevision:row.revision,hostId:ps.find(p=>p.user_id===row.host_user_id)?.id,startPlayerId:ps.find(p=>p.is_start)?.id,awards:row.awards,mismatchAccepted:row.mismatch_accepted,players:ps.map(p=>({id:p.id,name:p.name,userId:p.user_id,color:COLORS[p.position]})),results:Object.fromEntries(ps.map(p=>[p.id,{values:p.values_json,status:p.entry_status,revision:p.revision,updatedAt:p.updated_at}]))};
}
const current=()=>games.find(g=>g.id===active);
const me=g=>g.players.find(p=>p.userId===user()?.id);
const isHost=g=>me(g)?.id===g.hostId;
function flash(error){message=error?.message||String(error);render();}
function shell(content){
 root.innerHTML=`<header class="topbar"><div class="top-inner"><a class="brand" href="#" data-cloud="lobby"><span class="brand-mark" aria-hidden="true">C</span><span class="brand-text">Catan Runde<span class="brand-sub">Gemeinsam am Spieltisch</span></span></a>${user()?'<button class="button small" data-cloud="logout">Abmelden</button>':''}</div></header><div class="shell"><main id="main">${message?`<div class="error-list" role="alert">${esc(message)}</div>`:''}${notice?`<div class="notice success" role="status">${esc(notice)}</div>`:''}${!navigator.onLine?'<div class="notice">Offline · Deine Entwürfe bleiben auf diesem Gerät. Übertragen und Bestätigen benötigen Internet.</div>':''}${content}</main><footer class="footer"><button class="muted-link" data-cloud="local">Lokale Partien / Probelauf</button><span>Version 0.4 · Meine Spiele</span></footer></div>`;
 if(busy)root.querySelectorAll('button[type="submit"],button[data-cloud="confirm"]').forEach(b=>b.disabled=true);
}
function render(){
 displayedUserId=user()?.id||null;
 if(!user()){loginView();return;}
 if(screen==='logout'){shell('<section class="panel auth-panel"><h1>Gastzugang verlassen?</h1><button class="button" data-cloud="lobby">Angemeldet bleiben</button> <button class="button" data-cloud="logout-confirm">Gastzugang endgültig verlassen</button></section>');return;}
 if(screen==='new'){newView();return;}
 if(screen==='join'){joinView();return;}
 if(screen==='entry'&&current()){entryView();return;}
 if(screen==='game'&&current()){gameView();return;}
 lobbyView();
}
function emailForm(id,label){return `<form id="${id}"><label class="field">E-Mail-Adresse<input name="email" type="email" required autocomplete="email" ${cloud.EMAIL_READY?'':'disabled'}></label><button type="submit" class="button primary" ${cloud.EMAIL_READY?'':'disabled'}>${label}</button></form>${cloud.EMAIL_READY?'':'<p class="notice">Noch nicht aktiv: Der E-Mail-Versand wird eingerichtet. Bis dahin ist der Gastzugang verfügbar.</p>'}`;}
function loginView(){shell(`<section class="panel auth-panel"><p class="eyebrow">Dein persönliches Spielerkonto</p><h1>Deine Spiele. Dein Konto.</h1><p class="lead">Mit deiner E-Mail-Adresse findest du alle Partien wieder, an denen du teilgenommen hast – auch auf einem anderen Handy.</p>${emailForm('shared-auth','Konto erstellen / Anmelden')}<p class="subtle">Du erhältst einen Anmeldelink per E-Mail. Beim ersten Mal wird dein Konto angelegt. Du brauchst kein Passwort.</p><hr><h2>Nur kurz mitspielen?</h2><button class="button" data-cloud="guest">Als Gast mitspielen</button><p class="subtle">Gastpartien bleiben diesem Browser zugeordnet. Nach Abmeldung oder Löschen der Browserdaten kannst du den Gastzugang nicht wiederherstellen.</p></section>`);}
function historyItem(g){const player=me(g),closed=g.status==='confirmed',won=closed&&winners(g).some(p=>p.id===player?.id);return `<button class="history-item" data-open="${g.id}"><span><strong>${esc(g.place||'Catan-Runde')}</strong><small>${esc(g.date)} · ${g.players.map(p=>esc(p.name)).join(', ')}</small><small>${closed?`Dein Ergebnis: ${g.results[player.id].values.finale_siegpunkte} SP${won?' · Gewonnen':''}`:'Deine Eingabe: '+(g.results[player.id].status==='submitted'?'abgeschlossen':'offen')}</small></span><span class="chip ${closed?'green':''}">${closed?'Bestätigt':'Offen'}</span></button>`;}
function lobbyView(){
 const list=games.filter(g=>historyFilter==='all'||g.status===historyFilter),closed=games.filter(g=>g.status==='confirmed');
 shell(`<div class="page-heading"><div><p class="eyebrow">Dein persönliches Archiv</p><h1>Meine Spiele</h1><p class="subtle">${esc(user().is_anonymous?'Gast · auf diesem Browser gespeichert':user().email||'Angemeldet')}</p></div><button class="button primary" data-cloud="new">＋ Neue Partie</button></div><p class="subtle">Hier findest du alle gemeinsamen Partien, denen du mit diesem Konto beigetreten bist. Deine Ergebnisse bleiben auch nach dem Abschluss sichtbar.</p>${user().is_anonymous?`<section class="panel auth-panel"><h2>Gastpartien dauerhaft behalten</h2><p>Verknüpfe diesen Gastzugang mit einer noch unbenutzten E-Mail-Adresse. Nach der Bestätigung bleiben deine bisherigen Spiele demselben Konto zugeordnet.</p>${emailForm('shared-upgrade','E-Mail mit diesem Gastzugang verknüpfen')}<p class="subtle">Bereits bestehende Konten werden nicht automatisch zusammengeführt.</p></section>`:''}<section class="panel"><div class="panel-header"><h2>${games.length} Spiele · ${closed.length} abgeschlossen</h2><button class="button small" data-cloud="refresh">Aktualisieren</button></div><nav class="auth-actions" aria-label="Spiele filtern">${[['all','Alle'],['open','Offen'],['confirmed','Abgeschlossen']].map(([v,l])=>`<button class="button small ${historyFilter===v?'primary':''}" data-history-filter="${v}" aria-pressed="${historyFilter===v}">${l}</button>`).join('')}</nav><div class="history-list">${list.length?list.map(historyItem).join(''):'<p class="subtle">Hier sind noch keine Spiele. Erstelle eine Partie oder tritt über einen Einladungslink bei.</p>'}</div></section><section class="panel"><h2>Einladung erhalten?</h2><form id="shared-invite"><label class="field">Einladungslink oder Einladungscode<input name="token" required placeholder="Einladungslink einfügen" autocomplete="off"></label><button type="submit" class="button">Partie finden</button></form></section>`);
}

function newView(){shell(`<section class="panel auth-panel"><p class="eyebrow">Spielleitung</p><h1>Neue Partie</h1><p class="lead">Du bist Spieler 1. Die anderen wählen ihren freien Platz über deinen Einladungslink.</p><form id="shared-new"><div class="form-grid"><label class="field">Datum<input name="date" type="date" value="${today()}" required></label><label class="field">Ort<input name="place" maxlength="80"></label><label class="field full">Land<input name="country" maxlength="80"></label>${[1,2,3,4].map(i=>`<label class="field">${i===1?'Dein Name':`Spieler ${i}${i>2?' · optional':''}`}<input name="p${i}" maxlength="40" ${i<3?'required':''}></label>`).join('')}<label class="field full">Startspieler<select name="start">${[1,2,3,4].map(i=>`<option value="${i-1}">Spieler ${i}</option>`).join('')}</select></label></div><details><summary>Regeln, Tags und Notizen</summary><label class="field">Regeln<input name="rules" maxlength="300"></label><label class="field">Tags<input name="tags" maxlength="200"></label><label class="field">Notizen<textarea name="notes" maxlength="1000"></textarea></label></details><div class="auth-actions"><button type="submit" class="button primary">Partie erstellen</button><button type="button" class="button" data-cloud="lobby">Zurück</button></div></form></section>`);}
function joinView(){shell(`<section class="panel auth-panel"><p class="eyebrow">Einladung zur Partie</p><h1>${esc(invite?.place||'Catan-Runde')}</h1><p class="lead">Wähle deinen Namen. Bereits vergebene Plätze bleiben geschützt.</p><div class="history-list">${invite?.players.map(p=>`<button class="history-item" data-join="${p.id}" ${!p.available&&!p.mine?'disabled':''}><strong>${esc(p.name)}</strong><span>${p.mine?'Dein Platz':p.available?'Beitreten →':'Bereits vergeben'}</span></button>`).join('')||''}</div><button class="muted-link" data-cloud="lobby">Zurück zu deinen Partien</button></section>`);}
function award(g,kind){const list=candidates(g,kind),holder=g.players.find(p=>p.id===awardOwner(g,kind));return `<div class="award-box"><div class="award-title">${kind==='road'?'Längste Handelsstraße':'Größte Rittermacht'} · +2 SP</div><strong>${esc(holder?.name||'Keine Zuordnung')}</strong>${list.length>1?`<select data-shared-award="${kind}" aria-label="${kind==='road'?'Handelsstraße':'Rittermacht'} zuordnen" ${!isHost(g)||g.status==='confirmed'?'disabled':''}><option value="">Bei Gleichstand auswählen</option>${list.map(p=>`<option value="${p.id}" ${holder?.id===p.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>`:''}</div>`;}
function gameView(){
 const g=current(),p=me(g),r=review(g),d=drafts()[g.id];
 shell(`<div class="page-heading"><div><p class="eyebrow">${esc(g.date)} · ${g.players.length} Spieler</p><h1>${esc(g.place||'Unsere Partie')}</h1></div><button class="button small" data-cloud="lobby">Alle Partien</button></div>${d?`<div class="notice">${d.pending?'Deine Eingabe wartet auf Übertragung.':'Du hast einen lokalen Entwurf.'} ${d.error?esc(d.error):''}<button class="muted-link" data-cloud="entry">Entwurf ansehen</button>${d.pending&&!d.error?'<button class="button small" data-cloud="sync">Jetzt übertragen</button>':''}<button class="muted-link" data-cloud="export-draft">Entwurf sichern</button></div>`:''}
 ${g.status==='confirmed'?`<div class="winner"><p class="eyebrow">${winners(g).length>1?'Gemeinsamer Höchststand':'Gewonnen'}</p><h2>${esc(winners(g).map(x=>x.name).join(' & '))}</h2><p>Partie bestätigt</p></div>`:''}<section class="panel"><div class="panel-header"><h2>Am Tisch</h2><button class="button small" data-cloud="refresh">Aktualisieren</button></div><div class="players">${g.players.map(x=>`<div class="player-row"><span class="avatar" style="--avatar:${x.color}">${esc(x.name[0])}</span><div class="player-info"><div class="player-name">${esc(x.name)}${x.id===p.id?' (du)':''}</div><div class="player-role">${x.userId?g.results[x.id].status==='submitted'?`${g.results[x.id].values.finale_siegpunkte} SP · berechnet ${points(g,x.id)}`:'Eingabe offen':'Noch nicht beigetreten'}</div></div><span class="chip ${g.results[x.id].status==='submitted'?'green':''}">${g.results[x.id].status==='submitted'?'✓ Fertig':'Offen'}</span></div>`).join('')}</div><div class="panel-footer"><button class="button primary" data-cloud="entry">${g.status==='confirmed'?'Meine Werte ansehen':'Meine Werte eintragen'}</button>${isHost(g)&&g.status==='open'?'<button class="button" data-cloud="invite">Spieler einladen</button>':''}</div><div id="share-link">${inviteLink?`<label class="field" style="margin-top:15px">Einladungslink<input readonly value="${esc(inviteLink)}" id="shared-link"></label><button class="button small" data-cloud="copy-invite">Link kopieren</button>`:''}</div></section>
 <section class="panel"><h2>Bonus & Abschluss</h2><div class="award-grid" style="margin-top:18px">${award(g,'road')}${award(g,'army')}</div>${g.status==='open'?`${r.blockers.length?`<div class="notice">${r.blockers.map(esc).join('<br>')}</div>`:''}${r.mismatches.length?`<div class="notice">Abweichende Punkte: ${r.mismatches.map(x=>esc(x.name)).join(', ')}.</div>${isHost(g)?'<label class="check"><input id="shared-accept" type="checkbox">Ich habe die Abweichungen geprüft und übernehme die eingetragenen Endstände.</label>':''}`:''}<div class="save-bar"><p class="subtle">${isHost(g)?'Die Bestätigung sperrt eure Eingaben.':'Die Spielleitung bestätigt diese Partie.'}</p><button class="button primary" data-cloud="confirm" ${!isHost(g)||r.blockers.length||d?'disabled':''}>Partie bestätigen</button></div>`:'<p class="subtle" style="margin-top:15px">Diese Partie ist abgeschlossen und schreibgeschützt.</p>'}</section>`);
}
function entryView(){const g=current(),p=me(g),d=drafts()[g.id],v=d?.values||g.results[p.id].values,locked=g.status==='confirmed'||Boolean(d?.pending);shell(`<section class="panel auth-panel"><p class="eyebrow">${esc(p.name)} · Eigene Werte</p><h1>Dein Endstand</h1>${locked?`<div class="notice">${g.status==='confirmed'?'Partie bestätigt · Eingaben gesperrt':'Übertragung ausstehend · erst übertragen oder einen Konflikt auflösen'}</div>`:''}<form id="shared-entry">${FIELDS.map(([k,label,max,help])=>`<div class="stepper-row"><div><label class="stepper-label" for="s-${k}">${label}</label><div class="stepper-help">${help}</div></div><div class="stepper"><button type="button" data-shared-step="-1" data-key="${k}" aria-label="${label} verringern" ${locked?'disabled':''}>−</button><input id="s-${k}" name="${k}" type="number" inputmode="numeric" min="0" max="${max}" step="1" value="${v[k]??''}" required ${locked?'disabled':''}><button type="button" data-shared-step="1" data-key="${k}" aria-label="${label} erhöhen" ${locked?'disabled':''}>+</button></div></div>`).join('')}<p class="subtle" id="shared-draft-status">${d?'Lokaler Entwurf gespeichert.':'Dein übertragener Stand.'} Erst „Abschließen & übertragen“ sendet die Werte an deine Runde.</p>${d?.error?`<div class="notice">${esc(d.error)}<button class="button small" type="button" data-cloud="use-latest">Serverstand vergleichen</button></div>`:''}<div class="auth-actions">${compareReady&&d&&g.status!=='confirmed'?'<button class="button" type="button" data-cloud="rebase">Meinen Entwurf auf diesem Stand erneut freigeben</button>':''}${!locked?'<button class="button primary" type="submit">Abschließen & übertragen</button>':''}<button class="button" type="button" data-cloud="game">Zur Partie</button></div></form></section>`);}
async function refreshGames(){const rows=await cloud.loadGames();games=rows.map(normalize);localStorage.setItem(cacheKey(),JSON.stringify(games));}
function valuesFromForm(){return Object.fromEntries(FIELDS.map(([k])=>{const v=root.querySelector(`[name="${k}"]`).value;return [k,v===''?null:Number(v)];}));}
function saveLocal(){const g=current(),previous=drafts()[g.id];if(previous?.pending)throw Error('Deine vorige Eingabe wartet noch auf Übertragung. Bitte zuerst synchronisieren.');storeDraft(g.id,{values:valuesFromForm(),revision:previous?.revision??g.results[me(g).id].revision,pending:false});root.querySelector('#shared-draft-status').textContent='Entwurf auf diesem Gerät gespeichert · noch nicht übertragen.';}
async function sync(){
 for(const [gid,d] of Object.entries(drafts())){
  if(!d.pending||d.error)continue;
  try{await cloud.rpc('catan_save_result',{p_game:gid,p_values:d.values,p_revision:d.revision,p_operation:d.operation});clearDraft(gid);}
  catch(err){if(/Konflikt|bestätigt|Kein Zugriff|Ungültig|Handelsstraße|Mindestens/.test(err.message)){d.error=err.message;storeDraft(gid,d);}throw err;}
 }
 await refreshGames();
}
function parseInvite(text){let value=text.trim();try{value=new URL(value).hash.replace(/^#join=/,'');}catch{}if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw Error('Bitte einen gültigen Einladungslink einfügen.');return value;}
async function preview(token){localStorage.setItem('catan-invitation',token);invite=await cloud.rpc('catan_preview_invite',{p_token:token});screen='join';}
async function action(fn){if(busy)return;busy=true;message='';notice='';try{await fn();}catch(err){message=err.message||'Verbindung fehlgeschlagen. Bitte erneut versuchen.';}finally{busy=false;render();}}
root.addEventListener('click',event=>{
 const button=event.target.closest('[data-cloud],[data-open],[data-join],[data-shared-step],[data-history-filter]');if(!button||button.disabled)return;event.preventDefault();
 if(button.dataset.sharedStep){try{const input=root.querySelector(`[name="${button.dataset.key}"]`);input.value=Math.max(0,Math.min(Number(input.max),Number(input.value)+Number(button.dataset.sharedStep)));saveLocal();}catch(err){flash(err);}return;}
 if(button.dataset.historyFilter){historyFilter=button.dataset.historyFilter;render();return;}
 const cmd=button.dataset.cloud;
 if(cmd==='local'){location.hash='local';location.reload();return;}
 action(async()=>{
  if(button.dataset.open){active=button.dataset.open;screen='game';inviteLink='';compareReady=false;}
  if(button.dataset.join){inviteLink='';compareReady=false;active=await cloud.rpc('catan_join_game',{p_token:localStorage.getItem('catan-invitation'),p_player:button.dataset.join});localStorage.removeItem('catan-invitation');history.replaceState(null,'',location.pathname);await refreshGames();screen='game';}
  if(cmd==='new'){screen='new';inviteLink='';compareReady=false;}if(cmd==='lobby')screen='lobby';if(cmd==='game')screen='game';if(cmd==='entry')screen='entry';
  if(cmd==='logout'){
   if(user()?.is_anonymous){notice='Wenn du dich als Gast abmeldest, verlierst du deinen Zugang zu bisherigen Partien. Browser schließen reicht, um eine Pause zu machen.';screen='logout';return;}
   await cloud.logout();games=[];screen='lobby';
  }
  if(cmd==='logout-confirm'){await cloud.logout();games=[];screen='lobby';}
  if(cmd==='guest'){await cloud.guest();await refreshGames();const t=localStorage.getItem('catan-invitation');if(t)await preview(t);}
  if(cmd==='refresh')await refreshGames();
  if(cmd==='sync'){await sync();notice='Eingaben übertragen.';}
  if(cmd==='invite'){
   const t=await cloud.rpc('catan_invite_token',{p_game:active});const link=cloud.HOME+'#join='+t;
   notice='Einladungslink erstellt. Teile ihn mit deinen Mitspielern.';inviteLink=link;return;

  }
  if(cmd==='copy-invite'){await navigator.clipboard.writeText(root.querySelector('#shared-link').value);notice='Einladungslink kopiert.';}
  if(cmd==='confirm'){const g=current();await cloud.rpc('catan_confirm_game',{p_game:g.id,p_revision:g.serverRevision,p_road:awardOwner(g,'road'),p_army:awardOwner(g,'army'),p_accept_mismatch:Boolean(root.querySelector('#shared-accept')?.checked)});await refreshGames();notice='Partie für alle bestätigt.';}
  if(cmd==='export-draft'){const blob=new Blob([JSON.stringify(drafts()[active],null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='catan-entwurf.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  if(cmd==='use-latest'){
   await refreshGames();const g=current(),d=drafts()[active];
   if(g.status==='confirmed')throw Error('Die Partie ist bereits bestätigt. Bitte deinen Entwurf exportieren; er wird nicht überschrieben.');
   notice='Serverstand: '+FIELDS.map(([k,l])=>`${l}: ${g.results[me(g).id].values[k]}`).join(' · ')+'. Dein Entwurf bleibt erhalten.';
   screen='entry';compareReady=true;return;
  }
  if(cmd==='rebase'){compareReady=false;const d=drafts()[active];d.revision=current().results[me(current()).id].revision;d.pending=false;delete d.error;delete d.operation;storeDraft(active,d);notice='Entwurf bereit. Bitte prüfen und erneut abschließen.';}
 });
});
root.addEventListener('input',event=>{if(event.target.matches('#shared-entry input'))try{saveLocal();}catch(err){root.querySelector('#shared-draft-status').textContent=err.message;}});
root.addEventListener('change',event=>{if(event.target.dataset.sharedAward){current().awards[event.target.dataset.sharedAward]=event.target.value||null;}});
root.addEventListener('submit',event=>{
 if(!event.target.id.startsWith('shared-'))return;event.preventDefault();const form=event.target,data=new FormData(form),intent=event.submitter?.value;
 action(async()=>{
  if(form.id==='shared-auth'){await cloud.magicLink(data.get('email'));notice='Anmeldelink verschickt. Öffne die E-Mail auf dem Gerät, auf dem du spielen möchtest. Prüfe gegebenenfalls den Spamordner.';}
  if(form.id==='shared-upgrade'){await cloud.linkEmail(data.get('email'));notice='Bitte bestätige die Verknüpfung über den Link in deiner E-Mail. Deine bisherigen Partien bleiben erhalten.';}
  if(form.id==='shared-invite')await preview(parseInvite(data.get('token')));
  if(form.id==='shared-new'){
   const slots=[1,2,3,4].map(i=>String(data.get('p'+i)).trim()),start=Number(data.get('start'));
   if(!slots[start])throw Error('Der Startspieler benötigt einen Namen.');
   active=await cloud.rpc('catan_create_game',{p_names:slots.filter(Boolean),p_date:data.get('date'),p_place:data.get('place'),p_country:data.get('country'),p_start:slots.slice(0,start).filter(Boolean).length,p_rules:data.get('rules')||'',p_tags:data.get('tags')||'',p_notes:data.get('notes')||''});await refreshGames();screen='game';notice='Partie erstellt. Lade jetzt deine Mitspieler ein.';
  }
  if(form.id==='shared-entry'){
   const v=valuesFromForm(),errors=validateValues(v);if(errors.length)throw Error(errors.join(' '));const g=current(),old=drafts()[active];
   if(old?.error)throw Error('Bitte zuerst den Konflikt mit dem Serverstand prüfen.');
   if(!old?.pending)storeDraft(active,{values:v,revision:old?.revision??g.results[me(g).id].revision,pending:true,operation:crypto.randomUUID()});
   screen='game';if(navigator.onLine){await sync();notice='Deine Werte wurden an die Runde übertragen.';}else notice='Eingabe lokal gesichert. Sie wird bei der nächsten Verbindung übertragen.';
  }
 });
});
async function start(){
 if(location.hash==='#local'){
  const button=document.createElement('button');button.className='button primary';button.style.margin='16px';button.textContent='Zu gemeinsamen Partien';button.onclick=()=>{location.hash='';location.reload();};root.prepend(button);return;
 }
 root.classList.add('shared-app');
 window.addEventListener('storage',event=>{if(event.key==='catan-auth-v1'&&(user()?.id||null)!==displayedUserId)location.reload();});
 if(location.hash.startsWith('#join='))localStorage.setItem('catan-invitation',parseInvite(location.hash.slice(6)));
 try{await cloud.consumeCallback();if(user()){try{games=JSON.parse(localStorage.getItem(cacheKey())||'[]');}catch{}if(navigator.onLine){await cloud.refreshUser();await sync();const t=localStorage.getItem('catan-invitation');if(t)await preview(t);}}}catch(err){message=err.message;}
 render();
 poll=setInterval(async()=>{if(!user()||busy||document.hidden||!navigator.onLine||!['lobby','game'].includes(screen)||root.querySelector('#shared-link'))return;try{const before=JSON.stringify(games);await refreshGames();if(before!==JSON.stringify(games))render();}catch{}},10000);
 window.addEventListener('online',()=>{if(user())action(async()=>{await sync();notice='Wieder verbunden.';});});
 window.addEventListener('offline',()=>{if(screen!=='entry')render();});
}
start().catch(flash);
