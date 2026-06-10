import React from 'react'
import { useAppStore } from '@/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { ToastContainer, showToast } from '@/components/ui/toast'
import { TemplateCard } from '@/components/base/TemplateCard'
import { TemplateEditor } from '@/components/base/TemplateEditor'
import { BindingsPanel } from '@/components/base/BindingsPanel'
import { TagFilter } from '@/components/base/TagFilter'
import { showToast as showToastEvent } from '@/components/ui/toast'
import {
  Search,
  Download,
  Upload,
  Cloud,
  CloudDownload,
  Plus,
  Star,
  Grid3X3,
  Settings,
  X,
} from 'lucide-react'
import type { Template } from '@/types'

export function KnowledgeBase() {
  const {
    templates,
    settings,
    updateSettings,
    addTemplate,
    updateTemplate,
    deleteTemplate,
    toggleFavorite,
    reorderTemplates,
    importTemplates,
  } = useAppStore()

  const [searchQuery, setSearchQuery] = React.useState('')
  const [showFavorites, setShowFavorites] = React.useState(false)
  const [selectedTags, setSelectedTags] = React.useState<string[]>([])
  const [editingTemplate, setEditingTemplate] = React.useState<Template | null>(null)
  const [isCreating, setIsCreating] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Apply theme
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark')
  }, [settings.theme])

  // Get unique tags
  const allTags = React.useMemo(() => {
    return [...new Set(templates.map(t => t.tag).filter(Boolean))] as string[]
  }, [templates])

  // Filter templates
  const filteredTemplates = React.useMemo(() => {
    return templates
      .filter(t => {
        if (showFavorites && !t.favorite) return false
        if (selectedTags.length > 0 && (!t.tag || !selectedTags.includes(t.tag))) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            t.title.toLowerCase().includes(q) ||
            t.text.toLowerCase().includes(q) ||
            (t.tag && t.tag.toLowerCase().includes(q))
          )
        }
        return true
      })
      .sort((a, b) => a.order - b.order)
  }, [templates, searchQuery, showFavorites, selectedTags])

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `opspost_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    showToastEvent('Шаблоны экспортированы', 'success')
  }

  const handleImport = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (Array.isArray(data)) {
          importTemplates(data)
          showToastEvent('Шаблоны импортированы', 'success')
        }
      } catch {
        showToastEvent('Ошибка парсинга JSON', 'error')
      }
    }
    reader.readAsText(file)
  }

  const handleSyncToDrive = () => {
    chrome.runtime.sendMessage({ type: 'SAVE_TO_DRIVE', templates }, (response) => {
      if (response?.success) {
        showToastEvent('Сохранено на Google Диск', 'success')
      } else {
        showToastEvent('Ошибка: ' + (response?.error || 'unknown'), 'error')
      }
    })
  }

  const handleSyncFromDrive = () => {
    if (confirm('Синхронизировать с Google Диска?')) {
      chrome.runtime.sendMessage({ type: 'LOAD_FROM_DRIVE' }, (response) => {
        if (response?.success && response.templates) {
          importTemplates(response.templates)
          showToastEvent('База обновлена из облака', 'success')
        } else {
          showToastEvent('Не удалось загрузить', 'error')
        }
      })
    }
  }

  const handleSaveTemplate = (data: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => {
    if (editingTemplate) {
      updateTemplate(editingTemplate.id, data)
      showToastEvent('Шаблон обновлен', 'success')
    } else {
      addTemplate(data)
      showToastEvent('Шаблон создан', 'success')
    }
    setEditingTemplate(null)
    setIsCreating(false)
  }

  const handleReorder = (newOrder: string[]) => {
    reorderTemplates(newOrder)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-sm font-semibold">
            <span className="text-primary">OpsPost</span>
            <span className="text-muted-foreground ml-2">База знаний</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme switch */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-muted-foreground">Тёмная тема</span>
            <Switch
              checked={settings.theme === 'dark'}
              onCheckedChange={(checked) => updateSettings({ theme: checked ? 'dark' : 'light' })}
            />
          </label>

          {/* Grid settings */}
          <select
            className="h-7 text-xs border rounded px-1.5 bg-background"
            value={settings.gridCols}
            onChange={(e) => updateSettings({ gridCols: parseInt(e.target.value) })}
          >
            <option value={2}>2 колонки</option>
            <option value={3}>3 колонки</option>
            <option value={4}>4 колонки</option>
            <option value={5}>5 колонок</option>
          </select>

          {/* Backup actions */}
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={handleExport}>
              <Download className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSyncToDrive}>
              <Cloud className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="secondary" onClick={handleSyncFromDrive}>
              <CloudDownload className="h-3 w-3" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleImport(file)
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[350px] border-r bg-muted/20 p-4 flex flex-col gap-4 overflow-y-auto">
          <TemplateEditor
            template={editingTemplate}
            isNew={isCreating}
            onSave={handleSaveTemplate}
            onCancel={() => {
              setEditingTemplate(null)
              setIsCreating(false)
            }}
            allTags={allTags}
          />

          <BindingsPanel />
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="border-b px-4 py-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Поиск шаблонов..."
                className="pl-8 text-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <TagFilter
              tags={allTags}
              selected={selectedTags}
              onChange={setSelectedTags}
            />

            <Button
              size="sm"
              variant={showFavorites ? 'accent' : 'outline'}
              onClick={() => setShowFavorites(!showFavorites)}
            >
              <Star className={`h-3.5 w-3.5 mr-1.5 ${showFavorites ? 'fill-current' : ''}`} />
              Избранное
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setIsCreating(true)
                setEditingTemplate(null)
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Создать
            </Button>
          </div>

          {/* Selected tags pills */}
          {selectedTags.length > 0 && (
            <div className="px-4 py-2 flex gap-2 border-b bg-muted/30">
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                  onClick={() => setSelectedTags(selectedTags.filter((t) => t !== tag))}
                >
                  {tag}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))}
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                {templates.length === 0
                  ? 'База шаблонов пуста. Создайте первый шаблон.'
                  : 'Ничего не найдено по заданным критериям.'}
              </div>
            ) : (
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${settings.gridCols}, minmax(0, 1fr))`,
                }}
              >
                {filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => {
                      setEditingTemplate(template)
                      setIsCreating(false)
                    }}
                    onDelete={() => {
                      if (confirm(`Удалить "${template.title}"?`)) {
                        deleteTemplate(template.id)
                        showToastEvent('Шаблон удален', 'success')
                      }
                    }}
                    onToggleFavorite={() => toggleFavorite(template.id)}
                    onCopy={() => {
                      navigator.clipboard.writeText(template.text)
                      showToastEvent('Текст скопирован', 'success')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
