import type { DailyRecord, FoodItem, NutritionTarget, UserProfile } from './types'

export const COLORS = { green: '#25a56a', greenDark: '#147a4b', orange: '#f59e42', blue: '#4a90e2', purple: '#8b78d0', ink: '#1e2924', muted: '#76817b', grid: '#e8eeea' }
export const localDateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`
export const todayKey = () => localDateKey()
export const displayDate = (date = new Date()) => `${date.getMonth() + 1}月${date.getDate()}日`
export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
export const clampNumber = (value: unknown, fallback = 0) => { const n = Number(value); return Number.isFinite(n) ? Math.max(0, n) : fallback }

export function calculateTarget(profile: UserProfile): NutritionTarget {
  const { sex, age, height, weight, activityLevel, goal } = profile
  const bmi = weight / Math.pow(height / 100, 2)
  const bmr = 10 * weight + 6.25 * height - 5 * age + (sex === 'male' ? 5 : -161)
  const factors = { sedentary: 1.2, light: 1.375, moderate: 1.55, high: 1.725, extreme: 1.9 }
  const tdee = bmr * factors[activityLevel]
  const goalFactors = { lose: .85, maintain: 1, gain: 1.1 }
  const targetCalories = tdee * goalFactors[goal]
  return { bmi: +bmi.toFixed(1), bmr: Math.round(bmr), tdee: Math.round(tdee), targetCalories: Math.round(targetCalories), proteinTarget: Math.round(weight * 1.8), carbTarget: Math.round(targetCalories * .45 / 4), fatTarget: Math.round(targetCalories * .28 / 9) }
}

export function bmiLabel(bmi: number) { return bmi < 18.5 ? '偏低' : bmi < 24 ? '正常范围' : bmi < 28 ? '偏高' : '肥胖' }
export function recalculateFood(food: FoodItem): FoodItem { const ratio=clampNumber(food.grams)/100; return { ...food, calories:+(clampNumber(food.kcalPer100g)*ratio).toFixed(1), protein:+(clampNumber(food.proteinPer100g)*ratio).toFixed(1), carbs:+(clampNumber(food.carbsPer100g)*ratio).toFixed(1), fat:+(clampNumber(food.fatPer100g)*ratio).toFixed(1) } }
export function summarizeRecord(record: DailyRecord): DailyRecord {
  const foods = record.meals.flatMap(m => m.foods)
  return { ...record, meals: record.meals.map(m => ({ ...m, totalCalories:+m.foods.reduce((s,f)=>s+f.calories,0).toFixed(1),protein:+m.foods.reduce((s,f)=>s+f.protein,0).toFixed(1),carbs:+m.foods.reduce((s,f)=>s+f.carbs,0).toFixed(1),fat:+m.foods.reduce((s,f)=>s+f.fat,0).toFixed(1),source:m.source??'demo' })), totalCalories:+foods.reduce((s,f)=>s+f.calories,0).toFixed(1), protein:+foods.reduce((s,f)=>s+f.protein,0).toFixed(1), carbs:+foods.reduce((s,f)=>s+f.carbs,0).toFixed(1), fat:+foods.reduce((s,f)=>s+f.fat,0).toFixed(1) }
}
