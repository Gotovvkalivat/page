import React from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function BindingsList() {
  const bindings = useAppStore((state) => state.bindings)
  const deleteBinding = useAppStore((state) => state.deleteBinding)

  if (bindings.length === 0) {
    return (
      <div className="text-center text-muted-foreground text-xs py-3">
        Нет пользовательских привязок
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-[100px] overflow-y-auto">
      {bindings.map((binding) => (
        <div
          key={binding.id}
          className="flex items-center justify-between bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded px-2 py-1.5"
        >
          <span className="text-xs text-red-700 dark:text-red-300 truncate max-w-[200px]">
            {binding.domain}
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-5 w-5 text-red-500 hover:text-red-700"
            onClick={() => deleteBinding(binding.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  )
}
