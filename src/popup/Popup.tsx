import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { ToastContainer, showToast } from '@/components/ui/toast'
import { useAppStore } from '@/store'
import { TemplateList } from '@/components/popup/TemplateList'
import { BindingsList } from '@/components/popup/BindingsList'
import { ExternalLink, Search, Download, Upload, Cloud, CloudDownload, Crosshair, HelpCircle, List, Settings } from 'lucide-react'
import type { Template } from '@/types'

export function Popup() {
  const { settings, updateSettings, exportTemplates, importTemplates, syncFromDrive, syncToDrive } = usePopupActions()
  const [searchQuery, setSearchQuery] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  return (
    <div className="w-[340px] min-h-[400px] max-h-[560px] overflow-y-auto bg-background p-3">
      <header className="flex items-center justify-between border-b pb-2 mb-3">
        <h1 className="font-semibold text-sm flex items-center gap-2">
          <span className="text-primary">OpsPost</span>
          <span className="text-muted-foreground">База ответов</span>
        </h1>
        <span className="text-xs bg-muted px-2 py-0.5 rounded font-medium">v6.0</span>
      </header>

      <Tabs defaultValue="templates" className="w-full">
        <TabsList className="w-full grid grid-cols-3 mb-3">
          <TabsTrigger value="templates" className="text-xs">
            <List className="h-3 w-3 mr-1" />
            Шаблоны
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="help" className="text-xs">
            <HelpCircle className="h-3 w-3 mr-1" />
            Инструкция
          </TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-3">
          <Button
            className="w-full"
            onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('base.html') })}
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Открыть Базу Знаний
          </Button>

          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Поиск шаблона..."
              className="pl-8 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <TemplateList searchQuery={searchQuery} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <section className="space-y-3">
            <h3 className="text-xs font-medium border-l-2 border-amber-500 pl-2 text-muted-foreground">
              Внешний вид
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs">Тёмная тема</span>
              <Switch
                checked={settings.theme === 'dark'}
                onCheckedChange={(checked) => updateSettings({ theme: checked ? 'dark' : 'light' })}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium border-l-2 border-amber-500 pl-2 text-muted-foreground">
              Поведение
            </h3>
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-xs">Включить @-меню</span>
              <Switch
                checked={settings.atMenuEnabled}
                onCheckedChange={(checked) => updateSettings({ atMenuEnabled: checked })}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium border-l-2 border-amber-500 pl-2 text-muted-foreground">
              Управление данными
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" onClick={exportTemplates}>
                <Download className="h-3 w-3 mr-1" />
                Экспорт
              </Button>
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" />
                Импорт
              </Button>
              <Button size="sm" variant="secondary" onClick={syncToDrive}>
                <Cloud className="h-3 w-3 mr-1" />
                В Диск
              </Button>
              <Button size="sm" variant="secondary" onClick={syncFromDrive}>
                <CloudDownload className="h-3 w-3 mr-1" />
                Из Диска
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) importTemplates(file)
              }}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium border-l-2 border-amber-500 pl-2 text-muted-foreground">
              Привязка к CRM
            </h3>
            <Button size="sm" variant="outline" className="w-full" onClick={startBindingMode}>
              <Crosshair className="h-3 w-3 mr-1" />
              Привязать поле ввода
            </Button>
            <BindingsList />
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-medium border-l-2 border-amber-500 pl-2 text-muted-foreground">
              Горячие клавиши
            </h3>
            <ul className="text-xs space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd>
                <span>— Умный поиск</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">@</kbd>
                <span>— Меню шаблонов</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd>
                <span>+</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Enter</kbd>
                <span>— Вставить и отправить</span>
              </li>
              <li className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                <span>— Закрыть окно</span>
              </li>
            </ul>
          </section>
        </TabsContent>

        <TabsContent value="help" className="space-y-4 text-xs">
          <section>
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <span className="text-primary">/</span> Шорткоды
            </h3>
            <p className="text-muted-foreground">
              Напишите <code className="bg-muted px-1 rounded">/слово</code> и оно автоматически заменится на соответствующий шаблон.
            </p>
          </section>

          <section>
            <h3 className="font-medium flex items-center gap-2 mb-2">
              <span className="text-primary">@</span> @-меню
            </h3>
            <p className="text-muted-foreground">
              Введите <code className="bg-muted px-1 rounded">@</code> и начните печатать название шаблона — появится всплывающий список.
            </p>
          </section>

          <section>
            <h3 className="font-medium flex items-center gap-2 mb-2">
              Переменные
            </h3>
            <p className="text-muted-foreground">
              Используйте <code className="bg-muted px-1 rounded">{'{{Имя}}'}</code> в шаблоне. При вставке появится запрос на заполнение.
            </p>
          </section>

          <section>
            <h3 className="font-medium flex items-center gap-2 mb-2">
              Динамическая дата
            </h3>
            <p className="text-muted-foreground">
              <code className="bg-muted px-1 rounded">{'{{date}}'}</code> — подставит текущую дату.
            </p>
          </section>

          <section>
            <h3 className="font-medium flex items-center gap-2 mb-2">
              Избранное
            </h3>
            <p className="text-muted-foreground">
              Отмеченные звёздочкой шаблоны отображаются в плавающей панели при фокусе на поле ввода.
            </p>
          </section>

          <section>
            <h3 className="font-medium flex items-center gap-2 mb-2">
              Категории
            </h3>
            <p className="text-muted-foreground">
              Назначайте теги шаблонам и фильтруйте по ним в Базе знаний.
            </p>
          </section>
        </TabsContent>
      </Tabs>

      <ToastContainer />
    </div>
  )
}

function usePopupActions() {
  const { templates, bindings, settings, updateSettings, addToast, importTemplates: importToStore } = useAppStore()

  const exportTemplates = React.useCallback(() => {
    const blob = new Blob([JSON.stringify(templates, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `opspost_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    showToast('Шаблоны экспортированы', 'success')
  }, [templates])

  const importTemplates = React.useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (Array.isArray(data)) {
          importToStore(data)
          showToast('Шаблоны импортированы', 'success')
        }
      } catch {
        showToast('Ошибка парсинга JSON', 'error')
      }
    }
    reader.readAsText(file)
  }, [importToStore])

  const syncToDrive = React.useCallback(() => {
    chrome.runtime.sendMessage({ type: 'SAVE_TO_DRIVE', templates }, (response) => {
      if (response?.success) {
        showToast('Сохранено на Google Диск', 'success')
      } else {
        showToast('Ошибка: ' + (response?.error || 'unknown'), 'error')
      }
    })
  }, [templates])

  const syncFromDrive = React.useCallback(() => {
    if (confirm('Синхронизировать с Google Диска?')) {
      chrome.runtime.sendMessage({ type: 'LOAD_FROM_DRIVE' }, (response) => {
        if (response?.success && response.templates) {
          importToStore(response.templates)
          showToast('База обновлена из облака', 'success')
        } else {
          showToast('Не удалось загрузить', 'error')
        }
      })
    }
  }, [importToStore])

  return {
    settings,
    updateSettings,
    exportTemplates,
    importTemplates,
    syncToDrive,
    syncFromDrive,
  }
}

function startBindingMode() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id! },
      func: () => {
        window.dispatchEvent(new CustomEvent('opspost-start-binding'))
      }
    })
  })
}
