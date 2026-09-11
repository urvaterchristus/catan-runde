const status=document.querySelector('#offline-status');
const install=document.querySelector('#install-button');
const update=document.querySelector('#update-button');
const help=document.querySelector('#install-help');
let promptEvent=null,registration=null,reloading=false;
const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
function installHint(){
  if(standalone()){help.textContent='Als App geöffnet · Entwürfe sind auch offline verfügbar.';install.hidden=true;return;}
  help.textContent=/iPhone|iPad|iPod/.test(navigator.userAgent)?'Auf dem iPhone: In Safari öffnen → Teilen → Zum Home-Bildschirm.':'Auf dem Handy: Im Browsermenü „App installieren“ oder „Zum Startbildschirm hinzufügen“ wählen.';
}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;install.hidden=standalone();});
install.addEventListener('click',async()=>{
  if(!promptEvent)return;
  const event=promptEvent;promptEvent=null;install.hidden=true;
  try{await event.prompt();await event.userChoice;}catch{help.textContent='Bitte die Installation über das Browsermenü starten.';}
});
window.addEventListener('appinstalled',()=>{install.hidden=true;promptEvent=null;help.textContent='Installiert. Du findest Catan Runde auf deinem Startbildschirm.';});
update.addEventListener('click',()=>{
  if(registration?.waiting){reloading=true;registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});}
});
function offerUpdate(){if(registration?.waiting)update.hidden=false;}
installHint();
if('serviceWorker' in navigator&&window.isSecureContext){
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(reloading)location.reload();});
  navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).then(async reg=>{
    registration=reg;offerUpdate();
    reg.addEventListener('updatefound',()=>{
      const worker=reg.installing;
      worker?.addEventListener('statechange',()=>{
        if(worker.state==='installed')offerUpdate();
        if(worker.state==='redundant'&&!reg.active)status.textContent='Offline-Speicherung fehlgeschlagen. Bitte mit Internet neu laden.';
      });
    });
    await navigator.serviceWorker.ready;
    status.textContent='✓ App für dieses Gerät offline bereit';
  }).catch(()=>{status.textContent='Offline-Modus noch nicht bereit. Bitte mit Internet neu laden.';});
}else status.textContent='Offline-Installation benötigt HTTPS und einen unterstützten Browser.';
