import React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Star, Pencil, Trash2, Copy } from 'lucide-react'
import type { Template } from '@/types'

interface TemplateCardProps {
  template: Template
  onEdit: () => void
  onDelete: () => void
  onToggleFavorite: () => void
  onCopy: () => void
}

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onToggleFavorite,
  onCopy,
}: TemplateCardProps) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div
      className={cn(
        'relative flex flex-col p-3 rounded-lg border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        template.favorite
          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
      )}
    >
      {/* Actions */}
      <div className="flex justify-end gap-1 mb-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onCopy()
          }}
        >
          <Copy className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className={cn('h-6 w-6', template.favorite && 'text-amber-500')}
          onClick={(e) => {
            e.stopPropagation()
            onToggleFavorite()
          }}
        >
          <Star className={cn('h-3 w-3', template.favorite && 'fill-current')} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-hidden"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="font-semibold text-sm mb-1 truncate">{template.title}</div>
        {template.tag && (
          <Badge variant="secondary" className="text-[10px] py-0 mb-2">
            {template.tag}
          </Badge>
        )}
        <div
          className={cn(
            'text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed',
            expanded ? 'overflow-y-auto max-h-[200px]' : 'line-clamp-4'
          )}
        >
          {template.text}
        </div>
      </div>
    </div>
  )
}
