import { useCallback, useEffect, useState } from 'react'
import { getProfile, getRecords, getTarget } from '../data/store'

export function useAppData() {
  const load = useCallback(() => ({ profile: getProfile(), target: getTarget(), records: getRecords() }), [])
  const [data, setData] = useState(load)
  useEffect(() => { const update = () => setData(load()); window.addEventListener('calorielens:update', update); window.addEventListener('storage', update); return () => { window.removeEventListener('calorielens:update', update); window.removeEventListener('storage', update) } }, [load])
  return data
}
