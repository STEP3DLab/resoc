const DATA_URL = 'data/programs.csv';

const searchInput = document.getElementById('searchInput');
const formatSelect = document.getElementById('formatSelect');
const directionSelect = document.getElementById('directionSelect');
const districtSelect = document.getElementById('districtSelect');
const baseEducationSelect = document.getElementById('baseEducationSelect');
const budgetToggle = document.getElementById('budgetToggle');
const resetFiltersButton = document.getElementById('resetFilters');
const clearSearchButton = document.getElementById('clearSearch');
const emptyResetButton = document.getElementById('emptyResetButton');
const grid = document.getElementById('programGrid');
const resultsCount = document.getElementById('resultsCount');
const totalCount = document.getElementById('totalCount');
const activeFilters = document.getElementById('activeFilters');
const emptyState = document.getElementById('emptyState');
const districtHint = document.getElementById('districtHint');
const baseEducationHint = document.getElementById('baseEducationHint');

// Канонический список направлений каталога (строго по ТЗ).
const DIRECTION_CANONICAL = [
  'Агро, ветеринария и пищевые технологии',
  'Здравоохранение и биотехнологии',
  'Машиностроение и производственные технологии',
  'Нефтегазовая промышленность и недропользование',
  'Образование и гуманитарные направления',
  'Право, управление и коммуникации',
  'Строительство, архитектура и геоданные',
];

// Маппинг «сырых» значений из CSV в канонические.
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

let programs = [];

// Нормализация текста: чистим пробелы, скрытые символы, тире и опечатки.
const cleanText = (value) =>
  (value || '')
    .toString()
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[–—−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/Рекспублика/g, 'Республика');

const normalizeText = (value) => cleanText(value).toLowerCase();

const normalizeForSearch = (value) =>
  normalizeText(value)
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

// Определяем названия колонок, если они есть в CSV.
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

const buildInitials = (value) => {
  const words = (value || '').toString().match(/[A-Za-zА-Яа-яЁё]+/g) || [];
  const initials = words
    .filter((word) => word.length > 2)
    .map((word) => word[0])
    .join('');
  return normalizeForSearch(initials);
};

// Индекс для быстрого поиска по карточкам.
const buildSearchIndex = (program) => {
  const parts = [
    program.program_name,
    program.institution_name,
    program.fgos_code,
    program.macrogroup_name,
    program.city,
  ];
  const base = normalizeForSearch(parts.join(' '));
  const initials = [
    buildInitials(program.institution_name),
    buildInitials(program.program_name),
  ]
    .filter(Boolean)
    .join(' ');
  return `${base} ${initials}`.trim();
};

const buildUniversityUrl = (name) => {
  const params = new URLSearchParams({ name });
  return `university.html?${params.toString()}`;
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

  const institution = document.createElement('a');
  institution.className = 'institution-link';
  institution.textContent = program.institution_name || 'Организация не указана';
  institution.href = buildUniversityUrl(program.institution_name || '');

  const meta = document.createElement('div');
  meta.className = 'meta';

  const metaItems = [
    ['Формат обучения', program.education_level || '—'],
    ['Направление', program.macrogroup_name || '—'],
    ['Код ФГОС', program.fgos_code || '—'],
    ['Город', program.city || '—'],
    ['Федеральный округ РФ', program.district || '—'],
    ['Базовый уровень образования', program.base_education || '—'],
    ['Бюджетные места', program.budget_seat || '—'],
  ];

  metaItems.forEach(([label, value]) => {
    const line = document.createElement('p');
    line.innerHTML = `${label}: <span>${value}</span>`;
    meta.append(line);
  });

  const link = document.createElement('a');
  link.className = 'program-link';
  link.href = program.URL || '#';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Перейти к программе';

  if (!program.URL) {
    link.removeAttribute('target');
    link.removeAttribute('rel');
  }

  card.append(badges, title, institution, meta, link);
  return card;
};

const renderPrograms = (items) => {
  grid.innerHTML = '';
  items.forEach((program) => grid.append(createCard(program)));
  resultsCount.textContent = items.length;
  emptyState.hidden = items.length > 0;
};

const updateResetButtonState = () => {
  const hasFilters =
    searchInput.value.trim() !== '' ||
    formatSelect.value !== '' ||
    directionSelect.value !== '' ||
    districtSelect.value !== '' ||
    baseEducationSelect.value !== '' ||
    budgetToggle.checked;
  resetFiltersButton.disabled = !hasFilters;
  if (emptyResetButton) {
    emptyResetButton.disabled = !hasFilters;
  }
};

const toggleClearButton = () => {
  const shouldShow = searchInput.value.trim() !== '';
  clearSearchButton.classList.toggle('is-visible', shouldShow);
};

const updateActiveFilters = () => {
  const filters = [];

  if (searchInput.value.trim()) {
    filters.push(`Запрос: ${searchInput.value.trim()}`);
  }
  if (formatSelect.value) {
    filters.push(`Формат: ${formatSelect.value}`);
  }
  if (directionSelect.value) {
    filters.push(`Направление: ${directionSelect.value}`);
  }
  if (districtSelect.value) {
    filters.push(`Округ: ${districtSelect.value}`);
  }
  if (baseEducationSelect.value) {
    filters.push(`Базовый уровень: ${baseEducationSelect.value}`);
  }
  if (budgetToggle.checked) {
    filters.push('Только бюджетные места');
  }

  activeFilters.innerHTML = '';
  if (filters.length === 0) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.textContent = 'Фильтры не заданы';
    activeFilters.append(chip);
    return;
  }

  filters.forEach((label) => {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    chip.textContent = label;
    activeFilters.append(chip);
  });
};

