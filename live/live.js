import { seats, CAMERAS, CAMERA_INTERVAL } from '../shared/constants.js';
import { realtime } from '../shared/realtime.js';
import { demoSubtitles, subtitleAt } from '../shared/subtitles.js';

const stage=document.querySelector('#stage'), characters=document.querySelector('#characters'), effects=document.querySelector('#effects');
const audio=document.querySelector('#audio'), subtitle=document.querySelector('#subtitle'), unlock=document.querySelector('#unlock');
let state, autoTimer, lastGift, unlocked=false;

function drawCharacters(count, action) {
  while(characters.children.length<count){const i=characters.children.length, el=document.createElement('div');el.className='character enter';el.innerHTML='<div class="head"></div><div class="body"></div>';characters.append(el);requestAnimationFrame(()=>place(el,i,action));}
  while(characters.children.length>count) characters.lastElementChild.remove();
  [...characters.children].forEach((el,i)=>place(el,i,action));
}
function place(el,i,action){const s=seats[i];Object.assign(el.style,{left:`${s.x}%`,top:`${s.y}%`,zIndex:s.zIndex,transform:`scale(${s.scale}) rotate(${s.rotation}deg)`});el.className=`character ${action}`;}
function showGift(gift){if(!gift||gift.id===lastGift)return;lastGift=gift.id;const el=document.createElement('div');el.className='gift';el.textContent={lotus:'🪷',candle:'🕯️',golden:'✨🪷',aura:'☀️',bell:'🔔',special:'🪷✨'}[gift.type]||'🪷';effects.append(el);if(gift.type==='aura') characters.children[gift.target||0]?.classList.add('aura');if(gift.type==='candle'){el.classList.add('candle');el.style.left=`${20+Math.random()*60}%`;el.style.top='auto';}setTimeout(()=>el.remove(),5000);}
function scheduleAuto(){clearTimeout(autoTimer);if(!state?.auto_camera)return;autoTimer=setTimeout(()=>{const choices=CAMERAS.filter(x=>x!==state.camera);realtime.update({camera:choices[Math.floor(Math.random()*choices.length)]},'live');},CAMERA_INTERVAL.min+Math.random()*(CAMERA_INTERVAL.max-CAMERA_INTERVAL.min));}
async function syncAudio(s){audio.volume=s.audio_volume;if(s.audio_url&&audio.src!==s.audio_url)audio.src=s.audio_url;if(Math.abs(audio.currentTime-s.audio_current_time)>2)audio.currentTime=s.audio_current_time;if(!unlocked)return;if(s.audio_status==='playing')await audio.play().catch(()=>{});else audio.pause();if(s.audio_status==='stopped')audio.currentTime=0;}
realtime.subscribe(s=>{const cameraChanged=state?.camera!==s.camera;state=s;stage.className=`scene-${s.scene} camera-${s.camera}`;drawCharacters(s.character_count,s.character_action);showGift(s.gift);syncAudio(s);if(cameraChanged||!autoTimer)scheduleAuto();});
realtime.connect();unlock.onclick=async()=>{unlocked=true;unlock.classList.add('hidden');await audio.play().catch(()=>{});if(state.audio_status!=='playing')audio.pause();};
setInterval(()=>{if(!state)return;subtitle.textContent=state.subtitle_enabled?subtitleAt(demoSubtitles,audio.currentTime,state.subtitle_language):'';},150);
