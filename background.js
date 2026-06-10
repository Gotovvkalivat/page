// Инициализация контекстного меню
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "ops-templates-parent",
      title: "OpsPost Шаблоны",
      contexts: ["editable"]
    });
    updateContextMenu();
  });
});

function updateContextMenu() {
  chrome.storage.sync.get({ templates: [] }, (data) => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "ops-templates-parent",
        title: "OpsPost Шаблоны",
        contexts: ["editable"]
      });
      data.templates.slice(0, 10).forEach((tpl, idx) => {
        chrome.contextMenus.create({
          id: `ops-template-${idx}`,
          parentId: "ops-templates-parent",
          title: tpl.title.length > 50 ? tpl.title.slice(0,47)+'...' : tpl.title,
          contexts: ["editable"]
        });
      });
      if (data.templates.length > 10) {
        chrome.contextMenus.create({
          id: "ops-more-templates",
          parentId: "ops-templates-parent",
          title: "Ещё... (откройте базу)",
          contexts: ["editable"]
        });
      }
    });
  });
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ops-more-templates") {
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_MEGA_MODAL" });
    return;
  }
  if (info.menuItemId.startsWith("ops-template-")) {
    const idx = parseInt(info.menuItemId.split('-')[2]);
    chrome.storage.sync.get({ templates: [] }, (data) => {
      const tpl = data.templates[idx];
      if (tpl) {
        chrome.tabs.sendMessage(tab.id, { type: "INSERT_TEMPLATE", template: tpl });
      }
    });
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.templates) updateContextMenu();
});

async function findDriveFile(token) {
  try {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=name%3D%27opspost_templates_backup.json%27+and+trashed%3Dfalse', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const result = await response.json();
    return result.files && result.files.length > 0 ? result.files[0] : null;
  } catch (e) {
    return null;
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SAVE_TO_DRIVE") {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) { 
        sendResponse({ success: false, error: "Ошибка авторизации Google" }); 
        return; 
      }
      findDriveFile(token).then(existingFile => {
        const metadata = { name: 'opspost_templates_backup.json', mimeType: 'application/json' };
        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
        let method = 'POST';
        if (existingFile) {
          url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`;
          method = 'PATCH';
        }
        const boundary = 'foo_bar_baz';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;
        const multipartRequestBody = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(request.templates) + closeDelimiter;

        return fetch(url, {
          method: method, 
          headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, 
          body: multipartRequestBody
        });
      })
      .then(res => sendResponse({ success: res && res.ok }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true; 
  }

  if (request.type === "LOAD_FROM_DRIVE") {
    chrome.identity.getAuthToken({ interactive: true }, function(token) {
      if (chrome.runtime.lastError || !token) { 
        sendResponse({ success: false, error: "Ошибка авторизации Google" }); 
        return; 
      }
      findDriveFile(token).then(existingFile => {
        if (!existingFile) { 
          sendResponse({ success: false, error: "Бэкап не найден" }); 
          return; 
        }
        return fetch(`https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      })
      .then(res => res ? res.json() : null)
      .then(templates => {
        if (templates) sendResponse({ success: true, templates });
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    });
    return true;
  }

  if (request.type === "INSERT_TO_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (textToInsert) => {
          const el = document.activeElement;
          if (el && (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && el.type === "text") || el.getAttribute('contenteditable') === 'true')) {
            el.focus();
            const start = el.selectionStart || 0;
            const end = el.selectionEnd || 0;
            const currentVal = el.value || "";
            const newVal = currentVal.substring(0, start) + textToInsert + currentVal.substring(end);
            
            const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
            const valueSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
            if (valueSetter) valueSetter.call(el, newVal);
            else el.value = newVal;
            
            if (el._valueTracker) el._valueTracker.setValue(currentVal);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          } else {
            window.dispatchEvent(new CustomEvent('ops-alert-trigger', { detail: "Пожалуйста, выберите поле ввода перед вставкой." }));
          }
        },
        args: [request.text]
      });
    });
  }
});