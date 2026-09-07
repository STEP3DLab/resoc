import {programLabel} from './catalog-view-model.js';

export const RGSU_ADMISSIONS={
  name:'Приёмная комиссия РГСУ',
  email:'pk@rgsu.net',
  phone:'+7 495 255-67-35',
  url:'https://rgsu.net/abitur/'
};

const clean=value=>String(value??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim();
const price=value=>new Intl.NumberFormat('ru-RU').format(value)+' ₽';

export function normalizeRouteIds(ids,validIds,limit=3){
  const allowed=validIds instanceof Set?validIds:new Set(validIds);
  return [...new Set(Array.isArray(ids)?ids:[])].filter(id=>typeof id==='string'&&allowed.has(id)).slice(0,limit);
}

export function admissionRequirement(program){
  if(program.admissionRequirements)return program.admissionRequirements;
  if(program.level==='СПО')return 'Конкурс документов об образовании; для отдельных специальностей возможны дополнительные испытания.';
  if(program.level==='Магистратура')return 'Вступительное испытание по выбранному направлению магистратуры.';
  if(program.level==='Аспирантура')return 'Вступительные испытания по научной специальности и правилам приёма в аспирантуру.';
  if(program.level==='Ординатура')return 'Условия конкурса и вступительных испытаний определяются правилами приёма в ординатуру.';
  return 'ЕГЭ и/или вступительные испытания вуза. Точный перечень зависит от направления и основания поступления.';
}

export function routeDocuments(programs){
  const levels=new Set(programs.map(program=>program.level));
  const rows=[
    'Паспорт и сведения, необходимые для заявления',
    'Документ об образовании и приложение к нему',
    'Документы об индивидуальных достижениях — при наличии',
    'Документы на льготу, особую, отдельную или целевую квоту — при наличии основания'
  ];
  if([...levels].some(level=>['Бакалавриат','Специалитет'].includes(level)))rows.push('Результаты ЕГЭ или регистрация на вступительные испытания вуза');
  if(levels.has('Магистратура'))rows.push('Документы для вступительного испытания в магистратуру');
  if(levels.has('Аспирантура'))rows.push('Материалы для поступления в аспирантуру по правилам выбранной специальности');
  if(levels.has('Ординатура'))rows.push('Документы и подтверждения достижений для конкурса в ординатуру');
  return [...new Set(rows)];
}

export function routeActions(programs){
  const names=programs.map(program=>program.shortName).filter(Boolean);
  return [
    {id:'verify',title:'Проверить открытый набор',text:'Уточнить доступность выбранной формы, сроки и оставшиеся места по каждой программе.'},
    {id:'exams',title:'Уточнить вступительные испытания',text:'Сверить перечень, формат, расписание и минимальные баллы на официальной странице вуза.'},
    {id:'support',title:'Проверить меры поддержки',text:'Уточнить применимость льгот, квот, скидок и документов, подтверждающих основание.'},
    {id:'documents',title:'Собрать документы',text:'Подготовить единый комплект и отдельные материалы для выбранного уровня образования.'},
    {id:'apply',title:'Подать заявление',text:`Выбрать основной вариант и резерв. Организации: ${clean(names.join(', ')||'уточняются')}.`}
  ];
}

export function routeText(programs,profile={},date=new Date()){
  const education=clean(profile.educationLabel||profile.education||'не указано');
  const goal=clean(profile.goalLabel||profile.goal||'не указана');
  return [
    'МОЙ ОБРАЗОВАТЕЛЬНЫЙ МАРШРУТ',
    'Дата: '+date.toLocaleDateString('ru-RU'),
    `Цель: ${goal}`,
    `Исходное образование: ${education}`,
    '',
    ...programs.flatMap((program,index)=>[
      `${index+1}. ${programLabel(program)}`,
      `${program.shortName} · ${program.city} · ${program.level}`,
      `Форма: ${clean(program.formats||'уточнить')}`,
      `Срок: ${clean(program.duration||'уточнить')}`,
      `Стоимость: ${Number.isFinite(program.priceFrom)?'от '+price(program.priceFrom):'уточнить'}`,
      `Бюджетные места: ${Number.isFinite(program.budgetPlaces)?program.budgetPlaces:'уточнить'}`,
      `Набор: ${clean(program.intakeStatus||'уточнить')}`,
      `Вступительные испытания: ${clean(admissionRequirement(program))}`,
      `Источник: ${clean(program.source)}`,
      ''
    ]),
    'ПЛАН ДЕЙСТВИЙ',
    ...routeActions(programs).map((action,index)=>`${index+1}. ${action.title}. ${action.text}`),
    '',
    'БАЗОВЫЙ КОМПЛЕКТ ДОКУМЕНТОВ',
    ...routeDocuments(programs).map(item=>'• '+item),
    '',
    'Сведения в маршруте носят справочный характер. Открытый набор, точные сроки, испытания, стоимость и право на льготу подтверждает образовательная организация.'
  ].join('\n');
}

export function consultationMessage(programs,{name='',contact='',question=''}={}){
  return [
    'Здравствуйте!',
    '',
    'Прошу проконсультировать меня по выбранным образовательным программам:',
    ...programs.map((program,index)=>`${index+1}. ${programLabel(program)} — ${program.shortName}, ${program.level}\n${clean(program.source)}`),
    '',
    clean(question)?'Вопрос: '+clean(question):'Прошу уточнить открытый набор, вступительные испытания, сроки, стоимость, бюджетные места и возможные меры поддержки.',
    clean(name)?'Имя: '+clean(name):'',
    clean(contact)?'Дополнительный контакт: '+clean(contact):'',
    '',
    'Письмо подготовлено в образовательном навигаторе «Ресоциализация».'
  ].filter(Boolean).join('\n');
}

export function consultationMailto(programs,details={}){
  const subject='Консультация по образовательному маршруту';
  const body=consultationMessage(programs,details);
  return `mailto:${RGSU_ADMISSIONS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
