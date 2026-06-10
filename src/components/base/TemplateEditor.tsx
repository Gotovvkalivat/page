import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { X, Save } from 'lucide-react'
import type { Template } from '@/types'

interface TemplateEditorProps {
  template: Template | null
  isNew: boolean
  onSave: (data: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void
  onCancel: () => void
  allTags: string[]
}

export function TemplateEditor({
  template,
  isNew,
  onSave,
  onCancel,
  allTags,
}: TemplateEditorProps) {
  const [title, setTitle] = React.useState(template?.title || '')
  const [text, setText] = React.useState(template?.text || '')
  const [tag, setTag] = React.useState(template?.tag || '')
  const [showTagDropdown, setShowTagDropdown] = React.useState(false)

  const titleRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (isNew || template) {
      setTitle(template?.title || '')
      setText(template?.text || '')
      setTag(template?.tag || '')
      setTimeout(() => titleRef.current?.focus(), 100)
    }
  }, [template, isNew])

  if (!isNew && !template) {
    return (
      <div className="text-center text-muted-foreground text-xs py-6">
        Выберите шаблон для редактирования или создайте новый
      </div>
    )
  }

  const handleSubmit = () => {
    if (!title.trim() || !text.trim()) {
      alert('Заполните название и текст шаблона')
      return
    }
    onSave({
      title: title.trim(),
      text: text.trim(),
      tag: tag.trim() || null,
      favorite: template?.favorite || false,
    })
  }

  const filteredTags = allTags.filter((t) =>
    t.toLowerCase().includes(tag.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {isNew ? 'Новый шаблон' : 'Редактирование'}
        </h3>
        {template && (
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onCancel}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <Input
            ref={titleRef}
            placeholder="Название ответа..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
            className="text-sm"
          />
          <div className="text-[10px] text-muted-foreground text-right mt-0.5">
            {50 - title.length} симв.
          </div>
        </div>

        <div className="relative">
          <Input
            placeholder="Категория / Тег..."
            value={tag}
            onChange={(e) => {
              setTag(e.target.value)
              setShowTagDropdown(true)
            }}
            onFocus={() => setShowTagDropdown(true)}
            onBlur={() => setTimeout(() => setShowTagDropdown(false), 200)}
            className="text-sm"
          />
          {showTagDropdown && filteredTags.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg max-h-[120px] overflow-y-auto z-10">
              {filteredTags.map((t) => (
                <button
                  key={t}
                  className="w-full text-left px-2 py-1.5 text-xs hover:bg-muted"
                  onMouseDown={() => {
                    setTag(t)
                    setShowTagDropdown(false)
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <Textarea
          placeholder="Текст шаблона..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="text-sm resize-none"
        />

        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={handleSubmit}>
            <Save className="h-3 w-3 mr-1" />
            {isNew ? 'Создать' : 'Сохранить'}
          </Button>
          {template && (
            <Button size="sm" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
        </div>
      </div>

      <div className="h-px bg-border my-2" />
    </div>
  )
}
