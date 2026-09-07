import {REGION_DISTRICTS} from './engine.js';
import {programLabel} from './catalog-view-model.js';
import {icon} from './icons.js';
import {runtime} from './runtime-config.js';
import {checkAssistantConnection,connectionCopy} from './assistant-connection.js';
import {enhanceVoiceInputs,stopVoiceInput} from './voice-input.js';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const state={messages:[],draft:'',busy:false,connection:{kind:'checking'},error:'',profile:{education:'',district:'',region:'',format:'',themes:[],goal:'new',budget:false,maxMonths:''},proposal:null,imported:null,programs:[],kind:'explore',hasAnswer:false,stale:false,controller:null};
const education={nine:'9 классов',school:'11 классов',spo:'Среднее профессиональное',bachelor:'Бакалавриат',master:'Магистратура / специалитет'};
const districts={ЦФО:'Центральный',СЗФО:'Северо-Западный',ЮФО:'Южный',СКФО:'Северо-Кавказский',ПФО:'Приволжский',УФО:'Уральский',СФО:'Сибирский',ДФО:'Дальневосточный'};
const formats=['Очная','Очно-заочная','Заочная','С дистанционными технологиями','Онлайн без посещений'];
const goals={new:'Новая профессия',fast:'Короткий срок',continue:'Продолжить образование'};
const choices=(list,value,empty)=>`<option value="">${empty}</option>`+(Array.isArray(list)?list.map(x=>[x,x]):Object.entries(list)).map(([k,v])=>`<option value="${esc(k)}" ${value===k?'selected':''}>${esc(v)}</option>`).join('');
const suggestions=['Хочу сменить профессию, но не знаю, с чего начать','Хочу работать в IT и совмещать учёбу с работой','Помоги понять разницу между программами'];
let host,context,mountToken=0,statusController;
const current=()=>host?.isConnected&&host.querySelector('#assistantWorkspace')?.dataset.instance===String(mountToken);
const $=selector=>current()?host.querySelector(selector):null;
const available=()=>state.connection.kind==='ready';

export function conditionLabels(p){return [Object.hasOwn(p,'education')?'Образование: '+(education[p.education]||'требует уточнения'):null,Object.hasOwn(p,'district')?'Округ: '+(districts[p.district]||'любой'):null,Object.hasOwn(p,'region')?'Регион: '+(p.region||'любой'):null,Object.hasOwn(p,'format')?'Форма: '+(p.format||'любая'):null,p.goal?'Цель: '+goals[p.goal]:null,Object.hasOwn(p,'budget')?(p.budget?'Нужны бюджетные места':'Бюджет не обязателен'):null,Object.hasOwn(p,'maxMonths')?(p.maxMonths?'Срок: до '+p.maxMonths+' мес.':'Срок не ограничен'):null,Object.hasOwn(p,'themes')?p.themes.length?'Направления: '+p.themes.join(', '):'Направления не ограничены':null].filter(Boolean)}

const tags=p=>conditionLabels(p).map(value=>`<span>${esc(value)}</span>`).join('');

function compactCard(p){return `<button class="match-card" data-ai-program="${esc(p.id)}"><span class="match-top"><span class="match-institution">${esc(p.shortName)}</span>${icon('arrow')}</span><strong>${esc(programLabel(p))}</strong><span class="match-bottom">${esc(p.level)} · ${esc(p.city)}${p.recordType==='direction'?' · Направление':''}</span></button>`}

