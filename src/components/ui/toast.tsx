import * as React from 'react'
import { cn } from '@/lib/utils'
import type { Toast as ToastType } from '@/types'
import { CircleCheck as CheckCircle, Circle as XCircle, Info } from 'lucide-react'

interface ToastProps {
  toast: ToastType
  onRemove: (id: string) => void
}

export function Toast({ toast, onRemove }: ToastProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-right transition-all',
        toast.type === 'success' && 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-100',
        toast.type === 'error' && 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-100',
        toast.type === 'info' && 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-100'
      )}
    >
      {toast.type === 'success' && <CheckCircle className="h-4 w-4" />}
      {toast.type === 'error' && <XCircle className="h-4 w-4" />}
      {toast.type === 'info' && <Info className="h-4 w-4" />}
      <span className="text-sm font-medium">{toast.message}</span>
    </div>
  )
}

export function ToastContainer() {
  const [toasts, setToasts] = React.useState<ToastType[]>([])

  React.useEffect(() => {
    const handleToast = (e: CustomEvent<ToastType>) => {
      setToasts(prev => [...prev, e.detail])
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== e.detail.id))
      }, 4000)
    }

    window.addEventListener('opspost-toast' as any, handleToast)
    return () => window.removeEventListener('opspost-toast' as any, handleToast)
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-[2147483647] flex flex-col gap-2">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
      ))}
    </div>
  )
}

export function showToast(message: string, type: ToastType['type'] = 'info') {
  const toast: ToastType = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    message,
    type,
  }
  window.dispatchEvent(new CustomEvent('opspost-toast', { detail: toast }))
}
