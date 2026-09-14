import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
const Dashboard=lazy(()=>import('./pages/Dashboard').then(m=>({default:m.Dashboard})))
const Profile=lazy(()=>import('./pages/Profile').then(m=>({default:m.Profile})))
const Recognition=lazy(()=>import('./pages/Recognition').then(m=>({default:m.Recognition})))
const Trends=lazy(()=>import('./pages/Trends').then(m=>({default:m.Trends})))
const RecordPage=lazy(()=>import('./pages/Record').then(m=>({default:m.RecordPage})))
export default function App(){return <Suspense fallback={<div className="route-loading"><span/><p>正在整理你的能量数据…</p></div>}><Routes><Route element={<Layout/>}><Route index element={<Dashboard/>}/><Route path="record" element={<RecordPage/>}/><Route path="recognize" element={<Recognition/>}/><Route path="profile" element={<Profile/>}/><Route path="trends" element={<Trends/>}/><Route path="*" element={<Navigate to="/" replace/>}/></Route></Routes></Suspense>}