function renderShell(){
  host.innerHTML=`<div class="assistant-workspace" id="assistantWorkspace" data-instance="${mountToken}"><section class="chat-surface" aria-label="AI-помощник"><div class="chat-toolbar"><div><span class="assistant-mini" aria-hidden="true">✧</span><strong>AI-помощник</strong></div><span class="ai-status" id="connectionStatus" role="status"></span><button class="clear-chat" id="clearChat" aria-label="Начать новый диалог" title="Новый диалог">↺</button></div><div class="chat-welcome" id="chatWelcome"><h1 class="assistant-title">Помощник по выбору обучения</h1><p>Обсудите планы, уточните условия и сравните программы из каталога.</p><div class="conversation-starters" id="chatStarters">${suggestions.map((text,i)=>`<button data-starter="${i}"><span>${String(i+1).padStart(2,'0')}</span>${text}<span aria-hidden="true">↗</span></button>`).join('')}</div></div><div class="assistant-state-box" id="connectionNotice"><h2 id="connectionTitle"></h2><p id="connectionText"></p><div class="offline-actions"><a class="primary" href="#navigator">${icon('route')}Подобрать по шагам</a><a class="secondary" href="#catalog">Открыть каталог ${icon('arrow')}</a></div><button class="text-link" id="retryConnection">Проверить ещё раз</button></div><div id="importProfile" class="chat-import" hidden></div><div class="conversation" id="conversation"><div class="chat-history assistant-log" id="chatLog" role="log" aria-label="Диалог с помощником" aria-live="off" aria-relevant="additions"></div></div><div id="profileProposal" class="profile-proposal" hidden></div><div class="assistant-progress" id="assistantProgress" role="status" hidden></div><div class="composer-area" id="composerArea"><p class="chat-error" id="chatError" role="alert" hidden></p><form class="chat-composer" id="chatForm"><label class="sr-only" for="chatInput">Сообщение AI-помощнику</label><textarea id="chatInput" rows="2" maxlength="1800" placeholder="Например: есть техническое образование, хочу освоить IT…"></textarea><div class="composer-bottom"><span>Ctrl + Enter — отправить</span><button class="send-message" id="sendMessage" type="submit" aria-label="Отправить сообщение">↑</button></div></form><p class="chat-privacy">После отправки сообщение и условия передаются AI-провайдеру. Не указывайте личные и медицинские сведения. История остаётся в этой вкладке.</p></div></section><aside class="assistant-context"><span class="eyebrow">УСЛОВИЯ ПОДБОРА</span><h2>Что для вас важно</h2><p class="context-intro">Условия будут переданы помощнику вместе с вашим сообщением.</p><div class="context-fields"><label>Образование<select id="aiEducation">${choices(education,state.profile.education,'Выберите уровень')}</select></label><label>Федеральный округ<select id="aiDistrict">${choices(districts,state.profile.district,'Любой федеральный округ')}</select></label><label>Регион<select id="aiRegion">${choices(Object.keys(REGION_DISTRICTS),state.profile.region,'Любой регион')}</select></label><label>Предельный срок<select id="aiMaxMonths">${choices({6:'До 6 месяцев',12:'До 1 года',24:'До 2 лет',48:'До 4 лет'},state.profile.maxMonths,'Без ограничения срока')}</select></label><label>Форма обучения<select id="aiFormat">${choices(formats,state.profile.format,'Любая форма')}</select></label></div><div class="matches-heading"><h3 id="matchesTitle">Для знакомства с каталогом</h3><span id="matchesCount"></span></div><div class="matches-list" id="matchesList"></div><a class="all-programs" href="#catalog">Все ${context.catalog.programs.length} записей ${icon('arrow')}</a><p class="context-footnote">Набор, стоимость и условия поступления подтверждает вуз.</p></aside></div>`;
  $('#chatInput').dataset.voiceInput='';
  if(enhanceVoiceInputs(host))$('.chat-privacy').textContent='После отправки сообщение и условия передаются AI-провайдеру. Сайт не сохраняет аудио; голос распознаёт служба браузера. Не указывайте личные и медицинские сведения. История остаётся в этой вкладке.';
  $('#chatInput').value=state.draft;
  for(const message of state.messages)appendMessage(message,false);
  $('#chatLog').setAttribute('aria-live','polite');
  bind();update();
}

function appendMessage(message,announce=true){
  if(!current())return;
  const article=document.createElement('article');article.className='chat-message '+message.role;
  const author=document.createElement('div');author.className='message-author';author.textContent=message.role==='user'?'Вы':'AI-помощник';
  const paragraph=document.createElement('p');paragraph.textContent=message.content;
  article.append(author,paragraph);$('#chatLog').append(article);
  if(announce)scrollChat();
}

