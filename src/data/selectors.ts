import type {
  DailyRecord,
  FoodItem,
  MealType,
  NutritionTarget,
} from "../types";
import { foodDatabase } from "./foods";

const mealTypes: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const safe = (value: number | undefined) =>
  Number.isFinite(value) ? Math.max(0, value ?? 0) : 0;
export const getDailyNutrition = (record?: DailyRecord) => ({
  calories: safe(record?.totalCalories),
  protein: safe(record?.protein),
  carbs: safe(record?.carbs),
  fat: safe(record?.fat),
});
export const getDailyCalories = (record?: DailyRecord) =>
  getDailyNutrition(record).calories;
export const getMealDistribution = (record?: DailyRecord) =>
  mealTypes.map((type) => {
    const meals = record?.meals.filter((meal) => meal.type === type) ?? [];
    return {
      type,
      calories: +meals
        .reduce((sum, meal) => sum + safe(meal.totalCalories), 0)
        .toFixed(1),
      protein: +meals
        .reduce((sum, meal) => sum + safe(meal.protein), 0)
        .toFixed(1),
      carbs: +meals.reduce((sum, meal) => sum + safe(meal.carbs), 0).toFixed(1),
      fat: +meals.reduce((sum, meal) => sum + safe(meal.fat), 0).toFixed(1),
      count: meals.length,
    };
  });
export const getFoodDistribution = (record?: DailyRecord) => {
  const map = new Map<string, FoodItem>();
  for (const food of record?.meals.flatMap((meal) => meal.foods) ?? []) {
    const key = food.foodDefinitionId ?? food.name;
    const current = map.get(key);
    map.set(
      key,
      current
        ? {
            ...current,
            grams: current.grams + safe(food.grams),
            calories: current.calories + safe(food.calories),
            protein: current.protein + safe(food.protein),
            carbs: current.carbs + safe(food.carbs),
            fat: current.fat + safe(food.fat),
          }
        : { ...food },
    );
  }
  return [...map.values()].sort((a, b) => b.calories - a.calories);
};
export const getMacroEnergyRatio = (record?: DailyRecord) => {
  const protein = safe(record?.protein) * 4,
    carbs = safe(record?.carbs) * 4,
    fat = safe(record?.fat) * 9,
    total = Math.max(1, protein + carbs + fat);
  return {
    protein,
    carbs,
    fat,
    total,
    proteinRatio: protein / total,
    carbsRatio: carbs / total,
    fatRatio: fat / total,
  };
};
export const getCalorieDeviation = (
  record: DailyRecord | undefined,
  target: number,
) => getDailyCalories(record) - safe(target);
export const getConsistency = (
  record: DailyRecord | undefined,
  target: number,
) =>
  target > 0
    ? Math.max(
        0,
        Math.round(
          (1 - Math.abs(getCalorieDeviation(record, target)) / target) * 100,
        ),
      )
    : 0;
export const getWeeklyRecords = (records: DailyRecord[], endDate?: string) => {
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));
  const end = endDate ? sorted.findIndex((r) => r.date === endDate) : -1;
  return sorted.slice(
    Math.max(0, (end >= 0 ? end + 1 : sorted.length) - 7),
    end >= 0 ? end + 1 : undefined,
  );
};
export const getMonthlyRecords = (records: DailyRecord[]) =>
  [...records].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
export const getMealRhythm = (records: DailyRecord[]) =>
  records.flatMap((record, dayIndex) =>
    record.meals.map((meal) => {
      const time = new Date(meal.timestamp);
      return {
        id: meal.id,
        date: record.date,
        dayIndex,
        type: meal.type,
        minutes: time.getHours() * 60 + time.getMinutes(),
        calories: safe(meal.totalCalories),
        share: record.totalCalories
          ? meal.totalCalories / record.totalCalories
          : 0,
      };
    }),
  );
