import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ThemeProvider } from './contexts/ThemeContext'
import { ChartColorProvider } from './contexts/ChartColorContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <ChartColorProvider>
          <App />
        </ChartColorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
)
