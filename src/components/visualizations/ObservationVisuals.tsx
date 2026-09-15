import { useMemo, type CSSProperties } from "react";
import { hierarchy, treemap } from "d3";
import type { DailyRecord, NutritionTarget } from "../../types";
import {
  getCumulativeIntake,
  getFoodTreemap,
  getMacroEnergy,
  getMacroHeatmap,
  getMacroSevenDayStats,
  getMealBoxPlot,
  getMealTimes,
  getMonthlyDeviation,
  getWeeklyTrend,
} from "../../data/selectors";

const names = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
  protein: "蛋白质",
  carbs: "碳水",
  fat: "脂肪",
};
const colors = {
  breakfast: "#e8b86c",
  lunch: "#e76f51",
  dinner: "#7167d9",
  snack: "#7ca59b",
  protein: "#f06445",
  carbs: "#7167e8",
  fat: "#e6c941",
};
const points = (values: { x: number; y: number }[]) =>
  values.map((p) => `${p.x},${p.y}`).join(" ");
export function CalorieBudgetStrip({
  actual,
  target,
}: {
  actual: number;
  target: number;
}) {
  const pct = Math.min(125, (actual / Math.max(1, target)) * 100),
    remaining = Math.round(target - actual);
  return (
    <div className="budget-strip">
      <div className="budget-scale">
        <i style={{ width: `${pct / 1.25}%` }} />
        <b style={{ left: "80%" }} />
        <span style={{ left: `${Math.min(100, pct / 1.25)}%` }}>
          {Math.round(actual)}
        </span>
      </div>
      <div className="budget-legend">
        <span>0</span>
        <strong>
          {remaining >= 0
            ? `还可摄入 ${remaining}`
            : `已超出 ${Math.abs(remaining)}`}{" "}
          千卡
        </strong>
        <span>目标 {target}</span>
        <span>125%</span>
      </div>
    </div>
  );
}
export function CumulativeIntakeChart({
  record,
  target,
}: {
  record: DailyRecord;
  target: number;
}) {
  const data = getCumulativeIntake(record),
    path = points([
      { x: 28, y: 170 },
      ...data.map((d) => ({
        x: 28 + (d.minutes / 1440) * 572,
        y:
          170 -
          (d.cumulative /
            Math.max(target * 1.15, ...data.map((v) => v.cumulative), 1)) *
            142,
      })),
    ]);
  return (
    <svg
      className="observation-chart"
      viewBox="0 0 630 205"
      role="img"
      aria-label="一日累计热量曲线"
    >
      <line x1="28" x2="600" y1="170" y2="170" />
      <line className="target-line" x1="28" x2="600" y1="47" y2="47" />
      <polyline points={path} className="data-line" />
      {data.map((d) => (
        <g key={d.id}>
          <circle
            cx={28 + (d.minutes / 1440) * 572}
            cy={
              170 -
              (d.cumulative /
                Math.max(target * 1.15, ...data.map((v) => v.cumulative), 1)) *
                142
            }
            r="5"
          />
          <text x={28 + (d.minutes / 1440) * 572} y="194" textAnchor="middle">
            {d.time}
          </text>
        </g>
      ))}
      <text x="596" y="40" textAnchor="end">
        目标 {target}
      </text>
    </svg>
  );
}
export function MacroBullets({
  record,
  records,
  target,
}: {
  record: DailyRecord;
  records: DailyRecord[];
  target: NutritionTarget;
}) {
  const stats = getMacroSevenDayStats(records),
    items = [
      ["protein", record.protein, target.proteinTarget],
      ["carbs", record.carbs, target.carbTarget],
      ["fat", record.fat, target.fatTarget],
    ] as const;
  return (
    <div className="macro-bullets">
      {items.map(([key, actual, goal]) => {
        const max = Math.max(goal * 1.35, stats[key].max, 1);
        return (
          <article key={key}>
            <header>
              <b>{names[key]}</b>
              <strong>
                {Math.round(actual)}
                <small> / {goal} 克</small>
              </strong>
            </header>
            <div>
              <i
                className={key}
                style={{ width: `${Math.min(100, (actual / max) * 100)}%` }}
              />
              <em
                style={{
                  left: `${(stats[key].min / max) * 100}%`,
                  width: `${Math.max(2, ((stats[key].max - stats[key].min) / max) * 100)}%`,
                }}
              />
              <b style={{ left: `${(goal / max) * 100}%` }} />
            </div>
            <p>
              七日 {Math.round(stats[key].min)}–{Math.round(stats[key].max)} 克
              · 平均 {Math.round(stats[key].average)} 克
            </p>
          </article>
        );
      })}
    </div>
  );
}
export function MacroEnergyComposition({ record }: { record: DailyRecord }) {
  const data = getMacroEnergy(record),
    items = [
      ["protein", data.protein, data.proteinShare, 4],
      ["carbs", data.carbs, data.carbsShare, 4],
      ["fat", data.fat, data.fatShare, 9],
    ] as const;
  return (
    <div className="macro-energy">
      <div>
        {items.map(([key, , share]) => (
          <i key={key} className={key} style={{ width: `${share}%` }}>
            <span>{Math.round(share)}%</span>
          </i>
        ))}
      </div>
      {items.map(([key, kcal, , factor]) => (
        <article key={key}>
          <b>{names[key]}</b>
          <span>
            {Math.round(record[key])}克 × {factor}
          </span>
          <strong>{Math.round(kcal)} 千卡</strong>
        </article>
      ))}
    </div>
  );
}
export function FoodContributionTreemap({ record }: { record: DailyRecord }) {
  const nodes = useMemo(() => {
    const root = hierarchy<any>({ children: getFoodTreemap(record) }).sum(
      (d) => d.value ?? 0,
    );
    treemap<any>().size([620, 260]).paddingInner(3)(root);
    return root.leaves();
  }, [record]);
  return (
    <svg
      className="food-treemap"
      viewBox="0 0 620 260"
      role="img"
      aria-label="食物热量贡献矩形树图"
    >
      {nodes.map((node: any, index) => (
        <g key={node.data.id}>
          <rect
            x={node.x0}
            y={node.y0}
            width={node.x1 - node.x0}
            height={node.y1 - node.y0}
            fill={Object.values(colors)[index % Object.values(colors).length]}
          />
          {node.x1 - node.x0 > 58 && (
            <>
              <text x={node.x0 + 9} y={node.y0 + 21}>
                {node.data.name}
              </text>
              <text x={node.x0 + 9} y={node.y0 + 39}>
                {Math.round(node.value)} 千卡
              </text>
            </>
          )}
        </g>
      ))}
    </svg>
  );
}
export function WeeklyTargetBand({
  records,
  target,
  selectedDate,
  onSelect,
}: {
  records: DailyRecord[];
  target: number;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const data = getWeeklyTrend(records, target),
    max = Math.max(target * 1.25, ...data.map((d) => d.actual), 1),
    x = (i: number) => 45 + i * (540 / Math.max(1, data.length - 1)),
    y = (v: number) => 170 - (v / max) * 135;
  return (
    <svg
      className="observation-chart weekly-band"
      viewBox="0 0 630 210"
      role="img"
      aria-label="七日热量目标带"
    >
      <path
        className="target-band"
        d={`M ${data.map((d, i) => `${x(i)} ${y(d.upper)}`).join(" L ")} L ${[
          ...data,
        ]
          .reverse()
          .map((d, i) => `${x(data.length - 1 - i)} ${y(d.lower)}`)
          .join(" L ")} Z`}
      />
      <line
        className="target-line"
        x1="45"
        x2="585"
        y1={y(target)}
        y2={y(target)}
      />
      <polyline
        className="data-line"
        points={points(data.map((d, i) => ({ x: x(i), y: y(d.actual) })))}
      />
      {data.map((d, i) => (
        <g
          key={d.date}
          className={d.date === selectedDate ? "selected" : ""}
          onClick={() => onSelect(d.date)}
        >
          <circle cx={x(i)} cy={y(d.actual)} r="7" />
          <text x={x(i)} y="196" textAnchor="middle">
            {d.date.slice(5)}
          </text>
        </g>
      ))}
    </svg>
  );
}
export function WeeklyMealStack({
  records,
  target,
}: {
  records: DailyRecord[];
  target: number;
}) {
  const data = getWeeklyTrend(records, target),
    max = Math.max(...data.map((d) => d.actual), 1);
  return (
    <div className="meal-stack">
      {data.map((day) => (
        <article key={day.date}>
          <div>
            {day.meals.map((meal) => (
              <i
                key={meal.type}
                className={meal.type}
                style={{ height: `${(meal.calories / max) * 100}%` }}
                title={`${names[meal.type]} ${Math.round(meal.calories)} 千卡`}
              />
            ))}
          </div>
          <span>{day.date.slice(-2)}</span>
        </article>
      ))}
    </div>
  );
}
export function MonthlyDeviationChart({
  records,
  target,
}: {
  records: DailyRecord[];
  target: number;
}) {
  const data = getMonthlyDeviation(records, target),
    max = Math.max(...data.map((d) => Math.abs(d.deviation)), 1);
  return (
    <div className="deviation-lollipops">
      {data.map((day) => (
        <i
          key={day.date}
          className={day.deviation >= 0 ? "over" : "under"}
          style={{
            height: `${Math.max(3, (Math.abs(day.deviation) / max) * 46)}%`,
            transform: `translateY(${day.deviation >= 0 ? "-100%" : "0"})`,
          }}
          title={`${day.date} ${day.deviation >= 0 ? "+" : ""}${Math.round(day.deviation)} 千卡`}
        />
      ))}
    </div>
  );
}
export function MacroHeatmap({
  records,
  target,
}: {
  records: DailyRecord[];
  target: NutritionTarget;
}) {
  const data = getMacroHeatmap(records, target);
  return (
    <div className="macro-heatmap">
      <span />
      <>
        {getWeeklyTrend(records, target.targetCalories).map((day) => (
          <b key={day.date}>{day.date.slice(-2)}</b>
        ))}
      </>
      {(["protein", "carbs", "fat"] as const).map((key) => (
        <div className="heat-row" key={key}>
          <strong>{names[key]}</strong>
          {data
            .filter((cell) => cell.macro === key)
            .map((cell) => (
              <i
                key={cell.date}
                style={{ "--heat": Math.min(1.3, cell.value) } as CSSProperties}
              >
                <span>{Math.round(cell.value * 100)}%</span>
              </i>
            ))}
        </div>
      ))}
    </div>
  );
}
export function MealDistributionBoxPlot({
  records,
}: {
  records: DailyRecord[];
}) {
  const data = getMealBoxPlot(records),
    max = Math.max(...data.map((d) => d.max), 1);
  return (
    <div className="box-plots">
      {data.map((item) => (
        <article key={item.type}>
          <span>{names[item.type]}</span>
          <div>
            <i
              style={{
                left: `${(item.min / max) * 100}%`,
                width: `${((item.max - item.min) / max) * 100}%`,
              }}
            />
            <b
              style={{
                left: `${(item.q1 / max) * 100}%`,
                width: `${((item.q3 - item.q1) / max) * 100}%`,
              }}
            />
            <em style={{ left: `${(item.median / max) * 100}%` }} />
          </div>
          <strong>{Math.round(item.median)} 千卡</strong>
        </article>
      ))}
    </div>
  );
}
export function MealRhythmPolar({
  record,
  records,
}: {
  record: DailyRecord;
  records: DailyRecord[];
}) {
  const meals = getMealTimes(record),
    week = records.slice(-7),
    avg = (type: string) => {
      const values = week.flatMap((r) =>
        getMealTimes(r)
          .filter((m) => m.type === type)
          .map((m) => m.minutes),
      );
      return values.reduce((s, v) => s + v, 0) / Math.max(1, values.length);
    };
  const pos = (minutes: number, r = 92) => ({
    x: 120 + Math.sin((minutes / 1440) * Math.PI * 2) * r,
    y: 120 - Math.cos((minutes / 1440) * Math.PI * 2) * r,
  });
  return (
    <svg
      className="rhythm-polar"
      viewBox="0 0 240 240"
      role="img"
      aria-label="24小时饮食节律"
    >
      <circle cx="120" cy="120" r="92" />
      <circle cx="120" cy="120" r="68" />
      {[0, 6, 12, 18].map((hour) => {
        const p = pos(hour * 60, 105);
        return (
          <text key={hour} x={p.x} y={p.y} textAnchor="middle">
            {hour}:00
          </text>
        );
      })}
      {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => {
        const p = pos(avg(type), 76);
        return (
          <circle key={type} className="average" cx={p.x} cy={p.y} r="3" />
        );
      })}
      {meals.map((meal) => {
        const p = pos(meal.minutes);
        return (
          <g key={meal.id}>
            <circle
              className={meal.type}
              cx={p.x}
              cy={p.y}
              r={7 + Math.sqrt(meal.calories) / 3}
            />
            <title>
              {names[meal.type]} {meal.time} · {Math.round(meal.calories)} 千卡
            </title>
          </g>
        );
      })}
    </svg>
  );
}
