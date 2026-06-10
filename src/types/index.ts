export interface Template {
  id: string
  title: string
  text: string
  tag: string | null
  favorite: boolean
  createdAt: string
  updatedAt: string
  order: number
}

export interface CRMBinding {
  id: string
  domain: string
  textareaSelector: string
  sendBtnSelector: string | null
  createdAt: string
}

export interface AppSettings {
  theme: 'light' | 'dark'
  atMenuEnabled: boolean
  gridCols: number
  gridHeight: string
}

export interface User {
  id: string
  email: string
  createdAt: string
}

export type ToastType = 'success' | 'error' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}
