import type { ReactNode } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { CountUp } from './CountUp'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section> }
export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{action}</header>
}
export function MetricCard({ label, value, unit, note, tone = 'green', trend }: { label: string; value: string | number; unit?: string; note: string; tone?: 'green'|'orange'|'blue'|'purple'; trend?: 'up'|'down' }) {
  return <Card className={`metric tone-${tone}`}><div className="metric-top"><span>{label}</span><span className="metric-dot" /></div><div className="metric-value"><strong>{typeof value==='number'?<CountUp value={value} decimals={Number.isInteger(value)?0:1}/>:value}</strong>{unit && <small>{unit}</small>}</div><p>{trend === 'up' ? <ArrowUpRight size={14}/> : trend === 'down' ? <ArrowDownRight size={14}/> : null}{note}</p></Card>
}
export function Progress({ label, value, target, color }: { label: string; value: number; target: number; color: string }) { const pct = Math.min(100, Math.max(0, target ? value/target*100 : 0)); return <div className="progress-row"><div><span>{label}</span><strong>{Math.round(value)} <i>/ {target} g</i></strong></div><div className="track"><div style={{ width: `${pct}%`, backgroundColor: color }} /></div></div> }
