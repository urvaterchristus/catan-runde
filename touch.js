// Keep the game surface fixed. While typing, allow pinch zoom back out.
const viewport=document.querySelector('meta[name="viewport"]');
const editing=()=>document.activeElement?.matches('input:not([type="checkbox"]):not([type="radio"]),textarea,[contenteditable="true"]');
function updateViewport(){
  const active=Boolean(editing());
  document.documentElement.classList.toggle('editing-field',active);
  viewport.content=active
    ?'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=3, user-scalable=yes'
    :'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no';
}
document.addEventListener('focusin',updateViewport);
document.addEventListener('focusout',()=>queueMicrotask(updateViewport));
// Safari gesture events supplement touch-action where viewport limits are ignored.
for(const type of ['gesturestart','gesturechange','gestureend']){
  document.addEventListener(type,event=>{if(!editing())event.preventDefault();},{passive:false});
}
document.addEventListener('touchmove',event=>{
  if(event.touches.length>1&&!editing())event.preventDefault();
},{passive:false});
document.addEventListener('dblclick',event=>{if(!editing())event.preventDefault();},{passive:false});
new MutationObserver(updateViewport).observe(document.querySelector('#app'),{childList:true});
updateViewport();
