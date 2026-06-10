// Переключение вкладок
document.querySelectorAll('.p-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const tabId = tab.dataset.tab;
    document.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.p-tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });
});

// Тултипы
function initPopupTooltip() {
  let tooltip = document.createElement('div');
  tooltip.id = 'ops-global-tooltip';
  document.body.appendChild(tooltip);
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-tooltip]');
    if (target) {
      tooltip.innerText = target.dataset.tooltip;
      tooltip.classList.add('visible');
      const rect = target.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - 8}px`;
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-tooltip]')) tooltip.classList.remove('visible');
  });
}
initPopupTooltip();

// Тема и @-меню через свитчи
const themeSwitch = document.getElementById('pop-theme-switch');
const atMenuSwitch = document.getElementById('pop-at-menu-switch');
const body = document.getElementById('popup-root');

chrome.storage.sync.get({ theme: 'light', atMenuEnabled: true }, (res) => {
  if (res.theme === 'dark') {
    body.classList.add('dark-mode');
    themeSwitch.checked = true;
  }
  atMenuSwitch.checked = res.atMenuEnabled;
});

themeSwitch.addEventListener('change', (e) => {
  const newTheme = e.target.checked ? 'dark' : 'light';
  chrome.storage.sync.set({ theme: newTheme }, () => {
    if (newTheme === 'dark') body.classList.add('dark-mode');
    else body.classList.remove('dark-mode');
  });
});

atMenuSwitch.addEventListener('change', (e) => {
  chrome.storage.sync.set({ atMenuEnabled: e.target.checked });
});

// Открытие базы знаний
document.getElementById('pop-open-base').onclick = () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("base.html") });
};

// Поиск и рендер шаблонов
const searchInput = document.getElementById('pop-search');
function renderTemplates() {
  chrome.storage.sync.get({ templates: [] }, (data) => {
    const list = document.getElementById('pop-list');
    list.innerHTML = '';
    const q = searchInput.value.toLowerCase().trim();
    if (data.templates.length === 0) {
      list.innerHTML = '<div class="empty-message">База шаблонов пуста.</div>';
      return;
    }
    data.templates.forEach(tpl => {
      const tagText = tpl.tag ? tpl.tag.toLowerCase() : '';
      if (q && !tpl.title.toLowerCase().includes(q) && !tpl.text.toLowerCase().includes(q) && !tagText.includes(q)) return;
      const item = document.createElement('div');
      item.className = 'tpl-item';
      item.innerHTML = `
        <div class="tpl-meta-row">
          <div class="tpl-name">${escapeHtml(tpl.title)}</div>
        </div>
        ${tpl.tag ? `<span class="tpl-tag">${escapeHtml(tpl.tag)}</span>` : ''}
      `;
      item.onclick = () => {
        chrome.runtime.sendMessage({ type: "INSERT_TO_ACTIVE_TAB", text: tpl.text });
      };
      list.appendChild(item);
    });
  });
}
function escapeHtml(str) { return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

searchInput.oninput = renderTemplates;

// Экспорт/импорт
document.getElementById('pop-export').onclick = () => {
  chrome.storage.sync.get({ templates: [] }, d => {
    const blob = new Blob([JSON.stringify(d.templates, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `opspost_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  });
};
const fileHidden = document.getElementById('pop-file-hidden');
document.getElementById('pop-import').onclick = () => fileHidden.click();
fileHidden.onchange = (e) => {
  const file = e.target.files[0]; if(!file) return;
  const r = new FileReader();
  r.onload = function(evt) {
    try {
      const uploaded = JSON.parse(evt.target.result);
      if(Array.isArray(uploaded)) {
        chrome.storage.sync.get({ templates: [] }, d => {
          const merged = [...d.templates, ...uploaded.filter(u => !d.templates.some(l => l.title===u.title))];
          chrome.storage.sync.set({ templates: merged }, () => {
            renderTemplates();
            alert("Импорт завершён.");
          });
        });
      }
    } catch(e) { alert("Ошибка парсинга JSON."); }
  };
  r.readAsText(file);
};

// Google Drive
document.getElementById('pop-drive-save').onclick = () => {
  chrome.storage.sync.get({ templates: [] }, (data) => {
    chrome.runtime.sendMessage({ type: "SAVE_TO_DRIVE", templates: data.templates }, (response) => {
      alert(response && response.success ? "Сохранено на Google Диск!" : "Ошибка: " + (response?.error || "unknown"));
    });
  });
};
document.getElementById('pop-drive-load').onclick = () => {
  if (confirm("Синхронизировать с Google Диска? Новые шаблоны добавятся.")) {
    chrome.runtime.sendMessage({ type: "LOAD_FROM_DRIVE" }, (response) => {
      if (response && response.success && response.templates) {
        chrome.storage.sync.get({ templates: [] }, (d) => {
          const merged = [...d.templates, ...response.templates.filter(u => !d.templates.some(l => l.title === u.title))];
          chrome.storage.sync.set({ templates: merged }, () => {
            renderTemplates();
            alert("База обновлена из облака.");
          });
        });
      } else alert("Не удалось загрузить: " + (response?.error || "файл не найден"));
    });
  }
};

// Привязка полей
document.getElementById('pop-map-trigger').onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => { if (typeof startInteractiveMapping === 'function') startInteractiveMapping(); else alert("Перезагрузите страницу для активации привязки."); }
    });
  });
};

function renderBindings() {
  const bList = document.getElementById('pop-bindings-list');
  chrome.storage.sync.get({ customBindings: {} }, (res) => {
    bList.innerHTML = '';
    const domains = Object.keys(res.customBindings);
    if (domains.length === 0) {
      bList.innerHTML = '<div class="empty-message">Нет пользовательских привязок.</div>';
      return;
    }
    domains.forEach(domain => {
      const item = document.createElement('div');
      item.className = 'pop-binding-item';
      item.innerHTML = `<span class="domain-text" data-tooltip="${domain}">${escapeHtml(domain)}</span><i class="fa fa-trash-o del-bind" data-domain="${domain}" data-tooltip="Удалить привязку"></i>`;
      item.querySelector('.del-bind').onclick = (e) => {
        e.stopPropagation();
        chrome.storage.sync.get({ customBindings: {} }, (currentData) => {
          delete currentData.customBindings[domain];
          chrome.storage.sync.set({ customBindings: currentData.customBindings }, () => renderBindings());
        });
      };
      bList.appendChild(item);
    });
  });
}

renderTemplates();
renderBindings();