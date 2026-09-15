import {FIELDS,points,winners,awardOwner} from './model.js';
export function deletionIds(...lists){
 for(const list of lists)if(!Array.isArray(list)||list.some(id=>typeof id!=='string'||!/^[-a-zA-Z0-9_]{1,100}$/.test(id)))throw Error('Ungültige Löschkennungen.');
 return [...new Set(lists.flat())].sort();
}
export function exportExchangeData(state){const deletedIds=deletionIds(state.deletedIds||[]);return {format:'catan-exchange-v2',deletedIds,games:exportPCGames(state.games.filter(g=>!deletedIds.includes(g.id)))};}
export function toPCGame(g){
 if(g.status!=='confirmed')throw Error('Nur abgeschlossene Partien werden abgeglichen.');
 if(g.legacy?.source==='catan-pc')return {...structuredClone(g.legacy.raw),_catan_id:g.id};
 return {_catan_id:g.id,datum_iso:g.date,ort:g.place,land:g.country,regeln:g.rules?[g.rules]:[],tags:g.tags?[g.tags]:[],notizen:g.notes,sieger:winners(g).map(p=>p.name),spieler:g.players.map(p=>({name:p.name,startspieler:p.id===g.startPlayerId,...Object.fromEntries(FIELDS.map(([k])=>[k,g.results[p.id].values[k]])),siegpunkte_berechnet:points(g,p.id),laengste_handelsstrasse:awardOwner(g,'road')===p.id,groesste_rittermacht:awardOwner(g,'army')===p.id}))};
}
const sorted=x=>Array.isArray(x)?x.map(sorted):x&&typeof x==='object'?Object.fromEntries(Object.keys(x).sort().map(k=>[k,sorted(x[k])])):x;
export function sameGame(a,b){
 const clean=g=>{const x=toPCGame(g);delete x.spiel_nr;delete x.datum;delete x._catan_id;return sorted(x);};
 return JSON.stringify(clean(a))===JSON.stringify(clean(b));
}
export function exportPCGames(games){return games.filter(g=>g.status==='confirmed').map(toPCGame).sort((a,b)=>a.datum_iso.localeCompare(b.datum_iso)||a._catan_id.localeCompare(b._catan_id)).map((g,i)=>({...g,spiel_nr:i+1,datum:g.datum_iso.split('-').reverse().join('.')+' Nr. '+(i+1)}));}
