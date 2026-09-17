import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, Edit3, Plus, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useReducedMotion } from "motion/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CountUp } from "../components/CountUp";
import { ImmersiveScene } from "../components/three/ImmersiveScene";
import { getFreezeProgress } from "../components/three/dataLensMorph";
import { consumeEnergyInjection } from "../data/store";
import {
  getDeviationSummary,
  getMacroEnergyRatio,
  getMealDistribution,
  getMonthlyRecords,
  getWeeklyRecords,
} from "../data/selectors";
import { useAppData } from "../hooks/useAppData";
import { useAppUI } from "../context/AppUIContext";
import type { DailyRecord } from "../types";
import { todayKey } from "../utils";

gsap.registerPlugin(ScrollTrigger);
const mealNames = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
};
const chapterNames = [
  "薄膜",
  "餐次深度",
  "午餐聚焦",
  "食物细胞",
  "营养抽取",
  "营养雕塑",
  "能量平衡",
  "趋势入口",
];

export function Dashboard() {
  const { target, records } = useAppData();
  const { presentation } = useAppUI();
  const reduced = useReducedMotion() ?? false;
  const root = useRef<HTMLDivElement>(null);
  const empty: DailyRecord = {
    date: todayKey(),
    meals: [],
    totalCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
  const today =
    records.find((record) => record.date === todayKey()) ??
    records[records.length - 1] ??
    empty;
  const frozenProgress = getFreezeProgress();
  const [progress, setProgress] = useState(frozenProgress ?? 0);
  const [injection, setInjection] = useState(false);
  const remaining = target.targetCalories - today.totalCalories;
  const meals = getMealDistribution(today).filter((meal) => meal.calories > 0);
  const focusedMeal =
    today.meals.find((meal) => meal.type === "lunch") ??
    [...today.meals].sort((a, b) => b.totalCalories - a.totalCalories)[0];
  const macro = getMacroEnergyRatio(today);
  const week = getWeeklyRecords(records);
  const month = getMonthlyRecords(records);
  const deviation = getDeviationSummary(records, target.targetCalories);
  const active = Math.min(7, Math.floor(progress * 8));
  const weekAverage = Math.round(
    week.reduce((sum, r) => sum + r.totalCalories, 0) /
      Math.max(1, week.length),
  );
  const monthConsistency = Math.round(
    month.reduce((sum, r) => sum + (r.consistencyScore ?? 0), 0) /
      Math.max(1, month.length),
  );
  useLayoutEffect(() => {
    if (frozenProgress !== undefined) {
      setProgress(frozenProgress);
      const frame = requestAnimationFrame(() => {
        const distance =
          document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo(0, distance * frozenProgress);
      });
      return () => cancelAnimationFrame(frame);
    }
    if (!root.current || reduced) {
      setProgress(0);
      return;
    }
    const endTrigger = root.current.querySelector(
      ".scene-month",
    ) as HTMLElement;
    const trigger = ScrollTrigger.create({
      trigger: root.current,
      endTrigger,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.35,
      onUpdate: (self) => setProgress(self.progress),
    });
    return () => trigger.kill();
  }, [frozenProgress, reduced]);
  useEffect(() => {
    if (consumeEnergyInjection() && !reduced) {
      setInjection(true);
      const id = setTimeout(() => setInjection(false), 1150);
      return () => clearTimeout(id);
    }
  }, [reduced]);
  useEffect(() => {
    if (!presentation) return;
    document.documentElement.classList.add("guided-story");
    return () => document.documentElement.classList.remove("guided-story");
  }, [presentation]);
  const stageProgress = useMemo(() => Math.round(progress * 100), [progress]);
  return (
    <div className="immersive-home" ref={root}>
      <ImmersiveScene
        progress={progress}
        record={today}
        target={target}
        reduced={reduced}
      />
      <div className="story-progress">
        <span>{String(active + 1).padStart(2, "0")} / 08</span>
        <div>
          <i style={{ height: `${stageProgress}%` }} />
        </div>
        <b>{chapterNames[active]}</b>
      </div>
      <section className="story-scene scene-opening">
        <div className="story-grid" />
        <div className="scene-kicker">CalorieLens · 个人饮食能量可视化系统</div>
        <h1>
          看见，
          <br />
          你吃下的
          <br />
          <em>能量。</em>
        </h1>
        <a href="#scene-today">
          <ArrowDown />
          滚动进入数据
        </a>
        {injection && (
          <div className="lens-injection">
            <Sparkles />
            新餐食正在进入能量透镜
          </div>
        )}
      </section>
      <section id="scene-today" className="story-scene scene-today">
        <div className="scene-copy left">
          <span>02 / 今天</span>
          <h2>
            一个圆，
            <br />
            装下今天。
          </h2>
        </div>
        <div className="scene-data right">
          <span>今日已摄入</span>
          <strong>
            <CountUp value={today.totalCalories} />
            <small> 千卡</small>
          </strong>
          <div>
            <b>{target.targetCalories}</b>
            <span>今日目标 · 千卡</span>
          </div>
          <div>
            <b>{Math.abs(Math.round(remaining))}</b>
            <span>{remaining >= 0 ? "还可以摄入" : "已经超出"} · 千卡</span>
          </div>
        </div>
      </section>
      <section className="story-scene scene-meals">
        <div className="scene-copy left">
          <span>03 / 一日餐次</span>
          <h2>
            一天，
            <br />
            沿深度展开。
          </h2>
        </div>
        <div className="scene-minimal-data right">
          <span>{focusedMeal ? mealNames[focusedMeal.type] : "午餐"}</span>
          <strong>{Math.round(focusedMeal?.totalCalories ?? 0)} 千卡</strong>
          <small>{meals.length} 个餐次深度</small>
        </div>
      </section>
      <section className="story-scene scene-food">
        <div className="scene-copy right">
          <span>04 / 食物</span>
          <h2>
            午<br />餐
          </h2>
          <strong className="story-primary">
            {Math.round(focusedMeal?.totalCalories ?? 0)} 千卡
          </strong>
          <small>
            {focusedMeal?.timestamp.slice(11, 16) ?? "12:31"} ·{" "}
            {Math.round(
              ((focusedMeal?.totalCalories ?? 0) /
                Math.max(1, today.totalCalories)) *
                100,
            )}
            %
          </small>
        </div>
      </section>
      <section className="story-scene scene-macros">
        <div className="scene-copy left">
          <span>05 / 营养素</span>
          <h2>
            食物溶解成
            <br />
            三条营养流。
          </h2>
        </div>
        <div className="scene-minimal-data macro-minimal right">
          <strong>蛋白质 {Math.round(macro.proteinRatio * 100)}%</strong>
          <span>碳水 {Math.round(macro.carbsRatio * 100)}%</span>
          <small>脂肪 {Math.round(macro.fatRatio * 100)}%</small>
        </div>
      </section>
      <section className="story-scene scene-balance">
        <div className="balance-center">
          <span>06 / 能量平衡</span>
          <strong>{Math.round(today.totalCalories)}</strong>
          <small>今日摄入 · 千卡</small>
          <i />
          <b>{target.targetCalories}</b>
          <small>每日目标 · 千卡</small>
          <Link to="/record">
            <Plus />
            记录这一餐
          </Link>
        </div>
      </section>
      <section className="story-scene scene-week">
        <div className="scene-copy right">
          <span>07 / 过去七天</span>
          <h2>
            七只餐盘，
            <br />
            成为一段地貌。
          </h2>
        </div>
        <div className="week-summary left">
          <strong>{weekAverage}</strong>
          <span>七日平均 · 千卡</span>
          <b>
            {
              week.filter(
                (record) => record.totalCalories > target.targetCalories,
              ).length
            }{" "}
            天
          </b>
          <span>高于每日目标</span>
          <Link to="/trends">
            进入趋势空间 <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="story-scene scene-month">
        <div className="month-ending">
          <span>08 / 三十天</span>
          <h2>
            一餐退入远方，
            <br />
            时间扩大为一个月。
          </h2>
          <div>
            <article>
              <strong>{monthConsistency}%</strong>
              <span>月度平均一致性</span>
            </article>
            <article>
              <strong>{deviation.within}</strong>
              <span>天落在目标 ±10%</span>
            </article>
            <article>
              <strong>
                {deviation.average >= 0 ? "+" : ""}
                {deviation.average}
              </strong>
              <span>平均偏差 · 千卡</span>
            </article>
          </div>
          <Link to="/trends">
            探索完整三十天 <ArrowUpRight />
          </Link>
        </div>
      </section>
      <section className="home-meal-log">
        <header>
          <span>今天的可编辑记录</span>
          <h2>
            数据仍然可以
            <br />
            被你改变。
          </h2>
        </header>
        {today.meals.map((meal) => (
          <article key={meal.id}>
            <time>{new Date(meal.timestamp).toTimeString().slice(0, 5)}</time>
            <div>
              <span>{mealNames[meal.type]}</span>
              <h3>{meal.foods.map((food) => food.name).join("、")}</h3>
            </div>
            <strong>
              {Math.round(meal.totalCalories)}
              <small> 千卡</small>
            </strong>
            <Link
              to={`/record?meal=${meal.id}`}
              aria-label={`编辑${mealNames[meal.type]}`}
            >
              <Edit3 />
            </Link>
          </article>
        ))}
        <Link className="add-from-home" to="/record">
          <Plus />
          新增餐食
        </Link>
      </section>
      <footer className="immersive-footer">
        <b>CalorieLens</b>
        <span>数据用于课程展示，不构成专业营养建议。</span>
        <Link to="/trends">
          时间，让饮食显现规律。 <ArrowUpRight />
        </Link>
      </footer>
    </div>
  );
}
