import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// import "./css/commodities.css";
// import "./css/currencies.css";
// import "./css/shares.css";
// import "./css/style.css";
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
