"use strict";

// 大型世界事件的纯数据目录。执行、存档与界面逻辑位于 experience-system.js。

(() => {
  const realm = (scope, changes) => ({ type: "realm", scope, ...changes });
  const diplomacy = (scope, changes) => ({ type: "diplomacy", scope, ...changes });
  const world = changes => ({ type: "world", ...changes });
  const later = (after, text, effects) => ({ after, text, effects });
  const choice = (id, label, hint, effects, delayed = null, options = {}) => ({ id, label, hint, effects, delayed, ...options });
  const stage = (title, text, next, choices) => ({ title, text, next, choices });
  const chain = (name, icon, focus, conditions, roles, stages) => ({ name, icon, focus, conditions, roles, first: Object.keys(stages)[0], stages });

  const chains = Object.freeze({
    starfall: chain("星落之谜", "☄", "research", { minYear: 8, minKingdoms: 1 }, ["观星国", "远征国", "见证国"], {
      omen: stage("群星异动", "一道苍白星痕横贯夜空，各文明争论这是祝福、警告还是尚未理解的自然现象。", "expedition", [
        choice("observe", "组织观星", "推动研究，数年后形成观测传统", [realm("all", { research: 7 })], later(5, "早期观测记录被整理为星表。", [realm("all", { research: 5, influence: 2 })])),
        choice("pray", "举行祈星祭", "提高合法性与信仰，但会延缓实证研究", [realm("all", { legitimacy: 6, faith: 4 })], later(4, "祈星仪式成为各地共同节庆。", [realm("all", { unrest: -3, faith: 2 })])),
        choice("ignore", "安抚民众", "稳定社会并保存国库", [realm("all", { unrest: -7, treasury: 3 })])
      ]),
      expedition: stage("坠星远征", "斥候找到了星体坠落之处。灼热晶体蕴含奇异力量，但远征路线穿过危险荒野。", "legacy", [
        choice("shared", "联合考察", "参与国共享知识并建立互信", [realm("participants", { research: 9 }), diplomacy("participants", { score: 5, trust: 4, grievance: -3 })], later(6, "联合远征的学者建立了跨国书信网。", [diplomacy("participants", { score: 3, trust: 3 }), realm("participants", { research: 4 })])),
        choice("claim", "强者独占", "主导国迅速获益，其他参与国积累旧怨", [realm("primary", { research: 22, treasury: 25 }), diplomacy("participants", { score: -7, trust: -8, grievance: 14 })]),
        choice("seal", "封存遗迹", "换取稳定，并让遗迹线索更清晰", [realm("all", { unrest: -6, legitimacy: 2 }), world({ revealRuins: 1 })])
      ]),
      legacy: stage("星铁遗产", "晶体开始衰变，最后一批星铁必须用于公共学术、王权象征或永久封存。", null, [
        choice("academy", "建立星辰学院", "获得长期科研与文化声望", [realm("primary", { research: 18, influence: 8 }), realm("participants", { research: 5 })], later(8, "星辰学院培养出新一代测绘者。", [realm("participants", { research: 8 }), world({ revealRuins: 1 })]), { ending: "星辰学院保存了坠星知识" }),
        choice("regalia", "铸成王权礼器", "主导国巩固合法性，但盟友更加戒备", [realm("primary", { legitimacy: 14, treasury: 12 }), diplomacy("participants", { trust: -4, grievance: 6 })], null, { ending: "星铁成为王权的象征" }),
        choice("taboo", "立下禁忌", "所有文明获得安定与信仰", [realm("all", { unrest: -8, faith: 6 })], null, { ending: "坠星之地被列为永恒禁区" })
      ])
    }),

    council: chain("万邦议会", "⚖", "diplomacy", { minYear: 10, minKingdoms: 2 }, ["东道国", "边境国", "贸易国"], {
      summons: stage("议会召集令", "商路冲突与边境摩擦日益增多。使节建议召开跨文明议会，为共同规则奠定基础。", "charter", [
        choice("host", "共同出资", "消耗国库，增加参与国互信", [realm("participants", { treasury: -6, legitimacy: 2 }), diplomacy("participants", { score: 5, trust: 5, grievance: -3 })]),
        choice("neutral", "保持观望", "小幅改善关系，不承担高额成本", [diplomacy("participants", { score: 2, trust: 1 })]),
        choice("reject", "拒绝议会", "提高尚武影响并增加猜忌", [realm("participants", { valor: 3, unrest: 2 }), diplomacy("participants", { trust: -5, grievance: 5 })])
      ]),
      charter: stage("万邦宪章", "数月辩论后，使节提出贸易、边界与战俘三项准则。是否签署，将改变未来数十年的外交秩序。", "enforcement", [
        choice("peace", "签署和平宪章", "结束参与国战争并大幅提高互信", [diplomacy("participants", { score: 10, trust: 7, grievance: -8, peace: true }), realm("participants", { legitimacy: 4 })]),
        choice("trade", "只签贸易条款", "增加国库、粮食与商贸关系", [realm("participants", { treasury: 10, food: 5 }), diplomacy("participants", { score: 5, trust: 3 })]),
        choice("walkout", "退出谈判", "维护主权，但激化尚武与旧怨", [realm("participants", { valor: 4, authority: 3 }), diplomacy("participants", { score: -5, trust: -4, grievance: 6 })])
      ]),
      enforcement: stage("宪章的考验", "第一场违约争端出现了。世界必须决定由常设法庭、松散盟约还是各国武力来维护秩序。", null, [
        choice("court", "建立万邦法庭", "稳定外交并压低战争疲劳", [realm("participants", { treasury: -8, legitimacy: 6, cohesion: 5, warWeariness: -7 }), diplomacy("participants", { score: 8, trust: 6, grievance: -8 })], later(8, "万邦法庭裁决了第一批跨境争端。", [diplomacy("participants", { score: 5, trust: 4, grievance: -4 })]), { locks: ["iron_doctrine"], ending: "万邦法庭成为共同秩序的核心" }),
        choice("league", "维持松散盟约", "以贸易和协商维系合作", [realm("participants", { treasury: 12, influence: 5 }), diplomacy("participants", { score: 4, trust: 3 })], null, { ending: "诸国以松散盟约延续合作" }),
        choice("sovereignty", "各自维护主权", "强化国家权威，也让未来冲突更难调解", [realm("participants", { authority: 7, valor: 4 }), diplomacy("participants", { trust: -4, grievance: 5 })], null, { ending: "万邦宪章让位于武装主权" })
      ])
    }),

    blight: chain("灰穗之年", "🌾", "food", { minYear: 8, minKingdoms: 1 }, ["粮仓国", "饥馑国", "医师团"], {
      warning: stage("作物异变", "灰色斑点正在农田间蔓延。治疗师警告歉收将至，各国必须在冬季前做出准备。", "hunger", [
        choice("stores", "建立储备", "消耗木材，保护粮食", [realm("all", { wood: -12, food: 16 })]),
        choice("study", "研究病穗", "牺牲部分存粮，推动研究", [realm("all", { food: -5, research: 10 })], later(5, "抗病种子的试验获得成功。", [realm("all", { food: 12, research: 4 }), world({ fertility: 0.025 })])),
        choice("burn", "焚烧病田", "损失粮食，快速遏制恐慌", [realm("all", { food: -12, unrest: -3 }), world({ fertility: -0.015 })])
      ]),
      hunger: stage("饥馑考验", "歉收如期而至。富裕聚落仍有余粮，边境村庄却已出现饥饿，援助还是自保成为时代难题。", "renewal", [
        choice("relief", "跨国赈济", "重新分配粮食，提高互信", [realm("strongest", { food: -14 }), realm("weakest", { food: 24, unrest: -7 }), diplomacy("participants", { score: 4, trust: 4, grievance: -3 })]),
        choice("ration", "严格配给", "保存粮食但降低幸福", [realm("all", { food: 12, happiness: -5, authority: 3 })]),
        choice("open", "开放粮市", "用国库换取粮食与贸易", [realm("all", { treasury: -8, food: 14 }), diplomacy("participants", { score: 3, trust: 2 })])
      ]),
      renewal: stage("新种之春", "灾后的第一批种子已准备播下。集中保存、自由交换或迁离病土将决定农业的未来。", null, [
        choice("seedbank", "建立万国种库", "提升粮食、研究与土地恢复", [realm("participants", { treasury: -6, food: 10, research: 8 }), world({ fertility: 0.045, biomass: 0.035 })], later(7, "万国种库分发了更强健的作物。", [realm("all", { food: 15 }), world({ fertility: 0.025 })]), { ending: "种库让饥馑成为共同记忆" }),
        choice("markets", "交给自由粮市", "国库与贸易获益，但弱国仍感不安", [realm("participants", { treasury: 18, food: 6 }), realm("weakest", { unrest: 5 }), diplomacy("participants", { score: 2 })], null, { ending: "粮商建立了跨国粮市" }),
        choice("migration", "迁离病土", "降低动乱并恢复居民健康", [realm("all", { food: -5, unrest: -6, health: 7 }), world({ fertility: 0.02 })], null, { ending: "大迁徙重绘了农耕边界" })
      ])
    }),

    empty_throne: chain("空王座之争", "♛", "dynasty", { minYear: 12, minKingdoms: 2, minDynasties: 1 }, ["摄政国", "宣称国", "调停国"], {
      whispers: stage("王座低语", "一位统治者的权威骤然衰弱，数名宣称者在宫廷与邻国间寻找支持。", "claimants", [
        choice("regency", "承认摄政", "暂时稳定秩序，增强宫廷凝聚", [realm("primary", { legitimacy: 7, cohesion: 6, authority: 3 })]),
        choice("inquiry", "核验血统", "投入研究并降低继承争议", [realm("primary", { treasury: -5, research: 7, unrest: -4 })]),
        choice("back_claimant", "扶持宣称者", "获得影响力，但制造外交旧怨", [realm("rival", { legitimacy: 5, influence: 6 }), diplomacy("participants", { trust: -4, grievance: 7 })])
      ]),
      claimants: stage("诸侯站队", "宣称者公开亮出旗帜，贵族、军团与行会要求世界选择合法性来自血缘、议会还是实力。", "settlement", [
        choice("blood", "维护血缘继承", "提高合法性与宫廷影响", [realm("primary", { legitimacy: 10, cohesion: 3 }), realm("participants", { faith: 2 })]),
        choice("assembly", "召开继承大会", "用国库换取凝聚与跨国信任", [realm("participants", { treasury: -6, cohesion: 6, authority: 2 }), diplomacy("participants", { score: 4, trust: 4 })]),
        choice("trial", "让宣称者决斗", "提高尚武和军心，也扩大社会裂痕", [realm("participants", { valor: 6, armyMorale: 8, unrest: 5 })])
      ]),
      settlement: stage("新冠加冕", "王座终于有了主人。赦免失败者、流放反对派或分享权力，将决定这场继承危机留下何种政治传统。", null, [
        choice("amnesty", "大赦诸侯", "缓和旧怨并恢复社会", [realm("participants", { legitimacy: 7, unrest: -8 }), diplomacy("participants", { score: 4, trust: 4, grievance: -6 })], later(6, "获赦诸侯重新宣誓效忠。", [realm("primary", { cohesion: 7, authority: 3 })]), { ending: "大赦结束了王座之争" }),
        choice("exile", "流放反对者", "强化权威，但留下长期怨恨", [realm("primary", { authority: 10, legitimacy: 5 }), diplomacy("participants", { trust: -5, grievance: 9 })], null, { ending: "流亡者把王位旧怨带往异乡" }),
        choice("diarchy", "分享王权", "提升凝聚与研究，削弱单一权威", [realm("primary", { cohesion: 10, authority: -4, research: 7 }), diplomacy("participants", { trust: 3 })], null, { ending: "双重王权成为新的政治实验" })
      ])
    }),

    guild_revolution: chain("行会革命", "⚒", "guilds", { minYear: 14, minKingdoms: 1, minGuildInfluence: 22 }, ["工坊国", "商贸国", "保守国"], {
      petition: stage("百工请愿", "工匠与商人联名要求固定度量、公开税则和议会席位，旧贵族则警告秩序将被颠覆。", "shutdown", [
        choice("hear", "召开听证", "花费国库，提升凝聚与行会支持", [realm("primary", { treasury: -5, cohesion: 6, influence: 4 })]),
        choice("license", "颁发特许", "立即增加国库和研究", [realm("primary", { treasury: 14, research: 6, authority: 2 })]),
        choice("ban", "查禁结社", "强化权威并制造动乱", [realm("primary", { authority: 7, unrest: 7 }), realm("participants", { happiness: -3 })])
      ]),
      shutdown: stage("熄炉之日", "工坊停火、市场闭门，城市物资开始短缺。军队、平民与贵族都要求尽快解决僵局。", "charter", [
        choice("negotiate", "集体谈判", "恢复生产并降低动乱", [realm("participants", { treasury: -5, unrest: -7, cohesion: 7, research: 4 })]),
        choice("break", "强行复工", "获得资源，却损害幸福与长期信任", [realm("primary", { wood: 12, stone: 10, authority: 6, happiness: -6, unrest: 5 })]),
        choice("cooperative", "组建合作工坊", "降低国库，提升研究与文化", [realm("participants", { treasury: -8, research: 9, influence: 6 })], later(6, "合作工坊改良了生产工具。", [realm("participants", { research: 6, treasury: 8 })]))
      ]),
      charter: stage("百工宪章", "危机结束前，世界必须决定行会究竟是国家附庸、自治共同体，还是新的统治力量。", null, [
        choice("civic", "授予自治席位", "提升凝聚、研究与贸易互信", [realm("participants", { cohesion: 8, research: 7, influence: 5 }), diplomacy("participants", { score: 3, trust: 3 })], null, { ending: "行会成为议会中的永久力量" }),
        choice("crown", "纳入国家工坊", "强化权威和国库", [realm("primary", { authority: 8, treasury: 18, research: 4 }), realm("primary", { unrest: 3 })], null, { ending: "百工接受了王权监督" }),
        choice("republic", "建立行会共和国", "大幅提升凝聚与影响，削弱旧权威", [realm("primary", { cohesion: 12, influence: 10, authority: -8, legitimacy: 4 })], later(8, "行会共和国吸引了各国工匠。", [realm("primary", { research: 10, treasury: 12 }), realm("rival", { unrest: 3 })]), { ending: "工匠与商人掌握了新的公共权力" })
      ])
    }),

    sacred_schism: chain("圣火分裂", "✣", "faith", { minYear: 14, minKingdoms: 2, minFaith: 35 }, ["圣座国", "改革国", "世俗国"], {
      doctrine: stage("新启示", "一卷新发现的经文与既有教义冲突，神殿、王室和民众围绕解释权展开争论。", "fracture", [
        choice("synod", "召开宗教会议", "提高信仰和凝聚", [realm("participants", { treasury: -4, faith: 5, cohesion: 5 })]),
        choice("tolerate", "容许多种解释", "降低动乱并增加文化影响", [realm("participants", { unrest: -5, influence: 6, authority: -2 })]),
        choice("orthodox", "宣布唯一正统", "提高合法性和权威，但增加裂痕", [realm("primary", { legitimacy: 8, authority: 5, faith: 5 }), realm("rival", { unrest: 6 })])
      ]),
      fracture: stage("钟声相斥", "不同教派拒绝共享圣所，朝圣路受阻，边境城市爆发冲突。", "concordat", [
        choice("shared_shrines", "共享圣所", "缓和外交与民间冲突", [realm("participants", { unrest: -6, faith: 3 }), diplomacy("participants", { score: 5, trust: 4, grievance: -5 })]),
        choice("separate", "划分教区", "维持稳定，但信任恢复有限", [realm("participants", { legitimacy: 4, unrest: -3, authority: 2 })]),
        choice("crusade", "发动圣战", "强化军心和信仰，积累严重旧怨", [realm("participants", { faith: 7, valor: 5, armyMorale: 9, warWeariness: 5 }), diplomacy("participants", { score: -8, trust: -8, grievance: 12 })])
      ]),
      concordat: stage("信仰和约", "数年的分裂后，教士与统治者尝试规定信仰、法律和王权的最终边界。", null, [
        choice("plural", "确立宽容和约", "长期降低动乱并修复信任", [realm("participants", { cohesion: 9, unrest: -8, influence: 5 }), diplomacy("participants", { score: 7, trust: 6, grievance: -6 })], later(9, "宽容和约让跨境朝圣重新开始。", [realm("participants", { treasury: 8, faith: 3 }), diplomacy("participants", { trust: 3 })]), { ending: "多种信仰在和约下共存" }),
        choice("supremacy", "圣座高于王权", "大幅提高信仰与合法性，削弱国家权威", [realm("primary", { faith: 12, legitimacy: 10, authority: -7 })], null, { ending: "圣座获得了裁决王权的地位" }),
        choice("secular", "政教彻底分离", "提高研究与权威，但宗教支持下降", [realm("participants", { research: 10, authority: 7, faith: -5, unrest: 2 })], null, { ending: "世俗法取代教义成为共同尺度" })
      ])
    }),

    border_exodus: chain("无乡者长路", "♨", "weakest", { minYear: 12, minKingdoms: 2 }, ["收容国", "原乡国", "边境国"], {
      arrival: stage("边境营火", "成群流民抵达边境，他们携带技艺、伤病与关于故土崩溃的传闻。", "pressure", [
        choice("shelter", "开放边境", "消耗粮食，改善幸福与外交", [realm("primary", { food: -12, legitimacy: 5, happiness: 4 }), diplomacy("participants", { score: 4, trust: 4 })]),
        choice("screen", "有限安置", "平衡资源与稳定", [realm("primary", { food: -5, legitimacy: 2, unrest: -2 })]),
        choice("close", "关闭关卡", "保存粮食并制造怨恨", [realm("primary", { food: 5, authority: 4 }), realm("weakest", { unrest: 6 }), diplomacy("participants", { trust: -5, grievance: 8 })])
      ]),
      pressure: stage("新旧居民", "安置地的住房、工作与习俗冲突不断，城市必须决定新来者能否获得完整身份。", "homeland", [
        choice("citizenship", "授予公民权", "提高凝聚和文化，短期增加财政负担", [realm("primary", { treasury: -8, cohesion: 8, influence: 6, unrest: -4 })]),
        choice("settlements", "建立边境新村", "投入木石并改善粮食储备", [realm("primary", { wood: -10, stone: -6, food: 12, legitimacy: 3 })]),
        choice("labor", "组织劳役", "获得资源，却降低幸福并积累旧怨", [realm("primary", { wood: 14, stone: 12, authority: 5, happiness: -7 }), diplomacy("participants", { grievance: 5 })])
      ]),
      homeland: stage("故土之问", "流民后代要求重建故土、永久融入新家园，或追究造成流亡的责任。", null, [
        choice("return", "援助重建故土", "消耗资源，显著改善外交", [realm("participants", { treasury: -7, wood: -6, stone: -6, legitimacy: 4 }), diplomacy("participants", { score: 8, trust: 7, grievance: -8 })], later(8, "重建后的故土恢复了第一条商路。", [realm("participants", { treasury: 12, food: 8 })]), { ending: "无乡者重新点燃了故土炉火" }),
        choice("belong", "承认新家园", "提升凝聚、幸福与文化影响", [realm("primary", { cohesion: 10, happiness: 7, influence: 7 })], null, { ending: "流民成为新家园的一部分" }),
        choice("tribunal", "追究流亡责任", "提高合法性并激化旧怨", [realm("weakest", { legitimacy: 8, authority: 4 }), diplomacy("participants", { score: -3, trust: -3, grievance: 7 })], null, { ending: "流亡者把苦难写进了审判记录" })
      ])
    }),

    sea_road: chain("远海航路", "⚓", "navigation", { minYear: 16, minKingdoms: 2, minTradeRoutes: 1 }, ["航海国", "港湾国", "内陆国"], {
      chart: stage("无名海图", "一名远行者带回绘有陌生洋流的海图，声称海平线外存在更安全也更富饶的航道。", "passage", [
        choice("expedition", "资助远航", "消耗国库并推进研究", [realm("primary", { treasury: -10, research: 10 }), realm("participants", { influence: 2 })]),
        choice("open_map", "公开海图", "共享研究并改善互信", [realm("participants", { research: 6 }), diplomacy("participants", { score: 4, trust: 4 })]),
        choice("monopoly", "封锁海图", "主导国获利，其他参与国不满", [realm("primary", { treasury: 18, research: 6 }), diplomacy("participants", { trust: -5, grievance: 8 })])
      ]),
      passage: stage("风暴海峡", "船队必须穿越一片反复生成风暴的海峡。灯塔、护航舰或献祭仪式只能选择其一。", "league", [
        choice("lighthouses", "共建灯塔", "投入石材，获得研究与贸易收益", [realm("participants", { stone: -8, research: 7, treasury: 7 })], later(6, "灯塔链让商船敢于夜航。", [realm("participants", { treasury: 12 }), diplomacy("participants", { score: 3, trust: 2 })])),
        choice("escorts", "武装护航", "提升军心与国库，也增加戒惧", [realm("participants", { treasury: 8, armyMorale: 8, valor: 3 }), diplomacy("participants", { trust: -2, grievance: 3 })]),
        choice("ritual", "举行海神祭", "提升信仰、幸福与社会稳定", [realm("participants", { faith: 6, happiness: 5, unrest: -4 })])
      ]),
      league: stage("港湾盟约", "航路终于稳定。港口城邦要求决定海图、关税和救援义务的永久归属。", null, [
        choice("free_seas", "确立自由海域", "大幅改善贸易与外交", [realm("participants", { treasury: 15, influence: 6 }), diplomacy("participants", { score: 7, trust: 6, grievance: -5 })], later(9, "自由海域催生了新的远洋商团。", [realm("participants", { treasury: 14, research: 5 })]), { ending: "港湾盟约开启了自由航海时代" }),
        choice("tolls", "划分收费海域", "各国增加国库并强化权威", [realm("participants", { treasury: 22, authority: 5 }), diplomacy("participants", { score: -2, grievance: 3 })], null, { ending: "海路被划为彼此竞争的关税区" }),
        choice("navigator_order", "成立领航者公会", "提升科研、文化和跨国信任", [realm("participants", { research: 10, influence: 8 }), diplomacy("participants", { trust: 4 })], null, { ending: "领航者公会守护着共同海图" })
      ])
    }),

    ancient_beast: chain("远古巨兽", "🐉", "heroes", { minYear: 18, minKingdoms: 1, minAnimals: 18 }, ["守猎国", "受灾国", "学者国"], {
      signs: stage("折断的古树", "森林边缘出现巨大足迹，野兽迁徙、牧场失守，英雄们相信某个古老存在已经苏醒。", "hunt", [
        choice("track", "组织追踪", "提高英雄声望和研究", [realm("participants", { research: 6 }), world({ heroRenown: 6 })]),
        choice("wards", "加固聚落", "消耗木石，提高社会稳定", [realm("participants", { wood: -8, stone: -5, legitimacy: 3, unrest: -5 })]),
        choice("offerings", "献上贡品", "消耗粮食并提升信仰", [realm("participants", { food: -12, faith: 6, unrest: -3 })])
      ]),
      hunt: stage("巨兽现身", "巨兽逼近有人居住的河谷。围猎、驱离或尝试沟通，都可能改变人与荒野的关系。", "legacy", [
        choice("slay", "召集英雄围猎", "提高军心与英雄声望，生态受到损失", [realm("participants", { armyMorale: 10, valor: 6, legitimacy: 4 }), world({ heroRenown: 12, biomass: -0.025 })]),
        choice("drive", "引向无人荒野", "消耗粮食，保护生态并降低动乱", [realm("participants", { food: -8, unrest: -6 }), world({ biomass: 0.02 })]),
        choice("parley", "由守望者沟通", "提高文化、信仰与生态恢复", [realm("participants", { influence: 7, faith: 4, research: 4 }), world({ biomass: 0.04, heroRenown: 8 })])
      ]),
      legacy: stage("鳞与传说", "危机过后，遗留的鳞片、巢穴和故事引发最后争议：它们属于王室、学者还是整片荒野？", null, [
        choice("museum", "建立巨兽馆", "研究、文化与遗迹探索共同受益", [realm("primary", { treasury: -8, research: 12, influence: 9 }), world({ revealRuins: 1 })], later(7, "巨兽馆吸引了远方学者。", [realm("primary", { treasury: 12, research: 6 })]), { ending: "巨兽遗骸成为公开知识" }),
        choice("trophy", "铸成王室战利品", "提高合法性、尚武与军心", [realm("primary", { legitimacy: 12, valor: 7, armyMorale: 8 })], null, { ending: "巨兽传说成为王权神话" }),
        choice("sanctuary", "划为禁猎圣域", "大幅恢复生态并提升信仰", [realm("participants", { faith: 6, unrest: -4 }), world({ biomass: 0.07, fertility: 0.025 })], null, { ending: "巨兽领地成为荒野圣域" })
      ])
    }),

    fire_mountain: chain("火山神谕", "🌋", "disaster", { minYear: 18, minKingdoms: 1, minDisasters: 1 }, ["山麓国", "避难国", "工匠国"], {
      tremor: stage("大地鸣响", "山脉深处传来连续轰鸣，温泉干涸、井水变热，祭司与矿工给出截然不同的解释。", "eruption", [
        choice("evacuate", "提前疏散", "消耗国库，保护居民并降低动乱", [realm("primary", { treasury: -10, health: 6, unrest: -7 })]),
        choice("survey", "勘测山腹", "推进研究与工程准备", [realm("participants", { research: 8, stone: -4 })], later(4, "地脉图帮助聚落避开最危险的裂隙。", [realm("participants", { legitimacy: 4, unrest: -3 })])),
        choice("appease", "举行镇山祭", "提升信仰与合法性", [realm("primary", { food: -7, faith: 7, legitimacy: 5 })])
      ]),
      eruption: stage("赤夜喷发", "火柱照亮夜空，灰云压向农田。世界必须在抢救人口、保卫粮仓和封堵熔岩间分配力量。", "aftermath", [
        choice("rescue", "优先救援", "改善健康与幸福，但损失部分资源", [realm("participants", { food: -8, treasury: -5, health: 10, happiness: 5, unrest: -5 })]),
        choice("granaries", "保卫粮仓", "保存粮食并降低饥荒风险", [realm("participants", { wood: -6, food: 18, legitimacy: 3 })]),
        choice("channels", "开凿导流渠", "投入石材和研究，促进土地长期恢复", [realm("participants", { stone: -10, research: 8 }), world({ fertility: 0.02, shortenDisasters: 30 })])
      ]),
      aftermath: stage("灰土新生", "熔岩冷却后留下肥沃灰土、黑曜石与无家可归者。重建方式将决定火山是伤疤还是新起点。", null, [
        choice("rebuild", "原地重建", "消耗木石，恢复粮食与合法性", [realm("primary", { wood: -10, stone: -8, food: 14, legitimacy: 7, unrest: -6 }), world({ fertility: 0.04 })], later(7, "灰土农田迎来第一次丰收。", [realm("primary", { food: 18, treasury: 8 })]), { ending: "山麓城市在灰土上重生" }),
        choice("obsidian", "开发黑曜石", "增加石材、国库和研究", [realm("primary", { stone: 20, treasury: 16, research: 7, unrest: 2 })], null, { ending: "黑曜石矿镇环绕火山兴起" }),
        choice("shrine", "建立火山圣所", "提高信仰、文化并显露遗迹", [realm("participants", { faith: 8, influence: 7, unrest: -3 }), world({ revealRuins: 1 })], null, { ending: "火山被奉为毁灭与新生的圣地" })
      ])
    }),

    lost_city: chain("失落之城", "🗿", "legacy", { minYear: 20, minKingdoms: 2, minRuins: 1 }, ["发现国", "竞争国", "保管国"], {
      map: stage("残缺石图", "遗迹中的石图指向一座被历史抹去的古城，各国学者都声称自己拥有优先解释权。", "race", [
        choice("publish", "公开石图", "共享研究并改善外交", [realm("participants", { research: 7 }), diplomacy("participants", { score: 4, trust: 4 }), world({ revealRuins: 1 })]),
        choice("secret", "秘密勘探", "发现国获得优势，也引起猜忌", [realm("primary", { research: 12, treasury: -5 }), diplomacy("participants", { trust: -5, grievance: 6 })]),
        choice("verify", "先行考证", "稳步研究并提高文化影响", [realm("participants", { research: 5, influence: 5 }), world({ revealRuins: 1 })])
      ]),
      race: stage("古城竞逐", "多支队伍同时接近古城入口。补给告急，而地下机关仍在运作。合作、竞速或封锁只容一种选择。", "revelation", [
        choice("joint", "联合发掘", "投入资源，推动研究与互信", [realm("participants", { food: -6, treasury: -6, research: 10 }), diplomacy("participants", { score: 5, trust: 5, grievance: -4 }), world({ revealRuins: 2 })]),
        choice("race", "抢先进入", "主导国获利，参与国积累旧怨", [realm("primary", { treasury: 20, research: 12 }), diplomacy("participants", { score: -5, trust: -6, grievance: 10 })]),
        choice("seal_gate", "封锁入口", "提高稳定并延后发现", [realm("participants", { legitimacy: 3, unrest: -4, authority: 3 })])
      ]),
      revelation: stage("古城真相", "壁画证明古城曾因资源争夺而毁灭。它的财富、知识与警告应如何被后世继承？", null, [
        choice("archive", "建立共同档案馆", "大幅推动研究、文化和外交", [realm("participants", { treasury: -6, research: 14, influence: 9 }), diplomacy("participants", { score: 6, trust: 5, grievance: -5 })], later(10, "古城档案揭示了更多失落道路。", [world({ revealRuins: 2 }), realm("participants", { research: 7 })]), { ending: "古城真相被所有文明共同保存" }),
        choice("treasure", "瓜分古城财富", "增加国库和资源，降低互信", [realm("participants", { treasury: 22, stone: 10 }), diplomacy("participants", { trust: -3, grievance: 5 })], null, { ending: "失落之城被各国瓜分" }),
        choice("memorial", "只保留警世遗址", "提高合法性、稳定与信仰", [realm("participants", { legitimacy: 7, unrest: -7, faith: 4 })], null, { ending: "古城废墟成为争夺资源的永恒警告" })
      ])
    }),

    iron_doctrine: chain("铁律竞逐", "⚔", "military", { minYear: 18, minKingdoms: 2, minValor: 42 }, ["军备国", "受压国", "中立国"], {
      doctrine: stage("新式军典", "一套强调常备军、集中补给与先发制人的军典在诸国流传，旧有安全秩序开始动摇。", "arms_race", [
        choice("adopt", "全面采用", "提高军心与尚武，增加战争疲劳", [realm("primary", { valor: 7, armyMorale: 10, authority: 4, warWeariness: 4 })]),
        choice("study", "有限试行", "推进研究并适度强化军队", [realm("participants", { research: 7, armyMorale: 4 })]),
        choice("condemn", "公开谴责", "提高合法性，却激怒军备国", [realm("rival", { legitimacy: 6, influence: 4 }), diplomacy("participants", { score: -3, grievance: 5 })])
      ]),
      arms_race: stage("边境铸炉", "兵营扩建、道路军用化、粮仓被征用。任何一国停下，都担心自己成为下一个目标。", "reckoning", [
        choice("mobilize", "继续扩军", "提升军心、权威和资源，显著增加戒惧", [realm("participants", { wood: -7, stone: -7, armyMorale: 9, authority: 5, warWeariness: 5 }), diplomacy("participants", { trust: -6, grievance: 8 })]),
        choice("inspect", "互派核查使团", "改善信任并减少战争疲劳", [realm("participants", { treasury: -4, warWeariness: -6 }), diplomacy("participants", { score: 6, trust: 6, grievance: -5 })]),
        choice("fortify", "只修筑防线", "消耗石材，提高合法性和稳定", [realm("participants", { stone: -10, legitimacy: 5, unrest: -4, armyMorale: 5 })])
      ]),
      reckoning: stage("铁律终局", "军备竞赛已逼近临界点。建立永久军事同盟、签署裁军协定，或让最强者决定秩序，将塑造下一个时代。", null, [
        choice("war_league", "建立铁血同盟", "军心与权威大幅上升，和平制度被永久排除", [realm("participants", { valor: 9, armyMorale: 12, authority: 7 }), diplomacy("participants", { trust: 3, grievance: 4 })], later(7, "铁血同盟完成了常备军整编。", [realm("participants", { armyMorale: 8, warWeariness: 4 })]), { locks: ["council"], ending: "铁血同盟以武力维持世界秩序" }),
        choice("disarm", "签署裁军协定", "结束参与国战争并修复外交", [realm("participants", { warWeariness: -12, unrest: -5, legitimacy: 5 }), diplomacy("participants", { score: 9, trust: 7, grievance: -8, peace: true })], null, { locks: ["iron_doctrine"], ending: "裁军协定终止了铁律竞逐" }),
        choice("hegemony", "承认最强者霸权", "主导国获得巨大利益，其他国家留下深重旧怨", [realm("primary", { treasury: 28, legitimacy: 12, authority: 10 }), realm("rival", { unrest: 8, warWeariness: 6 }), diplomacy("participants", { score: -8, trust: -8, grievance: 14 })], null, { ending: "最强军备国建立了脆弱霸权" })
      ])
    })
  });

  globalThis.RealmWorldEventContent = Object.freeze({ chains });
})();
