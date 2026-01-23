const DATA_URL = 'data/programs.csv';

const searchInput = document.getElementById('searchInput');
const formatSelect = document.getElementById('formatSelect');
const directionSelect = document.getElementById('directionSelect');
const regionSelect = document.getElementById('regionSelect');
const budgetToggle = document.getElementById('budgetToggle');
const resetFiltersButton = document.getElementById('resetFilters');
const clearSearchButton = document.getElementById('clearSearch');
const grid = document.getElementById('programGrid');
const resultsCount = document.getElementById('resultsCount');
const totalCount = document.getElementById('totalCount');
const activeFilters = document.getElementById('activeFilters');
const emptyState = document.getElementById('emptyState');

let programs = [];

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

  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => {
    const entry = {};
    headers.forEach((header, index) => {
      entry[header] = (values[index] || '').trim();
    });
    return entry;
  });
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

  if (program.budget_seat?.toLowerCase() === 'да') {
    const budgetBadge = document.createElement('span');
    budgetBadge.className = 'badge accent';
    budgetBadge.textContent = 'Есть бюджет';
    badges.append(budgetBadge);
  }

  const title = document.createElement('h3');
  title.textContent = program.program_name || 'Без названия';

  const institution = document.createElement('p');
  institution.textContent = program.institution_name || 'Организация не указана';

  const meta = document.createElement('div');
  meta.className = 'meta';

  const metaItems = [
    ['Формат обучения', program.education_level || '—'],
    ['Направление', program.macrogroup_name || '—'],
    ['Код ФГОС', program.fgos_code || '—'],
    ['Регион', program.region || '—'],
    ['Бюджетные места', program.budget_seat || '—'],
  ];

  metaItems.forEach(([label, value]) => {
    const line = document.createElement('p');
    line.innerHTML = `${label}: <span>${value}</span>`;
    meta.append(line);
  });

  const link = document.createElement('a');
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
    regionSelect.value !== '' ||
    budgetToggle.checked;
  resetFiltersButton.disabled = !hasFilters;
};

const toggleClearButton = () => {
  const shouldShow = searchInput.value.trim() !== '';
  clearSearchButton.classList.toggle('is-visible', shouldShow);
};

const normalizeText = (value) => (value || '').toString().toLowerCase();

const normalizeForSearch = (value) =>
  normalizeText(value)
    .replace(/ё/g, 'е')
    .replace(/[^a-z0-9а-я]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const buildInitials = (value) => {
  const words = (value || '').toString().match(/[A-Za-zА-Яа-яЁё]+/g) || [];
  const initials = words
    .filter((word) => word.length > 2)
    .map((word) => word[0])
    .join('');
  return normalizeForSearch(initials);
};

const buildSearchIndex = (program) => {
  const parts = [
    program.program_name,
    program.institution_name,
    program.fgos_code,
    program.macrogroup_name,
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
  if (regionSelect.value) {
    filters.push(`Регион: ${regionSelect.value}`);
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
  const region = regionSelect.value;
  const budgetOnly = budgetToggle.checked;

  const filtered = programs.filter((program) => {
    const haystack = program.searchIndex || '';
    const queryTokens = query.split(/\s+/).filter(Boolean);
    const matchesQuery = queryTokens.every((token) => haystack.includes(token));
    const matchesFormat = !format || program.education_level === format;
    const matchesDirection = !direction || program.macrogroup_name === direction;
    const matchesRegion = !region || program.region === region;
    const matchesBudget = !budgetOnly || normalizeText(program.budget_seat) === 'да';
    return (
      matchesQuery &&
      matchesFormat &&
      matchesDirection &&
      matchesRegion &&
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
  ).sort();

  directions.forEach((direction) => {
    const option = document.createElement('option');
    option.value = direction;
    option.textContent = direction;
    directionSelect.append(option);
  });
};

const populateRegions = () => {
  const regions = Array.from(
    new Set(programs.map((program) => program.region).filter(Boolean))
  ).sort();

  regions.forEach((region) => {
    const option = document.createElement('option');
    option.value = region;
    option.textContent = region;
    regionSelect.append(option);
  });
};

const init = async () => {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить данные CSV');
    }
    const text = await response.text();
    programs = parseCSV(text).map((program) => ({
      ...program,
      searchIndex: buildSearchIndex(program),
    }));
    populateFormats();
    populateDirections();
    populateRegions();
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
  }
};

resetFiltersButton.addEventListener('click', () => {
  searchInput.value = '';
  formatSelect.value = '';
  directionSelect.value = '';
  regionSelect.value = '';
  budgetToggle.checked = false;
  applyFilters();
  searchInput.focus();
});
searchInput.addEventListener('input', applyFilters);
formatSelect.addEventListener('change', applyFilters);
directionSelect.addEventListener('change', applyFilters);
regionSelect.addEventListener('change', applyFilters);
budgetToggle.addEventListener('change', applyFilters);
clearSearchButton.addEventListener('click', () => {
  searchInput.value = '';
  applyFilters();
  searchInput.focus();
});

init();
