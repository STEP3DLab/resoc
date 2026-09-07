import {icon} from './icons.js';

let activeSession=null;

const recognitionClass=()=>globalThis.SpeechRecognition||globalThis.webkitSpeechRecognition||null;

export const voiceInputSupported=()=>Boolean(recognitionClass());

export function appendVoiceTranscript(base,spoken){
  const transcript=String(spoken??'').trim();
  if(!transcript)return String(base??'');
  const initial=String(base??'');
  if(!initial)return transcript;
  return initial+(/[\s\n]$/.test(initial)||/^[,.;:!?)]/.test(transcript)?'':' ')+transcript;
}

export function speechErrorMessage(code){
  return ({'not-allowed':'Доступ к микрофону запрещён','service-not-allowed':'Распознавание речи недоступно','audio-capture':'Микрофон не найден','no-speech':'Речь не распознана',network:'Нет связи с распознаванием речи'}[code]||'Не удалось распознать речь');
}

function updateButton(button,state,label){
  button.dataset.state=state;
  button.setAttribute('aria-pressed',String(state==='listening'));
  button.setAttribute('aria-label',state==='listening'?'Остановить голосовой ввод':'Начать голосовой ввод');
  button.title=state==='listening'?'Остановить запись':'Голосовой ввод';
  button.querySelector('.voice-button-label').textContent=label;
}

function clearButtonLater(button){
  clearTimeout(button.voiceResetTimer);
  button.voiceResetTimer=setTimeout(()=>{
    if(button.isConnected&&button.dataset.state!=='listening')updateButton(button,'idle','Голосовой ввод');
  },2600);
}

export function stopVoiceInput(){
  const session=activeSession;
  if(!session)return;
  activeSession=null;
  session.recognition.onend=null;
  session.recognition.onerror=null;
  session.recognition.onresult=null;
  try{session.recognition.abort()}catch{}
  if(session.button.isConnected)updateButton(session.button,'idle','Голосовой ввод');
}

function startVoiceInput(target,button){
  stopVoiceInput();
  const Recognition=recognitionClass();
  if(!Recognition)return;
  const recognition=new Recognition();
  const session={recognition,target,button,initial:target.value,final:'',interim:'',error:'',manualStop:false};
  activeSession=session;
  recognition.lang='ru-RU';
  recognition.interimResults=true;
  recognition.continuous=false;
  recognition.maxAlternatives=1;
  recognition.onstart=()=>{if(activeSession===session)updateButton(button,'listening','Слушаю…')};
  recognition.onresult=event=>{
    if(activeSession!==session)return;
    let interim='';
    for(let index=event.resultIndex;index<event.results.length;index++){
      const text=event.results[index][0]?.transcript||'';
      if(event.results[index].isFinal)session.final+=text;
      else interim+=text;
    }
    session.interim=interim;
    const next=appendVoiceTranscript(session.initial,session.final+session.interim);
    target.value=target.maxLength>0?next.slice(0,target.maxLength):next;
    target.dispatchEvent(new Event('input',{bubbles:true}));
  };
  recognition.onerror=event=>{if(activeSession===session&&event.error!=='aborted')session.error=speechErrorMessage(event.error)};
  recognition.onend=()=>{
    if(activeSession!==session)return;
    activeSession=null;
    const added=target.value!==session.initial;
    const message=session.error||(added?'Текст добавлен':session.manualStop?'Запись остановлена':'Речь не распознана');
    updateButton(button,session.error||!added&&!session.manualStop?'error':added?'success':'idle',message);
    clearButtonLater(button);
  };
  try{recognition.start()}catch{
    activeSession=null;
    updateButton(button,'error','Микрофон недоступен');
    clearButtonLater(button);
  }
}

export function enhanceVoiceInputs(root=document){
  stopVoiceInput();
  if(!voiceInputSupported())return false;
  root.querySelectorAll('[data-voice-input]').forEach(target=>{
    if(target.dataset.voiceEnhanced==='true')return;
    const button=document.createElement('button');
    button.type='button';
    button.className='voice-button';
    button.dataset.state='idle';
    button.dataset.voiceFor=target.id||target.name||'text';
    button.setAttribute('aria-label','Начать голосовой ввод');
    button.setAttribute('aria-pressed','false');
    button.title='Голосовой ввод';
    button.innerHTML=icon('mic')+'<span class="voice-button-label" role="status" aria-live="polite">Голосовой ввод</span>';
    target.insertAdjacentElement('afterend',button);
    button.onclick=()=>{
      if(activeSession?.button===button){
        activeSession.manualStop=true;
        updateButton(button,'processing','Обрабатываю…');
        try{activeSession.recognition.stop()}catch{stopVoiceInput()}
      }else startVoiceInput(target,button);
    };
    target.dataset.voiceEnhanced='true';
  });
  return true;
}
