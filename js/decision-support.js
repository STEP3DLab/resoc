import {filterCatalog} from './engine.js';
import {programLabel} from './catalog-view-model.js';

export const FILTER_LABELS={query:'Поиск',level:'Уровень',region:'Регион',city:'Город / населённый пункт',format:'Форма',theme:'Направление',rgsu:'Только РГСУ',budget:'Бюджетные места',institution:'Вуз',recordType:'Тип записи',maxPrice:'Минимальная цена',maxMonths:'Точный срок',complete:'Все четыре условия опубликованы'};

export function filterValues(values,selected){return [...new Set([...values,...(selected?[selected]:[])])]}

export function facetCounts(programs,filters,key,values){
  const rest={...filters};delete rest[key];
  const available=filterCatalog(programs,rest);
  if(['level','region','city','theme','institution','recordType'].includes(key)){const counts=new Map();for(const program of available)counts.set(program[key],(counts.get(program[key])||0)+1);return values.map(value=>({value,count:counts.get(value)||0}))}
  return values.map(value=>({value,count:filterCatalog(available,{[key]:value}).length}));
}

export function relaxationOptions(programs,filters){
  return Object.entries(filters).filter(([key,value])=>FILTER_LABELS[key]&&value).map(([key,value])=>{
    const next={...filters};delete next[key];
    return {key,label:FILTER_LABELS[key],value,count:filterCatalog(programs,next).length};
  }).filter(option=>option.count>0).sort((a,b)=>b.count-a.count).slice(0,3);
}

const price=value=>new Intl.NumberFormat('ru-RU').format(value)+' ₽';
export function programFacts(program){
  return [
    {key:'format',label:'Форма',known:!!program.formats,value:program.formats?.replaceAll('/',' · ')||'Не указана'},
    {key:'duration',label:'Срок',known:!!program.duration,value:program.duration||'Не указан'},
    {key:'price',label:'Стоимость за год',known:Number.isFinite(program.priceFrom),value:Number.isFinite(program.priceFrom)?'от '+price(program.priceFrom):'Не указана'},
    {key:'budget',label:'Бюджетные места',known:Number.isFinite(program.budgetPlaces),value:Number.isFinite(program.budgetPlaces)?String(program.budgetPlaces):'Не указаны'}
  ];
}

export const GENERAL_QUESTIONS=[
  'Открыт ли набор на нужный год и форму обучения? Какие сроки подачи документов?',
  'Достаточно ли моего образования и какие вступительные испытания нужны?'
];
export function programQuestions(program){
  const questions=[...GENERAL_QUESTIONS];
  if(program.recordType==='direction')questions.push('Какие конкретные профили доступны внутри этого направления?');
  if(!program.formats)questions.push('Какие формы обучения доступны?');
  if(!program.duration||/^от\s/i.test(program.duration))questions.push('Каков точный срок обучения для моей формы и уровня образования?');
  questions.push(Number.isFinite(program.priceFrom)?'Какова полная стоимость именно выбранной формы обучения? Что входит в оплату?':'Какова стоимость обучения и порядок оплаты?');
  questions.push(program.budgetPlaces>0?'Сколько бюджетных мест доступно именно по выбранной форме в нужном году?':program.budgetPlaces===0?'Предусмотрены ли скидки или другие варианты поддержки при платном обучении?':'Есть ли бюджетные места по нужной форме обучения?');
  questions.push('Нужны ли поездки в вуз? Как проходят занятия, практика и экзамены?');
  if(program.specialConditions)questions.push('Как выполняются специальные условия отбора: '+program.specialConditions);
  return questions;
}

export function shortlistText(programs,{questions=false,date=new Date()}={}){
  return ['РЕСОЦИАЛИЗАЦИЯ — '+(questions?'ВОПРОСЫ К ВУЗАМ':'МОЙ СПИСОК ПРОГРАММ'),
    'Дата выгрузки: '+date.toLocaleDateString('ru-RU'),
    'Программ: '+programs.length,
    'Условия перенесены из источников. Актуальный набор и индивидуальный допуск подтверждает вуз.',
    ...programs.map((program,index)=>['',`${index+1}. ${programLabel(program)}`,program.institution,
      program.city+' · '+program.level,
      'Тип записи: '+(program.recordType==='direction'?'направление подготовки':'программа или профиль'),
      ...programFacts(program).map(fact=>fact.label+': '+fact.value),
      'Сверка источника: '+(program.verifiedAt||'Дата не указана'),
      'Источник: '+program.source,
      ...(program.sourceNote?['Примечание источника: '+program.sourceNote]:[]),
      ...(program.priceNote?['Примечание о стоимости: '+program.priceNote]:[]),
      ...(program.specialConditions?['Особые условия: '+program.specialConditions]:[]),
      ...(program.additionalSource?['Дополнительный источник: '+program.additionalSource]:[]),
      ...(questions?['Вопросы:',...programQuestions(program).map((q,i)=>`${i+1}) ${q}`)]:[])
    ].join('\n')),
    '\nЦена «от» и бюджетные места не подтверждают условия каждой формы. Полностью онлайн-обучение требует отдельного подтверждения.'
  ].join('\n');
}
