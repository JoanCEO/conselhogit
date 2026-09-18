import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'  // ← linha nova
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>           {/* ← wrapping novo */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </ThemeProvider>          {/* ← wrapping novo */}
    </BrowserRouter>
  </React.StrictMode>
)