import {FIELDS,COLORS,validateValues} from './model.js';

const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])])):value;
export async function importPCGames(data){
 if(!Array.isArray(data))throw Error('Die PC-Datei muss eine Liste von Spielen enthalten.');
 const games=[];
 for(const raw of data){
  const fail=message=>{throw Error(`PC-Partie ${raw?.spiel_nr??games.length+1}: ${message}`);};
  if(!raw||!Array.isArray(raw.spieler)||raw.spieler.length<2||raw.spieler.length>6)fail('2 bis 6 Spieler erwartet.');
  if(typeof raw.datum_iso!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(raw.datum_iso)||!Number.isFinite(Date.parse(raw.datum_iso))||new Date(raw.datum_iso).toISOString().slice(0,10)!==raw.datum_iso)fail('Ungültiges Datum.');
  if(raw.spieler.some(p=>typeof p.name!=='string'||!p.name.trim()||p.name.length>80)||new Set(raw.spieler.map(p=>p.name.trim().toLocaleLowerCase('de'))).size!==raw.spieler.length)fail('Spielernamen fehlen oder sind doppelt.');
  for(const p of raw.spieler){const errors=validateValues(p);if(errors.length)fail(errors.join(' '));if(!Number.isFinite(p.siegpunkte_berechnet))fail('Berechnete Punkte fehlen.');}
  if(!Array.isArray(raw.sieger)||!raw.sieger.length||raw.sieger.some(n=>!raw.spieler.some(p=>p.name===n)))fail('Siegerzuordnung fehlt.');
  for(const key of ['laengste_handelsstrasse','groesste_rittermacht'])if(raw.spieler.filter(p=>p[key]).length>1)fail('Bonuskarte mehrfach vergeben.');
  const identity={...raw};delete identity.spiel_nr;delete identity.datum;delete identity._catan_id;
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical(identity))));
  const generated='pc-'+[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(raw._catan_id!==undefined&&(typeof raw._catan_id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(raw._catan_id)))fail('Ungültige dauerhafte Spielkennung.');
  const id=raw._catan_id||generated;
  const players=raw.spieler.map((p,i)=>({id:id+'-'+i,name:p.name,color:COLORS[i]||['#79529d','#56635e'][i-4]}));
  const owner=key=>players[raw.spieler.findIndex(p=>p[key])]?.id||null;
  const text=value=>Array.isArray(value)?value.join(', '):String(value??'');
  games.push({id,date:raw.datum_iso,place:text(raw.ort),country:text(raw.land),rules:text(raw.regeln),tags:text(raw.tags),notes:text(raw.notizen),status:'confirmed',hostId:players[0].id,startPlayerId:players[raw.spieler.findIndex(p=>p.startspieler)]?.id||players[0].id,players,
   results:Object.fromEntries(players.map((p,i)=>[p.id,{values:Object.fromEntries(FIELDS.map(([key])=>[key,raw.spieler[i][key]])),status:'submitted',revision:0,updatedAt:null}])),
   awards:{road:owner('laengste_handelsstrasse'),army:owner('groesste_rittermacht')},mismatchAccepted:raw.spieler.some(p=>p.finale_siegpunkte!==p.siegpunkte_berechnet),confirmedAt:null,
   legacy:{source:'catan-pc',raw:structuredClone(raw),winnerIds:players.filter((p,i)=>raw.sieger.includes(raw.spieler[i].name)).map(p=>p.id),points:Object.fromEntries(players.map((p,i)=>[p.id,raw.spieler[i].siegpunkte_berechnet]))}});
 }
 if(new Set(games.map(g=>g.id)).size!==games.length)throw Error('Die PC-Datei enthält identische Partien. Bitte zuerst prüfen; nichts wurde importiert.');
 return {schemaVersion:1,games,activeGameId:games[0]?.id||null,actorId:games[0]?.hostId||null};
}
