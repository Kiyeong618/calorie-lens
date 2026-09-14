import { motion } from 'motion/react'
import { EnergyRibbon, MealRhythmLine, NutritionBody } from '../components/TodayVisuals'
import { EnergyRidgeline, MonthlyPulse } from '../components/TrendVisuals'
import { useAppUI } from '../context/AppUIContext'
import { useAppData } from '../hooks/useAppData'
import type { DailyRecord } from '../types'
import { todayKey } from '../utils'

export function Trends(){const {records,target}=useAppData();const {selectedDate,setSelectedDate}=useAppUI();const fallback:DailyRecord={date:todayKey(),meals:[],totalCalories:0,protein:0,carbs:0,fat:0};const selected=records.find(r=>r.date===selectedDate)??records[records.length-1]??fallback;const latest=records.slice(-7);return <motion.div className="trends-page" initial={{opacity:0}} animate={{opacity:1}}><header className="trends-hero"><span>趋势 · 最近三十天</span><h1>时间，让饮食<br/>显现规律。</h1><p>点击任意日期，所有视觉将同步聚焦。</p><div className="date-scrubber">{latest.map(r=><button key={r.date} onClick={()=>setSelectedDate(r.date)} className={r.date===selected.date?'active':''}><span>{new Date(r.date).toLocaleDateString('zh-CN',{weekday:'short'})}</span><b>{r.date.slice(-2)}</b><i/></button>)}</div></header>
  <section className="trend-chapter ridge-chapter"><header><span>01 / 七日能量地貌</span><h2>七层数据山脊，<br/>今天离你最近。</h2><p>每条山脊的高度来自当日总摄入，酸性青柠虚线代表同一目标参考面。</p></header><EnergyRidgeline records={records} target={target.targetCalories} selectedDate={selected.date} onSelect={setSelectedDate}/></section>
  <section className="trend-chapter pulse-chapter"><header><span>02 / 月度能量脉冲</span><h2>偏差成为波动，<br/>稳定成为节奏。</h2></header><MonthlyPulse records={records} target={target.targetCalories} selectedDate={selected.date} onSelect={setSelectedDate}/></section>
  <section className="trend-chapter linked-chapter"><header><span>03 / 联动观察</span><h2>{new Date(selected.date).toLocaleDateString('zh-CN',{month:'long',day:'numeric'})}，<br/>营养如何形成。</h2><p>拖动上方日期后，营养体、饮食节律与能量流向都使用同一份当日数据重新计算。</p></header><div className="linked-date"><strong>{Math.round(selected.totalCalories)}</strong><span>千卡 · 一致性 {selected.consistencyScore??0}%</span></div><NutritionBody record={selected} target={target}/></section>
  <section className="trend-chapter"><header><span>04 / 饮食节律</span><h2>进食发生在<br/>一天的什么位置。</h2></header><MealRhythmLine record={selected}/></section>
  <section className="trend-chapter"><header><span>05 / 能量流向</span><h2>同一天，<br/>从餐食到目标。</h2></header><EnergyRibbon record={selected} target={target.targetCalories}/></section>
  </motion.div>}
