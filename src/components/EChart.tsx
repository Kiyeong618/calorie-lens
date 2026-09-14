import { useEffect, useRef } from 'react'
import * as echarts from 'echarts'
import type { EChartsOption } from 'echarts'

export function EChart({ option, height = 280, ariaLabel, onClick }: { option: EChartsOption; height?: number; ariaLabel: string; onClick?:(params:any)=>void }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef=useRef<echarts.ECharts|null>(null)
  useEffect(() => { if (!ref.current) return; const chart = echarts.init(ref.current); chartRef.current=chart; const resize = () => { if (!chart.isDisposed()) chart.resize() }; window.addEventListener('resize', resize); const observer = new ResizeObserver(resize); observer.observe(ref.current); return () => { observer.disconnect(); window.removeEventListener('resize', resize); chartRef.current=null; chart.dispose() } }, [])
  useEffect(()=>{chartRef.current?.setOption({...option,animationDuration:700,animationDurationUpdate:360,animationEasing:'cubicOut',animationEasingUpdate:'cubicInOut'},false)},[option])
  useEffect(()=>{const chart=chartRef.current;if(!chart||!onClick)return;chart.on('click',onClick);return()=>{chart.off('click',onClick)}},[onClick])
  return <div ref={ref} style={{ height }} role="img" aria-label={ariaLabel} />
}
