# 八阶段长期内容路线验收

审计版本：v0.21.0
审计日期：2026-07-23
结论：八个阶段均已进入正式模拟、玩家界面和存档体系，并由自动化测试覆盖；本轮未发现阻断发布的功能缺口。

## 验收原则

每个内容阶段只有同时满足以下条件才视为完成：

1. 机制会读取和改变真实世界状态，不是只显示说明文字。
2. 玩家能在正式页面观察或操作核心结果。
3. 长期状态进入当前存档版本，并有旧档迁移或默认补全策略。
4. 测试使用与浏览器相同的正式模块，覆盖主要成功路径、失败路径或确定性续接。

## 阶段矩阵

| 阶段 | 交付内容 | 主要实现 | 自动化证据 | 状态 |
|---|---|---|---|---|
| 阶段 1 | 五级文明时代、八类长期野心、里程碑与永久传承 | `long-term-system.js` | `tests/long-term-system.test.js` | 完成 |
| 阶段 2 | 具名人物、家谱婚姻、双向关系、王朝、四类继承法、摄政与继承危机 | `dynasty-system.js` | `tests/dynasty-system.test.js` | 完成 |
| 阶段 3 | 五类派系、议会席位、政策议题、国家权威与派系危机 | `politics-system.js` | `tests/politics-system.test.js` | 完成 |
| 阶段 4 | 十二条三章大型事件链、三十条区域事件、参与者、互斥路线与延迟后果 | `world-event-content.js`、`regional-event-content.js`、`experience-system.js` | `tests/world-event-system.test.js`、`tests/legacy-system.test.js` | 完成 |
| 阶段 5 | 六处古代遗迹、四件神器、四座奇观、十二类历史伤痕及流转损毁 | `legacy-system.js` | `tests/legacy-system.test.js` | 完成 |
| 阶段 6 | 六类后期危机、十二种互斥永久结局、持续制度生态与地形后果 | `legacy-system.js` | `tests/crisis-legacy-system.test.js` | 完成 |
| 阶段 7 | 六项组合挑战、分享码、难度评分与独立跨世界档案 | `world-challenge-system.js` | `tests/world-challenge-system.test.js` | 完成 |
| 阶段 8 | 全路线一致性审计、死代码清理、发布文档与持续集成平衡门禁 | `docs/`、`.github/workflows/validate.yml` | `tests/project-integrity.test.js`、`npm run check`、`npm run balance` | 完成 |

## 最终验证结果

- `npm run check`：脚本语法、确定性、存档迁移、DOM 完整性、模块边界和八阶段机制测试全部通过。
- `npm run balance`：12 个固定种子演化至纪元 50，人口 29–69，四文明存续率 100%，灭绝率 0%，饥荒国家占比 0%，完整食物网率 91.67%，战争世界覆盖率 41.67%。
- 浏览器验收：组合规则选择、待生成状态、挑战码、历史伤痕操作、危机永久遗产和跨世界封存入口均能在正式页面完成或观察。
- 静态清理：没有 TODO、FIXME、调试器或正式代码中的 `Math.random()`；删除了审计发现的未引用挑战函数，脚本依赖顺序与 DOM 引用由完整性测试保护。

## 原创像素美术升级

v0.21.0 在不改变八阶段模拟与 v22 存档结构的前提下，按环境地形、建筑、四种族角色、战斗、天灾、内容插图六步完成视觉升级：`pixel-art-system.js` 统一确定性像素绘制与低动态适配，`art-atlas.js` 集中映射 6 位英雄原型、4 件神器、4 座奇观和 12 条大型事件。`tests/pixel-art-system.test.js` 覆盖地形、建筑、角色、战斗和六类天灾；`tests/art-atlas.test.js` 与 `tests/visual-art-preview.html` 验证图集完整性、坐标映射和全部 26 个裁切结果。

## 当前产品边界

v0.21.0 已完成这条单机浏览器沙盒的长期内容路线和统一原创像素美术升级，但不把以下方向冒充为既有功能：联网多人、云端存档、用户模组 API、多语言本地化、移动端原生应用和服务器权威模拟均尚未实现。跨世界档案保存在当前浏览器本地存储中，清理站点数据会一并移除；需要长期备份时应继续使用世界 JSON 导出。
