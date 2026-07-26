import { seats } from '../shared/constants.js';
import { realtime } from '../shared/realtime.js';

const stage=document.querySelector('#stage'), characters=document.querySelector('#characters'), effects=document.querySelector('#effects');
const audio=document.querySelector('#audio'), unlock=document.querySelector('#unlock');
let state, lastGift, unlocked=false;

function drawCharacters(count, action) {
  while(characters.children.length<count){const i=characters.children.length, el=document.createElement('div');el.className='character enter';el.innerHTML='<div class="head"></div><div class="body"></div>';characters.append(el);requestAnimationFrame(()=>place(el,i,action));}
  while(characters.children.length>count) characters.lastElementChild.remove();
  [...characters.children].forEach((el,i)=>place(el,i,action));
}
function place(el,i,action){const s=seats[i];Object.assign(el.style,{left:`${s.x}%`,top:`${s.y}%`,zIndex:s.zIndex,transform:`scale(${s.scale}) rotate(${s.rotation}deg)`});el.className=`character ${action}`;}
function showGift(gift){if(!gift||gift.id===lastGift)return;lastGift=gift.id;const el=document.createElement('div');el.className='gift';el.textContent={lotus:'🪷',candle:'🕯️',golden:'✨🪷',aura:'☀️',bell:'🔔',special:'🪷✨'}[gift.type]||'🪷';effects.append(el);if(gift.type==='aura') characters.children[gift.target||0]?.classList.add('aura');if(gift.type==='candle'){el.classList.add('candle');el.style.left=`${20+Math.random()*60}%`;el.style.top='auto';}setTimeout(()=>el.remove(),5000);}
async function syncAudio(s){audio.volume=s.audio_volume;if(s.audio_url&&audio.src!==s.audio_url)audio.src=s.audio_url;if(Math.abs(audio.currentTime-s.audio_current_time)>2)audio.currentTime=s.audio_current_time;if(!unlocked)return;if(s.audio_status==='playing')await audio.play().catch(()=>{});else audio.pause();if(s.audio_status==='stopped')audio.currentTime=0;}
realtime.subscribe(s=>{state=s;stage.className=`scene-${s.scene} camera-${s.camera}${s.auto_camera?' auto-camera':''}`;drawCharacters(s.character_count,s.character_action);showGift(s.gift);syncAudio(s);});
realtime.connect();unlock.onclick=async()=>{unlocked=true;unlock.classList.add('hidden');await audio.play().catch(()=>{});if(state.audio_status!=='playing')audio.pause();};
