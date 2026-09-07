import {programLabel} from './catalog-view-model.js';
import {shortlistText} from './decision-support.js';

const stringKeys=['query','level','region','city','format','theme','institution','recordType'];
export function readSharedFilters(params){
  const filters={};
  for(const key of stringKeys){const value=params.get(key);if(value)filters[key]=value.slice(0,key==='institution'?600:160)}
  for(const key of ['rgsu','budget','complete'])if(params.get(key)==='1')filters[key]=true;
  for(const key of ['maxPrice','maxMonths']){const value=Number(params.get(key));if(Number.isFinite(value)&&value>0&&value<=10000000)filters[key]=String(value)}
  if(['rgsu','name','price','duration'].includes(params.get('sort')))filters.sort=params.get('sort');
  return filters;
}
export function sharedCatalogHash(filters){
  const params=new URLSearchParams({filters:'1'});
  const clean=readSharedFilters(new URLSearchParams(Object.entries(filters).filter(([,value])=>!!value).map(([key,value])=>[key,value===true?'1':String(value)])));
  for(const [key,value] of Object.entries(clean))params.set(key,value===true?'1':String(value));
  return '#catalog?'+params.toString();
}
export function programHash(id){return '#catalog?'+new URLSearchParams({program:id})}
export function publicLink(location,hash){const url=new URL(location);url.search='';url.hash=hash;return url.href}

export function russianLayout(query){
  if(!query||/[а-яё]/i.test(query)||!/[a-z]{3}/i.test(query))return '';
  const latin="qwertyuiop[]asdfghjkl;'zxcvbnm,.`",russian='йцукенгшщзхъфывапролджэячсмитьбюё';
  return [...query.toLowerCase()].map(char=>latin.includes(char)?russian[latin.indexOf(char)]:char).join('');
}
export function recentIds(current,id,available){return [...new Set([id,...current])].filter(value=>available.has(value)).slice(0,8)}
export function reorderIds(ids,id,delta){const next=[...ids],index=next.indexOf(id),target=index+delta;if(index<0||target<0||target>=next.length)return next;[next[index],next[target]]=[next[target],next[index]];return next}
export function publishedCount(program){return [!!program.formats,!!program.duration,Number.isFinite(program.priceFrom),Number.isFinite(program.budgetPlaces)].filter(Boolean).length}
export function numericFilterLabel(key,value){
  if(key==='maxPrice')return 'Цена от: до '+new Intl.NumberFormat('ru-RU').format(Number(value))+' ₽';
  if(key==='maxMonths')return 'Точный срок: до '+value+' мес.';
  if(key==='recordType')return value==='direction'?'Направления подготовки':'Программы и профили';
  return String(value);
}
export const csvColumns=[['Вуз','institution'],['Программа','label'],['Код','code'],['Уровень','level'],['Тип записи','recordType'],['Регион','region'],['Населённый пункт','city'],['Форма','formats'],['Срок','duration'],['Варианты формы, срока и базы','variants'],['Минимальная цена, ₽/год','priceFrom'],['Бюджетные места','budgetPlaces'],['Год источника / последнего потока','sourceYear'],['Дата проверки источника','verifiedAt'],['Официальный источник','source'],['Примечание о стоимости','priceNote'],['Примечание источника','sourceNote'],['Особые условия','specialConditions'],['Дополнительный источник','additionalSource'],['Основание географии','locationBasis'],['Источник географии','locationSource'],['Что подтверждает проверка','lastCheckMeaning'],['Состояние набора','intakeStatus'],['Страница извлечения','sourceEvidence'],['Обучающиеся потоки','cohortYears']];
function csvCell(value){let text=String(value??'');if(/^[=+@\-\t\r]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"'}
export function catalogueCsv(programs){return [csvColumns.map(([label])=>csvCell(label)).join(';'),...programs.map(program=>csvColumns.map(([,key])=>csvCell(key==='label'?programLabel(program):key==='variants'&&program.variants?JSON.stringify(program.variants):program[key])).join(';'))].join('\r\n')}
export function compareText(programs){return shortlistText(programs)}

export function downloadPayload(text,name){if(/\.json$/i.test(name))return {text,type:'application/json;charset=utf-8'};if(/\.csv$/i.test(name))return {text:'\uFEFF'+text,type:'text/csv;charset=utf-8'};return {text,type:'text/plain;charset=utf-8'}}
