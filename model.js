export const FIELDS = [
  ['siedlungen', 'Siedlungen', 5, 'Je 1 Siegpunkt'],
  ['staedte', 'Städte', 4, 'Je 2 Siegpunkte'],
  ['stadtmauern', 'Stadtmauern', 3, 'Anzahl deiner Stadtmauern'],
  ['strassen', 'Straßen insgesamt', 16, 'Alle gebauten Straßen'],
  ['handelsstrasse', 'Längste Handelsstraße', 30, 'Zusammenhängende Straßen'],
  ['ritter', 'Ritter', 14, 'Ausgespielte Ritterkarten'],
  ['sp_entwicklung', 'Siegpunktkarten', 10, 'Siegpunkte aus Entwicklungskarten'],
  ['finale_siegpunkte', 'Finale Siegpunkte', 20, 'Dein tatsächlich erreichter Endstand']
];
export const COLORS = ['#a53629', '#356387', '#ba8121', '#397259'];
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function blankValues() {
  return Object.fromEntries(FIELDS.map(([key]) => [key, ['siedlungen','strassen','finale_siegpunkte'].includes(key) ? 2 : 0]));
}
export function validateValues(v) {
  const errors = [];
  for (const [key,label,max] of FIELDS) {
    if (!Number.isInteger(v[key]) || v[key] < 0 || v[key] > max) errors.push(`${label}: Bitte eine ganze Zahl von 0 bis ${max} eingeben.`);
  }
  if (v.staedte + v.siedlungen < 2) errors.push('Zusammen müssen mindestens 2 Siedlungen oder Städte vorhanden sein.');
  if (v.handelsstrasse > v.strassen) errors.push('Die längste Handelsstraße darf nicht länger sein als deine Straßen insgesamt.');
  return errors;
}
export function createGame({names,date,place='',country='',rules='',tags='',notes=''}) {
  names = names.map(n => n.trim());
  if (names.length < 2 || names.length > 4 || names.some(n => !n || n.length > 40)) throw Error('Bitte 2 bis 4 Spielernamen mit höchstens 40 Zeichen angeben.');
  if (new Set(names.map(n=>n.toLocaleLowerCase('de'))).size !== names.length) throw Error('Jeder Spielername muss eindeutig sein.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10)!==date) throw Error('Bitte ein gültiges Datum eingeben.');
  const players = names.map((name,i)=>({id:crypto.randomUUID(),name,color:COLORS[i]}));
  return {id:crypto.randomUUID(),date,place:place.trim(),country:country.trim(),rules,tags,notes,
    status:'open',hostId:players[0].id,startPlayerId:players[0].id,players,
    results:Object.fromEntries(players.map(p=>[p.id,{values:blankValues(),status:'draft',revision:0,updatedAt:null}])),
    awards:{road:null,army:null},confirmedAt:null};
}
export function makeDemo() {
  const g = createGame({names:['Anna','Ben','Clara','David'],date:today(),place:'Bei Anna',country:'Deutschland'});
  const values = [
    {strassen:8,handelsstrasse:6,siedlungen:2,staedte:2,ritter:2,sp_entwicklung:0,finale_siegpunkte:8},
    {strassen:5,handelsstrasse:4,siedlungen:3,staedte:1,ritter:1,sp_entwicklung:1,finale_siegpunkte:6},
    {strassen:6,handelsstrasse:4,siedlungen:2,staedte:3,ritter:4,sp_entwicklung:0,finale_siegpunkte:10},
    {strassen:4,handelsstrasse:3,siedlungen:2,staedte:1,ritter:0,sp_entwicklung:0,finale_siegpunkte:4}
  ];
  g.players.forEach((p,i)=>{g.results[p.id].values={...blankValues(),...values[i]}; if(i===1||i===2) g.results[p.id].status='submitted';});
  return {schemaVersion:1,games:[g],activeGameId:g.id,actorId:g.hostId};
}
function requireOpen(g) { if(g.status!=='open') throw Error('Die Partie ist bestätigt. Eingaben sind gesperrt.'); }
export function updateResult(g,actorId,values,{submit=false}={}) {
  requireOpen(g);
  if(!g.results[actorId]) throw Error('Dieser Spieler gehört nicht zur Partie.');
  if(submit) {const errors=validateValues(values); if(errors.length) throw Error(errors.join('\n'));}
  const r=g.results[actorId];
  r.values=structuredClone(values); r.status=submit?'submitted':'draft';r.revision++;r.updatedAt=new Date().toISOString();
  g.awards={road:null,army:null};
}
export function candidates(g,kind) {
  const key=kind==='road'?'handelsstrasse':'ritter', threshold=kind==='road'?5:3;
  const max=Math.max(...g.players.map(p=>Number(g.results[p.id].values[key])||0));
  return max<threshold?[]:g.players.filter(p=>g.results[p.id].values[key]===max);
}
export function awardOwner(g,kind) {
  const list=candidates(g,kind);
  return list.length===1?list[0].id:list.some(p=>p.id===g.awards[kind])?g.awards[kind]:null;
}
export function chooseAward(g,actorId,kind,playerId) {
  requireOpen(g);
  if(actorId!==g.hostId) throw Error('Nur die Spielleitung darf Gleichstände auflösen.');
  if(!['road','army'].includes(kind) || (playerId!==null&&!candidates(g,kind).some(p=>p.id===playerId))) throw Error('Bitte einen Spieler aus dem Gleichstand wählen.');
  g.awards[kind]=playerId;
}
export function points(g,id) {
  const v=g.results[id].values;
  return v.siedlungen+2*v.staedte+v.sp_entwicklung+(awardOwner(g,'road')===id?2:0)+(awardOwner(g,'army')===id?2:0);
}
export function review(g) {
  const blockers=[];
  for(const p of g.players) {
    if(g.results[p.id].status!=='submitted') blockers.push(`${p.name} hat die Eingabe noch nicht abgeschlossen.`);
    for(const e of validateValues(g.results[p.id].values)) blockers.push(`${p.name}: ${e}`);
  }
  for(const kind of ['road','army']) if(candidates(g,kind).length>1&&!awardOwner(g,kind)) blockers.push(`Gleichstand bei ${kind==='road'?'Handelsstraße':'Rittermacht'}: Bitte den Besitzer auswählen.`);
  const mismatches=g.players.filter(p=>g.results[p.id].values.finale_siegpunkte!==points(g,p.id));
  return {blockers,mismatches};
}
export function confirmGame(g,actorId,acceptMismatch=false) {
  requireOpen(g);
  if(actorId!==g.hostId) throw Error('Nur die Spielleitung darf die Partie bestätigen.');
  const r=review(g);
  if(r.blockers.length) throw Error(r.blockers.join('\n'));
  if(r.mismatches.length&&!acceptMismatch) throw Error('Bitte die abweichenden Siegpunkte prüfen und ausdrücklich bestätigen.');
  g.status='confirmed';g.confirmedAt=new Date().toISOString();g.mismatchAccepted=r.mismatches.length>0;
}
export function winners(g) {
  const max=Math.max(...g.players.map(p=>g.results[p.id].values.finale_siegpunkte));
  return g.players.filter(p=>g.results[p.id].values.finale_siegpunkte===max);
}
