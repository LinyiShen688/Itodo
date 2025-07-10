# iTodo3 开发任务清单

## 📋 项目概述
基于 proto.html 1:1 复刻的四象限待办清单 Next.js 应用

---

## 🏗️ 阶段一：基础架构搭建

### 1. 项目配置与依赖
- [ ] 安装 Shadcn UI (`npx shadcn@latest init`)
- [ ] 配置 Tailwind CSS 自定义主题
- [ ] 安装拖拽库 (`@dnd-kit/core`, `@dnd-kit/sortable`)
- [ ] 配置 PWA 支持 (`next-pwa`)
- [ ] 配置 IndexedDB 库 (`idb`)

### 2. 全局样式系统
- [ ] **globals.css**: 复刻 proto.html 的 CSS 变量系统
- [ ] **globals.css**: 实现羊皮纸纹理背景（双层渐变 + 交叉纹理）
- [ ] **globals.css**: 设置字体导入（Caveat + Noto Serif SC）
- [ ] **globals.css**: 基础样式重置和响应式断点

### 3. 数据层架构
- [ ] **lib/indexeddb.js**: IndexedDB 数据库初始化
- [ ] **lib/indexeddb.js**: 任务数据结构定义
- [ ] **lib/indexeddb.js**: 任务列表数据结构定义
- [ ] **hooks/useTasks.js**: 任务管理 Hook
- [ ] **hooks/useTaskLists.js**: 任务列表管理 Hook
- [ ] **hooks/useLocalStorage.js**: 本地存储 Hook

---

## 🎨 阶段二：核心组件开发

### 4. 顶部栏组件
- [ ] **components/Header.jsx**: 基础布局结构
- [ ] **components/Header.jsx**: 左侧 App 标题（Caveat 字体 + 阴影）
- [ ] **components/Header.jsx**: 中间当前任务名称显示
- [ ] **components/Header.jsx**: 右侧番茄钟图标（悬浮动画）
- [ ] **components/Header.jsx**: 响应式适配（移动端隐藏部分元素）

### 5. 四象限主体
- [ ] **components/QuadrantGrid.jsx**: 2x2 网格布局容器
- [ ] **components/Quadrant.jsx**: 单个象限组件基础结构
- [ ] **components/Quadrant.jsx**: 象限标题编辑功能（点击铅笔图标）
- [ ] **components/Quadrant.jsx**: 任务列表容器
- [ ] **components/Quadrant.jsx**: "点击空白添加任务"提示
- [ ] **components/Quadrant.jsx**: 第一象限特殊样式（优先徽章、呼吸动画、特殊边框）

### 6. 任务条目组件
- [ ] **components/TaskItem.jsx**: 基础任务条目结构
- [ ] **components/TaskItem.jsx**: 圆形复选框（完成状态切换）
- [ ] **components/TaskItem.jsx**: 任务文本内联编辑
- [ ] **components/TaskItem.jsx**: 删除按钮（悬浮显示）
- [ ] **components/TaskItem.jsx**: 优先级圆点（四象限不同颜色）
- [ ] **components/TaskItem.jsx**: 悬浮动画效果
- [ ] **components/TaskItem.jsx**: 拖拽功能集成

---

## 🎯 阶段三：高级功能实现

### 7. 拖拽系统
- [ ] **lib/dragAndDrop.js**: 拖拽逻辑封装
- [ ] **components/DragProvider.jsx**: 拖拽上下文提供者
- [ ] **任务拖拽**: 象限内排序
- [ ] **任务拖拽**: 跨象限移动
- [ ] **拖拽视觉反馈**: 0.9 缩放 + 虚线占位符
- [ ] **拖拽动画**: 平滑过渡效果

### 8. 侧边栏系统
- [ ] **components/Sidebar.jsx**: 侧边栏基础结构
- [ ] **components/Sidebar.jsx**: 开启/关闭动画
- [ ] **components/SidebarToggle.jsx**: 切换按钮（垂直文字 + 图标）
- [ ] **components/TaskListManager.jsx**: 任务列表管理区域
- [ ] **components/TaskListManager.jsx**: 默认任务列表显示
- [ ] **components/TaskListManager.jsx**: 创建新任务列表功能
- [ ] **components/TaskListManager.jsx**: 双击编辑列表名称
- [ ] **components/TaskListManager.jsx**: 删除任务列表功能
- [ ] **components/TaskListManager.jsx**: 任务列表切换功能
- [ ] **components/ThemeSelector.jsx**: 主题选择下拉框

