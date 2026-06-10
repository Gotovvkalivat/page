import React from 'react'
import { useAppStore } from '@/store'
import { Badge } from '@/components/ui/badge'
import type { Template } from '@/types'

interface TemplateListProps {
  searchQuery: string
}

export function TemplateList({ searchQuery }: TemplateListProps) {
  const templates = useAppStore((state) => state.templates)

  const filtered = React.useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return templates.filter(t => {
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.text.toLowerCase().includes(q) ||
        (t.tag && t.tag.toLowerCase().includes(q))
      )
    })
  }, [templates, searchQuery])

  if (templates.length === 0) {
    return <div className="text-center text-muted-foreground text-xs py-6">База шаблонов пуста</div>
  }

  if (filtered.length === 0) {
    return <div className="text-center text-muted-foreground text-xs py-6">Ничего не найдено</div>
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-[200px] overflow-y-auto">
      {filtered.map((template) => (
        <TemplateItem key={template.id} template={template} />
      ))}
    </div>
  )
}

function TemplateItem({ template }: { template: Template }) {
  const handleClick = () => {
    chrome.runtime.sendMessage({
      type: 'INSERT_TO_ACTIVE_TAB',
      text: template.text
    })
    window.close()
  }

  return (
    <button
      onClick={handleClick}
      className="flex flex-col gap-0.5 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors text-left"
    >
      <span className="text-xs font-medium truncate">{template.title}</span>
      {template.tag && (
        <Badge variant="secondary" className="w-fit text-[10px] py-0">
          {template.tag}
        </Badge>
      )}
    </button>
  )
}
