import {filterCatalog,durationMonths} from './engine.js';

export function createCollections() {
  return {catalog: {filters: {}, limit: 12}, saved: {filters: {}, limit: 12}};
}

export function programLabel(program) {
  const profile = program.profile?.trim();
  return profile && !/^\d{2}\.\d{2}\.\d{2}/.test(profile) ? profile : program.title;
}

export function collectionRows(programs, collection, saved, view) {
  const available = view === 'saved' ? programs.filter(p => saved.has(p.id)) : programs;
  const rows = filterCatalog(available, collection.filters);
  const sort = collection.filters.sort || 'rgsu';
  if (sort === 'price') rows.sort((a, b) => (a.priceFrom ?? Infinity) - (b.priceFrom ?? Infinity));
  if (sort === 'name') rows.sort((a, b) => programLabel(a).localeCompare(programLabel(b), 'ru'));
  if (sort === 'duration') rows.sort((a,b)=>(durationMonths(a,collection.filters.format)??Infinity)-(durationMonths(b,collection.filters.format)??Infinity));
  if (sort === 'rgsu') rows.sort((a, b) => Number(b.rgsu) - Number(a.rgsu));
  return rows;
}

export function activeFilters(filters) {
  return Object.entries(filters).filter(([key, value]) => key !== 'sort' && !!value);
}

export function confirmedConditions(profile){
  return Object.fromEntries(['education','district','region','format','goal','budget','maxMonths','themes'].filter(key=>Object.hasOwn(profile,key)).map(key=>[key,key==='themes'?[...profile.themes]:profile[key]]));
}

export function consultationSelection(programs,{scope='all',programId=null,saved=new Set(),compare=new Set(),selection=[]}={}){
  if(scope==='list'){const byId=new Map(programs.map(program=>[program.id,program]));return [...new Set(selection||[])].map(id=>byId.get(id)).filter(Boolean)}
  if(scope==='program')return programs.filter(p=>p.id===programId);
  return programs.filter(p=>scope==='compare'?compare.has(p.id):scope==='saved'?saved.has(p.id):compare.has(p.id)||saved.has(p.id));
}