const applyFilters = () => {
  const query = normalizeForSearch(searchInput.value.trim());
  const format = formatSelect.value;
  const direction = directionSelect.value;
  const district = districtSelect.value;
  const baseEducation = baseEducationSelect.value;
  const budgetOnly = budgetToggle.checked;

  const filtered = programs.filter((program) => {
    const haystack = program.searchIndex || '';
    const queryTokens = query.split(/\s+/).filter(Boolean);
    const matchesQuery = queryTokens.every((token) => haystack.includes(token));
    const matchesFormat = !format || program.education_level === format;
    const matchesDirection =
      !direction || normalizeText(program.macrogroup_name) === normalizeText(direction);
    const matchesDistrict = !district || program.district === district;
    const matchesBaseEducation = !baseEducation || program.base_education === baseEducation;
    const matchesBudget = !budgetOnly || normalizeText(program.budget_seat) === 'да';

    return (
      matchesQuery &&
      matchesFormat &&
      matchesDirection &&
      matchesDistrict &&
      matchesBaseEducation &&
      matchesBudget
    );
  });

  renderPrograms(filtered);
  updateResetButtonState();
  updateActiveFilters();
  toggleClearButton();
};

const populateFormats = () => {
  const formats = Array.from(
    new Set(programs.map((program) => program.education_level).filter(Boolean))
  ).sort();

  formats.forEach((format) => {
    const option = document.createElement('option');
    option.value = format;
    option.textContent = format;
    formatSelect.append(option);
  });
};

const populateDirections = () => {
  const directions = Array.from(
    new Set(programs.map((program) => program.macrogroup_name).filter(Boolean))
  );

  DIRECTION_CANONICAL.filter((direction) => directions.includes(direction)).forEach((direction) => {
    const option = document.createElement('option');
    option.value = direction;
    option.textContent = direction;
    directionSelect.append(option);
  });
};

const populateDistricts = () => {
  const districts = Array.from(
    new Set(programs.map((program) => program.district).filter(Boolean))
  ).sort();

  if (districts.length === 0) {
    districtSelect.disabled = true;
    districtHint.hidden = false;
    return;
  }

  districts.forEach((district) => {
    const option = document.createElement('option');
    option.value = district;
    option.textContent = district;
    districtSelect.append(option);
  });
};

const populateBaseEducation = () => {
  const levels = Array.from(
    new Set(programs.map((program) => program.base_education).filter(Boolean))
  ).sort();

  if (levels.length === 0) {
    baseEducationSelect.disabled = true;
    baseEducationHint.hidden = false;
    return;
  }

  levels.forEach((level) => {
    const option = document.createElement('option');
    option.value = level;
    option.textContent = level;
    baseEducationSelect.append(option);
  });
};

const init = async () => {
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
      district: resolveColumn(headers, ['Федеральный округ РФ', 'Федеральный округ', 'Округ РФ', 'Округ']),
      baseEducation: resolveColumn(headers, [
        'Базовый уровень образования',
        'Уровень образования (входной)',
        'Базовый уровень',
      ]),
      budget: resolveColumn(headers, ['budget_seat', 'Бюджетные места']),
      url: resolveColumn(headers, ['URL', 'url', 'Ссылка']),
      description: resolveColumn(headers, ['Описание', 'Описание программы', 'program_description']),
    };

    programs = data.map((row) => {
      const directionRaw = row[columnMap.direction] || '';
      const mappedDirection = mapDirection(directionRaw);

      return {
        education_level: row[columnMap.format] || '',
        macrogroup_name: mappedDirection || '',
        fgos_code: row[columnMap.fgos] || '',
        institution_name: row[columnMap.institution] || '',
        program_name: row[columnMap.program] || '',
        city: row[columnMap.city] || '',
        district: row[columnMap.district] || '',
        base_education: row[columnMap.baseEducation] || '',
        budget_seat: row[columnMap.budget] || '',
        URL: row[columnMap.url] || '',
        description: row[columnMap.description] || '',
      };
    });

    programs = programs.map((program) => ({
      ...program,
      searchIndex: buildSearchIndex(program),
    }));

    populateFormats();
    populateDirections();
    populateDistricts();
    populateBaseEducation();

    totalCount.textContent = programs.length;
    renderPrograms(programs);
    updateResetButtonState();
    updateActiveFilters();
    toggleClearButton();
  } catch (error) {
    grid.innerHTML = '';
    emptyState.hidden = false;
    emptyState.querySelector('h2').textContent = 'Ошибка загрузки данных';
    emptyState.querySelector('p').textContent = error.message;
    if (emptyResetButton) {
      emptyResetButton.hidden = true;
    }
  }
};

const resetFilters = () => {
  searchInput.value = '';
  formatSelect.value = '';
  directionSelect.value = '';
  districtSelect.value = '';
  baseEducationSelect.value = '';
  budgetToggle.checked = false;
  applyFilters();
  searchInput.focus();
};

resetFiltersButton.addEventListener('click', resetFilters);
if (emptyResetButton) {
  emptyResetButton.addEventListener('click', resetFilters);
}
searchInput.addEventListener('input', applyFilters);
formatSelect.addEventListener('change', applyFilters);
directionSelect.addEventListener('change', applyFilters);
districtSelect.addEventListener('change', applyFilters);
baseEducationSelect.addEventListener('change', applyFilters);
budgetToggle.addEventListener('change', applyFilters);
clearSearchButton.addEventListener('click', () => {
  searchInput.value = '';
  applyFilters();
  searchInput.focus();
});

init();
