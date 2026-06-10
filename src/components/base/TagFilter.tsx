import React from 'react'
import { Button } from '@/components/ui/button'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagFilterProps {
  tags: string[]
  selected: string[]
  onChange: (tags: string[]) => void
}

export function TagFilter({ tags, selected, onChange }: TagFilterProps) {
  const [open, setOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  if (tags.length === 0) return null

  return (
    <div ref={dropdownRef} className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setOpen(!open)}
      >
        Теги
        {selected.length > 0 && (
          <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg min-w-[180px] max-h-[200px] overflow-y-auto z-50">
          {tags.map((tag) => (
            <button
              key={tag}
              className={cn(
                'w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-muted',
                selected.includes(tag) && 'bg-muted'
              )}
              onClick={() => {
                if (selected.includes(tag)) {
                  onChange(selected.filter((t) => t !== tag))
                } else {
                  onChange([...selected, tag])
                }
              }}
            >
              <div
                className={cn(
                  'h-3.5 w-3.5 border rounded flex items-center justify-center',
                  selected.includes(tag) && 'bg-primary border-primary text-primary-foreground'
                )}
              >
                {selected.includes(tag) && <Check className="h-2.5 w-2.5" />}
              </div>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
