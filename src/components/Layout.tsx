import { useEffect, useState } from 'react'
import { Activity, CalendarRange, DatabaseBackup, Moon, PenLine, Presentation, Sun } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { resetDemoData } from '../data/store'
import { useAppUI } from '../context/AppUIContext'

const links=[{to:'/',label:'今日',icon:CalendarRange},{to:'/record',label:'记录',icon:PenLine},{to:'/profile',label:'身体',icon:Activity},{to:'/trends',label:'趋势',icon:CalendarRange}]
export function Layout(){const {theme,toggleTheme,presentation,togglePresentation}=useAppUI();const [scrolled,setScrolled]=useState(false);const [tools,setTools]=useState(false);useEffect(()=>{const onScroll=()=>setScrolled(window.scrollY>24);window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll)},[]);const reset=()=>{if(confirm('确定恢复课程演示数据吗？当前记录将被替换。'))resetDemoData()};return <div className={`app-shell lens-shell ${presentation?'presentation-mode':''}`}>
  <header className={`top-nav ${scrolled?'scrolled':''}`}><NavLink to="/" className="wordmark"><span className="lens-logo"/><b>CalorieLens</b></NavLink><nav>{links.map(({to,label})=><NavLink key={to} to={to} end={to==='/' }>{label}<motion.i layoutId="nav-focus"/></NavLink>)}</nav><div className="nav-tools"><button onClick={toggleTheme} aria-label="切换明暗主题">{theme==='light'?<Moon/>:<Sun/>}</button><button onClick={togglePresentation} className={presentation?'active':''}><Presentation/><span>演示</span></button><button className="tool-dot" aria-label="更多设置" onClick={()=>setTools(v=>!v)}>···</button></div><AnimatePresence>{tools&&<motion.div className="tools-popover" initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}><button onClick={reset}><DatabaseBackup/>重置演示数据</button><small>数据仅用于课程展示</small></motion.div>}</AnimatePresence></header>
  <main className="main lens-main"><Outlet/></main>
  <nav className="bottom-nav">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/' }><Icon/><span>{label}</span><i/></NavLink>)}</nav>
  </div>}
