import type { RecognitionResult } from '../types'
import { uid } from '../utils'

const demoResult = (): RecognitionResult => ({ mealName: '鸡胸肉米饭套餐', confidence: .86, mode: 'demo', items: [
  { id: uid(), name: '鸡胸肉', grams: 120, kcalPer100g: 165, proteinPer100g:31, carbsPer100g:0, fatPer100g:3.6, calories: 198, protein: 37.2, carbs: 0, fat: 4.3, confidence: .92, source: 'demo' },
  { id: uid(), name: '米饭', grams: 180, kcalPer100g: 116, proteinPer100g:2.6, carbsPer100g:25.9, fatPer100g:.3, calories: 208.8, protein: 4.7, carbs: 46.6, fat: .5, confidence: .89, source: 'demo' },
  { id: uid(), name: '西兰花', grams: 80, kcalPer100g: 34, proteinPer100g:2.8, carbsPer100g:6.6, fatPer100g:.4, calories: 27.2, protein: 2.2, carbs: 5.3, fat: .3, confidence: .84, source: 'demo' },
  { id: uid(), name: '煎蛋', grams: 60, kcalPer100g: 150, proteinPer100g:12.5, carbsPer100g:1.2, fatPer100g:11.5, calories: 90, protein: 7.5, carbs: .7, fat: 6.9, confidence: .79, source: 'demo' }
], boxes:{
  '鸡胸肉':{x:8,y:12,width:38,height:34},'米饭':{x:50,y:10,width:40,height:38},'西兰花':{x:10,y:55,width:34,height:30},'煎蛋':{x:55,y:57,width:30,height:28}
} })

export class FoodRecognitionService {
  static async recognize(file: File): Promise<RecognitionResult> {
    const endpoint = import.meta.env.VITE_AI_ENDPOINT as string | undefined
    if (endpoint) try {
      const form = new FormData(); form.append('image', file)
      const response = await fetch(endpoint, { method: 'POST', body: form })
      if (!response.ok) throw new Error('AI request failed')
      const data = await response.json() as RecognitionResult
      return { ...data, mode: 'real', items: data.items.map(i => ({ ...i, id: i.id || uid(), proteinPer100g:i.proteinPer100g??(i.grams?i.protein*100/i.grams:0),carbsPer100g:i.carbsPer100g??(i.grams?i.carbs*100/i.grams:0),fatPer100g:i.fatPer100g??(i.grams?i.fat*100/i.grams:0), source: 'ai' })) }
    } catch { /* Graceful fallback keeps classroom demos reliable. */ }
    await new Promise(resolve => setTimeout(resolve, 1400))
    return demoResult()
  }
}
