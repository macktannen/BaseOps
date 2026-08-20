import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { DataProvider } from './contexts/DataProvider'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DataProvider>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </DataProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
