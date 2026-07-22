"use strict";

// 区域事件的纯数据目录。每条事件围绕一个主导文明展开，执行逻辑位于 legacy-system.js。

(() => {
  const realm = changes => ({ type: "realm", scope: "primary", ...changes });
  const all = changes => ({ type: "realm", scope: "all", ...changes });
  const diplomacy = changes => ({ type: "diplomacy", scope: "all", ...changes });
  const world = changes => ({ type: "world", ...changes });
  const choice = (id, label, hint, effects) => ({ id, label, hint, effects });
  const event = (name, icon, text, focus, conditions, choices) => ({ name, icon, text, focus, conditions, choices });

  const events = Object.freeze({
    golden_harvest: event("金穗丰年", "🌾", "异常温和的季节带来超额收成。各文明必须决定如何处理这份短暂的富足。", "food", { minYear: 4 }, [
      choice("store", "充实粮仓", "主导国获得大量粮食储备", [realm({ food: 24 })]),
      choice("festival", "举办庆典", "所有文明提高幸福与合法性", [all({ happiness: 5, legitimacy: 4 })]),
      choice("seed", "保留良种", "推动农业研究并改善肥力", [realm({ research: 10, food: 8 }), world({ fertility: 0.015 })])
    ]),
    border_envoys: event("边境使团", "🕊", "一支没有旗帜的使团请求穿越边境。他们可能带来和谈，也可能正在绘制防线。", "diplomacy", { minYear: 6, minKingdoms: 2 }, [
      choice("welcome", "设宴款待", "改善世界外交与主导国声望", [realm({ treasury: -5, legitimacy: 4 }), diplomacy({ score: 3, trust: 4, grievance: -3 })]),
      choice("escort", "武装护送", "提高权威与军心，关系保持谨慎", [realm({ authority: 4, armyMorale: 5 }), diplomacy({ trust: 1 })]),
      choice("detain", "扣留盘问", "强化尚武并制造跨国旧怨", [realm({ legitimacy: 3, valor: 4 }), diplomacy({ score: -3, trust: -5, grievance: 7 })])
    ]),
    guild_invention: event("工坊新法", "⚒", "行会工匠展示了一套可提高效率的新工具，但要求税收减免与公开荣誉。", "guilds", { minYear: 7, minGuildInfluence: 18 }, [
      choice("fund", "国家资助", "消耗国库，大幅推动研究", [realm({ treasury: -10, research: 14, guildInfluence: 4 })]),
      choice("license", "授予特许", "增加国库与行会影响", [realm({ treasury: 16, guildInfluence: 6, authority: 2 })]),
      choice("open", "公开工艺", "所有文明共享少量研究", [all({ research: 5 }), realm({ influence: 5 })])
    ]),
    wandering_people: event("流民长队", "🚶", "一支流离失所的人群来到城外，请求食物、庇护与重新开始的机会。", "weakest", { minYear: 7 }, [
      choice("shelter", "开放粮仓", "消耗粮食，提升合法性并降低动乱", [realm({ food: -12, legitimacy: 5, unrest: -6, happiness: 4 })]),
      choice("work", "以工代赈", "用少量粮食换取木石与社会凝聚", [realm({ food: -6, wood: 8, stone: 6, cohesion: 4 })]),
      choice("close_border", "关闭城门", "保存资源，但民众幸福下降", [realm({ authority: 4, unrest: -2, happiness: -4 })])
    ]),
    comet_faith: event("彗星之夜", "☄", "长尾彗星照亮夜空，祭司、学者和军人都宣称它验证了自己的道路。", "faith", { minYear: 8, minFaith: 25 }, [
      choice("observe", "记录天象", "推动研究并显露古代线索", [realm({ research: 9 }), world({ revealRuins: 1 })]),
      choice("rite", "举行大祭", "提高信仰、凝聚与合法性", [realm({ food: -5, faith: 6, cohesion: 4, legitimacy: 3 })]),
      choice("war_omen", "宣称战争征兆", "提高尚武与军团士气", [realm({ valor: 6, armyMorale: 8, warWeariness: 3 })])
    ]),

    mine_collapse: event("深矿塌陷", "⛏", "一条富矿脉突然坍塌，矿工受困，贵重矿石与救援时间正在同时流失。", "mining", { minYear: 8, minStone: 16 }, [
      choice("rescue", "全力救援", "消耗国库与石材，恢复健康和凝聚", [realm({ treasury: -8, stone: -5, health: 8, cohesion: 5, unrest: -4 })]),
      choice("dig", "抢挖矿石", "获得石材，但降低幸福并提高动乱", [realm({ stone: 20, happiness: -6, unrest: 5 })]),
      choice("seal", "永久封矿", "稳定社会并推动工程研究", [realm({ stone: -4, unrest: -5, research: 7 })])
    ]),
    river_market: event("河湾集市", "⛵", "季节性集市吸引了异国商旅，码头挤满货船，也引发关税与治安争议。", "trade", { minYear: 9, minTradeRoutes: 1 }, [
      choice("free", "免征关税", "改善外交并提高文化影响", [realm({ influence: 6, treasury: 5 }), diplomacy({ score: 3, trust: 3 })]),
      choice("tax", "征收商税", "大幅增加国库，略增动乱", [realm({ treasury: 20, unrest: 3, authority: 2 })]),
      choice("regulate", "设立市舶司", "消耗国库，增加研究与凝聚", [realm({ treasury: -5, research: 8, cohesion: 5 })])
    ]),
    forest_wardens: event("林地守望", "🌲", "守林人报告过度砍伐正在驱赶兽群，他们要求划定保护林或改良采伐方式。", "nature", { minYear: 8 }, [
      choice("reserve", "设立保护林", "恢复生态并提高信仰，短期减少木材", [realm({ wood: -10, faith: 4, unrest: -2 }), world({ biomass: 0.045 })]),
      choice("forestry", "推行轮伐", "推动研究并温和恢复生态", [realm({ research: 7, wood: 5 }), world({ biomass: 0.02 })]),
      choice("clear", "扩大采伐", "大量获得木材，损害生态与幸福", [realm({ wood: 22, happiness: -4 }), world({ biomass: -0.025 })])
    ]),
    veterans_return: event("老兵归乡", "🛡", "战争结束后，成群老兵带着伤病、荣誉与对土地的承诺返回故乡。", "military", { minYear: 10, minValor: 30 }, [
      choice("land", "分配土地", "消耗粮食，提高合法性与稳定", [realm({ food: -8, legitimacy: 6, unrest: -5, warWeariness: -6 })]),
      choice("guard", "编入卫队", "提高权威和军心", [realm({ authority: 5, armyMorale: 8, warWeariness: -3 })]),
      choice("pension", "发放抚恤", "消耗国库，改善幸福与凝聚", [realm({ treasury: -12, happiness: 7, cohesion: 5, warWeariness: -5 })])
    ]),
    healer_caravan: event("行医车队", "✚", "一群跨境治疗师愿意停留一季，但需要药材、护卫和免税许可。", "medicine", { minYear: 9 }, [
      choice("clinic", "建立诊所", "消耗国库，显著改善健康与抗疫", [realm({ treasury: -8, health: 10, plague: -10, research: 4 })]),
      choice("tour", "巡回乡野", "所有文明获得少量治疗", [all({ health: 4, plague: -4 }), realm({ legitimacy: 3 })]),
      choice("escort", "护送离境", "改善外交并获得研究记录", [realm({ research: 6 }), diplomacy({ score: 2, trust: 3 })])
    ]),

    tax_revolt: event("税吏风波", "¤", "税吏与市民在集市发生冲突，一张被撕毁的税榜点燃了积压已久的不满。", "unrest", { minYear: 10, minUnrest: 12 }, [
      choice("reform", "减税整顿", "损失国库，显著降低动乱", [realm({ treasury: -12, unrest: -9, legitimacy: 5 })]),
      choice("mediate", "议会调解", "提升凝聚并温和恢复秩序", [realm({ cohesion: 7, unrest: -5, authority: 2 })]),
      choice("suppress", "武力镇压", "提高权威，损害幸福并留下动乱", [realm({ authority: 8, happiness: -8, unrest: 5 })])
    ]),
    succession_feast: event("继承宴席", "♛", "统治家族举办盛宴，继承人、派系领袖与外国使节都在席间试探未来权力。", "dynasty", { minYear: 10, minDynasty: 1 }, [
      choice("public", "与民同庆", "消耗粮食，提高合法性与幸福", [realm({ food: -10, legitimacy: 7, happiness: 5 })]),
      choice("diplomatic", "宴请使节", "消耗国库并改善外交", [realm({ treasury: -7, influence: 4 }), diplomacy({ score: 4, trust: 4 })]),
      choice("private", "闭门定策", "提高权威与宫廷凝聚", [realm({ authority: 5, cohesion: 6, unrest: 2 })])
    ]),
    port_storm: event("港口风暴", "🌊", "突如其来的风暴冲毁栈桥，商船搁浅，港城必须在救人、抢货和重建间抉择。", "navigation", { minYear: 10, hasPort: true }, [
      choice("rescue", "优先救人", "改善健康、幸福与合法性", [realm({ treasury: -6, health: 7, happiness: 5, legitimacy: 4 })]),
      choice("cargo", "抢救货物", "获得粮食与国库，降低幸福", [realm({ food: 12, treasury: 12, happiness: -4 })]),
      choice("breakwater", "修建防波堤", "消耗石材，推动研究与长期稳定", [realm({ stone: -10, research: 8, unrest: -4 })])
    ]),
    wolf_moon: event("狼月围村", "🐺", "严冬将狼群逼近村落，牧民要求猎杀，守林人则认为应恢复荒野猎物。", "nature", { minYear: 9, minAnimals: 12 }, [
      choice("hunt", "组织猎队", "提高军心并换取粮食，损害生态", [realm({ food: 10, armyMorale: 5, valor: 3 }), world({ biomass: -0.015 })]),
      choice("fences", "加固围栏", "消耗木材，提高安全与稳定", [realm({ wood: -8, unrest: -5, legitimacy: 3 })]),
      choice("restore", "恢复猎物栖地", "消耗粮食并修复生态", [realm({ food: -6, faith: 3 }), world({ biomass: 0.04 })])
    ]),
    road_bandits: event("商道劫影", "🗡", "多支商队在同一路段失踪，地方领主、军团和商会互相指责。", "trade", { minYear: 11, minTradeRoutes: 1 }, [
      choice("patrol", "派兵巡逻", "消耗国库，提高军心与秩序", [realm({ treasury: -6, armyMorale: 6, unrest: -5, authority: 3 })]),
      choice("bounty", "发布悬赏", "消耗国库，提高合法性与幸福", [realm({ treasury: -10, legitimacy: 5, happiness: 3 })]),
      choice("deal", "秘密招安", "获得国库并略增动乱", [realm({ treasury: 14, unrest: 4, authority: 2 })])
    ]),

    artisan_fair: event("百工大集", "🎪", "来自各地的工匠聚集城中比试技艺，新式器具、夸张承诺与仿冒品同时涌现。", "guilds", { minYear: 10, minTechnology: 1 }, [
      choice("prizes", "设立大奖", "消耗国库，大幅推动研究与行会影响", [realm({ treasury: -8, research: 12, guildInfluence: 5 })]),
      choice("market", "开放交易", "增加国库与文化影响", [realm({ treasury: 15, influence: 6 })]),
      choice("standards", "制定标准", "提高权威、凝聚与研究", [realm({ authority: 4, cohesion: 5, research: 6 })])
    ]),
    forbidden_book: event("禁书流传", "📖", "一本质疑旧传统的手抄本在学者和年轻贵族间流传，神殿要求立即查禁。", "research", { minYear: 12, minFaith: 25 }, [
      choice("publish", "公开刊行", "大幅推动研究与文化，增加动乱", [realm({ research: 13, influence: 7, unrest: 4 })]),
      choice("debate", "公开辩论", "提高凝聚、研究并维持信仰", [realm({ cohesion: 6, research: 7, faith: 2 })]),
      choice("ban", "焚毁禁书", "提高信仰与权威，损失研究", [realm({ faith: 7, authority: 6, research: -4, unrest: 2 })])
    ]),
    sacred_spring: event("圣泉争议", "💧", "一处新涌出的泉水被宣称具有疗愈力量，朝圣者、医师和地主争夺控制权。", "faith", { minYear: 11, minFaith: 28 }, [
      choice("commons", "开放圣泉", "改善所有居民健康与主导国声望", [all({ health: 3, plague: -3 }), realm({ legitimacy: 5, faith: 4 })]),
      choice("clinic", "交给医师", "推动研究与抗疫", [realm({ research: 9, health: 7, plague: -7 })]),
      choice("shrine", "修建神殿", "消耗石材，提高信仰、幸福与影响", [realm({ stone: -8, faith: 8, happiness: 4, influence: 5 })])
    ]),
    refugee_scholars: event("流亡学者", "🕯", "邻国的学者因政治风波逃来，携带珍贵笔记，也带来可能引发外交冲突的身份。", "research", { minYear: 12, minKingdoms: 2 }, [
      choice("asylum", "给予庇护", "推动研究与文化，但制造外交旧怨", [realm({ research: 11, influence: 6, legitimacy: 3 }), diplomacy({ trust: -2, grievance: 4 })]),
      choice("exchange", "交换手稿", "所有文明共享研究并改善互信", [all({ research: 4 }), diplomacy({ score: 3, trust: 3 })]),
      choice("return", "遣返回国", "提高权威并改善外交，降低幸福", [realm({ authority: 5, happiness: -4 }), diplomacy({ score: 2, trust: 2 })])
    ]),
    grain_fire: event("粮仓失火", "🔥", "主粮仓在夜间起火，火势蔓延前只能优先抢救粮食、账册或附近居民。", "food", { minYear: 10, minFood: 30 }, [
      choice("grain", "抢救粮袋", "保住粮食，承担健康与动乱代价", [realm({ food: -6, health: -3, unrest: 3 })]),
      choice("people", "疏散居民", "损失粮食，提高幸福与合法性", [realm({ food: -16, happiness: 6, legitimacy: 5 })]),
      choice("records", "保全账册", "损失粮食，保住国库并推动行政研究", [realm({ food: -14, treasury: 8, research: 7 })])
    ]),

    frontier_fort: event("边堡请建", "🏰", "边境居民请求修建永久堡垒，商人担心它会阻碍贸易，军团则视其为安全基石。", "military", { minYear: 12, minValor: 34 }, [
      choice("fort", "修建石堡", "消耗石材，提高军心、权威与稳定", [realm({ stone: -12, armyMorale: 8, authority: 5, unrest: -4 })]),
      choice("outpost", "建立小型哨站", "消耗木材，温和提高秩序", [realm({ wood: -8, legitimacy: 3, unrest: -3 })]),
      choice("tradepost", "改建边贸站", "增加国库并改善外交", [realm({ treasury: 14, influence: 4 }), diplomacy({ score: 3, trust: 2 })])
    ]),
    miners_strike: event("矿工停锤", "🔨", "矿工拒绝继续进入危险坑道，要求提高口粮、修缮支撑并获得议会代表。", "mining", { minYear: 12, minGuildInfluence: 20 }, [
      choice("accept", "接受诉求", "消耗粮食，提高凝聚和行会支持", [realm({ food: -8, cohesion: 7, guildInfluence: 6, unrest: -5 })]),
      choice("safety", "只改善安全", "消耗木石，推动研究并缓和动乱", [realm({ wood: -6, stone: -4, research: 7, unrest: -4 })]),
      choice("replace", "强征劳工", "获得石材，提高权威并损害幸福", [realm({ stone: 16, authority: 6, happiness: -7, unrest: 5 })])
    ]),
    merchant_dispute: event("商会仲裁", "⚖", "两家跨国商会因货损互相扣押财产，争端正威胁整条贸易网络。", "diplomacy", { minYear: 12, minTradeRoutes: 1, minKingdoms: 2 }, [
      choice("court", "公开仲裁", "消耗国库，显著改善外交", [realm({ treasury: -5, legitimacy: 4 }), diplomacy({ score: 5, trust: 5, grievance: -4 })]),
      choice("compensate", "共同赔付", "损失国库，增加粮食与外交信任", [realm({ treasury: -9, food: 8 }), diplomacy({ score: 3, trust: 4 })]),
      choice("seize", "没收双方货物", "增加国库，制造外交怨恨", [realm({ treasury: 18, authority: 4 }), diplomacy({ score: -4, trust: -4, grievance: 7 })])
    ]),
    plague_scare: event("疫病疑云", "☣", "一名旅人在城门前病倒，是否真是瘟疫尚无定论，恐慌却已经传遍街巷。", "medicine", { minYear: 12, minDisasters: 1 }, [
      choice("quarantine", "谨慎隔离", "消耗国库，降低瘟疫与动乱", [realm({ treasury: -6, plague: -8, unrest: -5, authority: 3 })]),
      choice("treat", "公开救治", "改善健康、幸福并推动研究", [realm({ health: 8, plague: -6, happiness: 4, research: 5 })]),
      choice("deny", "压下消息", "维持国库与权威，增加未来风险", [realm({ treasury: 5, authority: 4, plague: 3, unrest: 4 })])
    ]),
    drought_well: event("枯井议事", "☀", "多口水井同时见底，农民、工匠和神殿围绕仅存水源的分配激烈争论。", "food", { minYear: 12, minDisasters: 1 }, [
      choice("ration", "统一配水", "提高权威并保住粮食，降低幸福", [realm({ authority: 5, food: 10, happiness: -4 })]),
      choice("dig", "开凿深井", "消耗石材与国库，推动研究和土地恢复", [realm({ stone: -8, treasury: -6, research: 7 }), world({ fertility: 0.025 })]),
      choice("pray", "举行祈雨祭", "消耗粮食，提高信仰与凝聚", [realm({ food: -6, faith: 7, cohesion: 4, unrest: -3 })])
    ]),

    hero_challenge: event("英雄挑战", "⚔", "一名声名鹊起的勇士公开挑战旧有领袖，民众把这场比试视作时代更替的象征。", "heroes", { minYear: 13, hasHero: true }, [
      choice("tournament", "举办公开比武", "消耗国库，提高英雄声望、军心和幸福", [realm({ treasury: -7, armyMorale: 7, happiness: 5 }), world({ heroRenown: 7 })]),
      choice("command", "授予军职", "提高权威、尚武和英雄声望", [realm({ authority: 5, valor: 5 }), world({ heroRenown: 5 })]),
      choice("council", "邀请入议会", "提高凝聚、合法性与文化影响", [realm({ cohesion: 7, legitimacy: 4, influence: 5 }), world({ heroRenown: 4 })])
    ]),
    ancient_map: event("古图残片", "🗺", "旅商出售一块标有古代道路和陌生符号的皮卷，真伪难辨，竞价者却越来越多。", "legacy", { minYear: 13, minRuins: 1 }, [
      choice("buy", "买下古图", "消耗国库，显露遗迹并推动研究", [realm({ treasury: -9, research: 7 }), world({ revealRuins: 1 })]),
      choice("copy", "公开摹本", "所有文明共享少量研究并改善外交", [all({ research: 3 }), diplomacy({ score: 2, trust: 2 }), world({ revealRuins: 1 })]),
      choice("fraud", "揭穿骗局", "提高权威并收回国库", [realm({ treasury: 8, authority: 4, legitimacy: 3 })])
    ]),
    marriage_festival: event("两姓庆典", "♥", "一场显赫婚姻让街巷充满庆典，派系与邻国都试图借机获得承诺。", "dynasty", { minYear: 13, minMarriages: 1 }, [
      choice("people", "开放庆典", "消耗粮食，提高幸福、合法性和凝聚", [realm({ food: -10, happiness: 7, legitimacy: 5, cohesion: 4 })]),
      choice("envoys", "邀请各国使节", "消耗国库并改善外交", [realm({ treasury: -7, influence: 5 }), diplomacy({ score: 4, trust: 4 })]),
      choice("oaths", "交换政治誓约", "提高权威和宫廷凝聚，略增动乱", [realm({ authority: 6, cohesion: 6, unrest: 2 })])
    ]),
    eclipse_omen: event("日蚀正午", "◐", "白昼突然暗去，市场停摆，军团戒备，学者争分夺秒记录这场罕见天象。", "faith", { minYear: 15 }, [
      choice("science", "全民观测", "推动研究并提高文化影响", [realm({ research: 11, influence: 6 })]),
      choice("vigil", "举行守夜仪式", "提高信仰、凝聚并降低动乱", [realm({ faith: 7, cohesion: 5, unrest: -5 })]),
      choice("decree", "宣布戒严", "提高权威与军心，降低幸福", [realm({ authority: 7, armyMorale: 6, happiness: -5 })])
    ]),
    fisher_dispute: event("渔场之争", "🐟", "两座港城的渔船在同一片海湾相撞，渔民要求保护，商会担心争端升级为封锁。", "navigation", { minYear: 13, hasPort: true, minKingdoms: 2 }, [
      choice("shared", "划定共享渔场", "增加粮食并改善外交", [realm({ food: 12, legitimacy: 3 }), diplomacy({ score: 4, trust: 4, grievance: -3 })]),
      choice("patrol", "派遣巡逻船", "提高权威、军心并增加少量粮食", [realm({ food: 6, authority: 5, armyMorale: 5 }), diplomacy({ trust: -1, grievance: 2 })]),
      choice("auction", "拍卖捕捞权", "增加国库并略微损害外交", [realm({ treasury: 18, influence: 3 }), diplomacy({ score: -2, grievance: 3 })])
    ])
  });

  globalThis.RealmRegionalEventContent = Object.freeze({ events });
})();
