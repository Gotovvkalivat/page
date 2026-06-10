import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { KnowledgeBase } from './KnowledgeBase'
import '@/styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <KnowledgeBase />
    </React.StrictMode>
  </React.StrictMode>
)
