const DATA_URL = 'data/programs.csv';

const universityTitle = document.getElementById('universityTitle');
const universitySubtitle = document.getElementById('universitySubtitle');
const universityDescription = document.getElementById('universityDescription');
const universityCount = document.getElementById('universityCount');
const grid = document.getElementById('universityGrid');
const emptyState = document.getElementById('universityEmptyState');

// Маппинг направлений для консистентного отображения.
const DIRECTION_MAP = new Map([
  ['агро и пищевые технологии', 'Агро, ветеринария и пищевые технологии'],
  ['здравоохранение', 'Здравоохранение и биотехнологии'],
  ['машиностроение', 'Машиностроение и производственные технологии'],
  ['нефтегазовая промышленность', 'Нефтегазовая промышленность и недропользование'],
  ['образование и гуманитарные', 'Образование и гуманитарные направления'],
  ['право и управление', 'Право, управление и коммуникации'],
  ['строительство и архитектура', 'Строительство, архитектура и геоданные'],
  ['it и цифровые технологии', 'Право, управление и коммуникации'],
  ['энергетика и электросети', 'Машиностроение и производственные технологии'],
  ['транспорт и бпла', 'Машиностроение и производственные технологии'],
]);

// Нормализация текста: пробелы, тире, невидимые символы.
const cleanText = (value) =>
  (value || '')
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/Рекспублика/g, 'Республика');

const normalizeText = (value) => cleanText(value).toLowerCase();

const parseCSV = (text, delimiter = ';') => {
  const rows = [];
  let current = '';
  let row = [];
  let insideQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (insideQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      row.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1;
      }
      row.push(current);
      if (row.some((value) => value.trim() !== '')) {
        rows.push(row);
      }
      row = [];
      current = '';
    } else {
      current += char;
    }
  }

  if (current.length || row.length) {
    row.push(current);
    if (row.some((value) => value.trim() !== '')) {
      rows.push(row);
    }
  }

  const headers = rows.shift().map((header) => cleanText(header));
  const data = rows.map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = cleanText(values[index]);
    });
    return entry;
  });

  return { headers, data };
};

// Поиск соответствий в заголовках CSV.
const resolveColumn = (headers, candidates) => {
  const normalizedHeaders = headers.map((header) => normalizeText(header));
  return candidates.reduce((found, candidate) => {
    if (found) {
      return found;
    }
    const index = normalizedHeaders.indexOf(normalizeText(candidate));
    return index !== -1 ? headers[index] : null;
  }, null);
};

const mapDirection = (rawValue) => {
  const normalized = normalizeText(rawValue);
  return DIRECTION_MAP.get(normalized) || rawValue || '';
};

const createCard = (program) => {
  const card = document.createElement('article');
  card.className = 'card';

  const badges = document.createElement('div');
  badges.className = 'card-badges';

  const formatBadge = document.createElement('span');
  formatBadge.className = 'badge';
  formatBadge.textContent = program.education_level || 'Формат не указан';
  badges.append(formatBadge);

  if (normalizeText(program.budget_seat) === 'да') {
    const budgetBadge = document.createElement('span');
    budgetBadge.className = 'badge accent';
    budgetBadge.textContent = 'Есть бюджет';
    badges.append(budgetBadge);
  }

  const title = document.createElement('h3');
  title.textContent = program.program_name || 'Без названия';

  const description = document.createElement('p');
  description.textContent = program.description || 'Описание отсутствует в CSV.';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const metaItems = [
    ['Направление', program.macrogroup_name || '—'],
    ['Код ФГОС', program.fgos_code || '—'],
    ['Город', program.city || '—'],
  ];

  metaItems.forEach(([label, value]) => {
    const line = document.createElement('p');
    line.innerHTML = `${label}: <span>${value}</span>`;
    meta.append(line);
  });

  const actions = document.createElement('div');
  actions.className = 'card-actions';

  if (program.URL) {
    const link = document.createElement('a');
    link.href = program.URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const isPdf = program.URL.toLowerCase().endsWith('.pdf');
    link.textContent =
      isPdf && !program.description
        ? 'Открыть официальный список (PDF)'
        : 'Открыть страницу программы';

    actions.append(link);
  }

  card.append(badges, title, description, meta, actions);
  return card;
};

const renderPrograms = (items) => {
  grid.innerHTML = '';
  items.forEach((program) => grid.append(createCard(program)));
  universityCount.textContent = items.length;
  emptyState.hidden = items.length > 0;
};

const init = async () => {
  const params = new URLSearchParams(window.location.search);
  const universityName = cleanText(params.get('name'));

  if (!universityName) {
    emptyState.hidden = false;
    universityTitle.textContent = 'Вуз не выбран';
    universitySubtitle.textContent = 'Вернитесь к каталогу и выберите организацию.';
    universityDescription.textContent = 'Не удалось определить название вуза.';
    return;
  }

  universityTitle.textContent = universityName;
  universitySubtitle.textContent = 'Программы и описания доступны на странице ниже.';
  universityDescription.textContent = `Выбранный вуз: ${universityName}`;

  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить данные CSV');
    }

    const text = await response.text();
    const { headers, data } = parseCSV(text);

    const columnMap = {
      direction: resolveColumn(headers, ['macrogroup_name', 'Направление']),
      format: resolveColumn(headers, ['education_level', 'Формат обучения']),
      fgos: resolveColumn(headers, ['fgos_code', 'Код ФГОС']),
      institution: resolveColumn(headers, ['institution_name', 'ВУЗ', 'Вуз', 'Организация']),
      program: resolveColumn(headers, ['program_name', 'Название программы']),
      city: resolveColumn(headers, ['region', 'Город', 'Регион']),
      budget: resolveColumn(headers, ['budget_seat', 'Бюджетные места']),
      url: resolveColumn(headers, ['URL', 'url', 'Ссылка']),
      description: resolveColumn(headers, ['Описание', 'Описание программы', 'program_description']),
    };

    const programs = data
      .map((row) => ({
        education_level: row[columnMap.format] || '',
        macrogroup_name: mapDirection(row[columnMap.direction] || ''),
        fgos_code: row[columnMap.fgos] || '',
        institution_name: row[columnMap.institution] || '',
        program_name: row[columnMap.program] || '',
        city: row[columnMap.city] || '',
        budget_seat: row[columnMap.budget] || '',
        URL: row[columnMap.url] || '',
        description: row[columnMap.description] || '',
      }))
      .filter((program) =>
        normalizeText(program.institution_name) === normalizeText(universityName)
      );

    renderPrograms(programs);
  } catch (error) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.querySelector('h2').textContent = 'Ошибка загрузки данных';
    emptyState.querySelector('p').textContent = error.message;
  }
};

init();
