// Publishable project key only. Authorization is enforced by the database.
export const CLOUD_URL='https://nbdtzbpnrklvajdgjanp.supabase.co';
const KEY='sb_publishable_6ndbXvzvJyXMSxNHVPIrOg_jNGNJJoK';
const SESSION='catan-auth-v1';
export const HOME='https://urvaterchristus.github.io/catan-runde/';
// Enable after custom SMTP has been configured and delivery verified.
export const EMAIL_READY=false;
export function session(){try{return JSON.parse(localStorage.getItem(SESSION)||'null');}catch{return null;}}
function saveSession(data){localStorage.setItem(SESSION,JSON.stringify({...data,expires_at:data.expires_at||Math.floor(Date.now()/1000)+data.expires_in}));}
async function response(res){
  const data=await res.json().catch(()=>null);
  if(!res.ok){
    const raw=data?.msg||data?.message||data?.error_description||data?.error||`Anfrage fehlgeschlagen (${res.status})`;
    const map={'Invalid login credentials':'E-Mail oder Passwort stimmen nicht.','Email not confirmed':'Bitte zuerst deine E-Mail-Adresse bestätigen.','User already registered':'Dieses Konto existiert bereits. Bitte anmelden.','Email rate limit exceeded':'Zu viele E-Mails angefordert. Bitte später erneut versuchen.'};
    throw Error(map[raw]||raw);
  }
  return data;
}
async function auth(path,body,token){return response(await fetch(CLOUD_URL+'/auth/v1/'+path,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)}));}
export async function guest(){const data=await auth('signup',{data:{}});saveSession(data);return data;}
export async function magicLink(email){
 if(!EMAIL_READY)throw Error('Die Anmeldung per E-Mail wird noch eingerichtet. Du kannst bereits als Gast mitspielen.');
 return auth('otp?redirect_to='+encodeURIComponent(HOME),{email,create_user:true});
}
let refreshPromise;
async function refresh(){
  if(refreshPromise)return refreshPromise;
  const run=async()=>{
    const s=session();if(!s)throw Error('Bitte anmelden.');
    if(s.expires_at>Date.now()/1000+60)return s;
    const data=await auth('token?grant_type=refresh_token',{refresh_token:s.refresh_token});saveSession(data);return data;
  };
  refreshPromise=(navigator.locks?navigator.locks.request('catan-session-refresh',run):run()).finally(()=>refreshPromise=null);
  return refreshPromise;
}
export async function token(){return (await refresh()).access_token;}
export async function logout(){const s=session();localStorage.removeItem(SESSION);if(s)try{await auth('logout?scope=local',{},s.access_token);}catch{}}
export async function consumeCallback(){
  const hash=new URLSearchParams(location.hash.slice(1));
  if(hash.get('error_description')){const message=hash.get('error_description');history.replaceState(null,'',location.pathname);throw Error(message);}
  if(!hash.get('access_token'))return false;
  const access=hash.get('access_token');
  const user=await response(await fetch(CLOUD_URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+access}}));
  saveSession({access_token:access,refresh_token:hash.get('refresh_token'),expires_in:Number(hash.get('expires_in')||3600),user});
  const recovery=hash.get('type')==='recovery';history.replaceState(null,'',location.pathname);return recovery;
}
export async function rpc(name,args){return response(await fetch(CLOUD_URL+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify(args)}));}
export async function refreshUser(){
 const access=await token();
 const user=await response(await fetch(CLOUD_URL+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+access}}));
 saveSession({...session(),user});return user;
}
export async function linkEmail(email){
 if(!EMAIL_READY)throw Error('Der E-Mail-Versand wird noch eingerichtet.');
 if(!session()?.user?.is_anonymous)throw Error('Dieser Zugang ist bereits ein festes Konto.');
 return response(await fetch(CLOUD_URL+'/auth/v1/user?redirect_to='+encodeURIComponent(HOME),{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify({email})}));
}
export async function loadGames(){
 const games=[],access=await token();let offset=0;
 while(true){
  const res=await fetch(CLOUD_URL+'/rest/v1/catan_games?select=*,catan_players(*)&order=played_on.desc,created_at.desc,id.desc&limit=100&offset='+offset,{headers:{apikey:KEY,Authorization:'Bearer '+access,Prefer:'count=exact'}});
  const range=res.headers.get('content-range'),page=await response(res);games.push(...page);offset+=page.length;
  const total=range&&range.split('/')[1]!=='*'?Number(range.split('/')[1]):null;
  if(!page.length||(total!==null&&offset>=total))break;
 }
 return [...new Map(games.map(g=>[g.id,g])).values()];
}
