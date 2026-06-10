// Background Service Worker for OpsPost Knowledge Assistant
// Handles context menu, Google Drive sync, and cross-tab messaging

// Initialize context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ops-templates-parent',
      title: 'OpsPost Шаблоны',
      contexts: ['editable'],
    })
    updateContextMenu()
  })
})

// Update context menu with current templates
async function updateContextMenu() {
  const data = await chrome.storage.sync.get({ templates: [] })

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'ops-templates-parent',
      title: 'OpsPost Шаблоны',
      contexts: ['editable'],
    })

    data.templates.slice(0, 10).forEach((tpl: any, idx: number) => {
      chrome.contextMenus.create({
        id: `ops-template-${idx}`,
        parentId: 'ops-templates-parent',
        title: tpl.title.length > 50 ? tpl.title.slice(0, 47) + '...' : tpl.title,
        contexts: ['editable'],
      })
    })

    if (data.templates.length > 10) {
      chrome.contextMenus.create({
        id: 'ops-more-templates',
        parentId: 'ops-templates-parent',
        title: 'Ещё... (откройте базу)',
        contexts: ['editable'],
      })
    }
  })
}

// Listen for storage changes to update context menu
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.templates) {
    updateContextMenu()
  }
})

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return

  if (info.menuItemId === 'ops-more-templates') {
    chrome.tabs.create({ url: chrome.runtime.getURL('base.html') })
    return
  }

  if (typeof info.menuItemId === 'string' && info.menuItemId.startsWith('ops-template-')) {
    const idx = parseInt(info.menuItemId.split('-')[2])
    chrome.storage.sync.get({ templates: [] }, (data) => {
      const tpl = data.templates[idx]
      if (tpl) {
        chrome.tabs.sendMessage(tab.id!, {
          type: 'INSERT_TEMPLATE',
          template: tpl,
        })
      }
    })
  }
})

// Find file in Google Drive
async function findDriveFile(token: string): Promise<{ id: string } | null> {
  try {
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=name%3D%27opspost_templates_backup.json%27+and+trashed%3Dfalse',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )
    const result = await response.json()
    return result.files?.length > 0 ? result.files[0] : null
  } catch {
    return null
  }
}

// Handle messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  // Save to Google Drive
  if (request.type === 'SAVE_TO_DRIVE') {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ success: false, error: 'Ошибка авторизации Google' })
        return
      }

      try {
        const existingFile = await findDriveFile(token)
        const metadata = { name: 'opspost_templates_backup.json', mimeType: 'application/json' }

        let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart'
        let method = 'POST'

        if (existingFile) {
          url = `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart`
          method = 'PATCH'
        }

        const boundary = 'foo_bar_baz'
        const delimiter = `\r\n--${boundary}\r\n`
        const closeDelimiter = `\r\n--${boundary}--`
        const body =
          delimiter +
          'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(request.templates) +
          closeDelimiter

        const res = await fetch(url, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
          body,
        })

        sendResponse({ success: res.ok })
      } catch (err: any) {
        sendResponse({ success: false, error: err.message })
      }
    })

    return true // Keep channel open for async response
  }

  // Load from Google Drive
  if (request.type === 'LOAD_FROM_DRIVE') {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError || !token) {
        sendResponse({ success: false, error: 'Ошибка авторизации Google' })
        return
      }

      try {
        const existingFile = await findDriveFile(token)
        if (!existingFile) {
          sendResponse({ success: false, error: 'Бэкап не найден' })
          return
        }

        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${existingFile.id}?alt=media`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )

        const templates = await res.json()
        sendResponse({ success: true, templates })
      } catch (err: any) {
        sendResponse({ success: false, error: err.message })
      }
    })

    return true
  }

  // Insert text to active tab
  if (request.type === 'INSERT_TO_ACTIVE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (text: string) => {
          const el = document.activeElement as HTMLTextAreaElement | HTMLInputElement
          if (
            el &&
            (el.tagName === 'TEXTAREA' ||
              (el.tagName === 'INPUT' && el.type === 'text') ||
              el.getAttribute('contenteditable') === 'true')
          ) {
            el.focus()
            const start = el.selectionStart || 0
            const end = el.selectionEnd || 0
            const currentVal = el.value || ''
            const newVal = currentVal.substring(0, start) + text + currentVal.substring(end)

            const proto =
              el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
            const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
            if (valueSetter) valueSetter.call(el, newVal)
            else el.value = newVal

            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          } else {
            alert('Пожалуйста, выберите поле ввода перед вставкой.')
          }
        },
        args: [request.text],
      })
    })

    return true
  }

  return false
})

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  if (command === 'open-search') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) return

      chrome.tabs.sendMessage(tabs[0].id, { type: 'OPEN_SMART_SEARCH' })
    })
  }
})
