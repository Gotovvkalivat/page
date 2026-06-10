import React from 'react'
import { Button } from '@/components/ui/button'
import { Eraser, Database } from 'lucide-react'
import type { Template } from '@/types'

interface CRMConfig {
  textarea: () => HTMLTextAreaElement | HTMLInputElement | null
  sendBtn: () => HTMLButtonElement | null
}

const DEFAULT_CRMS: Record<string, CRMConfig> = {
  'opspost.ru': {
    textarea: () => document.querySelector('.chat__footer textarea[data-ng-model]'),
    sendBtn: () => document.querySelector('.chat__footer button.btn-orange'),
  },
  'kdiscont.ru': {
    textarea: () => document.querySelector('form.styles-form__Dx4LY textarea[name="message"]'),
    sendBtn: () => document.querySelector('form.styles-form__Dx4LY button[type="submit"]'),
  },
  'm1express.ru': {
    textarea: () => document.querySelector('textarea'),
    sendBtn: () => document.querySelector('button.btn-primary'),
  },
}

function getCRMConfig(): CRMConfig | null {
  const host = window.location.hostname
  // Check for custom bindings from storage
  const bindingsStr = localStorage.getItem('opspost-bindings')
  const bindings = bindingsStr ? JSON.parse(bindingsStr) : {}

  if (bindings[host]) {
    return {
      textarea: () => document.querySelector(bindings[host].textareaSelector),
      sendBtn: bindings[host].sendBtnSelector
        ? () => document.querySelector(bindings[host].sendBtnSelector)
        : () => null,
    }
  }

  for (const [domain, config] of Object.entries(DEFAULT_CRMS)) {
    if (host.includes(domain)) {
      return config
    }
  }

  return null
}

function setNativeValue(element: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const isTextArea = element.tagName === 'TEXTAREA'
  const proto = isTextArea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  const currentVal = element.value

  if (valueSetter) valueSetter.call(element, value)
  else element.value = value

  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

export function FloatingPanel() {
  const [visible, setVisible] = React.useState(false)
  const [favorites, setFavorites] = React.useState<Template[]>([])
  const [position, setPosition] = React.useState({ top: 0, left: 0, width: 300 })
  const [crm, setCrm] = React.useState<CRMConfig | null>(null)

  React.useEffect(() => {
    // Load favorites from storage
    const loadFavorites = () => {
      const data = localStorage.getItem('opspost-storage')
      if (data) {
        try {
          const parsed = JSON.parse(data)
          const templates = parsed.state?.templates || []
          setFavorites(templates.filter((t: Template) => t.favorite))
        } catch {}
      }
    }

    loadFavorites()
    setCrm(getCRMConfig())

    // Update on storage changes
    window.addEventListener('storage', loadFavorites)

    return () => window.removeEventListener('storage', loadFavorites)
  }, [])

  React.useEffect(() => {
    if (!crm) return

    const checkFocus = () => {
      const textarea = crm.textarea()
      if (!textarea) return

      const isFocused = document.activeElement === textarea || textarea.contains(document.activeElement)

      if (isFocused) {
        const rect = textarea.getBoundingClientRect()
        setPosition({
          top: rect.top - 75,
          left: rect.left,
          width: rect.width,
        })
        setVisible(true)
      } else {
        setTimeout(() => {
          const panel = document.getElementById('opspost-floating-panel')
          if (panel && !panel.matches(':hover')) {
            setVisible(false)
          }
        }, 150)
      }
    }

    document.addEventListener('focusin', checkFocus)
    document.addEventListener('focusout', checkFocus)

    const interval = setInterval(checkFocus, 1000)

    return () => {
      document.removeEventListener('focusin', checkFocus)
      document.removeEventListener('focusout', checkFocus)
      clearInterval(interval)
    }
  }, [crm])

  if (!visible || !crm) return null

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const textarea = crm.textarea()
    if (textarea) {
      setNativeValue(textarea as HTMLTextAreaElement, '')
      textarea.focus()
    }
  }

  const handleOpenBase = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('opspost-open-base'))
  }

  const handleInsert = (template: Template) => {
    const textarea = crm.textarea()
    if (!textarea) return

    // Handle variables
    let text = template.text
    const varMatches = text.match(/\{\{([^}]+)\}\}/g)
    if (varMatches && varMatches.length > 0) {
      for (const match of varMatches) {
        const varName = match.slice(2, -2).trim()
        if (varName.toLowerCase() === 'date') continue
        const userValue = prompt(`Введите значение для "${varName}":`, '')
        if (userValue === null) return
        text = text.replace(new RegExp(match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), userValue)
      }
    }

    // Replace date
    const now = new Date()
    const formatted = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()}`
    text = text.replace(/\{\{date\}\}/gi, formatted)

    const currentVal = textarea.value || ''
    const start = textarea.selectionStart || 0
    const end = textarea.selectionEnd || 0
    const newVal = currentVal.substring(0, start) + text + currentVal.substring(end)

    setNativeValue(textarea as HTMLTextAreaElement, newVal)
  }

  return (
    <div
      id="opspost-floating-panel"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        width: position.width,
        zIndex: 2147483640,
      }}
      className="bg-background border rounded-lg shadow-lg p-2"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
          Быстрые ответы
        </span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={handleClear}>
            <Eraser className="h-3 w-3 mr-1" />
            Очистить
          </Button>
          <Button size="sm" variant="default" className="h-6 text-xs" onClick={handleOpenBase}>
            <Database className="h-3 w-3 mr-1" />
            База
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        {favorites.length === 0 ? (
          <span className="text-[10px] text-muted-foreground italic">
            Нет избранных шаблонов
          </span>
        ) : (
          favorites.map((tpl) => (
            <Button
              key={tpl.id}
              size="sm"
              variant="outline"
              className="h-6 text-[10px]"
              onClick={() => handleInsert(tpl)}
            >
              {tpl.title}
            </Button>
          ))
        )}
      </div>
    </div>
  )
}