export const getFoodScatterData = (records: DailyRecord[]) => {
  const map = new Map<
    string,
    {
      id: string;
      name: string;
      kcalDensity: number;
      proteinDensity: number;
      grams: number;
      calories: number;
      dates: Set<string>;
    }
  >();
  for (const record of records)
    for (const food of record.meals.flatMap((m) => m.foods)) {
      const key = food.foodDefinitionId ?? food.name;
      const item = map.get(key) ?? {
        id: key,
        name: food.name,
        kcalDensity: safe(food.kcalPer100g),
        proteinDensity: safe(food.proteinPer100g),
        grams: 0,
        calories: 0,
        dates: new Set<string>(),
      };
      item.grams += safe(food.grams);
      item.calories += safe(food.calories);
      item.dates.add(record.date);
      map.set(key, item);
    }
  return [...map.values()]
    .map((item) => ({ ...item, days: item.dates.size }))
    .sort((a, b) => b.grams - a.grams);
};
export const getTernaryPoint = (record?: DailyRecord) => {
  const macro = getMacroEnergyRatio(record);
  const protein = { x: 0.5, y: 0 },
    carbs = { x: 0, y: 1 },
    fat = { x: 1, y: 1 };
  return {
    x:
      protein.x * macro.proteinRatio +
      carbs.x * macro.carbsRatio +
      fat.x * macro.fatRatio,
    y:
      protein.y * macro.proteinRatio +
      carbs.y * macro.carbsRatio +
      fat.y * macro.fatRatio,
    ...macro,
  };
};
export const getTargetTernaryPoint = (target: NutritionTarget) => {
  const protein = target.proteinTarget * 4,
    carbs = target.carbTarget * 4,
    fat = target.fatTarget * 9,
    total = Math.max(1, protein + carbs + fat);
  return {
    x: 0.5 * (protein / total) + fat / total,
    y: (carbs + fat) / total,
    proteinRatio: protein / total,
    carbsRatio: carbs / total,
    fatRatio: fat / total,
  };
};
export const getEnergyBalance = (
  record: DailyRecord | undefined,
  target: NutritionTarget,
) => ({
  intake: getDailyCalories(record),
  expenditure: target.tdee,
  goal: target.targetCalories,
  remaining: target.targetCalories - getDailyCalories(record),
});
export const getSelectedDayData = (
  records: DailyRecord[],
  selectedDate: string,
) => records.find((r) => r.date === selectedDate);
export const getMacroRatios = (
  record: DailyRecord | undefined,
  target: NutritionTarget,
) => [
  target.targetCalories
    ? (getDailyCalories(record) / target.targetCalories) * 100
    : 0,
  target.proteinTarget
    ? ((record?.protein ?? 0) / target.proteinTarget) * 100
    : 0,
  target.carbTarget ? ((record?.carbs ?? 0) / target.carbTarget) * 100 : 0,
  target.fatTarget ? ((record?.fat ?? 0) / target.fatTarget) * 100 : 0,
];
export const getDeviationSummary = (records: DailyRecord[], target: number) => {
  const deviations = getMonthlyRecords(records).map((record) =>
    getCalorieDeviation(record, target),
  );
  const within = deviations.filter(
    (value) => Math.abs(value) <= target * 0.1,
  ).length;
  return {
    within,
    average: Math.round(
      deviations.reduce((sum, value) => sum + value, 0) /
        Math.max(1, deviations.length),
    ),
    maximum: Math.round(Math.max(0, ...deviations)),
    minimum: Math.round(Math.min(0, ...deviations)),
  };
};

export const getRemainingCalories = (
  record: DailyRecord | undefined,
  target: number,
) => Math.round(safe(target) - getDailyCalories(record));
export const getMealContribution = getMealDistribution;
export const getMealTimes = (record?: DailyRecord) =>
  [...(record?.meals ?? [])]
    .map((meal) => {
      const date = new Date(meal.timestamp);
      return {
        id: meal.id,
        type: meal.type,
        time: date.toTimeString().slice(0, 5),
        minutes: date.getHours() * 60 + date.getMinutes(),
        calories: meal.totalCalories,
      };
    })
    .sort((a, b) => a.minutes - b.minutes);
export const getEatingWindow = (record?: DailyRecord) => {
  const times = getMealTimes(record),
    final = times[times.length - 1];
  const first = times[0]?.minutes ?? 0,
    last = final?.minutes ?? 0;
  return {
    first,
    last,
    minutes: Math.max(0, last - first),
    firstLabel: times[0]?.time ?? "--:--",
    lastLabel: final?.time ?? "--:--",
  };
};
export const getCumulativeIntake = (record?: DailyRecord) => {
  let cumulative = 0;
  return getMealTimes(record).map((meal) => ({
    ...meal,
    cumulative: Math.round((cumulative += meal.calories)),
  }));
};
export const getMacroGrams = (record?: DailyRecord) => ({
  protein: safe(record?.protein),
  carbs: safe(record?.carbs),
  fat: safe(record?.fat),
});
export const getMacroEnergy = (record?: DailyRecord) => {
  const grams = getMacroGrams(record);
  const protein = grams.protein * 4,
    carbs = grams.carbs * 4,
    fat = grams.fat * 9,
    total = Math.max(1, protein + carbs + fat);
  return {
    protein,
    carbs,
    fat,
    total,
    proteinShare: (protein / total) * 100,
    carbsShare: (carbs / total) * 100,
    fatShare: (fat / total) * 100,
  };
};
export const getMacroCompletion = (
  record: DailyRecord | undefined,
  target: NutritionTarget,
) => ({
  protein: { actual: safe(record?.protein), target: target.proteinTarget },
  carbs: { actual: safe(record?.carbs), target: target.carbTarget },
  fat: { actual: safe(record?.fat), target: target.fatTarget },
});
export const getFoodTreemap = (record?: DailyRecord) => {
  const definitions = new Map(
    foodDatabase.map((food) => [food.id, food.category]),
  );
  return getFoodDistribution(record).map((food) => ({
    ...food,
    value: food.calories,
    category: definitions.get(food.foodDefinitionId ?? "") ?? "其他",
  }));
};
export const getWeeklyTrend = (
  records: DailyRecord[],
  target: number,
  endDate?: string,
) =>
  getWeeklyRecords(records, endDate).map((record) => ({
    date: record.date,
    actual: record.totalCalories,
    target,
    lower: target * 0.9,
    upper: target * 1.1,
    meals: getMealDistribution(record),
  }));
