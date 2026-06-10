import React from 'react'
import { cn } from '@/lib/utils'
import type { Template } from '@/types'

export function AtMenu() {
  const [active, setActive] = React.useState(false)
  const [templates, setTemplates] = React.useState<Template[]>([])
  const [filtered, setFiltered] = React.useState<Template[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const [inputElement, setInputElement] = React.useState<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const [triggerPos, setTriggerPos] = React.useState(-1)
  const [searchText, setSearchText] = React.useState('')
  const [position, setPosition] = React.useState({ top: 0, left: 0 })
  const [enabled, setEnabled] = React.useState(true)

  React.useEffect(() => {
    // Load templates and settings
    const loadData = () => {
      const data = localStorage.getItem('opspost-storage')
      if (data) {
        try {
          const parsed = JSON.parse(data)
          setTemplates(parsed.state?.templates || [])
          setEnabled(parsed.state?.settings?.atMenuEnabled ?? true)
        } catch {}
      }
    }

    loadData()

    // Handle input
    const handleInput = (e: InputEvent) => {
      if (!enabled) return

      const target = e.target as HTMLElement
      if (!target) return

      const isEditable =
        target.tagName === 'TEXTAREA' ||
        (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text') ||
        target.getAttribute('contenteditable') === 'true'

      if (!isEditable) return

      const input = target as HTMLInputElement | HTMLTextAreaElement
      const value = input.value || ''
      const cursorPos = input.selectionStart || 0

      // Find @ symbol before cursor
      let atPos = -1
      for (let i = cursorPos - 1; i >= 0; i--) {
        if (value[i] === '@') {
          atPos = i
          break
        }
        if (value[i] === ' ') break
      }

      if (atPos !== -1) {
        const search = value.substring(atPos + 1, cursorPos)
        const matching = templates.filter(
          (t) =>
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            (t.tag && t.tag.toLowerCase().includes(search.toLowerCase()))
        )

        if (matching.length > 0) {
          setInputElement(input)
          setTriggerPos(atPos)
          setSearchText(search)
          setFiltered(matching)
          setSelectedIndex(0)
          setActive(true)

          // Calculate position
          const rect = input.getBoundingClientRect()
          const coords = getCaretCoordinates(input, atPos)
          setPosition({
            top: rect.top + coords.top + window.scrollY + 20,
            left: rect.left + coords.left + window.scrollX,
          })
        } else {
          setActive(false)
        }
      } else {
        setActive(false)
      }
    }

    const handleKeydown = (e: KeyboardEvent) => {
      if (!active) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[selectedIndex]) {
          insertTemplate(filtered[selectedIndex])
        }
        setActive(false)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setActive(false)
      }
    }

    document.addEventListener('input', handleInput as EventListener)
    document.addEventListener('keydown', handleKeydown)

    return () => {
      document.removeEventListener('input', handleInput as EventListener)
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [enabled, templates, active, filtered, selectedIndex])

  const insertTemplate = (template: Template) => {
    if (!inputElement) return

    const value = inputElement.value
    const before = value.substring(0, triggerPos)
    const after = value.substring(triggerPos + 1 + searchText.length)
    const newValue = before + template.text + after

    // Set value using native setter
    const isTextArea = inputElement.tagName === 'TEXTAREA'
    const proto = isTextArea ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (valueSetter) valueSetter.call(inputElement, newValue)
    else inputElement.value = newValue

    inputElement.dispatchEvent(new Event('input', { bubbles: true }))
    inputElement.dispatchEvent(new Event('change', { bubbles: true }))

    // Set cursor position
    const newCursorPos = before.length + template.text.length
    if (inputElement.setSelectionRange) {
      inputElement.setSelectionRange(newCursorPos, newCursorPos)
    }

    inputElement.focus()
    setActive(false)
  }

  if (!active || !enabled) return null

  return (
    <div
      className="fixed bg-background border rounded-lg shadow-lg max-h-[250px] overflow-y-auto min-w-[220px] z-[2147483647]"
      style={{ top: position.top, left: position.left }}
    >
      {filtered.map((template, idx) => (
        <div
          key={template.id}
          className={cn(
            'flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs border-b last:border-b-0',
            idx === selectedIndex ? 'bg-muted' : 'hover:bg-muted'
          )}
          onClick={() => insertTemplate(template)}
        >
          <span className="font-medium">{template.title}</span>
          {template.tag && (
            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-2">
              {template.tag}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

function getCaretCoordinates(element: HTMLInputElement | HTMLTextAreaElement, position: number) {
  const div = document.createElement('div')
  const style = div.style

  style.position = 'absolute'
  style.visibility = 'hidden'
  style.whiteSpace = 'pre-wrap'
  style.wordBreak = 'break-word'

  const computed = window.getComputedStyle(element)
  style.font = computed.font
  style.fontSize = computed.fontSize
  style.fontFamily = computed.fontFamily
  style.fontWeight = computed.fontWeight
  style.lineHeight = computed.lineHeight
  style.paddingLeft = computed.paddingLeft
  style.paddingTop = computed.paddingTop
  style.paddingRight = computed.paddingRight
  style.paddingBottom = computed.paddingBottom
  style.borderLeft = computed.borderLeft
  style.borderTop = computed.borderTop
  style.borderRight = computed.borderRight
  style.borderBottom = computed.borderBottom
  style.boxSizing = computed.boxSizing

  div.textContent = element.value.substring(0, position)
  document.body.appendChild(div)

  const rect = div.getBoundingClientRect()
  const coords = { top: rect.height, left: rect.width }

  document.body.removeChild(div)

  return coords
}
