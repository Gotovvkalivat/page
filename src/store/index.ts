import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Template, CRMBinding, AppSettings, Toast } from '@/types'
import { generateId } from '@/lib/utils'

interface AppState {
  templates: Template[]
  bindings: CRMBinding[]
  settings: AppSettings
  toasts: Toast[]

  // Template actions
  addTemplate: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt' | 'order'>) => void
  updateTemplate: (id: string, updates: Partial<Template>) => void
  deleteTemplate: (id: string) => void
  reorderTemplates: (templateIds: string[]) => void
  toggleFavorite: (id: string) => void

  // Binding actions
  addBinding: (binding: Omit<CRMBinding, 'id' | 'createdAt'>) => void
  deleteBinding: (id: string) => void

  // Settings actions
  updateSettings: (settings: Partial<AppSettings>) => void

  // Toast actions
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void

  // Import/Export
  importTemplates: (templates: Template[]) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      templates: [],
      bindings: [],
      settings: {
        theme: 'light',
        atMenuEnabled: true,
        gridCols: 3,
        gridHeight: '240px',
      },
      toasts: [],

      addTemplate: (template) => set((state) => ({
        templates: [...state.templates, {
          ...template,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: state.templates.length,
        }]
      })),

      updateTemplate: (id, updates) => set((state) => ({
        templates: state.templates.map(t =>
          t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
        )
      })),

      deleteTemplate: (id) => set((state) => ({
        templates: state.templates.filter(t => t.id !== id)
      })),

      reorderTemplates: (templateIds) => set((state) => ({
        templates: templateIds.map((id, idx) => {
          const template = state.templates.find(t => t.id === id)
          return template ? { ...template, order: idx } : null
        }).filter(Boolean) as Template[]
      })),

      toggleFavorite: (id) => set((state) => ({
        templates: state.templates.map(t =>
          t.id === id ? { ...t, favorite: !t.favorite } : t
        )
      })),

      addBinding: (binding) => set((state) => ({
        bindings: [...state.bindings, {
          ...binding,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }]
      })),

      deleteBinding: (id) => set((state) => ({
        bindings: state.bindings.filter(b => b.id !== id)
      })),

      updateSettings: (settings) => set((state) => ({
        settings: { ...state.settings, ...settings }
      })),

      addToast: (toast) => {
        const id = generateId()
        set((state) => ({
          toasts: [...state.toasts, { ...toast, id }]
        }))
        setTimeout(() => get().removeToast(id), 4000)
      },

      removeToast: (id) => set((state) => ({
        toasts: state.toasts.filter(t => t.id !== id)
      })),

      importTemplates: (templates) => set((state) => {
        const existingTitles = new Set(state.templates.map(t => t.title))
        const newTemplates = templates.filter(t => !existingTitles.has(t.title))
        return {
          templates: [...state.templates, ...newTemplates.map((t, idx) => ({
            ...t,
            id: generateId(),
            order: state.templates.length + idx,
          }))]
        }
      }),
    }),
    {
      name: 'opspost-storage',
      partialize: (state) => ({
        templates: state.templates,
        bindings: state.bindings,
        settings: state.settings,
      }),
    }
  )
)
