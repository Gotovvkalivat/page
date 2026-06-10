import React from 'react'
import { Button } from '@/components/ui/button'
import { Crosshair, X } from 'lucide-react'

interface BindingOverlayProps {
  onComplete: () => void
}

export function BindingOverlay({ onComplete }: BindingOverlayProps) {
  const [phase, setPhase] = React.useState<'textarea' | 'sendBtn'>('textarea')
  const [textareaSelector, setTextareaSelector] = React.useState<string | null>(null)
  const [highlightElement, setHighlightElement] = React.useState<DOMRect | null>(null)

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const path = e.composedPath()
      const target = path.find(
        (el) =>
          (el as Element).tagName === 'TEXTAREA' ||
          ((el as Element).tagName === 'INPUT' && (el as HTMLInputElement).type === 'text') ||
          (el as Element).getAttribute?.('contenteditable') === 'true'
      )

      if (target) {
        setHighlightElement((target as Element).getBoundingClientRect())
      } else {
        setHighlightElement(null)
      }
    }

    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const path = e.composedPath()

      if (phase === 'textarea') {
        const textarea = path.find(
          (el) =>
            (el as Element).tagName === 'TEXTAREA' ||
            ((el as Element).tagName === 'INPUT' && (el as HTMLInputElement).type === 'text') ||
            (el as Element).getAttribute?.('contenteditable') === 'true'
        )

        if (textarea) {
          const selector = buildSelector(textarea as Element)
          setTextareaSelector(selector)
          setPhase('sendBtn')
        }
      } else {
        const btn = path.find(
          (el) =>
            (el as Element).tagName === 'BUTTON' ||
            (el as Element).tagName === 'A' ||
            ((el as Element).tagName === 'INPUT' && ['submit', 'button'].includes((el as HTMLInputElement).type))
        )

        saveBinding(btn ? buildSelector(btn as Element) : null)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onComplete()
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('click', handleClick, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [phase, onComplete])

  const buildSelector = (el: Element): string => {
    if (el.id) return `#${CSS.escape(el.id)}`

    const path: string[] = []
    let current: Element | null = el

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let selector = current.tagName.toLowerCase()

      if (current.className && typeof current.className === 'string') {
        const classes = Array.from(current.classList)
          .filter((c) => !c.startsWith('ops-'))
          .map((c) => `.${CSS.escape(c)}`)
          .join('')
        if (classes) selector += classes
      }

      let sibling: Element | null = current
      let nth = 1
      while ((sibling = sibling.previousElementSibling)) {
        if (sibling.tagName === current.tagName) nth++
      }
      selector += `:nth-of-type(${nth})`

      path.unshift(selector)
      current = current.parentElement

      if (current?.tagName === 'BODY') break
    }

    return path.join(' > ')
  }

  const saveBinding = (btnSelector: string | null) => {
    if (!textareaSelector) return

    const host = window.location.hostname
    const data = localStorage.getItem('opspost-bindings')
    const bindings = data ? JSON.parse(data) : {}

    bindings[host] = {
      textareaSelector,
      sendBtnSelector: btnSelector,
    }

    localStorage.setItem('opspost-bindings', JSON.stringify(bindings))

    // Also save to chrome storage if available
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.sync.get({ customBindings: {} }, (result) => {
        chrome.storage.sync.set({
          customBindings: {
            ...result.customBindings,
            [host]: {
              textarea: textareaSelector,
              sendBtn: btnSelector,
            },
          },
        })
      })
    }

    window.alert('Привязка успешно зарегистрирована!')
    onComplete()
  }

  return (
    <div
      className="fixed inset-0 z-[2147483645] pointer-events-none"
      style={{ background: 'rgba(15, 23, 42, 0.15)' }}
    >
      {/* Top bar */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-3 pointer-events-auto">
        <Crosshair className="h-4 w-4" />
        <span>
          {phase === 'textarea'
            ? 'Кликните по полю ввода'
            : 'Кликните по кнопке отправки (или нажмите Esc чтобы пропустить)'}
        </span>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 text-white hover:bg-slate-700"
          onClick={onComplete}
        >
          <X className="h-3 w-3 mr-1" />
          Выход
        </Button>
      </div>

      {/* Highlighter */}
      {highlightElement && (
        <div
          className="fixed pointer-events-none border-2 border-dashed border-primary bg-primary/20"
          style={{
            top: highlightElement.top,
            left: highlightElement.left,
            width: highlightElement.width,
            height: highlightElement.height,
            boxShadow: '0 0 0 4000px rgba(0, 0, 0, 0.2)',
          }}
        />
      )}
    </div>
  )
}
