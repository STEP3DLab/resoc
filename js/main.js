"use strict";

const featuredPrograms = [
  {title:"Информационные системы и технологии",owner:"РГСУ",level:"ВО",region:"Москва",format:"Очно-заочно",macro:"IT и цифровые технологии",duration:"4 года 6 месяцев",priority:true,reasons:["соответствует цели смены профессиональной области","позволяет учитывать технический опыт","совместима с занятостью"],result:"Квалификация бакалавра; работа в разработке, аналитике или сопровождении ИТ-систем.",caution:"Необходимо проверить вступительные испытания и расписание.",scores:{fast:78,new:92,continue:96}},
  {title:"Социальная работа",owner:"РГСУ",level:"ВО",region:"Москва",format:"Очно",macro:"Образование, социальная сфера и психология",duration:"4 года",priority:true,reasons:["опирается на коммуникативный опыт","связана с общественно значимой деятельностью","предусматривает понятный путь роста"],result:"Работа в социальной защите, НКО, реабилитационных и государственных организациях.",caution:"Очный формат необходимо сопоставить с текущей занятостью.",scores:{fast:72,new:88,continue:94}},
  {title:"Право и организация социального обеспечения",owner:"Колледж РГСУ",level:"СПО",region:"Москва",format:"Очно",macro:"Право, управление и коммуникации",duration:"2 года 10 месяцев",priority:true,reasons:["даёт прикладную квалификацию","связана с системой социальной поддержки","позволяет продолжить обучение в РГСУ"],result:"Квалификация юриста в сфере социального обеспечения.",caution:"Требуется уточнить форму и основание приёма.",scores:{fast:84,new:95,continue:88}},
  {title:"Оператор беспилотных авиационных систем",owner:"Образовательная организация-партнёр",level:"СПО",region:"ПФО",format:"Очно",macro:"Транспорт и беспилотные системы",duration:"1 год 10 месяцев",priority:false,reasons:["может соответствовать техническому опыту","имеет практико-ориентированный профиль","предполагает относительно короткий путь к профессии"],result:"Эксплуатация, обслуживание и контроль беспилотных авиационных систем.",caution:"Владелец и условия программы должны быть подтверждены.",scores:{fast:93,new:94,continue:76}},
  {title:"Управление проектами",owner:"РГСУ",level:"ДПО",region:"Москва",format:"Онлайн",macro:"Право, управление и коммуникации",duration:"4 месяца",priority:true,reasons:["короткий срок обучения","позволяет перенести управленческий опыт","доступен дистанционный формат"],result:"Планирование, управление командой, сроками, бюджетом и рисками проекта.",caution:"ДПО включается в первый запуск только после отдельного согласования.",scores:{fast:96,new:85,continue:82}},
  {title:"Техник по аддитивным технологиям",owner:"Образовательная организация-партнёр",level:"СПО",region:"УФО",format:"Очно",macro:"Машиностроение и производственные технологии",duration:"2 года 10 месяцев",priority:false,reasons:["связана с производственными навыками","относится к современной технической специализации","предполагает практическое обучение"],result:"Подготовка и сопровождение процессов промышленной 3D-печати.",caution:"Нужно подтвердить организацию, набор и регион обучения.",scores:{fast:86,new:91,continue:74}}
];

const goals={fast:"Выйти на работу быстрее",new:"Получить новую профессию",continue:"Продолжить образование"};
const educationLabels={"not-set":"Уточнить позднее",school:"Среднее общее",spo:"Среднее профессиональное",vo:"Высшее"};
let currentStep=1;
let catalogPrograms=[];
let shownCount=20;

const $=(selector,root=document)=>root.querySelector(selector);
const $$=(selector,root=document)=>Array.from(root.querySelectorAll(selector));

function updateGoalCards(){
  $$(".goal-card").forEach(card=>card.classList.toggle("is-selected",$("input",card).checked));
}

function extractSignals(){
  const text=`${$("#request").value} ${$("#experience").value}`.toLowerCase();
  const signals=[];
  if(/техник|оборуд|ремонт|инжен|связ|беспилот/.test(text))signals.push("технический опыт");
  if(/руковод|управл|команд|организ/.test(text))signals.push("управленческий опыт");
  if(/социал|помощ|люд|консульт/.test(text))signals.push("работа с людьми");
  if(/быстр|корот|скорее/.test(text))signals.push("приоритет короткого срока");
  if(/онлайн|дистан/.test(text))signals.push("дистанционный формат");
  if(!signals.length)signals.push("цель сформулирована","опыт требует уточнения");
  $("#signals").innerHTML=signals.map(item=>`<span>${escapeHtml(item)}</span>`).join("");
}

function wizardData(){
  return {goal:$("input[name=goal]:checked").value,request:$("#request").value.trim(),education:$("#education").value,experience:$("#experience").value.trim(),district:$("#district").value,format:$("#studyFormat").value};
}