function renderMatches(){
  if(!current())return;
  const examples=[context.catalog.programs.find(p=>p.rgsu&&p.code==='09.03.02'),context.catalog.programs.find(p=>p.rgsu&&p.code==='39.03.02'),context.catalog.programs.find(p=>p.rgsu&&p.code==='38.03.03')].filter(Boolean);
  const rows=state.stale?[]:state.programs.length?state.programs.map(id=>context.catalog.programs.find(p=>p.id===id)).filter(Boolean):state.hasAnswer?[]:examples;
  $('#matchesTitle').textContent=state.stale?'Условия изменились':state.programs.length?(state.kind==='recommended'?'Предварительные варианты':state.kind==='clarify'?'Уточните условия у вуза':'Из каталога'):'Для знакомства с каталогом';
  $('#matchesCount').textContent=rows.length;$('#matchesCount').hidden=!rows.length;
  const signature=JSON.stringify([state.stale,rows.map(p=>p.id)]);if($('#matchesList').dataset.signature===signature)return;$('#matchesList').dataset.signature=signature;
  $('#matchesList').innerHTML=rows.length?rows.slice(0,3).map(compactCard).join(''):`<p class="matches-stale">${state.stale?'Отправьте сообщение с новыми условиями, чтобы обновить варианты.':'В текущем ответе пока нет программ. Уточните запрос или посмотрите каталог.'}</p>`;
  host.querySelectorAll('[data-ai-program]').forEach(button=>button.onclick=()=>context.detail(button.dataset.aiProgram));
}


function renderProfiles(){
  if(!current())return;
  const imported=$('#importProfile');imported.hidden=!state.imported;
  if(state.imported){
    const signature=JSON.stringify(state.imported);
    if(imported.dataset.signature!==signature){
      imported.dataset.signature=signature;
      imported.innerHTML=`<strong>Условия из пошагового подбора</strong><div class="proposal-tags">${tags(state.imported)}</div><p>Свободный текст анкеты не переносится. После применения условия попадут к AI только вместе с отправленным сообщением.</p><button class="primary" id="acceptImport">Использовать условия</button><button class="text-link" id="dismissImport">Не переносить</button>`;
      $('#acceptImport').onclick=()=>{if(state.busy)return;state.profile={...state.profile,...state.imported};state.imported=null;invalidateMatches();syncFields();renderProfiles();(available()?$('#chatInput'):$('#aiEducation')).focus({preventScroll:true})};
      $('#dismissImport').onclick=()=>{state.imported=null;renderProfiles();$('#aiEducation').focus({preventScroll:true})};
    }
    $('#acceptImport').disabled=state.busy;
  }else imported.dataset.signature='';
  const proposal=$('#profileProposal');proposal.hidden=!state.proposal;
  if(state.proposal){
    const signature=JSON.stringify(state.proposal);
    if(proposal.dataset.signature!==signature){
      proposal.dataset.signature=signature;
      proposal.innerHTML=`<strong>Так помощник понял ваши условия</strong><div class="proposal-tags">${tags(state.proposal)}</div><p>Проверьте изменения перед новым подбором.</p><div><button class="primary" id="applyAiProfile">Применить и подобрать</button><button class="text-link" id="dismissAiProfile">Оставить мои условия</button></div>`;
      $('#applyAiProfile').onclick=()=>{if(state.busy||!available())return;state.profile={...state.profile,...state.proposal};state.proposal=null;state.draft='Я подтверждаю выбранные условия. Какие программы можно рассмотреть?';$('#chatInput').value=state.draft;syncFields();renderProfiles();$('#sendMessage').focus({preventScroll:true});send()};
      $('#dismissAiProfile').onclick=()=>{state.proposal=null;renderProfiles();$('#chatInput').focus({preventScroll:true})};
    }
    $('#applyAiProfile').disabled=state.busy||!available();
  }else proposal.dataset.signature='';
}

function syncFields(){for(const [id,key]of [['aiEducation','education'],['aiDistrict','district'],['aiRegion','region'],['aiMaxMonths','maxMonths'],['aiFormat','format']]){const field=$('#'+id);if(field){field.value=state.profile[key]||'';field.disabled=state.busy}}}
function invalidateMatches(){state.programs=[];state.proposal=null;state.stale=true;renderMatches()}

function update(){
  if(!current())return;
  const copy=connectionCopy[state.connection.kind]||connectionCopy.checking;
  $('#connectionStatus').textContent=copy.status;
  $('#connectionStatus').className='ai-status '+(available()?'online':'offline');
  $('#connectionNotice').hidden=available();
  $('#connectionTitle').textContent=copy.title;$('#connectionText').textContent=copy.text;
  $('#retryConnection').hidden=['checking','static'].includes(state.connection.kind);
  $('#chatStarters').hidden=!available();
  $('#chatWelcome').hidden=state.messages.length>0;
  $('#composerArea').hidden=!available()&&!state.draft&&!state.messages.length;
  $('#chatInput').readOnly=state.busy;
  const voiceButton=$('[data-voice-for="chatInput"]');if(voiceButton)voiceButton.disabled=state.busy;
  const sendButton=$('#sendMessage');sendButton.disabled=!state.busy&&!available();sendButton.type=state.busy?'button':'submit';sendButton.textContent=state.busy?'■':'↑';sendButton.setAttribute('aria-label',state.busy?'Остановить ответ':'Отправить сообщение');
  $('#clearChat').disabled=state.busy||!state.messages.length;
  $('#chatError').hidden=!state.error;$('#chatError').textContent=state.error;
  $('#assistantProgress').hidden=!state.busy;$('#assistantProgress').textContent=state.busy?'Помощник готовит ответ…':'';
  syncFields();renderMatches();renderProfiles();
}

