Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
      observer(newVal) {
        if (newVal) {
          this.startAnimation();
        } else {
          this.stopAnimation();
        }
      }
    },
    text: {
      type: String,
      value: 'AI正在分析营养成分...'
    }
  },

  data: {
    // 原始提示列表
    rawTips: [
      '💡 每天摄入1.5-2L水有助于提升代谢',
      '👀 颜色越丰富的蔬菜，通常抗氧化剂越多',
      '💧 饭前喝一杯水，正餐可以少摄入约13%热量',
      '🍎 细嚼慢咽（每口20次）能增加饱腹感荷尔蒙的分泌',
      '🥦 十字花科蔬菜（如西蓝花）有助于肝脏排毒',
      '🧂 减少盐的摄入（<5g/天）能有效预防水肿',
      '🏃‍♀️ 饭后散步15分钟有助于平稳餐后血糖',
      '🧠 优质脂肪（如坚果、鱼油）对大脑健康至关重要',
      '😴 睡眠不足（<7小时）会导致瘦素分泌减少，容易暴食',
      '🥗 先吃蔬菜再吃主食，有利于控制血糖波动',
      '🍳 早餐摄入高蛋白，能显著降低全天饥饿感',
      '🥤 含糖饮料是"隐形热量"的最大来源',
      '🍬 想要戒糖？试着用天然水果代替甜食',
      '💪 肌肉量增加，基础代谢率也会随之提升',
      '🌞 适度晒太阳补充维生素D，有助于钙质吸收',
      '🥑 牛油果虽然健康，但热量很高，半个就够了',
      '🍱 尽量少吃加工肉制品，它们通常含盐量超标',
      '🍚 将白米饭换成糙米或杂粮饭，能增加膳食纤维',
      '🍵 绿茶中的儿茶素有助于提高脂肪氧化率',
      '🍌 运动前一小时吃根香蕉，能提供持续的能量',
      '🥦 蒸煮是保留蔬菜营养最好的烹饪方式',
      '🥢 使用小号餐具可以从视觉上增加食物份量感',
      '⏰ 规律进餐能帮助身体调节饥饿信号',
      '🥜 坚果每次吃一小把（约30g）就足够了',
      '🥛 睡前一杯温牛奶有助于安神助眠',
      '🚫 情绪化进食时，试着先深呼吸或喝杯水冷静一下',
      '🌶️ 适量吃辣可以暂时提高新陈代谢',
      '🦵 深蹲是燃烧卡路里效率最高的动作之一',
      '🧘‍♀️ 压力过大会导致皮质醇升高，更容易堆积腹部脂肪',
      '🚶‍♂️ 把车停远一点，多走几步也是运动'
    ],
    shuffledTips: [],
    currentTipIndex: 0,
    currentTip: '',
    progress: 0,
    dots: '...'
  },

  lifetimes: {
    attached() {
      this.shuffleTips();
      // 初始化第一条
      this.setData({
          currentTip: this.data.shuffledTips[0],
          currentTipIndex: 0
      });
    },
    detached() {
      this.stopAnimation();
    }
  },

  methods: {
    // 洗牌算法
    shuffleTips() {
        const tips = [...this.data.rawTips];
        for (let i = tips.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tips[i], tips[j]] = [tips[j], tips[i]];
        }
        this.setData({ shuffledTips: tips });
    },

    startAnimation() {
      this.shuffleTips();
      this.setData({ 
          progress: 5, // 起始进度
          currentTipIndex: 0,
          currentTip: this.data.shuffledTips[0]
      });

      // 提示语轮播 (4000ms)
      this.tipTimer = setInterval(() => {
        this.nextTip();
      }, 4000);

      // 进度条平滑模拟
      // 目标：30秒左右到90%，然后极慢移动
      let currentProgress = 5;
      
      this.progressTimer = setInterval(() => {
        if (currentProgress < 98) {
            let increment = 0;
            
            // 模拟真实的非线性进度
            if (currentProgress < 30) {
                // 0-30%: 快速启动 (约2秒)
                increment = 1.5;
            } else if (currentProgress < 60) {
                // 30-60%: 匀速推进 (约5秒)
                increment = 0.6;
            } else if (currentProgress < 85) {
                // 60-85%: 缓慢推进 (约15秒)
                increment = 0.15;
            } else {
                // 85%+: 蠕动 (无限等待)
                increment = 0.02;
            }

            // 添加一点随机性
            increment = increment * (0.8 + Math.random() * 0.4);
            
            currentProgress += increment;
            this.setData({
                progress: Math.min(99, currentProgress) // 永远不让它自己到100
            });
        }
      }, 100);
      
      // 省略号动画
      let dotCount = 0;
      this.dotTimer = setInterval(() => {
          dotCount = (dotCount + 1) % 4;
          this.setData({
              dots: '.'.repeat(dotCount)
          });
      }, 500);
    },

    stopAnimation() {
      if (this.tipTimer) clearInterval(this.tipTimer);
      if (this.progressTimer) clearInterval(this.progressTimer);
      if (this.dotTimer) clearInterval(this.dotTimer);
      
      // 瞬间填满，给用户完成的反馈
      this.setData({ progress: 100 });
      
      setTimeout(() => {
          this.setData({ progress: 0 }); // 重置以便下次使用
      }, 500);
    },

    nextTip() {
      const { shuffledTips, currentTipIndex } = this.data;
      const nextIndex = (currentTipIndex + 1) % shuffledTips.length;
      this.setData({
        currentTipIndex: nextIndex,
        currentTip: shuffledTips[nextIndex]
      });
    }
  }
});
