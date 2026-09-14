import { useState } from 'react'
import { Camera, Clock3, PenLine, RotateCcw } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ManualRecorder } from '../components/ManualRecorder'
import { getMealTemplates, getRecords } from '../data/store'

export function RecordPage(){
  const navigate=useNavigate();const [params,setParams]=useSearchParams();const [mode,setMode]=useState<'choose'|'manual'|'recent'>(()=>params.get('meal')||params.get('copy')||params.get('template')?'manual':params.get('mode')==='recent'?'recent':'choose')
  const recent=getRecords().flatMap(r=>r.meals).filter(m=>m.source!=='demo').sort((a,b)=>b.timestamp.localeCompare(a.timestamp)).slice(0,8);const templates=getMealTemplates()
  return <motion.div className="record-page" initial={{opacity:0}} animate={{opacity:1}}><header className="record-hero"><span>记录 · {new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}</span><h1>记录这一餐。</h1><p>把食物变成可以理解的数据。</p></header>
    {mode==='choose'&&<div className="record-methods"><button onClick={()=>navigate('/recognize')}><Camera/><span>01</span><h2>智能识别</h2><p>上传餐食照片，让视觉模型提供可编辑的估算。</p><b>用照片记录 →</b></button><button onClick={()=>setMode('manual')}><PenLine/><span>02</span><h2>手动记录</h2><p>从本地食物库搜索，精确输入食物与克数。</p><b>搜索食物 →</b></button><button onClick={()=>setMode('recent')}><Clock3/><span>03</span><h2>最近吃过</h2><p>复制最近餐食或常用模板，再快速调整。</p><b>再次记录 →</b></button></div>}
    {mode==='manual'&&<><button className="mode-back" onClick={()=>{setMode('choose');setParams({})}}>← 更换记录方式</button><ManualRecorder/></>}
    {mode==='recent'&&<section className="recent-stage"><button className="mode-back" onClick={()=>setMode('choose')}>← 更换记录方式</button><div className="record-subhead"><span>最近吃过</span><h2>熟悉的一餐，不必重新开始。</h2></div><div className="recent-grid">{templates.map(t=><button key={t.id} onClick={()=>{setParams({template:t.id});setMode('manual')}}><span>常用餐食</span><h3>{t.name}</h3><p>{t.foods.map(f=>f.name).join(' · ')}</p><b>{Math.round(t.foods.reduce((s,f)=>s+f.calories,0))} 千卡</b></button>)}{recent.map(m=><button key={m.id} onClick={()=>{setParams({copy:m.id});setMode('manual')}}><span>{new Date(m.timestamp).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span><h3>{m.foods.map(f=>f.name).join(' + ')}</h3><p>{m.foods.length} 种食物 · {m.type==='snack'?'加餐':m.type==='breakfast'?'早餐':m.type==='lunch'?'午餐':'晚餐'}</p><b>{Math.round(m.totalCalories)} 千卡</b></button>)}{!templates.length&&!recent.length&&<div className="recent-empty"><RotateCcw/><p>完成一次手动记录后，<br/>这里会出现你的最近餐食。</p><button onClick={()=>setMode('manual')}>开始记录</button></div>}</div></section>}
  </motion.div>
}
