import { motion } from 'motion/react'
import { EnergyRibbon } from '../components/TodayVisuals'
import { EnergyRidgeline } from '../components/TrendVisuals'
import { CalorieDeviationRibbon, CircularMealRhythm, FoodGalaxy, NutritionTernary } from '../components/visualizations/AnalyticVisuals'
import { useAppUI } from '../context/AppUIContext'
import { getMonthlyRecords, getWeeklyRecords } from '../data/selectors'
import { useAppData } from '../hooks/useAppData'
import type { DailyRecord } from '../types'
import { todayKey } from '../utils'

export function Trends(){const {records,target}=useAppData();const {selectedDate,setSelectedDate}=useAppUI();const fallback:DailyRecord={date:todayKey(),meals:[],totalCalories:0,protein:0,carbs:0,fat:0};const selected=records.find(record=>record.date===selectedDate)??records[records.length-1]??fallback;const week=getWeeklyRecords(records);const month=getMonthlyRecords(records);return <motion.div className="trends-page" initial={{opacity:0}} animate={{opacity:1}}><header className="trends-hero"><span>趋势 · 三十日数据探索空间</span><h1>时间，让饮食<br/>显现规律。</h1><p>点击日期或历史数据点，五种视觉会聚焦同一天。</p><div className="date-scrubber">{week.map(record=><button key={record.date} onClick={()=>setSelectedDate(record.date)} className={record.date===selected.date?'active':''}><span>{new Date(`${record.date}T12:00:00`).toLocaleDateString('zh-CN',{weekday:'short'})}</span><b>{record.date.slice(-2)}</b><i/></button>)}</div></header>
  <section className="trend-chapter ridge-chapter"><header><span>01 / 七日能量地貌</span><h2>每一天，<br/>由四次进食塑形。</h2><p>每条山脊代表一天，四个局部峰依次对应早餐、午餐、晚餐和加餐；峰高来自真实餐次热量。</p></header><EnergyRidgeline records={records} target={target.targetCalories} selectedDate={selected.date} onSelect={setSelectedDate}/></section>
  <section className="trend-chapter pulse-chapter"><header><span>02 / 三十日目标偏差带</span><h2>目标是中线，<br/>偏差成为波形。</h2><p>上方表示摄入高于目标，下方表示低于目标；它把稳定与异常放在同一尺度比较。</p></header><CalorieDeviationRibbon records={month} target={target.targetCalories}/></section>
  <section className="trend-chapter ternary-chapter"><header><span>03 / 营养三角</span><h2>三种供能比例，<br/>决定一天落在哪里。</h2><p>不比较克数，而是使用蛋白质 ×4、碳水 ×4、脂肪 ×9 后的真实供能比例。</p></header><div className="linked-date"><strong>{Math.round(selected.totalCalories)}</strong><span>{selected.date.slice(5).replace('-','月')}日 · 千卡 · 一致性 {selected.consistencyScore??0}%</span></div><NutritionTernary record={selected} records={records} target={target} onSelect={setSelectedDate}/></section>
  <section className="trend-chapter galaxy-chapter"><header><span>04 / 食物星图</span><h2>你经常吃的，<br/>散布在什么位置。</h2><p>位置表达营养密度，面积表达真实摄入量。它用于描述数据特征，不给食物贴“好”或“坏”的标签。</p></header><FoodGalaxy records={month}/></section>
  <section className="trend-chapter clock-chapter"><header><span>05 / 饮食节律</span><h2>进食时间，<br/>围成一天的轨道。</h2><p>切换七日模式，可以观察晚餐是否推迟、加餐是否聚集在夜间。</p></header><CircularMealRhythm record={selected} records={records}/></section>
  <section className="trend-chapter auxiliary-chapter"><header><span>辅助 / 能量流场</span><h2>餐次如何汇入今天，<br/>再靠近目标。</h2><p>Ribbon 宽度来自各餐真实热量，不使用标准 Sankey 布局。</p></header><EnergyRibbon record={selected} target={target.targetCalories}/></section>
  </motion.div>}
