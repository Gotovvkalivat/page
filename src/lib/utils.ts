import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function escapeHtml(str: string): string {
  return str.replace(/[&<>]/g, (m) => {
    if (m === '&') return '&amp;'
    if (m === '<') return '&lt;'
    if (m === '>') return '&gt;'
    return m
  })
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const year = d.getFullYear()
  return `${day}.${month}.${year}`
}

export function replaceDateVariable(text: string): string {
  return text.replace(/\{\{date\}\}/gi, formatDate(new Date()))
}

export function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{([^}]+)\}\}/g) || []
  return matches
    .map(m => m.slice(2, -2).trim())
    .filter(v => v.toLowerCase() !== 'date')
}

export function replaceVariables(text: string, values: Record<string, string>): string {
  let result = text
  for (const [key, value] of Object.entries(values)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'gi'), value)
  }
  return replaceDateVariable(result)
}
