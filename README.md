# CalorieLens 4.0

> 看见，你吃下的能量。

CalorieLens 是面向大学“数据可视化”课程的个人饮食能量可视化系统。它既是一套可实际使用的本地饮食记录工具，也是一件用空间、形态和时间解释个人数据的交互作品。

项目拒绝把数字简单装进 Dashboard 卡片。餐食数据会直接决定界面：热量改变透镜填充与厚度，餐次改变空间层数，食物热量改变碎片体积，三大营养素的真实供能比例改变 Ribbon 宽度，时间与偏差生成七日地貌和三十日环。

## 产品功能

- 智能图片识别：扫描线、检测框、可信度与图像—列表联动；所有识别结果均可修改。
- 完整手动记录：约 100 种本地常见食物、别名搜索、分类、收藏、最近使用、克重与常见份量、多食物组餐。
- 自定义与包装食品：支持每 100 克或每份营养录入，底层统一换算为克。
- 餐食管理：日期、时间、餐次、食物重量、整餐编辑删除与常用餐食模板。
- 身体计算：BMI、Mifflin–St Jeor BMR、活动系数 TDEE、目标热量和宏量营养目标。
- 30 天故事化演示数据：包含周末偏高、异常日、逐渐变晚的晚餐和回归目标等可观察模式。
- localStorage 持久化、深浅主题、演示模式、桌面顶部导航与移动端底部导航。

## 热量透镜

核心视觉物体 Calorie Lens 介于玻璃透镜与抽象餐盘之间。Three.js 不作为装饰，而用于表达饮食数据层级：

```text
一天的 Lens
  → 按餐次沿 Z 轴拆层
  → 最大餐次拆成 Food Fragments
  → 食物解构为三条 Nutrient Ribbons
  → 七天形成空间地貌
  → 三十天排列为 Monthly Ring
```

主要数据映射：

- 内部填充：`currentCalories / targetCalories`
- 餐盘层厚度：`mealCalories / dailyCalories`
- 食物碎片体积：`foodCalories / mealCalories`
- Ribbon 宽度：蛋白质 `g × 4`、碳水 `g × 4`、脂肪 `g × 9` 后的供能比例
- 历史 Lens 厚度：每日目标偏差绝对值
- 历史 Lens 亮度：Consistency Score

首页只挂载一个固定 WebGL Canvas。GSAP ScrollTrigger 将页面滚动映射成连续的场景时间线，DOM 章节作为可访问的数据说明层覆盖在 Canvas 上。

## 八幕滚动叙事

1. **透镜**：品牌主张与由真实数据形成的 Calorie Lens。
2. **今天**：镜头接近并倾斜 Lens，显示摄入、目标与剩余。
3. **餐次**：当天实际存在的餐次按热量比例沿深度展开。
4. **食物**：热量最大的一餐拆解为大小不同的食物碎片。
5. **营养素**：碎片转化为蛋白质、碳水、脂肪三条供能流。
6. **能量平衡**：摄入与个人目标形成空间差值。
7. **七天**：每日 Lens 组成一段近期饮食地貌。
8. **三十天**：30 只 Lens 汇聚成 Monthly Ring，完成月度总结。

## 五个特色数据可视化

### 营养三角

使用 Ternary Plot 而不是雷达图。三个顶点分别是蛋白质、碳水和脂肪，位置由三者的供能比例决定；目标结构显示为区域，过去七天显示为历史点。它回答：“这一天的能量更偏向哪种营养来源？”

### 食物星图

横轴为热量密度（千卡 / 100 克），纵轴为蛋白质密度（克 / 100 克），圆点面积为实际摄入克数。它回答：“我经常吃的食物，在营养密度空间中分布在哪里？”背景区域只描述数据特征，不进行健康判断。

### 圆形饮食节律

24 小时被映射为圆周，Orb 角度表示进食时间、大小表示餐次热量。七日模式用多条同心轨迹观察晚餐推迟或夜间加餐聚集。它回答：“我通常在什么时候摄入最多能量？”

### 三十日目标偏差带

每天的 `actualCalories - targetCalories` 形成发散波形，中心线是个人目标，上方为高于目标、下方为低于目标，并统计 ±10% 天数、平均偏差与极值。它回答：“过去一个月控制是否稳定，异常发生在哪里？”

### 七日能量地貌

每条山脊代表一天，早餐、午餐、晚餐、加餐形成四个局部峰，而不是只用每日总量画一条线。它回答：“最近哪一天、哪一餐造成了能量高峰？”

能量流场作为辅助视觉，使用自定义 SVG Ribbon 将四种餐次汇入今日摄入，再与目标形成空间差值。

## 数据与计算

AI、手动、自定义和最近记录最终统一为 `FoodItem`，并进入同一 `Meal` / `DailyRecord` 流程。可视化只消费 `src/data/selectors.ts` 的结果，不在图表组件中重复业务聚合。

```text
portionRatio = grams / 100
calories = kcalPer100g × portionRatio
protein = proteinPer100g × portionRatio
carbs = carbsPer100g × portionRatio
fat = fatPer100g × portionRatio
```

主要 selectors 包括：`getDailyNutrition`、`getMealDistribution`、`getFoodDistribution`、`getMacroEnergyRatio`、`getWeeklyRecords`、`getMonthlyRecords`、`getMealRhythm`、`getFoodScatterData`、`getTernaryPoint` 和 `getDeviationSummary`。

## 技术栈

- React 19 + TypeScript + Vite
- Three.js + React Three Fiber + Drei
- GSAP + ScrollTrigger
- D3 + SVG
- Motion
- Apache ECharts（仅保留在适合标准统计表达的 AI 营养构成中）
- Tailwind CSS + 自定义视觉系统
- localStorage

## 性能与降级

- 首页只有一个 WebGL Canvas，DPR 上限为 1.75。
- 粒子数量桌面不超过 900；隐藏页面暂停 `useFrame` 更新。
- 移动端不挂载 Canvas，使用数据驱动的 CSS 静态 Lens，保留完整工具与趋势功能。
- `prefers-reduced-motion` 关闭复杂滚动镜头和粒子运动。
- Canvas 配有静态 Lens fallback；所有 3D 数据均有对应 DOM 文本，不作为唯一信息来源。
- 页面按路由懒加载，图表只在进入对应页面后加载。

## 运行与构建

```bash
npm install
npm run dev
npm run lint
npm run build
```

项目通过 GitHub Actions 自动部署到 GitHub Pages。路由使用 HashRouter，确保静态托管环境刷新子页面不会返回 404。

## 推荐课堂演示

1. 打开首页，让 Lens 在巨大中文排版前出现。
2. 连续滚动，依次解释填充、餐次拆层、食物碎片和营养 Ribbon 的数据映射。
3. 进入“记录”，搜索鸡胸肉输入 120 克，再加入米饭 180 克与西兰花 100 克。
4. 保存后回到今日，观察数字、Lens、餐次层和营养比例真实变化。
5. 在 AI 识别页上传图片，展示扫描、检测框、结果校正和统一入库。
6. 在“趋势”依次展示七日地貌、三十日偏差带、营养三角、食物星图与七日饮食节律。
7. 点击历史日期，说明多个可视化如何共享 `selectedDate`。
8. 回到首页最后一幕，以 30-Day Monthly Ring 完成作品结尾。

## 限制与免责声明

图片识别可能误判。食物营养值会因品牌、烹饪方式、产地和重量估算发生变化。本项目仅用于课程展示与一般饮食记录，不是医疗诊断、疾病治疗或专业营养指导工具。
