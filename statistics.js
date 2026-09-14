export function statistics(games){
 const complete=games.filter(g=>g.status==='confirmed'),players=new Map();
 for(const g of complete){
  const best=Math.max(...g.players.map(p=>g.results[p.id].values.finale_siegpunkte));
  for(const p of g.players){
   const key=p.name.trim().toLocaleLowerCase('de'),v=g.results[p.id].values.finale_siegpunkte;
   const row=players.get(key)||{name:p.name.trim(),games:0,wins:0,total:0,best:0};
   row.games++;row.wins+=Number(v===best);row.total+=v;row.best=Math.max(row.best,v);players.set(key,row);
  }
 }
 return {games:complete.length,players:[...players.values()].sort((a,b)=>b.wins-a.wins||b.total/b.games-a.total/a.games||a.name.localeCompare(b.name,'de'))};
}
