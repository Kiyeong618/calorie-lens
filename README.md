# CalorieLens 5.2 · Liquid Data Lens

> 看见，你吃下的能量。

CalorieLens 是面向大学“数据可视化”课程的个人饮食能量可视化系统。它保留完整的 AI/手动餐食录入、克重换算、历史编辑、身体计算和 localStorage 持久化，并把输入、计算、数据模型、视觉编码、交互与洞察连成一条可演示的链。

## 产品结构

- 今日：首页采用单一 WebGL Canvas；滚动控制摄影机，而不是让模型原地旋转。
- 记录：约 100 种食物搜索、收藏、最近使用、自定义/包装食品、多食物组餐、编辑删除，以及实时 Meal Treemap。
- 身体：BMI、BMR、TDEE 和目标热量实时推导，配公式实验室与能量 Waterfall。
- 趋势：“数据观测室”提供 10 组统计模块与跨图日期联动。
- AI：图片扫描、检测框、置信度、份量校正；结果与手动录入统一为 `FoodItem`。

## Cinematic Data Space

`cameraTimeline.ts` 分别建立 `cameraPositionCurve` 和 `cameraTargetCurve` 两条 Catmull–Rom 曲线，并对 position、target 与 35°–48° FOV 平滑插值。12 个镜头涵盖 Dolly In、Close Pass、Lens Fly-through、Orbit、Dolly、Food Cell Fly-through、Ribbon 穿行、Crane/Tilt、3D→2D 压平与 Extreme Pull Out。

三维对象不是装饰：餐次角度来自时间，尺度来自热量；每日透镜的填充来自摄入/目标，厚度来自偏差，清晰度来自一致性。最终 30 个 Day Lens 沿三维时间螺旋退向远方。

| 空间对象 | 视觉编码 |
| --- | --- |
| Calorie Lens | 填充 = 今日摄入 / 目标 |
| Meal Orbit | 角度 = 餐次分钟 / 1440；大小 = 餐次热量占比 |
| Food Cells | 体积 = 食物在本餐的热量贡献 |
| Nutrition Ribbons | 宽度 = 蛋白质×4、碳水×4、脂肪×9 后的供能占比 |
| Time Spiral | 曲线位置 = 日期；厚度 = 偏差；透明度 = 一致性 |

首页只挂载一个 Canvas，DPR 上限 1.65。移动端和 `prefers-reduced-motion` 使用静态数据透镜；所有 3D 信息均有 DOM 等价文本。

## 数据观测室

| 图形 | 回答的问题 | 编码 |
| --- | --- | --- |
| Calorie Budget Strip | 今天还能吃多少？ | 长度 = 当前摄入；标记 = 目标 |
| Cumulative Intake | 热量如何逐餐累积？ | X = 时间；Y = 累计千卡 |
| 24H Rhythm | 今天吃得早还是晚？ | 角度 = 时间；圆面积 = 餐次热量 |
| Macro Bullet | 与目标和七日范围相差多少？ | 条 = 今天；带 = 七日范围；刻度 = 目标 |
| Macro Energy Strip | 能量由什么组成？ | 宽度 = 4/4/9 换算后的供能比例 |
| Food Scatter | 食物密度分布如何？ | X = kcal/100g；Y = protein/100g；面积 = 克重 |
| Food Treemap | 热量主要来自哪些食物？ | 面积 = 实际千卡贡献 |
| Weekly Target Band | 哪天偏离目标？ | 线 = 实际；带 = 目标 ±10% |
| Meal Stack | 异常由哪一餐造成？ | 堆叠高度 = 各餐千卡 |
| Monthly Deviation | 月度稳定性如何？ | 发散方向/长度 = 实际 − 目标 |
| 7×3 Heatmap | 哪天宏量营养偏离？ | 色深 = actual / target |
| Meal Box Plot | 哪一餐最容易吃多？ | Min/Q1/Median/Q3/Max |

点击七日趋势或日期导航会更新全局 `selectedDate`，节律、食物图、Treemap、目标轨和详情同步重算。所有图形消费 `src/data/selectors.ts` 的 processed data，不在图表中硬编码业务聚合。

## 计算公式

```text
食物热量 = kcalPer100g × grams / 100
一餐 / 一天 = 所有 FoodItem / Meal 求和
BMI = weight(kg) / height(m)²
BMR(男) = 10W + 6.25H − 5A + 5
BMR(女) = 10W + 6.25H − 5A − 161
TDEE = BMR × activityFactor
Target = TDEE × goalFactor
Macro kcal = protein×4 + carbs×4 + fat×9
Remaining = Target − Actual
Deviation = Actual − Target
Consistency = max(0, 1 − |Actual − Target| / Target) × 100
```

重要数值提供“怎么算的？”入口，展示符号公式、当前值代入和结果。一致性仅是课程项目定义的目标接近度，不是医学指标。

## 30 天 Demo Story

演示数据不是无规律随机数：第一周稳定；第二周周末偏高；第三周晚餐逐渐推迟；第四周重新接近目标。数据通过版本化迁移补齐，不覆盖用户已有个人记录。

## 技术栈与运行

React 19、TypeScript、Vite、Three.js / React Three Fiber / Drei、GSAP ScrollTrigger、D3、ECharts、Motion。

```bash
npm install
npm run lint
npm run build
```

GitHub Actions 自动部署 GitHub Pages；HashRouter 确保静态托管刷新可用。

## 推荐课堂演示

1. 首页滚动展示 Lens 穿越、餐次轨道、午餐 Food Cells、Nutrition Ribbons 与 30 日时间螺旋。
2. 数据观测室讲解 24H 节律、Scatter + Treemap、七日 Target Band 和三十日偏差，并点击日期演示联动。
3. 身体页修改数据，展示 BMI → BMR → TDEE → Target 的实时公式和 Waterfall。
4. 记录页添加鸡胸肉 120g、米饭 180g，观察克重计算与 Meal Treemap，再保存回首页验证全局变化。
5. AI 页上传照片、校正识别结果，说明 AI 与手动输入进入相同数据模型。

本项目用于课程展示和一般信息，不构成医疗或专业营养建议。