function buildSummary(){
  const data=wizardData();
  const rows=[["Цель",goals[data.goal]],["Исходная ситуация",data.request],["Образование",educationLabels[data.education]],["Опыт",data.experience||"не указан"],["Регион",data.district==="all"?"любой / онлайн":data.district],["Формат",data.format==="all"?"любой":data.format]];
  $("#summary").innerHTML=rows.map(([key,value])=>`<dt>${key}</dt><dd>${escapeHtml(value)}</dd>`).join("");
}

function setStep(step){
  currentStep=step;
  $$(".wizard-step").forEach(section=>section.classList.toggle("is-active",Number(section.dataset.step)===step));
  $$(".stepper li").forEach((item,index)=>{item.classList.toggle("is-active",index+1===step);item.classList.toggle("is-done",index+1<step);$("span",item).textContent=index+1<step?"✓":String(index+1)});
  $("#stepBadge").textContent=`шаг ${step} из 4`;
  $("#backButton").hidden=step===1;
  $("#nextButton").textContent=step===4?"Получить варианты":"Продолжить";
  if(step===2)extractSignals();
  if(step===4)buildSummary();
  $(".wizard").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
}

function renderRecommendations(){
  const data=wizardData();
  const ranked=featuredPrograms.map(program=>({...program,score:program.scores[data.goal]+(data.format!=="all"&&program.format===data.format?4:0)+(data.district!=="all"&&(program.region===data.district||program.region.includes(data.district))?3:0)})).sort((a,b)=>b.score-a.score).slice(0,3);
  $("#recommendationPlaceholder").hidden=true;
  $("#recommendationGrid").hidden=false;
  $("#recommendationCount").textContent="3 варианта";
  $("#recommendationIntro").textContent="Предварительные варианты по указанным условиям. Откройте карточку, чтобы увидеть причины и ограничения.";
  $("#recommendationGrid").innerHTML=ranked.map((program,index)=>`<article class="recommendation-card ${program.priority?"featured":""}"><div class="card-top"><span class="rank">0${index+1}</span><span class="quality">${qualityLabel(program.score)}</span></div><span class="provider ${program.priority?"rgsu":""}">${program.priority?"РГСУ · приоритет среди релевантных":"Партнёрская программа"}</span><h3>${escapeHtml(program.title)}</h3><p>${escapeHtml(program.owner)}</p><div class="meta"><span>${program.level}</span><span>${program.format}</span><span>${program.duration}</span></div><div class="reason">${escapeHtml(program.reasons[0])}</div><button class="button button--ghost" type="button" data-featured="${featuredPrograms.findIndex(item=>item.title===program.title)}">Открыть обоснование</button></article>`).join("");
  $$("[data-featured]").forEach(button=>button.addEventListener("click",()=>openProgram(featuredPrograms[Number(button.dataset.featured)])));
  $("#recommendations").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
}

function qualityLabel(score){return score>=91?"Высокая предварительная релевантность":score>=82?"Умеренная предварительная релевантность":"Требуется проверка"}

$("#nextButton").addEventListener("click",()=>{
  if(currentStep===1&&$("#request").value.trim().length<12){$("#requestError").textContent="Опишите ситуацию немного подробнее — не менее 12 знаков.";$("#request").focus();return}
  $("#requestError").textContent="";
  if(currentStep===4){if(!$("#confirm").checked){$("#confirmError").textContent="Подтвердите ознакомление с ограничением прототипа.";$("#confirm").focus();return}renderRecommendations();return}
  setStep(currentStep+1);
});
$("#backButton").addEventListener("click",()=>setStep(Math.max(1,currentStep-1)));
$$("input[name=goal]").forEach(input=>input.addEventListener("change",updateGoalCards));
$("#experience").addEventListener("input",extractSignals);
$("#confirm").addEventListener("change",()=>$("#confirmError").textContent="");

function parseCsv(text){
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){const char=text[i];if(char==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++}else quoted=!quoted}else if(char===';'&&!quoted){row.push(field.trim());field=""}else if((char==='\n'||char==='\r')&&!quoted){if(char==='\r'&&text[i+1]==='\n')i++;row.push(field.trim());field="";if(row.some(Boolean))rows.push(row);row=[]}else field+=char}
  if(field||row.length){row.push(field.trim());rows.push(row)}
  const headers=rows.shift()||[];
  return rows.map(values=>Object.fromEntries(headers.map((header,index)=>[header,values[index]||""])));
}

async function loadCatalog(){
  try{const response=await fetch("data/programs.csv");if(!response.ok)throw new Error("catalog");catalogPrograms=parseCsv(await response.text()).filter(item=>item.program_name);populateMacros();renderCatalog()}catch(error){$("#catalogCount").textContent="недоступен";$("#catalogList").innerHTML='<div class="catalog-empty">Каталог временно недоступен. Воспользуйтесь персональным подбором или обратитесь к специалисту.</div>'}
}

