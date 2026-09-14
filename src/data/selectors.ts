import type { DailyRecord, MealType, NutritionTarget } from '../types'

export const getDailyCalories = (record?: DailyRecord) => record?.totalCalories ?? 0
export const getMacroCalories = (record?: DailyRecord) => ({ protein: (record?.protein ?? 0) * 4, carbs: (record?.carbs ?? 0) * 4, fat: (record?.fat ?? 0) * 9 })
export const getCalorieDeviation = (record: DailyRecord | undefined, target: number) => getDailyCalories(record) - target
export const getConsistencyScore = (record: DailyRecord | undefined, target: number) => target > 0 ? Math.max(0, Math.round((1 - Math.abs(getCalorieDeviation(record, target)) / target) * 100)) : 0
export function getMealDistribution(record?: DailyRecord) { const types: MealType[] = ['breakfast','lunch','dinner','snack']; return types.map(type => ({ type, calories: record?.meals.filter(m=>m.type===type).reduce((s,m)=>s+m.totalCalories,0) ?? 0 })) }
export const getEnergyBalance = (record: DailyRecord | undefined, target: NutritionTarget) => ({ intake: getDailyCalories(record), expenditure: target.tdee, goal: target.targetCalories, remaining: target.targetCalories - getDailyCalories(record) })
export const getSelectedDayData = (records: DailyRecord[], selectedDate: string) => records.find(r=>r.date===selectedDate)
export const getMacroRatios = (record: DailyRecord | undefined, target: NutritionTarget) => [
  target.targetCalories ? getDailyCalories(record)/target.targetCalories*100 : 0,
  target.proteinTarget ? (record?.protein??0)/target.proteinTarget*100 : 0,
  target.carbTarget ? (record?.carbs??0)/target.carbTarget*100 : 0,
  target.fatTarget ? (record?.fat??0)/target.fatTarget*100 : 0,
]
