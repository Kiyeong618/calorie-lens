/* eslint-disable no-irregular-whitespace */
import { useMemo, useState, type ReactNode } from "react";
import {
  Check,
  ChevronLeft,
  Clock3,
  Minus,
  Package,
  Plus,
  Save,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type {
  FoodCategory,
  FoodDefinition,
  FoodItem,
  MealType,
} from "../types";
import {
  calculateFoodByWeight,
  calculateMealNutrition,
  recalculateEntry,
} from "../data/nutrition";
import {
  addMeal,
  deleteMeal,
  getAllFoods,
  getFavorites,
  getMeal,
  getMealTemplates,
  getRecentFoodIds,
  saveCustomFood,
  saveMealTemplate,
  toggleFavorite,
  updateMeal,
} from "../data/store";
import { todayKey, uid } from "../utils";
import { CountUp } from "./CountUp";
import { foodCategories } from "../data/foods";

const types: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "早餐" },
  { value: "lunch", label: "午餐" },
  { value: "dinner", label: "晚餐" },
  { value: "snack", label: "加餐" },
];
const nowTime = () => new Date().toTimeString().slice(0, 5);
const emptyCustom = {
  name: "",
  kcalPer100g: 0,
  proteinPer100g: 0,
  carbsPer100g: 0,
  fatPer100g: 0,
  grams: 100,
};
export function ManualRecorder() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editingId = params.get("meal");
  const copyId = params.get("copy");
  const templateId = params.get("template");
  const existing = editingId ? getMeal(editingId) : undefined;
  const copied = copyId ? getMeal(copyId) : undefined;
  const template = templateId
    ? getMealTemplates().find((t) => t.id === templateId)
    : undefined;
  const seedFoods = existing?.foods ?? copied?.foods ?? template?.foods ?? [];
  const [foods, setFoods] = useState<FoodItem[]>(() =>
    seedFoods.map((f) => ({
      ...f,
      id: uid(),
      source: existing ? f.source : "recent",
    })),
  );
  const [database, setDatabase] = useState(getAllFoods);
  const [favorites, setFavorites] = useState(getFavorites);
  const [recentIds] = useState(getRecentFoodIds);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "favorite" | "recent">("all");
  const [category, setCategory] = useState<FoodCategory | "全部">("全部");
  const [selected, setSelected] = useState<FoodDefinition>();
  const [grams, setGrams] = useState(100);
  const [type, setType] = useState<MealType>(
    existing?.type ?? copied?.type ?? template?.type ?? "lunch",
  );
  const [date, setDate] = useState(existing?.date ?? todayKey());
  const [time, setTime] = useState(
    existing
      ? new Date(existing.timestamp).toTimeString().slice(0, 5)
      : nowTime(),
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState(emptyCustom);
  const [packageOpen, setPackageOpen] = useState(false);
  const [pack, setPack] = useState({
    name: "",
    servingGrams: 35,
    servingKcal: 168,
    protein: 3,
    carbs: 20,
    fat: 8,
    servings: 1,
  });
  const [saved, setSaved] = useState(false);
  const visible = useMemo(
    () =>
      database
        .filter((f) => {
          const text = `${f.name}${f.aliases.join("")}`.toLowerCase();
          const match = text.includes(query.trim().toLowerCase());
          const scope =
            filter === "favorite"
              ? favorites.includes(f.id)
              : filter === "recent"
                ? recentIds.includes(f.id)
                : true;
          return (
            match && scope && (category === "全部" || f.category === category)
          );
        })
        .slice(0, 18),
    [database, query, filter, category, favorites, recentIds],
  );
  const total = calculateMealNutrition(foods);
  const choose = (food: FoodDefinition) => {
    setSelected(food);
    setGrams(food.servings?.[0]?.grams ?? 100);
  };
  const addSelected = () => {
    if (!selected || grams <= 0) return;
    setFoods((v) => [...v, calculateFoodByWeight(selected, grams, "manual")]);
    setSelected(undefined);
    setQuery("");
  };
  const changeWeight = (id: string, value: number) =>
    setFoods((v) =>
      v.map((f) => (f.id === id ? recalculateEntry(f, Math.max(1, value)) : f)),
    );
  const createCustom = () => {
    if (!custom.name.trim() || custom.grams <= 0) return;
    const definition = saveCustomFood({
      name: custom.name.trim(),
      aliases: [],
      category: "调味 / 其他",
      defaultUnit: "克",
      kcalPer100g: custom.kcalPer100g,
      proteinPer100g: custom.proteinPer100g,
      carbsPer100g: custom.carbsPer100g,
      fatPer100g: custom.fatPer100g,
    });
    setDatabase(getAllFoods());
    setFoods((v) => [
      ...v,
      calculateFoodByWeight(definition, custom.grams, "custom"),
    ]);
    setCustom(emptyCustom);
    setCustomOpen(false);
  };
  const addPackage = () => {
    if (!pack.name.trim() || pack.servingGrams <= 0 || pack.servings <= 0)
      return;
    const grams = pack.servingGrams * pack.servings;
    const ratio = 100 / pack.servingGrams;
    const definition: FoodDefinition = {
      id: `package-${uid()}`,
      name: pack.name,
      aliases: [],
      category: "零食",
      defaultUnit: "份",
      kcalPer100g: pack.servingKcal * ratio,
      proteinPer100g: pack.protein * ratio,
      carbsPer100g: pack.carbs * ratio,
      fatPer100g: pack.fat * ratio,
      servings: [{ name: "1份", grams: pack.servingGrams }],
    };
    setFoods((v) => [...v, calculateFoodByWeight(definition, grams, "custom")]);
    setPackageOpen(false);
  };
  const submit = () => {
    if (!foods.length) return;
    const stamp = `${date}T${time}:00`;
    if (existing) updateMeal(existing.id, { foods, type, timestamp: stamp });
    else
      addMeal(type, foods, undefined, {
        timestamp: stamp,
        date,
        source: "manual",
      });
    setSaved(true);
    setTimeout(() => navigate(date === todayKey() ? "/" : "/trends"), 700);
  };
  const saveTemplate = () => {
    if (!foods.length) return;
    const name = window.prompt("给这份常用餐食起个名字：", "我的常用餐食");
    if (name?.trim()) saveMealTemplate(name.trim(), foods, type);
  };
  return (
    <div className="manual-studio">
      <section className="food-discovery">
        <div className="record-subhead">
          <span>{existing ? "编辑已记录餐食" : "手动记录"}</span>
          <h2>今天吃了什么？</h2>
          <p>搜索食物，用实际重量把它转化成营养数据。</p>
        </div>
        <label className="food-search">
          <Search />
          <input
            autoFocus
            placeholder="搜索鸡胸肉、米饭、香蕉……"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd>⌘ K</kbd>
        </label>
        <div className="food-filters">
          <div>
            {(["recent", "favorite", "all"] as const).map((v) => (
              <button
                className={filter === v ? "active" : ""}
                onClick={() => setFilter(v)}
                key={v}
              >
                {v === "all" ? "全部" : v === "favorite" ? "收藏" : "最近"}
              </button>
            ))}
          </div>
          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as FoodCategory | "全部")
            }
          >
            <option>全部</option>
            {foodCategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="food-results">
          {visible.map((food) => (
            <button
              key={food.id}
              className="food-result"
              onClick={() => choose(food)}
            >
              <span className="food-glyph">{food.name.slice(0, 1)}</span>
              <span>
                <b>{food.name}</b>
                <small>
                  {food.category} · 每100克 {food.kcalPer100g} 千卡
                </small>
              </span>
              <i
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(food.id);
                  setFavorites(getFavorites());
                }}
              >
                {favorites.includes(food.id) ? (
                  <Star size={16} fill="currentColor" />
                ) : (
                  <Star size={16} />
                )}
              </i>
              <Plus size={17} />
            </button>
          ))}
        </div>
        {!visible.length && (
          <div className="no-food">
            <p>没有找到“{query}”</p>
            <button onClick={() => setCustomOpen(true)}>
              ＋ 创建自定义食物
            </button>
          </div>
        )}
        <div className="alternative-entry">
          <button onClick={() => setCustomOpen(true)}>
            <Plus />
            自定义食物
          </button>
          <button onClick={() => setPackageOpen(true)}>
            <Package />
            包装食品
          </button>
        </div>
      </section>
      <aside className="meal-workbench">
        <div className="meal-title">
          <span>这一餐</span>
          <strong>
            <CountUp value={total.totalCalories} decimals={1} />
            <small> 千卡</small>
          </strong>
          <p>
            {foods.length} 种食物 · 蛋白质 {total.protein}克 · 碳水{" "}
            {total.carbs}克 · 脂肪 {total.fat}克
          </p>
        </div>
        <div className="meal-items">
          <AnimatePresence>
            {foods.map((food, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="meal-entry"
                key={food.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <b>{food.name}</b>
                  <small>
                    {food.grams}克 · {food.calories} 千卡
                  </small>
                </div>
                <div className="mini-stepper">
                  <button
                    onClick={() => changeWeight(food.id, food.grams - 10)}
                  >
                    <Minus />
                  </button>
                  <input
                    type="number"
                    value={food.grams}
                    onChange={(e) =>
                      changeWeight(food.id, Number(e.target.value))
                    }
                  />
                  <i>克</i>
                  <button
                    onClick={() => changeWeight(food.id, food.grams + 10)}
                  >
                    <Plus />
                  </button>
                </div>
                <button
                  className="remove-entry"
                  onClick={() =>
                    setFoods((v) => v.filter((f) => f.id !== food.id))
                  }
                >
                  <X />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {!foods.length && (
            <div className="empty-meal">
              <span>0</span>
              <p>
                从左侧选择食物
                <br />
                它们会在这里组成一餐
              </p>
            </div>
          )}
        </div>
        <div className="meal-meta">
          <div>
            <label>餐次</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as MealType)}
            >
              {types.map((t) => (
                <option value={t.value} key={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label>日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div>
            <label>
              <Clock3 />
              时间
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>
        <div className="meal-actions">
          <button
            className="ghost-action"
            onClick={saveTemplate}
            disabled={!foods.length}
          >
            <Save />
            保存为常用餐食
          </button>
          {existing && (
            <button
              className="delete-action"
              onClick={() => {
                if (confirm("确定删除整餐吗？")) {
                  deleteMeal(existing.id);
                  navigate("/");
                }
              }}
            >
              <Trash2 />
              删除整餐
            </button>
          )}
          <button
            className="commit-meal"
            onClick={submit}
            disabled={!foods.length}
          >
            {saved ? (
              <>
                <Check />
                已保存记录
              </>
            ) : existing ? (
              "保存修改"
            ) : date === todayKey() ? (
              "记入今日"
            ) : (
              "保存记录"
            )}
          </button>
        </div>
      </aside>
      <AnimatePresence>
        {selected && (
          <motion.div
            className="portion-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(undefined)}
          >
            <motion.div
              className="portion-editor"
              initial={{ y: 20, scale: 0.98 }}
              animate={{ y: 0, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="close-portion"
                onClick={() => setSelected(undefined)}
              >
                <X />
              </button>
              <span>{selected.category}</span>
              <h3>{selected.name}</h3>
              <div className="per100">
                <b>{selected.kcalPer100g}</b>
                <small>千卡 / 100克</small>
                <p>
                  蛋白质 {selected.proteinPer100g}克　碳水{" "}
                  {selected.carbsPer100g}克　脂肪 {selected.fatPer100g}克
                </p>
              </div>
              <label>实际食用重量</label>
              <div className="weight-focus">
                <button onClick={() => setGrams((v) => Math.max(1, v - 10))}>
                  <Minus />
                </button>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={grams}
                  onChange={(e) => setGrams(Number(e.target.value))}
                />
                <i>克</i>
                <button onClick={() => setGrams((v) => Math.min(1000, v + 10))}>
                  <Plus />
                </button>
              </div>
              <input
                className="weight-range"
                type="range"
                min="1"
                max="500"
                value={Math.min(500, grams)}
                onChange={(e) => setGrams(Number(e.target.value))}
              />
              {selected.servings?.length && (
                <div className="servings">
                  {selected.servings.map((s) => (
                    <button key={s.name} onClick={() => setGrams(s.grams)}>
                      {s.name} · {s.grams}克
                    </button>
                  ))}
                </div>
              )}
              <div className="portion-result">
                <span>
                  {grams}克 {selected.name}
                </span>
                <strong>
                  {calculateFoodByWeight(selected, grams).calories} 千卡
                </strong>
              </div>
              <button className="commit-meal" onClick={addSelected}>
                加入这一餐
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {customOpen && (
          <FoodModal
            title="创建自定义食物"
            onClose={() => setCustomOpen(false)}
            onSubmit={createCustom}
          >
            {Object.entries({
              name: "食物名称",
              kcalPer100g: "每100克热量",
              proteinPer100g: "每100克蛋白质",
              carbsPer100g: "每100克碳水",
              fatPer100g: "每100克脂肪",
              grams: "实际食用克数",
            }).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type={key === "name" ? "text" : "number"}
                  value={custom[key as keyof typeof custom]}
                  onChange={(e) =>
                    setCustom((v) => ({
                      ...v,
                      [key]:
                        key === "name"
                          ? e.target.value
                          : Number(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </FoodModal>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {packageOpen && (
          <FoodModal
            title="录入包装食品"
            onClose={() => setPackageOpen(false)}
            onSubmit={addPackage}
          >
            {Object.entries({
              name: "食品名称",
              servingGrams: "每份重量（克）",
              servingKcal: "每份热量（千卡）",
              protein: "每份蛋白质",
              carbs: "每份碳水",
              fat: "每份脂肪",
              servings: "实际吃了几份",
            }).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type={key === "name" ? "text" : "number"}
                  value={pack[key as keyof typeof pack]}
                  onChange={(e) =>
                    setPack((v) => ({
                      ...v,
                      [key]:
                        key === "name"
                          ? e.target.value
                          : Number(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </FoodModal>
        )}
      </AnimatePresence>
    </div>
  );
}
function FoodModal({
  title,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="portion-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div className="food-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-portion" onClick={onClose}>
          <X />
        </button>
        <button className="back-label" onClick={onClose}>
          <ChevronLeft />
          返回
        </button>
        <h3>{title}</h3>
        <div className="custom-grid">{children}</div>
        <button className="commit-meal" onClick={onSubmit}>
          保存并加入这一餐
        </button>
      </motion.div>
    </motion.div>
  );
}
