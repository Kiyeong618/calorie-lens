export type Sex = 'male' | 'female'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme'
export type Goal = 'lose' | 'maintain' | 'gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodCategory = '主食'|'肉类'|'海鲜'|'蛋类'|'乳制品'|'蔬菜'|'水果'|'豆制品'|'坚果'|'饮料'|'零食'|'调味 / 其他'|'蛋奶'|'其他'
export type FoodSource = 'ai'|'manual'|'custom'|'recent'|'demo'

export interface UserProfile { sex: Sex; age: number; height: number; weight: number; activityLevel: ActivityLevel; goal: Goal }
export interface NutritionTarget { bmi: number; bmr: number; tdee: number; targetCalories: number; proteinTarget: number; carbTarget: number; fatTarget: number }
export interface ServingOption { name:string; grams:number }
export interface FoodDefinition { id:string; name:string; aliases:string[]; category:FoodCategory; defaultUnit:string; kcalPer100g:number; proteinPer100g:number; carbsPer100g:number; fatPer100g:number; fiberPer100g?:number; servings?:ServingOption[]; favorite?:boolean }
export interface FoodItem { id:string; foodDefinitionId?:string; name:string; grams:number; kcalPer100g:number; proteinPer100g:number; carbsPer100g:number; fatPer100g:number; calories:number; protein:number; carbs:number; fat:number; source:FoodSource; confidence?:number }
export interface BoundingBox { x: number; y: number; width: number; height: number }
export interface Meal { id:string; date:string; timestamp:string; type:MealType; image?:string; foods:FoodItem[]; totalCalories:number; protein:number; carbs:number; fat:number; source:FoodSource }
export interface DailyRecord { date: string; meals: Meal[]; totalCalories: number; protein: number; carbs: number; fat: number; targetCalories?: number; calorieDeviation?: number; consistencyScore?: number }
export interface RecognitionResult { mealName: string; confidence: number; items: FoodItem[]; mode: 'real' | 'demo'; boxes?: Record<string, BoundingBox> }
export interface MealTemplate { id:string; name:string; foods:FoodItem[]; type:MealType; createdAt:string }
