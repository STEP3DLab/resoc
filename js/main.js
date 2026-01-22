const DATA_URL = 'data/programs.csv';

const searchInput = document.getElementById('searchInput');
const formatSelect = document.getElementById('formatSelect');
const resetFiltersButton = document.getElementById('resetFilters');
const grid = document.getElementById('programGrid');
const resultsCount = document.getElementById('resultsCount');
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

  card.append(title, institution, meta, link);
  return card;
};

const renderPrograms = (items) => {
  grid.innerHTML = '';
  items.forEach((program) => grid.append(createCard(program)));
  resultsCount.textContent = items.length;
  emptyState.hidden = items.length > 0;
};

const updateResetButtonState = () => {
  const hasFilters = searchInput.value.trim() !== '' || formatSelect.value !== '';
  resetFiltersButton.disabled = !hasFilters;
};

const applyFilters = () => {
  const query = searchInput.value.trim().toLowerCase();
  const format = formatSelect.value;

  const filtered = programs.filter((program) => {
    const matchesQuery = program.program_name?.toLowerCase().includes(query);
    const matchesFormat = !format || program.education_level === format;
    return matchesQuery && matchesFormat;
  });

  renderPrograms(filtered);
  updateResetButtonState();
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

const init = async () => {
  try {
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Не удалось загрузить данные CSV');
    }
    const text = await response.text();
    programs = parseCSV(text);
    populateFormats();
    renderPrograms(programs);
    updateResetButtonState();
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
  applyFilters();
  searchInput.focus();
});
searchInput.addEventListener('input', applyFilters);
formatSelect.addEventListener('change', applyFilters);

init();
