import { useState, type FormEvent } from "react";
import { Activity, Check, Flame, HeartPulse, Target } from "lucide-react";
import { motion } from "motion/react";
import { getProfile, saveProfile } from "../data/store";
import type { UserProfile } from "../types";
import { bmiLabel, calculateTarget } from "../utils";

const activityLabels: Record<UserProfile["activityLevel"], string> = {
  sedentary: "久坐",
  light: "轻度活动",
  moderate: "中度活动",
  high: "高度活动",
  extreme: "极高活动",
};
const goalLabels: Record<UserProfile["goal"], string> = {
  lose: "温和减脂",
  maintain: "保持状态",
  gain: "稳步增肌",
};

export function Profile() {
  const [form, setForm] = useState<UserProfile>(getProfile);
  const [shown, setShown] = useState(() => calculateTarget(form));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const preview = calculateTarget(form);
  const set = <K extends keyof UserProfile>(key: K, value: UserProfile[K]) =>
    setForm((v) => ({ ...v, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.age < 14 || form.age > 100) next.age = "请输入 14–100 岁";
    if (form.height < 100 || form.height > 230)
      next.height = "请输入 100–230 cm";
    if (form.weight < 25 || form.weight > 300) next.weight = "请输入 25–300 kg";
    setErrors(next);
    if (Object.keys(next).length) return;
    saveProfile(form);
    setShown(preview);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  const activity = Math.max(0, shown.tdee - shown.bmr);
  const activityFactor = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    high: 1.725,
    extreme: 1.9,
  }[form.activityLevel];
  const goalFactor = { lose: 0.85, maintain: 1, gain: 1.1 }[form.goal];
  const stages = [
    {
      icon: <HeartPulse />,
      label: "身体尺度",
      value: `BMI ${shown.bmi}`,
      note: bmiLabel(shown.bmi),
    },
    {
      icon: <Flame />,
      label: "静息生命活动",
      value: `${shown.bmr} 千卡`,
      note: "基础代谢 BMR",
    },
    {
      icon: <Activity />,
      label: "日常活动",
      value: `+ ${activity} 千卡`,
      note: activityLabels[form.activityLevel],
    },
    {
      icon: <Target />,
      label: "你的每日目标",
      value: `${shown.targetCalories} 千卡`,
      note: goalLabels[form.goal],
    },
  ];
  return (
    <motion.div
      className="body-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className="body-hero">
        <p>身体 · 能量基线</p>
        <h1>
          你的身体，
          <br />
          每天需要多少能量？
        </h1>
        <span>
          这里的数字不是判决，而是一把观察日常能量的尺。填写基础数据后，今日与趋势会同步更新。
        </span>
      </header>
      <main className="body-layout">
        <form className="body-form" onSubmit={submit}>
          <div className="body-form-head">
            <span>01 / 你的数据</span>
            <h2>建立个人能量坐标</h2>
            <p>采用 Mifflin–St Jeor 公式进行课程展示级估算。</p>
          </div>
          <label className="body-field">
            <span>生理性别</span>
            <div className="body-segment">
              <button
                type="button"
                className={form.sex === "female" ? "active" : ""}
                onClick={() => set("sex", "female")}
              >
                女性
              </button>
              <button
                type="button"
                className={form.sex === "male" ? "active" : ""}
                onClick={() => set("sex", "male")}
              >
                男性
              </button>
            </div>
          </label>
          <div className="body-number-grid">
            {(
              [
                ["age", "年龄", "岁"],
                ["height", "身高", "厘米"],
                ["weight", "体重", "公斤"],
              ] as const
            ).map(([key, label, unit]) => (
              <label className="body-field" key={key}>
                <span>{label}</span>
                <div className="body-number">
                  <input
                    type="number"
                    step={key === "weight" ? ".1" : "1"}
                    value={form[key]}
                    onChange={(e) => set(key, Number(e.target.value))}
                  />
                  <i>{unit}</i>
                </div>
                {errors[key] && <small>{errors[key]}</small>}
              </label>
            ))}
          </div>
          <label className="body-field">
            <span>活动水平</span>
            <select
              value={form.activityLevel}
              onChange={(e) =>
                set(
                  "activityLevel",
                  e.target.value as UserProfile["activityLevel"],
                )
              }
            >
              <option value="sedentary">久坐 · 很少运动</option>
              <option value="light">轻度 · 每周 1–3 次</option>
              <option value="moderate">中度 · 每周 3–5 次</option>
              <option value="high">高度 · 每周 6–7 次</option>
              <option value="extreme">极高 · 高强度训练</option>
            </select>
          </label>
          <label className="body-field">
            <span>当前目标</span>
            <select
              value={form.goal}
              onChange={(e) =>
                set("goal", e.target.value as UserProfile["goal"])
              }
            >
              <option value="lose">温和减脂 · 目标为 TDEE 的 85%</option>
              <option value="maintain">保持状态 · 目标等于 TDEE</option>
              <option value="gain">稳步增肌 · 目标为 TDEE 的 110%</option>
            </select>
          </label>
          <div className="body-preview">
            <span>预计每日目标</span>
            <strong>
              {preview.targetCalories}
              <small> 千卡</small>
            </strong>
          </div>
          <button className="body-save" type="submit">
            {saved ? (
              <>
                <Check />
                已经同步到全站
              </>
            ) : (
              <>
                保存身体数据 <span>→</span>
              </>
            )}
          </button>
        </form>
        <section className="body-journey">
          <div className="journey-head">
            <span>02 / 能量旅程</span>
            <h2>你的身体，如何抵达每日目标。</h2>
          </div>
          <div className="journey-axis" />
          {stages.map((stage, index) => (
            <motion.article
              key={stage.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + index * 0.1 }}
            >
              <div className="journey-node">{stage.icon}</div>
              <span>{stage.label}</span>
              <strong>{stage.value}</strong>
              <p>{stage.note}</p>
              {index < stages.length - 1 && (
                <i>
                  {index === 0 ? "测量" : index === 1 ? "叠加活动" : "调整目标"}
                </i>
              )}
            </motion.article>
          ))}
          <div className="macro-targets">
            <span>营养参考</span>
            <div>
              <b>{shown.proteinTarget}g</b>
              <small>蛋白质</small>
            </div>
            <div>
              <b>{shown.carbTarget}g</b>
              <small>碳水</small>
            </div>
            <div>
              <b>{shown.fatTarget}g</b>
              <small>脂肪</small>
            </div>
          </div>
        </section>
      </main>
      <section className="formula-lab">
        <header>
          <span>03 / 公式实验室</span>
          <h2>
            每一个数字，
            <br />
            都有来路。
          </h2>
        </header>
        <div className="formula-lab-grid">
          <article>
            <span>BMI · 身体质量指数</span>
            <code>体重 ÷ 身高²</code>
            <p>
              {form.weight} ÷ {(form.height / 100).toFixed(2)}²
            </p>
            <strong>{preview.bmi}</strong>
          </article>
          <article>
            <span>BMR · 基础代谢</span>
            <code>
              10W + 6.25H − 5A {form.sex === "male" ? "+ 5" : "− 161"}
            </code>
            <p>
              10×{form.weight} + 6.25×{form.height} − 5×{form.age}{" "}
              {form.sex === "male" ? "+ 5" : "− 161"}
            </p>
            <strong>{preview.bmr} 千卡</strong>
          </article>
          <article>
            <span>TDEE · 每日总消耗</span>
            <code>BMR × 活动系数</code>
            <p>
              {preview.bmr} × {activityFactor}
            </p>
            <strong>{preview.tdee} 千卡</strong>
          </article>
          <article>
            <span>每日目标</span>
            <code>TDEE × 目标系数</code>
            <p>
              {preview.tdee} × {goalFactor}
            </p>
            <strong>{preview.targetCalories} 千卡</strong>
          </article>
        </div>
        <div className="energy-waterfall">
          <span>
            BMR <b>{preview.bmr}</b>
          </span>
          <i style={{ width: `${(preview.bmr / preview.tdee) * 100}%` }} />
          <span>
            活动 <b>+{preview.tdee - preview.bmr}</b>
          </span>
          <i
            style={{
              width: `${((preview.tdee - preview.bmr) / preview.tdee) * 100}%`,
            }}
          />
          <span>
            TDEE <b>{preview.tdee}</b>
          </span>
          <i className="total" />
          <span>
            目标调整 <b>×{goalFactor}</b>
          </span>
          <strong>{preview.targetCalories} 千卡 / 日</strong>
        </div>
      </section>
      <footer className="body-disclaimer">
        以上结果来自通用估算公式，仅用于数据可视化课程展示和一般信息，不构成医疗、减重或营养建议。
      </footer>
    </motion.div>
  );
}