function populateMacros(){
  const macros=[...new Set(catalogPrograms.map(item=>item.macrogroup_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
  $("#macroFilter").insertAdjacentHTML("beforeend",macros.map(item=>`<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join(""));
}

function filteredCatalog(){
  const query=$("#catalogSearch").value.trim().toLowerCase();const level=$("#levelFilter").value;const macro=$("#macroFilter").value;
  return catalogPrograms.filter(item=>(!query||`${item.program_name} ${item.institution_name} ${item.fgos_code}`.toLowerCase().includes(query))&&(level==="all"||item.education_level===level)&&(macro==="all"||item.macrogroup_name===macro));
}

function renderCatalog(reset=false){
  if(reset)shownCount=20;const list=filteredCatalog();$("#catalogCount").textContent=`найдено: ${list.length}`;
  $("#catalogList").innerHTML=list.length?list.slice(0,shownCount).map((item,index)=>`<button class="catalog-row" type="button" data-catalog-index="${index}"><span><strong>${escapeHtml(clean(item.program_name))}</strong><small>${escapeHtml(clean(item.macrogroup_name))}</small></span><span><strong>${escapeHtml(clean(item.institution_name))}</strong><small>${escapeHtml(clean(item.region))}</small></span><span><strong>${escapeHtml(clean(item.education_level))}</strong><small>${escapeHtml(clean(item.fgos_code))}</small></span><span><strong>${budgetLabel(item.budget_seat)}</strong><small>бюджет</small></span><span class="arrow">›</span></button>`).join(""):'<div class="catalog-empty">По заданным условиям программы не найдены. Измените запрос или сбросьте фильтры.</div>';
  $$("[data-catalog-index]").forEach(button=>button.addEventListener("click",()=>openCatalogProgram(list[Number(button.dataset.catalogIndex)])));
  $("#loadMore").hidden=shownCount>=list.length;
}

function budgetLabel(value){const normalized=clean(value).toLowerCase();if(normalized==="да")return"есть";if(/^\d+$/.test(normalized))return normalized;return"уточнить"}
function clean(value){return String(value||"").replace(/\s+/g," ").trim()}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]))}

$("#catalogSearch").addEventListener("input",()=>renderCatalog(true));
$("#levelFilter").addEventListener("change",()=>renderCatalog(true));
$("#macroFilter").addEventListener("change",()=>renderCatalog(true));
$("#resetFilters").addEventListener("click",()=>{$("#catalogSearch").value="";$("#levelFilter").value="all";$("#macroFilter").value="all";renderCatalog(true)});
$("#loadMore").addEventListener("click",()=>{shownCount+=20;renderCatalog()});

function openCatalogProgram(item){
  const url=/^https?:\/\//.test(item.URL||"")?item.URL:"";
  $("#dialogBody").innerHTML=`<div class="dialog-content"><span class="provider">${escapeHtml(clean(item.education_level))}</span><h2 id="dialogTitle">${escapeHtml(clean(item.program_name))}</h2><p>${escapeHtml(clean(item.institution_name))}</p><div class="dialog-section"><h3>Основные сведения</h3><p>${escapeHtml(clean(item.macrogroup_name))} · ${escapeHtml(clean(item.region))} · код ${escapeHtml(clean(item.fgos_code)||"не указан")}</p></div><div class="dialog-section"><h3>Бюджетные места</h3><p>${escapeHtml(budgetLabel(item.budget_seat))}</p></div><div class="dialog-note">Сведения необходимо подтвердить на официальном сайте образовательной организации.</div><div class="dialog-actions">${url?`<a class="button" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Официальный источник</a>`:""}<a class="button button--ghost" href="#consultation" data-close-dialog>Обсудить со специалистом</a></div></div>`;
  showDialog();
}

function openProgram(program){
  $("#dialogBody").innerHTML=`<div class="dialog-content"><span class="provider ${program.priority?"rgsu":""}">${program.priority?"Программа РГСУ":"Партнёрская программа"}</span><h2 id="dialogTitle">${escapeHtml(program.title)}</h2><p>${escapeHtml(program.owner)} · ${program.level} · ${program.format}</p><div class="dialog-section"><h3>Почему включена в подбор</h3><ul>${program.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join("")}</ul></div><div class="dialog-section"><h3>Результат обучения</h3><p>${escapeHtml(program.result)}</p></div><div class="dialog-note"><strong>Требует проверки:</strong> ${escapeHtml(program.caution)}</div><div class="dialog-actions"><a class="button" href="#consultation" data-close-dialog>Обсудить со специалистом</a></div></div>`;
  showDialog();
}

function showDialog(){const dialog=$("#programDialog");dialog.showModal();$$('[data-close-dialog]',dialog).forEach(link=>link.addEventListener("click",()=>dialog.close()))}
$(".dialog-close").addEventListener("click",()=>$("#programDialog").close());
$("#programDialog").addEventListener("click",event=>{if(event.target===$("#programDialog"))$("#programDialog").close()});

$("#consultationForm").addEventListener("submit",event=>{event.preventDefault();event.currentTarget.innerHTML='<div class="form-success" role="status"><strong>Сценарий обращения показан</strong><p>В демонстрационной версии данные не отправляются. В рабочем сервисе здесь появятся номер обращения и ожидаемый срок ответа.</p></div>'});

updateGoalCards();
loadCatalog();