### 9. 移动端适配
- [ ] **components/FloatingActionButton.jsx**: 移动端 FAB 按钮
- [ ] **响应式布局**: 桌面端 2x2 网格
- [ ] **响应式布局**: 移动端单列纵向滚动
- [ ] **响应式交互**: 触摸友好的交互设计

---

## ⚡ 阶段四：交互优化与动画

### 10. 动画系统
- [ ] **第一象限特效**: 柔和呼吸动画（gentleGlow）
- [ ] **悬浮效果**: 任务条目 translateY + 阴影
- [ ] **点击反馈**: 按钮点击动画
- [ ] **过渡动画**: 所有状态变化 0.3s ease
- [ ] **侧边栏动画**: 滑入滑出效果

### 11. 交互优化
- [ ] **键盘支持**: Enter 确认编辑、Escape 取消
- [ ] **自动聚焦**: 新建任务自动获得焦点
- [ ] **用户反馈**: 操作成功的视觉反馈
- [ ] **防抖处理**: 输入内容自动保存
- [ ] **错误处理**: 操作失败的友好提示

---

## 🎨 阶段五：主题系统

### 12. 多主题支持
- [ ] **themes/parchment.js**: 羊皮纸经典主题（默认）
- [ ] **themes/darkBlue.js**: 墨水深蓝主题
- [ ] **themes/forestGreen.js**: 森林绿意主题
- [ ] **themes/goldenDawn.js**: 晨曦金黄主题
- [ ] **hooks/useTheme.js**: 主题切换逻辑
- [ ] **主题持久化**: 用户主题选择保存

---

## 📱 阶段六：PWA 配置

### 13. PWA 支持
- [ ] **public/manifest.json**: PWA 配置文件
- [ ] **Service Worker**: 离线缓存策略
- [ ] **图标适配**: 各种尺寸的应用图标
- [ ] **安装提示**: 引导用户安装到桌面
- [ ] **离线体验**: 网络断开时的功能保障

---

## 🔧 阶段七：性能优化

### 14. 性能优化
- [ ] **React.memo**: 组件重渲染优化
- [ ] **useMemo/useCallback**: Hook 优化
- [ ] **虚拟滚动**: 大量任务时的性能保障
- [ ] **懒加载**: 非关键组件延迟加载
- [ ] **Bundle 分析**: 打包体积优化

---

## ✅ 阶段八：测试与发布

### 15. 质量保障
- [ ] **ESLint/Prettier**: 代码质量检查
- [ ] **功能测试**: 所有交互功能验证
- [ ] **响应式测试**: 各种设备尺寸适配
- [ ] **性能测试**: 页面加载和交互性能
- [ ] **浏览器兼容**: 主流浏览器测试

### 16. 部署准备
- [ ] **构建优化**: 生产环境构建配置
- [ ] **SEO 优化**: meta 标签和描述
- [ ] **部署文档**: README.md 完善
- [ ] **使用说明**: 用户使用指南

---

## 🎯 开发优先级说明

**高优先级**（核心功能）:
- 阶段一：基础架构搭建
- 阶段二：核心组件开发  
- 阶段三：拖拽和侧边栏功能

**中优先级**（体验优化）:
- 阶段四：交互动画
- 阶段五：多主题支持

**低优先级**（增强功能）:
- 阶段六：PWA 配置
- 阶段七：性能优化
- 阶段八：测试发布

---

## 📝 开发说明

1. **严格按照 proto.html 复刻**：确保视觉和交互 1:1 还原
2. **Mobile-first 策略**：优先考虑移动端体验
3. **组件化开发**：每个功能模块独立组件
4. **数据驱动**：状态管理清晰，数据流向明确
5. **性能优先**：关注组件渲染性能和用户体验

完成一个任务后，在对应的 `[ ]` 中标记 `[✓]` 