export const getTargetBand = (target: number) => ({
  target,
  lower: target * 0.9,
  upper: target * 1.1,
});
export const getDailyDeviation = (
  record: DailyRecord | undefined,
  target: number,
) => ({
  actual: getDailyCalories(record),
  target,
  deviation: getCalorieDeviation(record, target),
  consistency: getConsistency(record, target),
});
export const getMonthlyDeviation = (records: DailyRecord[], target: number) =>
  getMonthlyRecords(records).map((record) => ({
    date: record.date,
    ...getDailyDeviation(record, target),
  }));
export const getConsistencyScore = getConsistency;
const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const index = (sorted.length - 1) * p,
    lower = Math.floor(index),
    weight = index - lower;
  return (
    sorted[lower] +
    ((sorted[lower + 1] ?? sorted[lower]) - sorted[lower]) * weight
  );
};
export const getMealBoxPlot = (records: DailyRecord[]) =>
  mealTypes.map((type) => {
    const values = records.flatMap((record) =>
      getMealDistribution(record)
        .filter((meal) => meal.type === type && meal.calories > 0)
        .map((meal) => meal.calories),
    );
    return {
      type,
      min: Math.min(0, ...values),
      q1: quantile(values, 0.25),
      median: quantile(values, 0.5),
      q3: quantile(values, 0.75),
      max: Math.max(0, ...values),
      count: values.length,
    };
  });
export const getMacroHeatmap = (
  records: DailyRecord[],
  target: NutritionTarget,
) =>
  getWeeklyRecords(records).flatMap((record, column) => [
    {
      macro: "protein",
      column,
      date: record.date,
      value: target.proteinTarget ? record.protein / target.proteinTarget : 0,
    },
    {
      macro: "carbs",
      column,
      date: record.date,
      value: target.carbTarget ? record.carbs / target.carbTarget : 0,
    },
    {
      macro: "fat",
      column,
      date: record.date,
      value: target.fatTarget ? record.fat / target.fatTarget : 0,
    },
  ]);
export const getCategoryDistribution = (records: DailyRecord[]) => {
  const definitions = new Map(
    foodDatabase.map((food) => [food.id, food.category]),
  );
  const map = new Map<
    string,
    { category: string; calories: number; count: number }
  >();
  for (const record of records)
    for (const food of record.meals.flatMap((meal) => meal.foods)) {
      const category = definitions.get(food.foodDefinitionId ?? "") ?? "其他";
      const current = map.get(category) ?? { category, calories: 0, count: 0 };
      current.calories += food.calories;
      current.count += 1;
      map.set(category, current);
    }
  return [...map.values()].sort((a, b) => b.calories - a.calories);
};
export const getMacroSevenDayStats = (records: DailyRecord[]) => {
  const week = getWeeklyRecords(records);
  const values = (key: "protein" | "carbs" | "fat") =>
    week.map((record) => safe(record[key]));
  return Object.fromEntries(
    (["protein", "carbs", "fat"] as const).map((key) => {
      const list = values(key);
      return [
        key,
        {
          min: Math.min(0, ...list),
          max: Math.max(0, ...list),
          average:
            list.reduce((sum, value) => sum + value, 0) /
            Math.max(1, list.length),
        },
      ];
    }),
  ) as Record<
    "protein" | "carbs" | "fat",
    { min: number; max: number; average: number }
  >;
};
export const getInsights = (
  records: DailyRecord[],
  target: NutritionTarget,
) => {
  const week = getWeeklyRecords(records),
    month = getMonthlyRecords(records),
    box = getMealBoxPlot(month),
    largest = box.reduce((a, b) => (b.median > a.median ? b : a), box[0]);
  const late = getMealRhythm(week).filter(
    (meal) => meal.type === "dinner" && meal.minutes >= 20 * 60,
  ).length;
  return [
    `近 7 天有 ${week.filter((record) => Math.abs(record.totalCalories - target.targetCalories) <= target.targetCalories * 0.1).length} 天落在目标 ±10% 内。`,
    `${largest?.type === "breakfast" ? "早餐" : largest?.type === "lunch" ? "午餐" : largest?.type === "dinner" ? "晚餐" : "加餐"}的月度中位热量最高。`,
    late
      ? `近 7 天有 ${late} 次晚餐发生在 20:00 后。`
      : "近 7 天晚餐时间相对稳定。",
  ];
};
