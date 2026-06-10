import React from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink } from 'lucide-react'

export function BindingsPanel() {
  const bindings = useAppStore((state) => state.bindings)
  const deleteBinding = useAppStore((state) => state.deleteBinding)

  if (bindings.length === 0) {
    return (
      <details className="group">
        <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer flex items-center gap-2 hover:text-foreground">
          <ExternalLink className="h-3 w-3" />
          Привязанные сайты
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-auto">
            {bindings.length}
          </span>
        </summary>
        <div className="mt-3 text-center text-muted-foreground text-xs py-2">
          Нет привязок
        </div>
      </details>
    )
  }

  return (
    <details className="group" open>
      <summary className="text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer flex items-center gap-2 hover:text-foreground">
        <ExternalLink className="h-3 w-3" />
        Привязанные сайты
        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded ml-auto">
          {bindings.length}
        </span>
      </summary>
      <div className="mt-3 flex flex-col gap-1 max-h-[150px] overflow-y-auto">
        {bindings.map((binding) => (
          <div
            key={binding.id}
            className="flex items-center justify-between bg-muted/50 rounded px-2 py-1.5"
          >
            <span className="text-xs truncate max-w-[200px]" title={binding.domain}>
              {binding.domain}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="h-5 w-5 text-destructive hover:text-destructive"
              onClick={() => deleteBinding(binding.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </details>
  )
}
