# CalorieLens 3.0 · 热量透镜

一个面向大学“数据可视化”课程展示的个人饮食与能量观察 Web 项目。它把每一餐转换成可计算、可编辑、可追溯的营养数据，并用 3D 能量透镜、营养体、饮食节律、能量流向和时间地貌呈现身体与食物的关系。

## 核心体验

- **今日**：沉浸式滚动叙事，实时 3D 能量透镜由摄入与目标驱动。
- **记录**：智能识别、手动记录、最近记录三种同级入口。
- **完整手动记录**：60+ 本地常见食物、模糊搜索、分类、收藏、最近使用、克重/常见份量、多食物组餐、自定义与包装食品、日期/时间/餐次、整餐编辑删除、常用餐食模板。
- **统一数据模型**：AI 与手动食物共用 `FoodItem`，餐食共用 `Meal`；所有营养值都由每 100 克数据和实际重量重新计算。
- **身体**：BMI、BMR、TDEE、目标热量与三大营养目标形成纵向“能量旅程”。
- **趋势**：七日能量地貌、三十日偏差脉冲、营养体、24 小时饮食节律和能量流向共享选中日期。
- **本地可运行**：30 天演示数据与所有用户数据保存在 `localStorage`，无需后端即可展示完整流程。
- **展示辅助**：明暗主题、演示模式、响应式顶部/底部导航、减少动态效果系统偏好。

## 技术栈

React 19、TypeScript、Vite、Three.js、React Three Fiber、Drei、ECharts、Motion、Tailwind CSS、Lucide React。

## 启动

```bash
npm install
npm run dev
```

质量检查与生产构建：

```bash
npm run lint
npm run build
npm run preview
```

## 目录

```text
src/
├─ components/
│  ├─ EnergyCore.tsx          # 实时 3D 热量透镜
│  ├─ ManualRecorder.tsx      # 完整手动记录工作台
│  ├─ TodayVisuals.tsx        # 营养体、节律与能量流向
│  ├─ TrendVisuals.tsx        # 七日地貌与月度脉冲
│  └─ Layout.tsx              # 顶部/移动底部导航与主题
├─ data/
│  ├─ foods.ts                # 60+ 本地食物营养库
│  ├─ nutrition.ts            # 纯营养计算函数
│  └─ store.ts                # 数据迁移、30 日演示与持久化
├─ pages/
│  ├─ Dashboard.tsx           # “今日”数据叙事
│  ├─ Record.tsx              # 三种记录入口
│  ├─ Recognition.tsx         # AI 图像识别与校正
│  ├─ Profile.tsx             # 身体能量旅程
│  └─ Trends.tsx              # 联动趋势叙事
└─ services/FoodRecognitionService.ts
```

## 关键计算

- 食物营养：`每 100 克营养 × 实际克重 / 100`
- 蛋白质与碳水能量：`克数 × 4 kcal`
- 脂肪能量：`克数 × 9 kcal`
- 一致性：`max(0, 1 - |实际 - 目标| / 目标) × 100%`
- BMR：Mifflin–St Jeor 公式；TDEE 为 BMR 与活动系数的乘积。

## AI 识别

设置 `VITE_AI_ENDPOINT` 后会向后端发送名为 `image` 的 multipart 文件；未设置、离线或请求失败时自动使用明确标注的演示识别结果。密钥应只放在后端。

```env
VITE_AI_ENDPOINT=/api/recognize-food
```

## 课堂展示建议

1. 在“今日”滚动讲解摄入如何驱动热量透镜和三种关联视觉。
2. 在“记录”用手动方式组合一餐，调整克重并保存。
3. 回到“今日”观察数字与 3D 状态变化，再编辑刚才的整餐。
4. 在“身体”修改活动水平或目标，观察全站目标同步。
5. 在“趋势”点击日期，展示五种视觉如何响应同一数据状态。

## 免责声明

本项目用于课程学习与数据可视化演示。图片识别、热量和营养估算可能存在误差，不构成医疗、疾病治疗或专业营养建议。
