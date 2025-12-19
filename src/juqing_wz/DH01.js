export const dialogueTree = {
    start01: {
        content: [
            //   {
            //       backgroundImage: "light",
            //       HPxushi: [
            //           "黑，再次睁开双眼，映入眼帘的是一望无际的黑暗。<br/>恐惧、不安，茫然，一系列的负面情绪钻入我的脑海。"
            //           , "想要逃离，却被困于此地。",
            //           "所能做的，便只有呼喊。"
            //       ],
            //       textYincang: 2,
            //   },
            //   {
            //     action: 3,
            //     heipingWenzi: "第一章：笼中鸟",
            //     text:"……"
            //   },
            {
                name: "我", text: "不！",
                backgroundImage: "shiyanshi",
                textYincang: false,
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi1.webp",
                        x: -5,
                    }
                ],
            },
            {
                name: "我", text: "（琳恩茫然地看着四周，才发现刚刚的景象原来是一场梦。自从摆脱了洗脑的控制，她就经常在睡着后陷入这可怕的梦境。）",
            },
            {
                name: "我", text: "或许这就是我的报应吧……",
            },
            {
                name: "我", text: "(今天是来”苍穹”设施的第一个月,琳恩申请的幼体培育计划正式通过了。)",
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi2.webp",
                        x: -5,
                    }
                ],
            },
            {
                text: "(请点击右下角的平板挑选要培育的实验体吧。)",
                tishi: 1,
                kucun: true,
                textJuxu: true
            },
            {
                text: "(琳恩选好了想要培养的实验体。)",
            },
            {
                text: "(过了差不多一个小时,机器人安保将编号 220 的实验体送入实验室)",
                heipingWenzi: "一段时间后",
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi1.webp",
                        x: -5,
                    }
                ],
            },
            {
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        img: "tuzi/tuzi.webp",
                        x: 50,
                    },
                    {
                        id: 99,
                        show: true,
                        img: "robot/robot.webp",
                        x: 65,
                    },
                ],
                name: "机器人安保",
                text: "编号 220 实验体已交付至指定实验室。",
            },
            {
                name: "我",
                text: "好的,你可以离开了。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(收到指令后,机器人安保转身沿着原路退出,实验室门 “咔嗒” 一声自动闭合,室内瞬间安静下来)",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        x:65
                    },
                    {
                        id: 99,
                        show: false,
                    },
                ],
            },
            {
                text: "(220在门口不愿移动, 始终低着头,姿势有些不安,怯生生地用余光扫过四周,每当视线不小心与琳恩对上,都会像受惊般立刻垂下眼,局促地站在原地,等待指示。)",
            },
            {
                name: "我",
                text: "（这就是传闻中的人造生命技术吗？真是完全看不出来眼前的“孩子”是通过技术手段创造出来的生命。）",
            },
            {
                text: "（琳恩仔细打量着眼前这个鲜活的生命,有些感叹这项技术的深奥，望着眼前这个鲜活的生命，培育手册却要求将他视作工具，不要对他有任何感情。）",
            },
            {
                name: "我",
                text: "（看作工具吗？这未免也太…）",
            },
            {
                text: "（琳恩深吸一口气，压下心头的纠结，望着眼前还在紧张着看着自己的“孩子”，缓缓蹲下身，保持身体的低矮姿态，不让自己看起来具有威胁。）",
            },
            {
                name: "我",
                text: "别害怕，你好，220，我叫琳恩，从今天开始，由我来照顾你。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(220 听到声音,身体轻轻抖了一下,下意识往后退了一小步,眼里满是不安,嘴唇抿成一条细线,没敢说话。)",
            },
            {
                name: "我",
                text: "嗯…没关系，慢慢来，我们可以先熟悉一下彼此，不用有压力。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "（琳恩缓缓伸出手，手心朝上，保持静止，示意他可以选择靠近。）",
            },
            {
                name: "我",
                text: "你现在肯定很不安对吧？到了新地方，周围都是陌生的，会不安很正常……我能理解这种感觉，但是你可以信任我…",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "（220沉默了好一会儿，实验室里只剩两人的呼吸声。终于他抬起头正视着琳恩，但还是带着不安与紧张。他观察着琳恩的表情，小声开口。）",
            },
            {
                name: "220",
                text: "你……你是好人吗？",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                name: "我",
                text: "嗯，你可以相信我。我是你的专属培育员，我的工作就是照顾你以及让你觉醒。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "（220缓缓走了过来，轻轻握住琳恩的手，动作小心而谨慎。）",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        x: 20,
                    },
                ],
            },
            {
                name: "220",
                text: "我相信你。",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                name: "我",
                text: "很好，看来你是个勇敢的乖孩子呢。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(琳恩轻轻回握了一下他的手，语气带着赞许。220被夸赞后有些开心，眼神里的警惕褪去不少，大胆了一些，他微微歪头询问琳恩)",
            },
            {
                name: "220",
                text: "那…我该怎么喊你呢？",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                name: "我",
                text: "你可以叫我琳恩，很简单的名字，对吧？",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "（琳恩能感觉到，220 握着自己的手松了些，整个人也不再那么拘谨，看来赞许他的确很有作用。）",
            },
            {
                text: "（220 把 “琳恩” 两个字在嘴里轻轻呢喃了几遍，似乎努力想要记住这个名字。）",
            },
            {
                name: "我",
                text: "我的名字这么难记吗？好了，我带你去参观你的房间吧。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "（220 用力点点头，耳朵尖悄悄红了 —— 大概是被琳恩发现自己在默念名字，有些不好意思。他紧紧跟着琳恩。）",
                currentNodeKey: "start03"
            },
        ]
    },
    start03: {
        content: [
            { text: "…." },
            {
                name: "我",
                text: "（琳恩带他来到了为他准备的房间，这里有着为他准备的玩具和书籍以及一张睡觉的床。）",
                backgroundImage: "fangjian",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        x: 65,
                    },
                ],
            },
            {
                name: "我",
                text: "这里就是你住的地方了，你可以到处看看。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "（220 眼神好奇地打量着房间各处。）"
            },
            {
                name: "220",
                text: "我喜欢这里，这里有很多玩具。",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                text: "(琳恩松开了牵住他的手，但220没有到处跑，而是待在原地，眼神里虽然还有点警惕，却多了丝明显的好奇，会时不时偷偷看一眼琳恩。）"
            },
            {
                name: "我",
                text: "怎么了？不去玩吗？",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                name: "220",
                text: "你没有说可以玩。",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                name: "我",
                text: "行吧,我这里没那么多规则,在这房间内你可以随你做你喜欢的事情。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                name: "220",
                text: "谢谢你，琳恩。",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                text: "(220 听到这话,露出了开心的表情,他走到了玩具堆旁边,开始了自己的玩耍。)",
            },
            {
                text: "(琳恩依靠在墙壁开始观察他,他刚开始还比较拘谨,时不时望向琳恩,似乎在等待琳恩的指示,并没有太放开,随着时间的推移,他渐渐开始投入了玩耍。)",
            },
            {
                text: "(“喜欢拼积木”,琳恩记录着他的点点滴滴,一旁默默的观察,本来工作人员是打算帮助琳恩在这座房间安装摄像头来观察的,但琳恩拒绝了,她讨厌被窥视的生活,所以她并不想这样做。)",
            },
            {
                text: "(眼见着时间差不多了,琳恩打开房门准备离开,但220叫住了她。)",
            },
            {
                name: "220",
                text: "那个…我饿了。",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                text: "(琳恩这才想起来,一直专注于观察和记录,忘记了要给他喂食了,琳恩记得要给实验体吃专门的能量棒,根据说明,每天只需要喂一根就能支撑一天所需的能量,琳恩回到大厅,取出了分配好的能量棒,回到房间递给了220。)",
            },
            {
                name: "我",
                text: "给。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(220见状接过了能量棒吃了起来,几口便吃完了,琳恩有些好奇,这根小东西竟然能支撑一天活动所需要的能量,但琳恩并不了解食物制作方面相关的知识。)",
            },
            {
                name: "我",
                text: "还有什么需要的吗？",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(220摇了摇头。)",
            },
            {
                name: "我",
                text: "有事可以出来叫我,我在的。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(琳恩回到了大厅,坐在椅子上,按了按太阳穴,劳累了一天,想到还有数据分析的工作要做,琳恩感到一阵脑涨。)",
                action: 2,
                backgroundImage: "shiyanshi",
                fullBodyImages: [
                    {
                        id: 2,
                        show: false,
                    },
                ],
            },
            {
                name: "我",
                text: "该死,还没吃饭呢。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(琳恩想起了那根能量棒,她还没吃过呢,看220几口吃掉了,她有些好奇味道和是否真的能支撑一天的能量,而且也没有规定培育员不能吃能量棒。)",
                selectContent: [
                    {
                        select: "吃",
                        currentNodeKey: "eat01",
                        selected: true
                    },
                    {
                        select: "不吃",
                        currentNodeKey: "eat02",
                    },
                ]
            },
        ]
    },
    eat01: {
        content: [
            { text: "…." },
            {
                text: "(琳恩好奇地拿出了能量棒,拆开包装袋,咬了一口后便直接喷了出来,这到底是什么东西,干涩的粉末附着在表面,里面的味道难以形容,琳恩肯定是自己绝对没尝过的味道,像是各种化学品混合在一起的古怪味道,琳恩急忙喝了几大口水才缓了过来。)"
            },
            {
                name: "我",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
                text: "这可太恶心了,他是怎么面无表情的吃下去的？"
            },
            { text: "(琳恩经历了这一遭,精神了起来,口腔中还残留着那股奇怪的味道,去刷了一遍牙后才彻底摆脱了那股不可言状的味道。)" },
            {
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
                name: "我",
                text: "糟糕的体验,好了,该工作了。",
                currentNodeKey: "eatEnd"
            },
        ]
    },
    eat02: {
        content: [
            { text: "…." },
            {
                text: "(琳恩好奇地拿出了能量棒,看着包装袋上没有任何说明的标签,觉得还是算了,而且看着就不好吃。于是琳恩用平板像往常那般点了食物外送服务,将食物通过机器人送到门口。)."
            },

            {
                text: "(吃饱喝足后,琳恩打起了干劲,是时候该工作了。)",
                currentNodeKey: "eatEnd"
            },
        ]
    },
    eatEnd: {
        content: [
            { text: "…." },
            {
                text: "(点击电脑开始今日的工作吧。)",
                backgroundImage: "shiyanshi",
                textJuxu: true,
                bjWuping: "shiyanshi.webp",
                xiaoxi: {
                    name: "实验体培育部",
                    messages: [
                        { user: "主任", text: "各位培育员,实验个体已下发。请务必认真对待,重点提升实验体精神力,确保完成既定指标。", src: "touxiangzhuren.webp" },
                        { user: "主任", text: "本次培育实验为期 20 天,需在第 5 天、第 10 天、第 15 天、第 20 天前往实验中心开会汇报。", src: "touxiangzhuren.webp" },
                        { user: "主任", text: "辛苦各位,期待本次培育实验能够顺利完成。", src: "touxiangzhuren.webp" },
                    ]
                }
            },
            {
                text: "(琳恩完成了今日的工作。)",
                heipingWenzi: "认真工作了一段时间后",
            },
            {
                text: "(去看看实验体220怎么样了吧。)",
                textJuxu: true,
                dangqianrenwu: "房门",
                boxesShow: 7,
                index: 0
            },
            {
                text: "(琳恩打开了实验体的房门,发现220 缩在小床上,整个人裹紧了被子,连脑袋都埋进了软枕里,只露出一小截毛发,被子随着他的呼吸不断起伏。)",
                bjWuping: false,
                backgroundImage: "fangjian01hei",
            },
            {
                text: "(琳恩凝视着那小小的身影,确定他应该是睡着了。)",
                selectContent: [
                    {
                        select: "靠近观察",
                        currentNodeKey: "start041"
                    },
                    {
                        select: "离开",
                        currentNodeKey: "start042",
                        name: "220",
                        Affinity: 3
                    },
                ]
            },
        ]
    },
    start041: {
        content: [
            { text: "…." },
            {
                text: "(琳恩放轻脚步缓缓走到220的床边,发现他正在闭着眼睛侧过头睡觉。)",
                backgroundImage: "baise",
                texieCg:true,
                fullBodyImages: [
                    {
                        id: 199,
                        show: true,
                        img: "tuzi/tuzisleep1.webp",
                        juzhong: true,
                        daxiao: 82,
                    },
                ],
                dengdai: 1500
            },
            {
                text: "(当琳恩仔细观察时,220似乎感觉到了注视,突然睁开了双眼,紧紧盯着床边的人,眸子在昏暗中亮得吓人,瞳孔紧紧缩着,像是被刺激到了,但他没有动作,就这样死死盯着。)",
                fullBodyImages: [
                    {
                        id: 199,
                        show: true,
                        img: "tuzi/tuzisleep2.webp",
                        juzhong: true,
                        daxiao: 82,
                    },
                ],
                dengdai: 1500
            },
            {
                name: "琳恩",
                text: "抱歉,吵醒你了,我只是想看看你是否没事。",
            },
            {
                text: "(220 没说话也没任何动作,视线依旧死死锁住琳恩。)",
            },
            {
                name: "琳恩",
                text: "你没事吧？",
            },
            {
                text: "(琳恩在他眼前挥了挥手,有些疑惑地看着他这一副僵住的表情。)",
            },
            {
                text: "(过了好一会,220才从不变地表情中缓了过来,委屈巴巴地表示被吓坏了。)",
                fullBodyImages: [
                    {
                        id: 199,
                        show: true,
                        img: "tuzi/tuzisleep3.webp",
                        juzhong: true,
                        daxiao: 82,
                    },
                ],
                dengdai: 1500
            },
            {
                text: "(原来刚刚琳恩把220吓应激了,导致无法动弹,琳恩了解后只好再次朝220道歉并用手抚摸着安慰他,过了好一会,220没事了,琳恩才起身。)",
            },
            {
                name: "琳恩",
                text: "那我不打扰你了,继续睡吧。",
            },
            {
                text: "(琳恩说完离开了房间。)",
                fullBodyImages: [
                    {
                        id: 199,
                        show: false,
                    },
                ],
                texieCg:false,
                backgroundImage: "fangjian01hei",
                currentNodeKey: "start05"
            },
        ]
    },
    start042: {
        content: [
            { text: "…." },
            {

                text: "(琳恩没有上前,她清楚地知道被打扰睡眠是一件很糟糕的事情。)",
            },
            {
                text: "(最后看了一眼那截露在外面的毛发,她悄然退后一步,将门缓缓掩上,直到门扉合拢的那一刻,也没有发出太大的声响。)",
            },
            {
                currentNodeKey: "start05"
            },
        ]
    },
    start05: {
        content: [
            { text: "…." },
            {
                text: "(该休息了,点击右上角的结束按钮进入下一天。)",
                backgroundImage: "shiyanshi",
                textJuxu: true,
                dangqianrenwu: "结束1",
                bjWuping: "shiyanshi.webp",
            },
            {
                text: "(新的一天,去看看220的情况吧。)",
                heipingWenzi: "休息一晚后",
                action: 3,
                textJuxu: true,
                dangqianrenwu: "房门1",
                boxesShow: 7,
                index: 0
            },
        ]
    },
    start051: {
        content: [
            { text: "…." },
            {
                backgroundImage: "fangjian01",
                text: "(晨光照进房间,220 侧躺在床上,没像昨晚那样裹紧被子,熟睡的侧脸露在外面,呼吸轻匀。)",
            },
            {
                text: "(琳恩靠在门框上,有些满意的看着这一幕：看来睡得不错。)",
                selectContent: [
                    {
                        select: "门口唤醒他",
                        currentNodeKey: "start053",
                        name: "220",
                        Affinity: 2
                    },
                    {
                        select: "悄悄进去查看",
                        currentNodeKey: "start054",
                    },
                ],
            },

        ]
    },
    start052: {
        content: [
            { text: "…." },
            {
                backgroundImage: "fangjian01",
                text: "(琳恩打开房门,220听到了动静,立刻起身,目光朝着门口望过来,眼神里还带着刚醒的浅淡迷糊。)",
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi1.webp",
                        x: -5,
                    }
                ],

            },
            {
                name: "我",
                text: "220,该起床了。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,

                    }
                ],
            },
            {
                text: "(220点点头,起身下床了,等待着琳恩的指令。)",
                backgroundImage: "fangjian",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        img: "tuzi/tuzi.webp",
                        x: 50,
                    },
                ],
            },
            {
                text: "...",
                liaotian: 1,
                fullBodyImages: [
                    {
                        id: 1,
                        show: false,
                    },
                ],
                fullBodyImages: [
                    {
                        id: 2,
                        show: false,
                    },

                ],
            }
        ]
    },
    start053: {
        content: [
            { text: "…." },
            {
                text: "(琳恩站在门口,敲了敲门框,轻声唤道。)",
            },
            {
                name: "我",
                text: "220,该起床了。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(220听到动静,打了个绵长的哈欠,带着刚睡醒的慵懒,慢慢坐起身。他抬手揉了揉眼睛,眼尾还泛着浅红,茫然地朝着门口的方向望过来,还没完全清醒。)",
            },
            {
                name: "我",
                text: "看来你昨晚睡得不错。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                name: "220",
                text: "嗯。",
                backgroundImage: "fangjian",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        img: "tuziHappy",
                        x: 50,
                    },
                ],
            },
            {
                text: "(220 对着她轻轻点了点头,没有了之前的局促。)",
                liaotian: 1,
                fullBodyImages: [
                    {
                        id: 1,
                        show: false,
                    },
                    {
                        id: 2,
                        show: false,
                    },
                ],
            },
        ]
    },
    start054: {
        content: [
            { text: "…." },
            {
                text: "(琳恩悄悄走到220的床前,220没有察觉,琳恩仔细观察他的睡颜,没有了昨晚的的警惕,显然是安心睡熟了。)",
            },
            {
                name: "我",
                text: "该起……",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(琳恩还没说完,220 便被近距离的声音惊吓到了,猛地睁开眼,往床的另一侧 “蛄蛹” 了半寸,后背瞬间绷紧。他攥着被子边缘,眼神里还带着刚醒的懵然,直直盯着近在咫尺的琳恩。)",
            },
            {
                name: "我",
                text: "抱歉,吓到你了吗？",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                name: "220",
                text: "嗯…",
                backgroundImage: "fangjian",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        img: "tuzi/tuzi.webp",
                        x: 50,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                text: "(220有些委屈地点点头。)",
            },
            {
                name: "我",
                text: "下次不会这样了。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                text: "(220 望着她,沉默了几秒,又再次开心了起来。)",
                liaotian: 1,
                fullBodyImages: [
                    {
                        id: 1,
                        show: false,
                    },
                    {
                        id: 2,
                        show: false,
                    },
                ],
            },
        ]
    },
    oneDay: {
        content: [
            { text: "…." },
            {
                backgroundImage: "shiyanshi",
                text: "(好了,该开始今天的工作了。)",
                bjWuping: "shiyanshi.webp",
                textJuxu: true,
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi1.webp",
                        x: -5,
                 }
                ],
            },
            {
                text: "(琳恩完成了今日的工作。)",
                heipingWenzi: "认真工作了一段时间后",
            },
            {
                text: "(该休息了)",
            },
            {
                text: "(该休息了,点击右上角的结束按钮进入下一天。)",
                backgroundImage: "shiyanshi",
                textJuxu: true,
                dangqianrenwu: "结束1",
                bjWuping: "shiyanshi.webp",
            },
            {
                text: "(新的一天,去看看220的情况吧。)",
                heipingWenzi: "休息一晚后",
                action: 3,
                textJuxu: true,
                dangqianrenwu: "房门2",
                boxesShow: 7,
                index: 0
            },
        ]
    },
    twoDay_01: {
        content: [
            { text: "…." },
            {
                backgroundImage: "fangjian",
                text: "（当琳恩推开220的房门时，220 听见动静，猛地从床上坐起身，怯生生地抬头看向琳恩。）",
                fullBodyImages: [
                    {
                     id:1,
                     show:true,
                     x:-5
                    },
                    {
                        id: 2,
                        show: true,
                        img: "tuzi/tuzi.webp",
                        x: 50,
                    },
                ],

            },
            {
                name: "我",
                text: "看来你很紧张。",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                name: "220",
                text: "……",
            },
            {
                name: "我",
                text: "昨天怎么样,还好吗？",
                fullBodyImages: [
                    {
                        id: 1,
                        isSpeaking: 1,
                    },
                ],
            },
            {
                name: "220",
                text: "嗯。",
                fullBodyImages: [
                    {
                        id: 2,
                        isSpeaking: 2,
                    },
                ],
            },
            {
                text: "（他顿了顿，略微抬起头观察着琳恩。）",
            },
            {
                text: "(琳恩走近观察起他昨天的伤势，已经全部愈合了，甚至连疤痕都没有留下，虽然早听说过人造生命的自愈能力很强，但当亲眼所见时还是有些震惊。)",
            },
            {
                text: "（震惊之时，另一个想法突然冒出来：既然恢复这么快，是不是可以把下次实验的强度再提一点？琳恩被这突如其来的想法吓了一跳。）",
            },
            {
                name: "我",
                text: "（我真是罪孽深重的人……）",
            },
            {
                text: "...",
                liaotian: 1,
                fullBodyImages: [
                    {
                        id: 1,
                        show: false,
                    },
                    {
                        id: 2,
                        show: false,
                    },
                ],
            }
        ]
    },
    twoDay: {
        content: [
            { text: "…." },
            {
                backgroundImage: "shiyanshi",
                text: "(好了,该开始今天的工作了。)",
                bjWuping: "shiyanshi.webp",
                textJuxu: true,
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi1.webp",
                        x: -5,
                    }
                ],
            },
            {
                text: "(琳恩完成了今日的工作。)",
                heipingWenzi: "认真工作了一段时间后",
            },
            {
                text: "(该休息了)",
            },
            {
                text: "(该休息了,点击右上角的结束按钮进入下一天。)",
                backgroundImage: "shiyanshi",
                textJuxu: true,
                dangqianrenwu: "结束1",
                bjWuping: "shiyanshi.webp",
            },
            {
                text: "(新的一天,去看看220的情况吧。)",
                heipingWenzi: "休息一晚后",
                action: 3,
                textJuxu: true,
                dangqianrenwu: "房门2",
                boxesShow: 7,
                index: 0
            },
        ]
    },
    threeDay: {
        content: [
            { text: "…." },
            {
                backgroundImage: "shiyanshi",
                text: "(平板似乎来了新的消息，去看看吧。)",
                // bjWuping: "shiyanshi.webp",
                textJuxu: true,
                fullBodyImages: [
                    {
                        id: 1,
                        show: true,
                        img: "boshi/boshi1.webp",
                        x: -5,

                    }
                ],
            },
            {
                name: "琳恩",
                text: "(虽然说没有强制要求，但还是按照主任的要求去走访一下其他培育员吧。)",
                textJuxu: true,
                bjWuping: "shiyanshi.webp",
                waichu: 1,
                tishi: 2,
            },
        ]
    },
    //拜访法伯尔
    baifang_faboer: {
        content: [
            { text: "…." },
            {}
        ]
    },
    threeDay_01: {
        content: [
            { text: "…." },
            {
                backgroundImage: "fangjian",
                text: "(当琳恩推开220的房门时,220早已起身在等候她了。)",
                fullBodyImages: [
                    {
                        id: 2,
                        show: true,
                        img: "tuzi/tuzi.webp",
                        x: 50,
                    },
                ],
            },
            {
                text: "...",
                liaotian: 1,
                fullBodyImages: [
                    {
                        id: 1,
                        show: false,
                    },
                ],
                fullBodyImages: [
                    {
                        id: 2,
                        show: false,
                    },
                ],
            }
        ]
    },
    //签署合同
    start3: {
        content: [
            { text: "…." },
            {
                text: "(去看看实验体220怎么样了吧。)",
            },
            {
                text: "(四个孩子用懵懂而迷茫的眼神望着我,一个紧张地攥着衣角,一个害怕地微微发抖,还有一个平静地观察着周围,最后一个则好奇地注视着我。)",
                selectContent: [
                    {
                        select: "自我介绍",
                        currentNodeKey: "start5"
                    },
                    {
                        select: "温和的自我介绍",
                        currentNodeKey: "chooseCyric",

                    },
                ]
            },
            {
                zidongSave: true,
                text: "(主任从桌上取出一枚数据芯片,递到我手中。那是实验室的访问密钥,表面刻着纳米级线路,流动着微弱的光。)",
                currentNodeKey: "start4"
            },
        ]
    },
    start5: {
        content: [
            { text: "…." },
            {
                name: "琳恩", text: "那我来选人吧。",
                zidongSave: true
            },
            { name: "琳恩", text: "剧情未完成", end: true },
        ]
    },
}
