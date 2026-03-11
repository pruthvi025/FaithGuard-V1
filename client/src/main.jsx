import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './ErrorBoundary.jsx'
import './index.css'

console.log('🚀 FaithGuard: Starting application...')
console.log('🔍 Environment check:', {
  hasReact: typeof React !== 'undefined',
  hasReactDOM: typeof ReactDOM !== 'undefined',
  userAgent: navigator.userAgent,
  url: window.location.href
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  console.error('❌ Root element not found!')
  document.body.innerHTML = '<div style="padding: 2rem; color: red; background: white; font-size: 20px;">Error: Root element not found!</div>'
} else {
  console.log('✅ Root element found:', rootElement)
  try {
    console.log('✅ Root element found, rendering app...')

    ReactDOM.createRoot(rootElement).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    )
    console.log('✅ App rendered successfully')
  } catch (error) {
    console.error('❌ Fatal error rendering app:', error)
    console.error('Error stack:', error.stack)
    rootElement.innerHTML = `
      <div style="padding: 2rem; color: red; background: white; font-size: 18px;">
        <h1>Fatal Error</h1>
        <p><strong>${error.message}</strong></p>
        <pre style="background: #f0f0f0; padding: 1rem; overflow: auto;">${error.stack}</pre>
      </div>
    `
  }
}