export async function checkAssistantConnection(runtime,fetcher,signal){
  if(runtime.platform==='github-pages'&&!runtime.assistantBase)return {kind:'static'};
  try{
    const response=await fetcher((runtime.assistantBase||'')+'/api/assistant/status',{cache:'no-store',signal});
    if(!response.ok)throw new Error('status');
    const data=await response.json();
    if(typeof data.available!=='boolean')throw new Error('invalid status');
    return {kind:data.available?'ready':'unconfigured'};
  }catch(error){
    if(signal?.aborted&&signal.reason==='superseded')return {kind:'cancelled'};
    return {kind:'error'};
  }
}
export const connectionCopy={
  checking:{status:'Проверяем подключение',title:'Проверяем доступность помощника',text:'Это займёт несколько секунд. Каталог и пошаговый подбор доступны сразу.'},
  ready:{status:'Можно начать диалог',title:'',text:''},
  unconfigured:{status:'Диалог пока недоступен',title:'Помощник ожидает подключения',text:'Пока выберите программу в каталоге или укажите условия в пошаговом подборе.'},
  static:{status:'Диалог пока недоступен',title:'В этой версии чат ещё не подключён',text:'Каталог, пошаговый подбор, избранное и сравнение работают. Можно начать с них.'},
  error:{status:'Нет связи с помощником',title:'Не удалось проверить подключение',text:'Попробуйте ещё раз. Введённое сообщение сохранено в этой вкладке.'},
};
