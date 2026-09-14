import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { todayKey } from '../utils'
type Theme='light'|'dark'
interface AppUI { selectedDate:string; setSelectedDate:(date:string)=>void; theme:Theme; toggleTheme:()=>void; presentation:boolean; togglePresentation:()=>void }
const Context=createContext<AppUI|null>(null)
export function AppUIProvider({children}:{children:ReactNode}){const [selectedDate,setSelectedDate]=useState(todayKey);const [theme,setTheme]=useState<Theme>(()=>(localStorage.getItem('calorielens:theme') as Theme)||'light');const [presentation,setPresentation]=useState(false);useEffect(()=>{document.documentElement.dataset.theme=theme;localStorage.setItem('calorielens:theme',theme)},[theme]);const value=useMemo(()=>({selectedDate,setSelectedDate,theme,toggleTheme:()=>setTheme(v=>v==='light'?'dark':'light'),presentation,togglePresentation:()=>setPresentation(v=>!v)}),[selectedDate,theme,presentation]);return <Context.Provider value={value}>{children}</Context.Provider>}
export function useAppUI(){const value=useContext(Context);if(!value)throw new Error('useAppUI requires AppUIProvider');return value}
