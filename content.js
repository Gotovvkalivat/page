// content.js - версия 5.1
const DEFAULT_CRMS = [
  { host: "opspost.ru", textarea: ".chat__footer textarea[data-ng-model]", sendBtn: ".chat__footer button.btn-orange" },
  { host: "kdiscont.ru", textarea: "form.styles-form__Dx4LY textarea[name='message']", sendBtn: "form.styles-form__Dx4LY button[type='submit']" },
  { host: "m1express.ru", textarea: "textarea", sendBtn: "button.btn-primary" }
];

let selectedFilterTags = [];
let floatingPanelHost = null;
let activeSmartSearch = false;
let atMenuActive = false, atMenuSelectedIndex = -1, atMenuTemplates = [], atMenuInputElement = null, atMenuTriggerPos = -1, atMenuSearchText = '';
let sortableInstance = null;

function applyThemeToHost(hostElement) {
  chrome.storage.sync.get({ theme: 'light' }, (res) => {
    if (res.theme === 'dark') hostElement.classList.add('dark-mode');
    else hostElement.classList.remove('dark-mode');
  });
}
function initGlobalTooltip(container, shadow) {
  let tooltip = shadow.getElementById('ops-global-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'ops-global-tooltip';
    container.appendChild(tooltip);
  }
  shadow.addEventListener('mouseover', (e) => {
    const path = e.composedPath ? e.composedPath() : [];
    const target = path.find(el => el && el.dataset && el.dataset.tooltip);
    if (target) {
      tooltip.innerText = target.dataset.tooltip;
      tooltip.classList.add('visible');
      const rect = target.getBoundingClientRect();
      tooltip.style.left = `${rect.left + rect.width / 2}px`;
      tooltip.style.top = `${rect.top - 8}px`;
    }
  });
  shadow.addEventListener('mouseout', () => tooltip.classList.remove('visible'));
  shadow.addEventListener('click', () => tooltip.classList.remove('visible'));
  shadow.addEventListener('wheel', () => tooltip.classList.remove('visible'));
}
function getModalHost() {
  let host = document.getElementById('ops-modal-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'ops-modal-host';
    applyThemeToHost(host);
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
    shadow.appendChild(fontAwesome);
    const styleLink = document.createElement('style');
    styleLink.textContent = `@import "${chrome.runtime.getURL('style.css')}";`;
    shadow.appendChild(styleLink);
    initGlobalTooltip(shadow, shadow);
  }
  return host.shadowRoot;
}
function getFloatingPanelHost() {
  if (!floatingPanelHost) {
    floatingPanelHost = document.createElement('div');
    floatingPanelHost.id = 'ops-floating-host';
    applyThemeToHost(floatingPanelHost);
    document.body.appendChild(floatingPanelHost);
    const shadow = floatingPanelHost.attachShadow({ mode: 'open' });
    const fontAwesome = document.createElement('link');
    fontAwesome.rel = 'stylesheet';
    fontAwesome.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css';
    shadow.appendChild(fontAwesome);
    const styleLink = document.createElement('style');
    styleLink.textContent = `@import "${chrome.runtime.getURL('style.css')}";`;
    shadow.appendChild(styleLink);
    const panel = document.createElement('div');
    panel.id = 'ops-floating-panel';
    panel.style.display = 'none';
    shadow.appendChild(panel);
    initGlobalTooltip(shadow, shadow);
  }
  return floatingPanelHost.shadowRoot;
}
function resolveCurrentCRM(callback) {
  const currentHost = window.location.hostname;
  chrome.storage.sync.get({ customBindings: {} }, (res) => {
    if (res.customBindings && res.customBindings[currentHost]) {
      const bind = res.customBindings[currentHost];
      return callback({
        textarea: () => document.querySelector(bind.textarea),
        sendBtn: () => bind.sendBtn ? document.querySelector(bind.sendBtn) : null,
        isCustom: true
      });
    }
    const def = DEFAULT_CRMS.find(c => currentHost.includes(c.host));
    if (def) {
      return callback({
        textarea: () => document.querySelector(def.textarea),
        sendBtn: () => document.querySelector(def.sendBtn),
        isCustom: false
      });
    }
    callback(null);
  });
}
function setNativeValue(element, value) {
  if (!element) return;
  const isTextArea = element.tagName === "TEXTAREA";
  const proto = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  const currentVal = element.value;
  if (valueSetter) valueSetter.call(element, value);
  else element.value = value;
  if (element._valueTracker) element._valueTracker.setValue(currentVal);
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
function insertFinalText(templateText, autoSend = false) {
  resolveCurrentCRM((crm) => {
    if (!crm) return;
    const textarea = crm.textarea();
    if (!textarea) { showToast("Целевое поле ввода не найдено.", "error"); return; }
    textarea.focus();
    const currentVal = textarea.value || "";
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;
    const newVal = currentVal.substring(0, start) + templateText + currentVal.substring(end);
    setNativeValue(textarea, newVal);
    textarea.selectionStart = textarea.selectionEnd = start + templateText.length;
    if (autoSend) {
      setTimeout(() => {
        const btn = crm.sendBtn();
        if (btn && !btn.disabled) btn.click();
      }, 150);
    }
  });
}
function showToast(text, type = "info") {
  const shadow = getModalHost();
  let container = shadow.getElementById('ops-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'ops-toast-container';
    shadow.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `ops-toast ${type}`;
  toast.innerHTML = `<i class="fa ${type==='success'?'fa-check-circle':'fa-exclamation-triangle'}"></i> <span>${text}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.classList.add('visible'), 50);
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
function showConfirm(text, onConfirm) {
  const shadow = getModalHost();
  const overlay = document.createElement('div');
  overlay.className = 'ops-blur-overlay';
  overlay.innerHTML = `
    <div class="ops-modal-container layout-dialog">
      <div class="ops-modal-body text-center">${text}</div>
      <div class="ops-modal-footer flex-end gap-2">
        <button id="ops-dial-cancel" class="ops-m-btn ops-m-btn-secondary">Отмена</button>
        <button id="ops-dial-ok" class="ops-m-btn ops-m-btn-orange">Продолжить</button>
      </div>
    </div>
  `;
  shadow.appendChild(overlay);
  overlay.querySelector('#ops-dial-cancel').onclick = () => overlay.remove();
  overlay.querySelector('#ops-dial-ok').onclick = () => { onConfirm(); overlay.remove(); };
}
function startInteractiveMapping() {
  const shadow = getModalHost();
  let oldOverlay = shadow.getElementById('ops-picker-overlay');
  if (oldOverlay) oldOverlay.remove();
  const pickerOverlay = document.createElement('div');
  pickerOverlay.id = 'ops-picker-overlay';
  pickerOverlay.innerHTML = `
    <div class="ops-picker-topbar">
      <span><i class="fa fa-crosshairs"></i> Режим привязки: Кликните по <b>ПОЛЮ ВВОДА</b> в CRM</span>
      <button id="ops-picker-abort" class="ops-m-btn ops-m-btn-secondary">Выход (Esc)</button>
    </div>
    <div id="ops-picker-highlighter"></div>
  `;
  shadow.appendChild(pickerOverlay);
  const highlighter = pickerOverlay.querySelector('#ops-picker-highlighter');
  let targetedTextareaSelector = null;
  function buildCleanSelector(el) {
    if (el.id) return `#${CSS.escape(el.id)}`;
    const path = [];
    while (el && el.nodeType === Node.ELEMENT_NODE) {
      let selector = el.nodeName.toLowerCase();
      if (el.className && typeof el.className === 'string') {
        const classes = Array.from(el.classList).filter(c => !c.startsWith('ops-')).map(c => `.${CSS.escape(c)}`).join('');
        if (classes) selector += classes;
      }
      let sibling = el, nth = 1;
      while (sibling = sibling.previousElementSibling) {
        if (sibling.nodeName === el.nodeName) nth++;
      }
      selector += `:nth-of-type(${nth})`;
      path.unshift(selector);
      el = el.parentNode;
      if (el && el.tagName === 'BODY') break;
    }
    return path.join(' > ');
  }
  const onMouseMove = (e) => {
    const path = e.composedPath();
    const target = path.find(el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text') || el.getAttribute?.('contenteditable') === 'true');
    if (target) {
      const rect = target.getBoundingClientRect();
      highlighter.style.display = 'block';
      highlighter.style.top = `${rect.top + window.scrollY}px`;
      highlighter.style.left = `${rect.left + window.scrollX}px`;
      highlighter.style.width = `${rect.width}px`;
      highlighter.style.height = `${rect.height}px`;
    } else highlighter.style.display = 'none';
  };
  const onClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    const path = e.composedPath();
    const target = path.find(el => el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type === 'text') || el.getAttribute?.('contenteditable') === 'true');
    if (!target) return;
    targetedTextareaSelector = buildCleanSelector(target);
    pickerOverlay.querySelector('.ops-picker-topbar span').innerHTML = `<i class="fa fa-mouse-pointer"></i> Поле захвачено! Теперь кликните по <b>КНОПКЕ ОТПРАВКИ</b>`;
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('click', onClick, true);
    const onButtonClick = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      const p = ev.composedPath();
      const btn = p.find(el => el.tagName === 'BUTTON' || el.tagName === 'A' || (el.tagName === 'INPUT' && (el.type === 'submit' || el.type === 'button')));
      saveBindingAndClean(btn ? buildCleanSelector(btn) : null);
    };
    const saveBindingAndClean = (btnSel) => {
      chrome.storage.sync.get({ customBindings: {} }, (data) => {
        data.customBindings[window.location.hostname] = {
          textarea: targetedTextareaSelector,
          sendBtn: btnSel
        };
        chrome.storage.sync.set({ customBindings: data.customBindings }, () => {
          showToast("Привязка успешно зарегистрирована!", "success");
          pickerOverlay.remove();
          setTimeout(() => location.reload(), 500);
        });
      });
    };
    document.addEventListener('click', onButtonClick, true);
    document.addEventListener('keydown', (ev) => { if(ev.key === 'Escape') saveBindingAndClean(null); }, {once: true});
  };
  pickerOverlay.querySelector('#ops-picker-abort').onclick = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('click', onClick, true);
    pickerOverlay.remove();
  };
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('click', onClick, true);
}
function openCustomizerModal(title, text) {
  const shadow = getModalHost();
  const oldModal = shadow.getElementById('ops-customizer-overlay');
  if (oldModal) oldModal.remove();
  const isStandalone = window.location.href.includes('base.html');
  const overlay = document.createElement('div');
  overlay.id = 'ops-customizer-overlay';
  overlay.className = 'ops-blur-overlay';
  overlay.innerHTML = `
    <div class="ops-modal-container layout-compact resizable-container">
      <div class="ops-modal-header">
        <div class="ops-modal-title">Редактирование: <span>${title}</span></div>
        <div id="ops-cust-close" class="ops-modal-close" data-tooltip="Закрыть окно">&times;</div>
      </div>
      <div class="ops-modal-body flex-grow" style="padding: 16px;">
        <textarea id="ops-customizer-textarea"></textarea>
      </div>
      <div class="ops-modal-footer">
        <div class="ops-modal-hotkey-info"><b>Ctrl + Enter</b> — мгновенная отправка</div>
        <div class="ops-modal-actions">
          <button id="ops-cust-cancel" class="ops-m-btn ops-m-btn-secondary">Отмена</button>
          <button id="ops-cust-submit" class="ops-m-btn ops-m-btn-primary">Вставить текст</button>
          <button id="ops-cust-send" class="ops-m-btn ops-m-btn-orange">Вставить и Отправить</button>
        </div>
      </div>
    </div>
  `;
  shadow.appendChild(overlay);
  const txtArea = overlay.querySelector('#ops-customizer-textarea');
  txtArea.value = text;
  txtArea.focus();
  const closeAndRestoreMenu = () => {
    overlay.remove();
    const megaOverlay = shadow.getElementById('ops-mega-overlay');
    if (megaOverlay) megaOverlay.style.display = 'flex';
  };
  const insertAndCloseEverything = (textToInsert, autoSend) => {
    insertFinalText(textToInsert, autoSend);
    overlay.remove();
    const megaOverlay = shadow.getElementById('ops-mega-overlay');
    if (megaOverlay) megaOverlay.remove();
  };
  overlay.querySelector('#ops-cust-close').onclick = closeAndRestoreMenu;
  overlay.querySelector('#ops-cust-cancel').onclick = closeAndRestoreMenu;
  if (isStandalone) {
    overlay.querySelector('.ops-modal-hotkey-info').style.display = 'none';
    overlay.querySelector('#ops-cust-submit').style.display = 'none';
    overlay.querySelector('#ops-cust-send').style.display = 'none';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'ops-m-btn ops-m-btn-primary';
    copyBtn.innerHTML = '<i class="fa fa-copy"></i> Скопировать';
    copyBtn.onclick = () => { navigator.clipboard.writeText(txtArea.value).then(() => showToast("Текст скопирован!", "success")); };
    overlay.querySelector('.ops-modal-actions').insertBefore(copyBtn, overlay.querySelector('#ops-cust-cancel'));
    overlay.querySelector('#ops-cust-cancel').innerText = 'Закрыть';
  } else {
    overlay.querySelector('#ops-cust-submit').onclick = () => { insertAndCloseEverything(txtArea.value, false); };
    overlay.querySelector('#ops-cust-send').onclick = () => { insertAndCloseEverything(txtArea.value, true); };
    txtArea.onkeydown = (e) => { if (e.key === 'Enter' && e.ctrlKey) insertAndCloseEverything(txtArea.value, true); };
  }
}
function openMegaModal() {
  const shadow = getModalHost();
  let old = shadow.getElementById('ops-mega-overlay');
  if (old) { old.style.display = 'flex'; return; }
  const overlay = document.createElement('div');
  overlay.id = 'ops-mega-overlay';
  overlay.className = 'ops-blur-overlay';
  chrome.storage.sync.get({ theme: 'light' }, (res) => {
    const isDark = res.theme === 'dark';
    overlay.innerHTML = `
      <div class="ops-modal-container layout-mega">
        <div class="ops-modal-header">
          <div class="ops-modal-title"><i class="fa fa-database"></i> База знаний: <span>Управление</span></div>
          <label class="theme-switch" data-tooltip="Сменить тему">
            <input type="checkbox" id="mega-theme-switch">
            <span class="slider"></span>
            <span>Тёмная тема</span>
          </label>
          <div class="ops-grid-settings">
            <label data-tooltip="Количество колонок карточек"><i class="fa fa-columns"></i> Столбцы: <select id="mega-grid-cols"><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option></select></label>
            <label data-tooltip="Высота карточки"><i class="fa fa-arrows-v"></i> Высота: <select id="mega-grid-height"><option value="180px">180px</option><option value="240px" selected>240px</option><option value="320px">320px</option><option value="max-content">Авто</option></select></label>
          </div>
          <div class="ops-mega-backup-group">
            <button id="mega-btn-file-export" class="ops-m-btn ops-m-btn-secondary" data-tooltip="Сохранить файл .json"><i class="fa fa-download"></i> Экспорт</button>
            <button id="mega-btn-file-import" class="ops-m-btn ops-m-btn-secondary" data-tooltip="Загрузить из .json"><i class="fa fa-upload"></i> Импорт</button>
            <button id="mega-btn-drive-save" class="ops-m-btn ops-m-btn-primary" data-tooltip="Выгрузить в Google Диск"><i class="fa fa-google"></i> В Диск</button>
            <button id="mega-btn-drive-load" class="ops-m-btn ops-m-btn-orange" data-tooltip="Загрузить из Google Диска"><i class="fa fa-refresh"></i> Из Диска</button>
            <input type="file" id="mega-file-hidden" accept=".json" style="display:none;">
          </div>
          <div id="mega-modal-close" class="ops-modal-close" data-tooltip="Закрыть базу">&times;</div>
        </div>
        <div class="ops-mega-layout">
          <div class="ops-mega-sidebar">
            <h4 id="mega-form-title">Новый шаблон</h4>
            <input type="hidden" id="mega-edit-index" value="-1">
            <input type="text" id="mega-input-title" placeholder="Название ответа..." maxlength="50">
            <div style="text-align:right; font-size:10px; color:var(--text-muted); margin:-10px 0 6px 0;">Осталось: <span id="mega-char-counter">50</span> симв.</div>
            <div style="position: relative; width: 100%;">
              <input type="text" id="mega-input-tag" placeholder="Категория / Тег...">
              <div id="mega-tag-autocomplete" class="ops-autocomplete-dropdown"></div>
            </div>
            <textarea id="mega-input-text" placeholder="Текст шаблона..." rows="10"></textarea>
            <div style="display:flex; gap:6px;">
              <button id="mega-btn-save" class="ops-m-btn ops-m-btn-primary" style="flex:1;">Сохранить шаблон</button>
              <button id="mega-btn-cancel-edit" class="ops-m-btn ops-m-btn-secondary" style="display:none;">Отмена</button>
            </div>
            <div class="ops-sidebar-divider"></div>
            <details class="ops-bindings-details">
              <summary><i class="fa fa-link"></i> Привязанные сайты <i class="fa fa-caret-down" style="margin-left:auto;"></i></summary>
              <div id="mega-bindings-list" class="ops-bindings-list" style="margin-top: 10px;"></div>
            </details>
          </div>
          <div class="ops-mega-main">
            <div class="ops-toolbar-row">
              <div class="search-wrapper" style="position:relative; flex:1;">
                <i class="fa fa-search search-icon"></i>
                <input type="text" id="mega-search" placeholder="Глобальный поиск в базе данных...">
              </div>
              <div class="ops-multiselect-container">
                <div id="mega-tag-dropdown-btn" class="ops-multiselect-trigger" data-tooltip="Выбрать категории">Теги (0) <i class="fa fa-chevron-down"></i></div>
                <div id="mega-tag-dropdown-list" class="ops-multiselect-menu"></div>
              </div>
              <button id="mega-btn-fav-filter" class="ops-m-btn ops-m-btn-secondary" data-tooltip="Показать только Избранные"><i class="fa fa-star-o"></i> Избранное</button>
            </div>
            <div id="mega-selected-tags-pills" class="ops-tag-pills-row"></div>
            <div id="ops-sticky-grid" class="ops-sticky-grid"></div>
          </div>
        </div>
      </div>
    `;
    shadow.appendChild(overlay);
    overlay.querySelector('#mega-modal-close').onclick = () => overlay.remove();
    const themeSwitch = overlay.querySelector('#mega-theme-switch');
    themeSwitch.checked = isDark;
    themeSwitch.addEventListener('change', (e) => {
      const newTheme = e.target.checked ? 'dark' : 'light';
      chrome.storage.sync.set({ theme: newTheme }, () => {
        applyThemeToHost(document.getElementById('ops-modal-host'));
        if (floatingPanelHost) applyThemeToHost(floatingPanelHost);
      });
    });
    setupMegaModalEvents(shadow, overlay);
    renderStickyGrid(shadow);
    renderBindingsList(shadow);
    rebuildTagMultiselectDropdown(shadow);
  });
}
function renderBindingsList(shadow) {
  const cont = shadow.getElementById('mega-bindings-list');
  if (!cont) return;
  chrome.storage.sync.get({ customBindings: {} }, (res) => {
    cont.innerHTML = '';
    const keys = Object.keys(res.customBindings);
    if (keys.length === 0) { cont.innerHTML = '<div class="no-bindings-info">Нет привязок элементов.</div>'; return; }
    keys.forEach(domain => {
      const row = document.createElement('div');
      row.className = 'ops-binding-row';
      row.innerHTML = `<div class="ops-binding-domain" data-tooltip="${domain}">${domain}</div><button class="ops-binding-del-btn" data-domain="${domain}" data-tooltip="Удалить привязку"><i class="fa fa-trash-o"></i></button>`;
      row.querySelector('.ops-binding-del-btn').onclick = () => {
        delete res.customBindings[domain];
        chrome.storage.sync.set({ customBindings: res.customBindings }, () => {
          showToast(`Связь для домена ${domain} удалена`, "info");
          renderBindingsList(shadow);
        });
      };
      cont.appendChild(row);
    });
  });
}
function renderStickyGrid(shadow, searchQuery = '') {
  const grid = shadow.getElementById('ops-sticky-grid');
  if (!grid) return;
  chrome.storage.sync.get({ templates: [], favFilter: false }, (data) => {
    grid.innerHTML = '';
    const search = searchQuery.toLowerCase().trim();
    data.templates.forEach((tpl, index) => {
      if (data.favFilter && !tpl.favorite) return;
      if (selectedFilterTags.length > 0 && (!tpl.tag || !selectedFilterTags.includes(tpl.tag))) return;
      const tagText = tpl.tag ? tpl.tag.toLowerCase() : '';
      if (search && !tpl.title.toLowerCase().includes(search) && !tpl.text.toLowerCase().includes(search) && !tagText.includes(search)) return;
      const card = document.createElement('div');
      card.className = `ops-sticky-note ${tpl.favorite ? 'is-fav' : ''}`;
      card.setAttribute('data-title', tpl.title);
      card.innerHTML = `
        <div class="ops-sticky-actions">
          <button class="ops-sh-btn btn-copy" data-tooltip="Копировать текст"><i class="fa fa-copy"></i></button>
          <button class="ops-sh-btn btn-fav" data-tooltip="${tpl.favorite ? 'Убрать из избранного' : 'Добавить в избранное'}"><i class="fa ${tpl.favorite ? 'fa-star' : 'fa-star-o'}"></i></button>
          <button class="ops-sh-btn btn-edit" data-tooltip="Редактировать"><i class="fa fa-pencil"></i></button>
          <button class="ops-sh-btn btn-del" data-tooltip="Удалить карточку"><i class="fa fa-trash"></i></button>
        </div>
        <div class="ops-sticky-content" data-tooltip="Кликните для просмотра текста">
          <div class="ops-sticky-title">${escapeHtml(tpl.title)}</div>
          ${tpl.tag ? `<div class="ops-sticky-tag"><i class="fa fa-tag"></i> ${escapeHtml(tpl.tag)}</div>` : ''}
          <div class="ops-sticky-body-text">${escapeHtml(tpl.text)}</div>
        </div>
      `;
      card.querySelector('.btn-copy').onclick = (e) => { e.stopPropagation(); navigator.clipboard.writeText(tpl.text).then(() => showToast("Текст скопирован!", "success")); };
      card.querySelector('.ops-sticky-content').onclick = () => { const megaOverlay = shadow.getElementById('ops-mega-overlay'); if (megaOverlay) megaOverlay.style.display = 'none'; openCustomizerModal(tpl.title, tpl.text); };
      card.querySelector('.btn-fav').onclick = (e) => { e.stopPropagation(); tpl.favorite = !tpl.favorite; chrome.storage.sync.set({ templates: data.templates }, () => renderStickyGrid(shadow, searchQuery)); };
      card.querySelector('.btn-edit').onclick = (e) => { e.stopPropagation(); shadow.getElementById('mega-edit-index').value = index; shadow.getElementById('mega-input-title').value = tpl.title; shadow.getElementById('mega-input-tag').value = tpl.tag || ''; shadow.getElementById('mega-input-text').value = tpl.text; shadow.getElementById('mega-form-title').innerText = "Изменение шаблона"; shadow.getElementById('mega-btn-save').innerText = "Обновить"; shadow.getElementById('mega-btn-cancel-edit').style.display = "inline-block"; shadow.getElementById('mega-input-title').focus(); };
      card.querySelector('.btn-del').onclick = (e) => { e.stopPropagation(); showConfirm(`Удалить "${tpl.title}"?`, () => { data.templates.splice(index, 1); chrome.storage.sync.set({ templates: data.templates }, () => { showToast("Шаблон удален", "success"); renderStickyGrid(shadow, searchQuery); rebuildTagMultiselectDropdown(shadow); }); }); };
      grid.appendChild(card);
    });
    initDragAndDropGrid(shadow);
  });
}
function resetMegaForm(shadow) {
  if (!shadow.getElementById('mega-input-title')) return;
  shadow.getElementById('mega-edit-index').value = "-1";
  shadow.getElementById('mega-input-title').value = "";
  shadow.getElementById('mega-input-tag').value = "";
  shadow.getElementById('mega-input-text').value = "";
  shadow.getElementById('mega-form-title').innerText = "Новый шаблон";
  shadow.getElementById('mega-btn-save').innerText = "Сохранить шаблон";
  shadow.getElementById('mega-btn-cancel-edit').style.display = "none";
  shadow.getElementById('mega-char-counter').innerText = "50";
}
function setupMegaModalEvents(shadow, overlay) {
  const searchInput = overlay.querySelector('#mega-search');
  searchInput.oninput = () => renderStickyGrid(shadow, searchInput.value);
  overlay.querySelector('#mega-input-title').oninput = function() { overlay.querySelector('#mega-char-counter').innerText = 50 - this.value.length; };
  const tagIn = overlay.querySelector('#mega-input-tag');
  const tagDrop = overlay.querySelector('#mega-tag-autocomplete');
  tagIn.onfocus = tagIn.oninput = () => {
    chrome.storage.sync.get({ templates: [] }, d => {
      const val = tagIn.value.toLowerCase().trim();
      const tags = [...new Set(d.templates.map(t => t.tag).filter(Boolean))];
      const matching = tags.filter(t => t.toLowerCase().includes(val));
      if (matching.length > 0) {
        tagDrop.innerHTML = '';
        matching.forEach(m => {
          const item = document.createElement('div');
          item.className = 'ops-auto-item';
          item.innerText = m;
          item.onclick = () => { tagIn.value = m; tagDrop.classList.remove('open'); };
          tagDrop.appendChild(item);
        });
        tagDrop.classList.add('open');
      } else tagDrop.classList.remove('open');
    });
  };
  document.addEventListener('click', (e) => { if (!e.composedPath().includes(tagIn)) tagDrop.classList.remove('open'); });
  const favFilterBtn = overlay.querySelector('#mega-btn-fav-filter');
  favFilterBtn.onclick = () => {
    chrome.storage.sync.get({ favFilter: false }, d => {
      const next = !d.favFilter;
      chrome.storage.sync.set({ favFilter: next }, () => {
        favFilterBtn.className = `ops-m-btn ${next ? 'ops-m-btn-orange' : 'ops-m-btn-secondary'}`;
        favFilterBtn.innerHTML = `<i class="fa ${next ? 'fa-star' : 'fa-star-o'}"></i> Избранное`;
        renderStickyGrid(shadow, searchInput.value);
      });
    });
  };
  overlay.querySelector('#mega-btn-save').onclick = () => {
    const idx = parseInt(overlay.querySelector('#mega-edit-index').value);
    const title = overlay.querySelector('#mega-input-title').value.trim();
    const tag = overlay.querySelector('#mega-input-tag').value.trim();
    const text = overlay.querySelector('#mega-input-text').value.trim();
    if (!title || !text) { showToast("Заполните имя и текст шаблона.", "error"); return; }
    chrome.storage.sync.get({ templates: [] }, d => {
      const item = { title, tag, text, favorite: idx >= 0 ? d.templates[idx].favorite : false };
      if (idx >= 0) d.templates[idx] = item;
      else d.templates.push(item);
      chrome.storage.sync.set({ templates: d.templates }, () => {
        showToast("Шаблон сохранен!", "success");
        resetMegaForm(shadow);
        renderStickyGrid(shadow, searchInput.value);
        rebuildTagMultiselectDropdown(shadow);
      });
    });
  };
  overlay.querySelector('#mega-btn-cancel-edit').onclick = () => resetMegaForm(shadow);
  overlay.querySelector('#mega-btn-file-export').onclick = () => {
    chrome.storage.sync.get({ templates: [] }, d => {
      const blob = new Blob([JSON.stringify(d.templates, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `opspost_backup_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    });
  };
  const fileIn = overlay.querySelector('#mega-file-hidden');
  overlay.querySelector('#mega-btn-file-import').onclick = () => fileIn.click();
  fileIn.onchange = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const uploaded = JSON.parse(evt.target.result);
        if (Array.isArray(uploaded)) {
          chrome.storage.sync.get({ templates: [] }, d => {
            const merged = [...d.templates, ...uploaded.filter(u => !d.templates.some(l => l.title===u.title))];
            chrome.storage.sync.set({ templates: merged }, () => {
              showToast("Шаблоны импортированы", "success");
              renderStickyGrid(shadow, searchInput.value);
              rebuildTagMultiselectDropdown(shadow);
            });
          });
        }
      } catch(ex) { showToast("Невалидный JSON", "error"); }
    };
    reader.readAsText(file);
  };
  overlay.querySelector('#mega-btn-drive-save').onclick = () => {
    chrome.storage.sync.get({ templates: [] }, (data) => {
      chrome.runtime.sendMessage({ type: "SAVE_TO_DRIVE", templates: data.templates }, (res) => {
        if (res && res.success) showToast("Сохранено на Google Диск!", "success");
        else showToast("Ошибка диска: " + (res ? res.error : "Unknown"), "error");
      });
    });
  };
  overlay.querySelector('#mega-btn-drive-load').onclick = () => {
    showConfirm("Загрузить шаблоны из Google Drive? Текущая база будет объединена.", () => {
      chrome.runtime.sendMessage({ type: "LOAD_FROM_DRIVE" }, (res) => {
        if (res && res.success && res.templates) {
          chrome.storage.sync.get({ templates: [] }, (d) => {
            const merged = [...d.templates, ...res.templates.filter(u => !d.templates.some(l => l.title === u.title))];
            chrome.storage.sync.set({ templates: merged }, () => {
              showToast("База синхронизирована с Google Диска!", "success");
              renderStickyGrid(shadow, searchInput.value);
              rebuildTagMultiselectDropdown(shadow);
            });
          });
        } else showToast("Не удалось скачать бэкап", "error");
      });
    });
  };
  const selCols = overlay.querySelector('#mega-grid-cols');
  const selHeight = overlay.querySelector('#mega-grid-height');
  const applyGridCSS = (cols, height) => {
    const grid = shadow.getElementById('ops-sticky-grid');
    if (grid) { grid.style.setProperty('--grid-cols', cols); grid.style.setProperty('--card-height', height); }
  };
  chrome.storage.sync.get({ gridCols: '3', gridHeight: '240px' }, prefs => {
    selCols.value = prefs.gridCols;
    selHeight.value = prefs.gridHeight;
    applyGridCSS(prefs.gridCols, prefs.gridHeight);
  });
  selCols.onchange = () => { chrome.storage.sync.set({ gridCols: selCols.value }); applyGridCSS(selCols.value, selHeight.value); };
  selHeight.onchange = () => { chrome.storage.sync.set({ gridHeight: selHeight.value }); applyGridCSS(selCols.value, selHeight.value); };
  const dropBtn = overlay.querySelector('#mega-tag-dropdown-btn');
  const dropMenu = overlay.querySelector('#mega-tag-dropdown-list');
  dropBtn.onclick = (e) => { e.stopPropagation(); dropMenu.classList.toggle('open'); };
  document.addEventListener('click', (e) => { if (!e.composedPath().includes(dropMenu)) dropMenu.classList.remove('open'); });
}
function rebuildTagMultiselectDropdown(shadow) {
  const dropMenu = shadow.getElementById('mega-tag-dropdown-list');
  const dropBtn = shadow.getElementById('mega-tag-dropdown-btn');
  if (!dropMenu) return;
  chrome.storage.sync.get({ templates: [] }, d => {
    const tags = [...new Set(d.templates.map(t => t.tag).filter(Boolean))];
    dropMenu.innerHTML = '';
    dropBtn.innerHTML = `Теги (${selectedFilterTags.length}) <i class="fa fa-chevron-down"></i>`;
    if (tags.length === 0) { dropMenu.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:12px;">Тегов не найдено</div>'; return; }
    tags.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'ops-multiselect-item';
      const checked = selectedFilterTags.includes(tag);
      item.innerHTML = `<input type="checkbox" data-tag="${tag}" ${checked ? 'checked' : ''} style="pointer-events:none;"><span>${tag}</span>`;
      item.onclick = (e) => {
        e.stopPropagation();
        const idx = selectedFilterTags.indexOf(tag);
        if (idx >= 0) selectedFilterTags.splice(idx, 1);
        else selectedFilterTags.push(tag);
        rebuildTagMultiselectDropdown(shadow);
        updateTagFilterUI(shadow);
      };
      dropMenu.appendChild(item);
    });
  });
}
function updateTagFilterUI(shadow) {
  const pillsRow = shadow.getElementById('mega-selected-tags-pills');
  if (!pillsRow) return;
  pillsRow.innerHTML = '';
  selectedFilterTags.forEach(tag => {
    const pill = document.createElement('div');
    pill.className = 'ops-tag-pill';
    pill.innerHTML = `<span>${tag}</span><i class="fa fa-times remove-pill"></i>`;
    pill.querySelector('.remove-pill').onclick = () => {
      const idx = selectedFilterTags.indexOf(tag);
      if (idx >= 0) selectedFilterTags.splice(idx, 1);
      rebuildTagMultiselectDropdown(shadow);
      updateTagFilterUI(shadow);
    };
    pillsRow.appendChild(pill);
  });
  renderStickyGrid(shadow, shadow.getElementById('mega-search')?.value || '');
}
function initFloatingOverlay() {
  let hideTimeout;
  const checkAndRenderPanel = () => {
    resolveCurrentCRM((crm) => {
      const shadow = getFloatingPanelHost();
      const panel = shadow.getElementById('ops-floating-panel');
      if (!crm) { if (panel) panel.style.display = 'none'; return; }
      const textarea = crm.textarea();
      const isFocused = textarea && (document.activeElement === textarea || textarea.contains(document.activeElement));
      if (isFocused) {
        clearTimeout(hideTimeout);
        chrome.storage.sync.get({ templates: [] }, (data) => {
          const favorites = data.templates.filter(t => t.favorite);
          panel.innerHTML = '';
          const topbar = document.createElement('div');
          topbar.id = 'ops-quick-topbar';
          topbar.innerHTML = `
            <div class="panel-label"><i class="fa fa-bolt"></i> Быстрые ответы</div>
            <div class="ops-panel-controls">
              <button id="ops-btn-clear" class="ops-mini-btn" style="color:#ef4444; border-color:#fca5a5;" data-tooltip="Очистить поле ввода"><i class="fa fa-eraser"></i> Очистить</button>
              <button id="ops-btn-open-mega" class="ops-mini-btn primary" data-tooltip="Открыть Базу Знаний"><i class="fa fa-database"></i> База</button>
            </div>
          `;
          panel.appendChild(topbar);
          topbar.querySelector('#ops-btn-clear').onclick = (e) => { e.preventDefault(); e.stopPropagation(); setNativeValue(textarea, ""); textarea.focus(); };
          topbar.querySelector('#ops-btn-open-mega').onclick = (e) => { e.preventDefault(); e.stopPropagation(); openMegaModal(); };
          const chipsContainer = document.createElement('div');
          chipsContainer.id = 'ops-chips-container';
          if (favorites.length === 0) chipsContainer.innerHTML = '<span class="no-favs-alert">Нет избранных шаблонов. Отметьте звёздочкой в Базе Знаний.</span>';
          else favorites.forEach(tpl => {
            const chip = document.createElement('button');
            chip.className = 'ops-chip-btn';
            chip.type = 'button';
            chip.innerHTML = `${tpl.title}`;
            chip.onclick = (e) => { e.preventDefault(); e.stopPropagation(); insertFinalTextWithVariables(tpl.text, false); };
            chipsContainer.appendChild(chip);
          });
          panel.appendChild(chipsContainer);
          const rect = textarea.getBoundingClientRect();
          panel.style.display = 'block';
          panel.style.position = 'fixed';
          const panelHeight = panel.offsetHeight || 75;
          panel.style.top = `${rect.top - panelHeight - 12}px`;
          panel.style.left = `${rect.left}px`;
          panel.style.width = `${rect.width}px`;
        });
      } else {
        hideTimeout = setTimeout(() => { if (panel && !panel.matches(':hover') && !panel.contains(document.activeElement)) panel.style.display = 'none'; }, 150);
      }
    });
  };
  document.addEventListener('focusin', checkAndRenderPanel);
  document.addEventListener('focusout', checkAndRenderPanel);
  document.addEventListener('click', checkAndRenderPanel);
  document.addEventListener('input', checkAndRenderPanel);
  setInterval(checkAndRenderPanel, 1000);
  window.addEventListener('ops-alert-trigger', (e) => showToast(e.detail, "error"));
}
function escapeHtml(str) { return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }
function replaceDateVariable(text) {
  const now = new Date();
  const formatted = `${now.getDate().toString().padStart(2,'0')}.${(now.getMonth()+1).toString().padStart(2,'0')}.${now.getFullYear()}`;
  return text.replace(/\{\{date\}\}/gi, formatted);
}
async function insertFinalTextWithVariables(templateText, autoSend = false) {
  const varMatches = templateText.match(/\{\{([^}]+)\}\}/g);
  if (varMatches && varMatches.length > 0) {
    let filledText = templateText;
    for (const match of varMatches) {
      const varName = match.slice(2, -2).trim();
      if (varName.toLowerCase() === 'date') continue;
      const userValue = prompt(`Введите значение для "${varName}":`, '');
      if (userValue === null) return;
      filledText = filledText.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), userValue);
    }
    filledText = replaceDateVariable(filledText);
    insertFinalText(filledText, autoSend);
  } else {
    const processed = replaceDateVariable(templateText);
    insertFinalText(processed, autoSend);
  }
}
function showSmartSearch() {
  if (activeSmartSearch) return;
  chrome.storage.sync.get({ templates: [] }, (data) => {
    const shadow = getModalHost();
    let existing = shadow.getElementById('ops-smart-search');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.id = 'ops-smart-search';
    overlay.className = 'ops-blur-overlay';
    overlay.style.alignItems = 'flex-start';
    overlay.style.paddingTop = '15vh';
    overlay.innerHTML = `
      <div class="ops-modal-container layout-smart">
        <div class="ops-modal-header">
          <div class="ops-modal-title"><i class="fa fa-search"></i> Умный поиск шаблонов</div>
          <div id="smart-search-close" class="ops-modal-close">&times;</div>
        </div>
        <div class="ops-modal-body" style="padding: 16px;">
          <input type="text" id="smart-search-input" placeholder="Введите название или тег..." autofocus class="smart-search-input">
          <div id="smart-search-results" class="smart-search-results"></div>
        </div>
        <div class="ops-modal-footer">
          <span style="font-size: 11px; color:var(--text-muted);"><kbd>↑</kbd> <kbd>↓</kbd> — навигация, <kbd>Enter</kbd> — вставить</span>
        </div>
      </div>
    `;
    shadow.appendChild(overlay);
    activeSmartSearch = true;
    const input = overlay.querySelector('#smart-search-input');
    const resultsDiv = overlay.querySelector('#smart-search-results');
    let selectedIndex = -1;
    let currentTemplates = data.templates;
    function renderResults(filter = '') {
      const q = filter.toLowerCase().trim();
      const filtered = currentTemplates.filter(tpl => {
        if (q && !tpl.title.toLowerCase().includes(q) && !(tpl.tag && tpl.tag.toLowerCase().includes(q))) return false;
        return true;
      });
      resultsDiv.innerHTML = '';
      selectedIndex = -1;
      if (filtered.length === 0) {
        resultsDiv.innerHTML = '<div class="smart-search-empty">Ничего не найдено</div>';
        return;
      }
      filtered.forEach((tpl, idx) => {
        const div = document.createElement('div');
        div.className = 'smart-search-item';
        div.innerHTML = `<div class="smart-title">${escapeHtml(tpl.title)}</div>${tpl.tag ? `<div class="smart-tag">${escapeHtml(tpl.tag)}</div>` : ''}`;
        div.onclick = () => { selectTemplate(tpl); };
        resultsDiv.appendChild(div);
      });
      if (filtered.length > 0) selectItem(0);
    }
    function selectItem(idx) {
      const items = resultsDiv.querySelectorAll('.smart-search-item');
      if (items.length === 0) return;
      if (selectedIndex >= 0) items[selectedIndex].classList.remove('selected');
      selectedIndex = (idx + items.length) % items.length;
      items[selectedIndex].classList.add('selected');
      items[selectedIndex].scrollIntoView({ block: 'nearest' });
    }
    function selectTemplate(tpl) {
      insertFinalTextWithVariables(tpl.text, false);
      overlay.remove();
      activeSmartSearch = false;
    }
    input.oninput = () => renderResults(input.value);
    input.onkeydown = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); selectItem(selectedIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); selectItem(selectedIndex - 1); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const items = resultsDiv.querySelectorAll('.smart-search-item');
        if (selectedIndex >= 0 && items[selectedIndex]) {
          const idx = selectedIndex;
          const q = input.value.toLowerCase().trim();
          const filtered = currentTemplates.filter(tpl => !q || tpl.title.toLowerCase().includes(q) || (tpl.tag && tpl.tag.toLowerCase().includes(q)));
          if (filtered[idx]) selectTemplate(filtered[idx]);
        }
      } else if (e.key === 'Escape') { overlay.remove(); activeSmartSearch = false; }
    };
    renderResults('');
    overlay.querySelector('#smart-search-close').onclick = () => { overlay.remove(); activeSmartSearch = false; };
    input.focus();
  });
}
function initShortcodeWatcher() {
  let lastProcessedValue = '';
  document.body.addEventListener('input', (e) => {
    const target = e.target;
    if (!target || (target.tagName !== 'TEXTAREA' && !(target.tagName === 'INPUT' && target.type === 'text') && target.getAttribute('contenteditable') !== 'true')) return;
    const value = target.value || target.innerText;
    if (value === lastProcessedValue) return;
    lastProcessedValue = value;
    const words = value.split(/\s+/);
    const lastWord = words[words.length-1];
    if (lastWord && lastWord.startsWith('/')) {
      const shortcode = lastWord.slice(1);
      chrome.storage.sync.get({ templates: [] }, (data) => {
        const match = data.templates.find(t => t.title.toLowerCase() === shortcode.toLowerCase());
        if (match) {
          e.preventDefault();
          const newValue = value.replace(new RegExp(`${lastWord}$`), match.text);
          if (target.value !== undefined) setNativeValue(target, newValue);
          else if (target.innerText !== undefined) target.innerText = newValue;
          lastProcessedValue = newValue;
        }
      });
    }
  });
}
function initGlobalHotkeys() {
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.code === 'Space') {
      e.preventDefault();
      showSmartSearch();
    }
  });
}
function initAtMenu() {
  document.addEventListener('input', handleAtMenuInput);
  document.addEventListener('keydown', handleAtMenuKeydown);
  document.addEventListener('click', (e) => {
    if (atMenuActive && !e.target.closest('#ops-at-menu')) closeAtMenu();
  });
}
function handleAtMenuInput(e) {
  const target = e.target;
  if (!target) return;
  const isEditable = target.tagName === 'TEXTAREA' ||
                     (target.tagName === 'INPUT' && target.type === 'text') ||
                     target.getAttribute('contenteditable') === 'true';
  if (!isEditable) return;
  let value, cursorPos;
  if (target.value !== undefined) {
    value = target.value;
    cursorPos = target.selectionStart;
  } else {
    value = target.innerText;
    cursorPos = value.length;
  }
  let atPos = -1;
  for (let i = cursorPos - 1; i >= 0; i--) {
    if (value[i] === '@') {
      atPos = i;
      break;
    }
  }
  if (atPos !== -1) {
    const searchPart = value.substring(atPos + 1, cursorPos);
    if (!searchPart.includes(' ')) {
      if (!atMenuActive || atMenuTriggerPos !== atPos || atMenuSearchText !== searchPart) {
        atMenuTriggerPos = atPos;
        atMenuSearchText = searchPart;
        showAtMenu(target, atPos, searchPart);
      } else if (atMenuActive) {
        atMenuSearchText = searchPart;
        showAtMenu(target, atPos, searchPart);
      }
      return;
    }
  }
  if (atMenuActive) closeAtMenu();
}
function handleAtMenuKeydown(e) {
  if (!atMenuActive) return;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    selectAtMenuItem(atMenuSelectedIndex + 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    selectAtMenuItem(atMenuSelectedIndex - 1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    const items = document.querySelectorAll('#ops-at-menu .ops-at-item');
    if (atMenuSelectedIndex >= 0 && items[atMenuSelectedIndex]) {
      const tpl = atMenuTemplates[atMenuSelectedIndex];
      if (tpl) insertAtTemplate(tpl.text);
    }
    closeAtMenu();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeAtMenu();
  }
}
function showAtMenu(inputEl, startPos, searchText) {
  closeAtMenu();
  chrome.storage.sync.get({ templates: [], atMenuEnabled: true }, (data) => {
    if (!data.atMenuEnabled) return;
    const query = searchText.toLowerCase();
    let filtered = data.templates.filter(tpl =>
      tpl.title.toLowerCase().includes(query) ||
      (tpl.tag && tpl.tag.toLowerCase().includes(query))
    );
    if (filtered.length === 0) return;
    atMenuTemplates = filtered;
    atMenuInputElement = inputEl;
    atMenuActive = true;
    atMenuSelectedIndex = -1;
    const menuDiv = document.createElement('div');
    menuDiv.id = 'ops-at-menu';
    menuDiv.className = 'ops-at-menu';
    menuDiv.style.position = 'absolute';
    menuDiv.style.zIndex = '2147483647';
    menuDiv.style.backgroundColor = 'var(--bg-base)';
    menuDiv.style.border = '1px solid var(--border-med)';
    menuDiv.style.borderRadius = '8px';
    menuDiv.style.boxShadow = '0 4px 12px var(--shadow-color)';
    menuDiv.style.maxHeight = '250px';
    menuDiv.style.overflowY = 'auto';
    menuDiv.style.minWidth = '220px';
    menuDiv.style.fontSize = '13px';
    filtered.forEach((tpl, idx) => {
      const item = document.createElement('div');
      item.className = 'ops-at-item';
      item.innerHTML = `<strong>${escapeHtml(tpl.title)}</strong>${tpl.tag ? `<span class="ops-at-tag">${escapeHtml(tpl.tag)}</span>` : ''}`;
      item.dataset.index = idx;
      item.onclick = () => {
        insertAtTemplate(tpl.text);
        closeAtMenu();
      };
      menuDiv.appendChild(item);
    });
    document.body.appendChild(menuDiv);
    const rect = inputEl.getBoundingClientRect();
    const cursorPos = getCaretCoordinates(inputEl, startPos);
    let top = rect.top + cursorPos.top + window.scrollY + 20;
    let left = rect.left + cursorPos.left + window.scrollX;
    if (top + menuDiv.offsetHeight > window.innerHeight + window.scrollY) {
      top = rect.top + cursorPos.top + window.scrollY - menuDiv.offsetHeight - 5;
    }
    menuDiv.style.top = `${top}px`;
    menuDiv.style.left = `${left}px`;
    if (filtered.length) selectAtMenuItem(0);
  });
}
function selectAtMenuItem(index) {
  const items = document.querySelectorAll('#ops-at-menu .ops-at-item');
  if (!items.length) return;
  if (atMenuSelectedIndex >= 0) items[atMenuSelectedIndex].classList.remove('selected');
  atMenuSelectedIndex = (index + items.length) % items.length;
  items[atMenuSelectedIndex].classList.add('selected');
  items[atMenuSelectedIndex].scrollIntoView({ block: 'nearest' });
}
function insertAtTemplate(text) {
  if (!atMenuInputElement) return;
  const currentValue = atMenuInputElement.value || atMenuInputElement.innerText;
  const before = currentValue.substring(0, atMenuTriggerPos);
  const after = currentValue.substring(atMenuTriggerPos + 1 + atMenuSearchText.length);
  const newValue = before + text + after;
  setNativeValue(atMenuInputElement, newValue);
  const newCursorPos = before.length + text.length;
  if (atMenuInputElement.setSelectionRange) {
    atMenuInputElement.setSelectionRange(newCursorPos, newCursorPos);
  }
  atMenuInputElement.focus();
}
function closeAtMenu() {
  const menu = document.getElementById('ops-at-menu');
  if (menu) menu.remove();
  atMenuActive = false;
  atMenuSelectedIndex = -1;
  atMenuTemplates = [];
  atMenuInputElement = null;
  atMenuTriggerPos = -1;
  atMenuSearchText = '';
}
function getCaretCoordinates(element, position) {
  const div = document.createElement('div');
  const style = div.style;
  style.position = 'absolute';
  style.visibility = 'hidden';
  style.whiteSpace = 'pre-wrap';
  style.wordBreak = 'break-word';
  const computed = window.getComputedStyle(element);
  style.font = computed.font;
  style.fontSize = computed.fontSize;
  style.fontFamily = computed.fontFamily;
  style.fontWeight = computed.fontWeight;
  style.lineHeight = computed.lineHeight;
  style.paddingLeft = computed.paddingLeft;
  style.paddingTop = computed.paddingTop;
  style.paddingRight = computed.paddingRight;
  style.paddingBottom = computed.paddingBottom;
  style.borderLeft = computed.borderLeft;
  style.borderTop = computed.borderTop;
  style.borderRight = computed.borderRight;
  style.borderBottom = computed.borderBottom;
  style.boxSizing = computed.boxSizing;
  div.textContent = element.value.substring(0, position);
  document.body.appendChild(div);
  const rect = div.getBoundingClientRect();
  const coords = { top: rect.height, left: rect.width };
  document.body.removeChild(div);
  return coords;
}
function initDragAndDropGrid(shadow) {
  const gridContainer = shadow.getElementById('ops-sticky-grid');
  if (!gridContainer) return;
  if (sortableInstance) sortableInstance.destroy();
  if (typeof Sortable === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js';
    script.onload = () => initDragAndDropGrid(shadow);
    document.head.appendChild(script);
    return;
  }
  sortableInstance = new Sortable(gridContainer, {
    animation: 150,
    onEnd: function() {
      const cards = Array.from(gridContainer.children);
      const newOrder = cards.map(card => card.getAttribute('data-title')).filter(Boolean);
      chrome.storage.sync.get({ templates: [] }, (data) => {
        const templates = data.templates;
        const reordered = [];
        for (const title of newOrder) {
          const found = templates.find(t => t.title === title);
          if (found) reordered.push(found);
        }
        templates.forEach(t => {
          if (!reordered.some(r => r.title === t.title)) reordered.push(t);
        });
        chrome.storage.sync.set({ templates: reordered });
      });
    }
  });
}
function initNewFeatures() {
  initShortcodeWatcher();
  initGlobalHotkeys();
  initAtMenu();
  const style = document.createElement('style');
  style.textContent = `
    .ops-at-menu { padding: 4px 0; }
    .ops-at-item { padding: 6px 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-soft); }
    .ops-at-item.selected { background: var(--bg-hover); }
    .ops-at-tag { font-size: 10px; background: var(--border-soft); padding: 2px 6px; border-radius: 4px; margin-left: 8px; }
    .theme-switch { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
    .theme-switch input { display: none; }
    .theme-switch .slider { width: 40px; height: 20px; background: var(--border-med); border-radius: 20px; position: relative; transition: 0.2s; display: inline-block; }
    .theme-switch .slider:before { content: ""; position: absolute; width: 16px; height: 16px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: 0.2s; }
    .theme-switch input:checked + .slider { background: #f59e0b; }
    .theme-switch input:checked + .slider:before { transform: translateX(20px); }
    .ops-sticky-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); align-items: start; }
  `;
  document.head.appendChild(style);
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initFloatingOverlay();
    initNewFeatures();
  });
} else {
  initFloatingOverlay();
  initNewFeatures();
}