function bind(){
  const input=$('#chatInput');
  input.oninput=()=>{state.draft=input.value};
  input.onkeydown=e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();send()}};
  $('#clearChat').addEventListener('click',stopVoiceInput);
  $('#chatForm').onsubmit=e=>{e.preventDefault();send()};
  $('#sendMessage').onclick=()=>{if(state.busy)state.controller?.abort()};
  $('#retryConnection').onclick=checkConnection;
  $('#clearChat').onclick=()=>{state.messages=[];state.draft='';state.proposal=null;state.programs=[];state.error='';state.hasAnswer=false;state.stale=false;$('#chatLog').replaceChildren();input.value='';update();input.focus({preventScroll:true})};
  host.querySelectorAll('[data-starter]').forEach(button=>button.onclick=()=>{state.draft=suggestions[Number(button.dataset.starter)];input.value=state.draft;input.focus()});
  for(const [id,key]of [['aiEducation','education'],['aiDistrict','district'],['aiRegion','region'],['aiMaxMonths','maxMonths'],['aiFormat','format']])$('#'+id).onchange=e=>{state.profile[key]=e.target.value;if(key==='region'&&state.profile.region)state.profile.district=REGION_DISTRICTS[state.profile.region]||'';if(key==='district'&&state.profile.region&&state.profile.district&&REGION_DISTRICTS[state.profile.region]!==state.profile.district)state.profile.region='';invalidateMatches();syncFields();renderProfiles()};
}

async function checkConnection(){
  statusController?.abort('superseded');statusController=new AbortController();
  const controller=statusController,token=mountToken;
  state.connection={kind:'checking'};update();
  const timeout=setTimeout(()=>controller.abort('timeout'),10000);
  try{const connection=await checkAssistantConnection(runtime,fetch,controller.signal);if(token!==mountToken||controller!==statusController||connection.kind==='cancelled')return;state.connection=connection;update()}finally{clearTimeout(timeout)}
}

async function send(){
  if(state.busy||!available())return;
  stopVoiceInput();
  const text=state.draft.trim();if(!text){$('#chatInput')?.focus();return}
  const userMessage={role:'user',content:text};
  state.messages.push(userMessage);appendMessage(userMessage);state.draft='';state.busy=true;state.error='';state.proposal=null;state.controller=new AbortController();
  if(current())$('#chatInput').value='';update();
  try{
    const response=await fetch((runtime.assistantBase||'')+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:state.messages.slice(-10),profile:state.profile}),signal:state.controller.signal});
    const data=await response.json();if(!response.ok)throw new Error(data.message||'Ответ пока недоступен. Попробуйте ещё раз.');
    const message={role:'assistant',content:data.reply};state.messages.push(message);appendMessage(message);
    state.proposal=data.profileProposal;state.programs=data.programIds||[];state.kind=data.kind||'explore';state.hasAnswer=true;state.stale=false;
  }catch(error){
    state.draft=text;state.messages.pop();if(current()){$('#chatLog').lastElementChild?.remove();$('#chatInput').value=text}
    state.error=error.name==='AbortError'?'Ответ остановлен. Сообщение осталось в поле ввода.':error instanceof TypeError?'Связь прервалась. Сообщение осталось в поле ввода — попробуйте ещё раз.':error.message;
  }finally{
    state.busy=false;state.controller=null;update();
    // Reply arrival never steals focus from another control or route.
  }
}

function scrollChat(){const conversation=$('#conversation');if(conversation)conversation.scrollTop=conversation.scrollHeight}
export function mountAssistant(element,ctx){host=element;context=ctx;mountToken++;if(ctx.initialProfile)state.imported={...ctx.initialProfile,themes:[...(ctx.initialProfile.themes||[])]};renderShell();checkConnection()}
