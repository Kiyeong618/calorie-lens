import { motion } from "motion/react";
import type { ReactNode } from "react";
import { FoodGalaxy } from "../components/visualizations/AnalyticVisuals";
import {
  CalorieBudgetStrip,
  CumulativeIntakeChart,
  FoodContributionTreemap,
  MacroBullets,
  MacroEnergyComposition,
  MacroHeatmap,
  MealDistributionBoxPlot,
  MealRhythmPolar,
  MonthlyDeviationChart,
  WeeklyMealStack,
  WeeklyTargetBand,
} from "../components/visualizations/ObservationVisuals";
import { useAppUI } from "../context/AppUIContext";
import {
  getDailyDeviation,
  getDeviationSummary,
  getEatingWindow,
  getInsights,
  getMonthlyRecords,
  getWeeklyRecords,
} from "../data/selectors";
import { useAppData } from "../hooks/useAppData";
import type { DailyRecord } from "../types";
import { todayKey } from "../utils";
function Module({
  index,
  title,
  question,
  children,
  wide = false,
}: {
  index: string;
  title: string;
  question: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`observation-module ${wide ? "wide" : ""}`}>
      <header>
        <span>{index}</span>
        <h2>{title}</h2>
        <p>{question}</p>
      </header>
      {children}
    </section>
  );
}
function Formula({
  title,
  symbolic,
  values,
  result,
  note,
}: {
  title: string;
  symbolic: string;
  values: string;
  result: string;
  note?: string;
}) {
  return (
    <details className="formula-panel">
      <summary>
        <span>{title}</span>
        <b>怎么算的？</b>
      </summary>
      <div>
        <code>{symbolic}</code>
        <p>{values}</p>
        <strong>{result}</strong>
        {note && <small>{note}</small>}
      </div>
    </details>
  );
}
export function Trends() {
  const { records, target } = useAppData(),
    { selectedDate, setSelectedDate } = useAppUI();
  const fallback: DailyRecord = {
    date: todayKey(),
    meals: [],
    totalCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  const selected =
      records.find((r) => r.date === selectedDate) ??
    records[records.length - 1] ??
      fallback,
    week = getWeeklyRecords(records, selected.date),
    month = getMonthlyRecords(records),
    day = getDailyDeviation(selected, target.targetCalories),
    window = getEatingWindow(selected),
    summary = getDeviationSummary(records, target.targetCalories),
    insights = getInsights(records, target);
  let stable = 0;
  for (const r of [...month].reverse()) {
    if (
      Math.abs(r.totalCalories - target.targetCalories) >
      target.targetCalories * 0.1
    )
      break;
    stable++;
  }
  return (
    <motion.main
      className="observation-room"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="data-poster">
        <span>数据观测室 · {selected.date.split("-").join(" / ")}</span>
        <div>
          <h1>{Math.round(selected.totalCalories)}</h1>
          <b>
            千卡
            <br />
            今日摄入
          </b>
        </div>
        <aside>
          <p>
            目标 <strong>{target.targetCalories}</strong>
          </p>
          <p>
            差值{" "}
            <strong>
              {day.deviation >= 0 ? "+" : ""}
              {Math.round(day.deviation)}
            </strong>
          </p>
          <p>
            完成度{" "}
            <strong>
              {Math.round(
                (selected.totalCalories / Math.max(1, target.targetCalories)) *
                  100,
              )}
              %
            </strong>
          </p>
          <p>
            一致性 <strong>{day.consistency}%</strong>
          </p>
        </aside>
        <nav>
          {week.map((r) => (
            <button
              key={r.date}
              className={r.date === selected.date ? "active" : ""}
              onClick={() => setSelectedDate(r.date)}
            >
              <span>
                {new Date(`${r.date}T12:00:00`).toLocaleDateString("zh-CN", {
                  weekday: "short",
                })}
              </span>
              <b>{r.date.slice(-2)}</b>
            </button>
          ))}
        </nav>
      </header>
      <div className="observation-grid">
        <Module
          index="01"
          title="今日能量预算"
          question="今天到底还能吃多少？"
          wide
        >
          <CalorieBudgetStrip
            actual={selected.totalCalories}
            target={target.targetCalories}
          />
          <Formula
            title="剩余热量"
            symbolic="每日目标 − 今日摄入"
            values={`${target.targetCalories} − ${Math.round(selected.totalCalories)}`}
            result={`${Math.round(target.targetCalories - selected.totalCalories)} 千卡`}
          />
        </Module>
        <Module
          index="02"
          title="一日累计摄入"
          question="热量如何在一天中逐餐累积？"
        >
          <CumulativeIntakeChart
            record={selected}
            target={target.targetCalories}
          />
        </Module>
        <Module
          index="03"
          title="24 小时饮食节律"
          question="今天吃得比自己的习惯早，还是晚？"
        >
          <div className="rhythm-wrap">
            <MealRhythmPolar record={selected} records={week} />
            <div>
              <strong>
                {Math.floor(window.minutes / 60)} 小时 {window.minutes % 60} 分
              </strong>
              <span>进食窗口</span>
              <p>
                首餐 {window.firstLabel}
                <br />
                末餐 {window.lastLabel}
              </p>
            </div>
          </div>
        </Module>
        <Module
          index="04"
          title="三大营养素目标轨"
          question="今天与目标、七日范围分别处于哪里？"
          wide
        >
          <MacroBullets record={selected} records={week} target={target} />
          <MacroEnergyComposition record={selected} />
        </Module>
        <Module
          index="05"
          title="食物密度散点"
          question="食物具有怎样的热量与蛋白质密度？"
        >
          <FoodGalaxy records={[selected]} />
        </Module>
        <Module
          index="06"
          title="食物热量贡献"
          question="今天的热量主要来自哪些食物？"
        >
          <FoodContributionTreemap record={selected} />
        </Module>
        <Module
          index="07"
          title="七日目标带"
          question="实际摄入何时偏离目标 ±10%？"
          wide
        >
          <WeeklyTargetBand
            records={records}
            target={target.targetCalories}
            selectedDate={selected.date}
            onSelect={setSelectedDate}
          />
          <WeeklyMealStack records={week} target={target.targetCalories} />
        </Module>
        <Module
          index="08"
          title="三十日目标偏差"
          question="一个月中稳定与异常发生在哪里？"
          wide
        >
          <MonthlyDeviationChart
            records={month}
            target={target.targetCalories}
          />
          <div className="deviation-stats">
            <span>
              <b>
                {summary.average >= 0 ? "+" : ""}
                {summary.average}
              </b>
              平均偏差
            </span>
            <span>
              <b>{summary.within}</b>目标范围内天数
            </span>
            <span>
              <b>+{summary.maximum}</b>最大超出
            </span>
            <span>
              <b>{summary.minimum}</b>最大不足
            </span>
            <span>
              <b>{stable}</b>当前连续稳定天数
            </span>
          </div>
          <Formula
            title="一致性分数"
            symbolic="max(0, 1 − |实际 − 目标| ÷ 目标) × 100"
            values={`|${Math.round(selected.totalCalories)} − ${target.targetCalories}| ÷ ${target.targetCalories}`}
            result={`${day.consistency}%`}
            note="这是目标接近度，用于可视化展示，不是医学指标。"
          />
        </Module>
        <Module
          index="09"
          title="一周营养热图"
          question="哪几天的宏量营养明显偏离目标？"
        >
          <MacroHeatmap records={week} target={target} />
        </Module>
        <Module
          index="10"
          title="餐次热量分布"
          question="过去 30 天真正容易吃多的是哪一餐？"
        >
          <MealDistributionBoxPlot records={month} />
        </Module>
        <section className="insight-panel">
          <span>自动观察</span>
          {insights.map((text, index) => (
            <p key={text}>
              <b>0{index + 1}</b>
              {text}
            </p>
          ))}
        </section>
      </div>
    </motion.main>
  );
}
