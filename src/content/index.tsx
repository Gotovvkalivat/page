import React from 'react'
import ReactDOM from 'react-dom/client'
import { FloatingPanel } from './FloatingPanel'
import { AtMenu } from './AtMenu'
import { BindingOverlay } from './BindingOverlay'
import '@/styles/globals.css'

// Shadow DOM host for content script UI
function createShadowHost(id: string): ShadowRoot {
  let host = document.getElementById(id)
  if (!host) {
    host = document.createElement('div')
    host.id = id
    document.body.appendChild(host)
  }
  if (!host.shadowRoot) {
    const shadow = host.attachShadow({ mode: 'open' })

    // Inject styles
    const style = document.createElement('style')
    style.textContent = `
      :host {
        all: initial;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
    `
    shadow.appendChild(style)

    // Create container for React
    const container = document.createElement('div')
    shadow.appendChild(container)
  }
  return host.shadowRoot!
}

// Main content script initialization
function init() {
  const shadow = createShadowHost('opspost-content-host')
  const container = shadow.querySelector('div')!

  function render(showBinding: boolean = false) {
    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <FloatingPanel />
        <AtMenu />
        {showBinding && <BindingOverlay onComplete={() => render(false)} />}
      </React.StrictMode>
    )
  }

  render()

  // Listen for binding mode trigger
  window.addEventListener('opspost-start-binding', () => {
    render(true)
  })
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
