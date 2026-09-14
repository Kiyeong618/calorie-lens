import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { initializeStore } from './data/store'
import './index.css'
import { AppUIProvider } from './context/AppUIContext'
initializeStore()
ReactDOM.createRoot(document.getElementById('root')!).render(<HashRouter><AppUIProvider><App/></AppUIProvider></HashRouter>)
