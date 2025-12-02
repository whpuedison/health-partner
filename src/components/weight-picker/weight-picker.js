Component({
  properties: {
    min: { type: Number, value: 30 }, // 体重最小值30kg
    max: { type: Number, value: 200 }, // 体重最大值200kg
    value: { type: Number, value: 70 }, // 默认值70kg
    step: { type: Number, value: 1 }, // 步长1kg
    unit: { type: String, value: 'kg' } // 单位kg
  },
  data: {
    marks: [],
    translateX: 0,
    markWidth: 10, // rpx per step
    containerWidth: 638, // rpx
    touchStartX: 0,
    lastTouchX: 0,    // 上次触点位置
    lastDeltaX: 0,     // 上次增量
    isTouching: false
  },
  lifetimes: {
    attached() {
      this.initRuler();
    }
  },
  observers: {
    'value': function(value) {
      if (this.data.marks.length > 0) {
        this.updateScrollPosition();
      }
    }
  },
  methods: {
    initRuler() {
      console.log('weight-picker initRuler 开始初始化');
      const { min, max, step } = this.properties;
      const marks = [];

      for (let i = min; i <= max; i += step) {
        const index = Math.floor((i - min) / step);
        const left = 319 + index * this.data.markWidth; // 从中心线开始向右分布

        marks.push({
          value: i,
          isLong: i % 10 === 0, // 每10kg一个长刻度
          left: left
        });
      }

      console.log('weight-picker 初始化完成，marks数量:', marks.length);
      this.setData({ marks });
      this.updateScrollPosition();
    },

    updateScrollPosition() {
      const { value, min, step } = this.properties;
      const { markWidth } = this.data;
      const index = Math.round((value - min) / step);
      const translateX = -index * markWidth;

      // 确保translateX在合理范围内
      const maxTranslate = -(Math.floor((this.properties.max - min) / step)) * markWidth;
      this.setData({
        translateX: Math.max(maxTranslate, Math.min(0, translateX)),
        lastTranslateX: Math.max(maxTranslate, Math.min(0, translateX))
      });
    },

    onTouchStart(e) {
      const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
      this.setData({
        touchStartX: e.touches[0].clientX * pixelRatio,
        isTouching: true
      });
    },

    onTouchMove(e) {
      if (!this.data.isTouching) return;

      const { min, step } = this.properties;
      const { markWidth, touchStartX, lastTranslateX, lastTouchX } = this.data;
      const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
      const currentX = e.touches[0].clientX * pixelRatio;

      // 计算总移动距离和每次增量
      const totalDeltaX = currentX - touchStartX;
      const deltaIncrement = currentX - this.data.lastTouchX;

      // 🚀 高级阻尼系统设计

      // 1️⃣ 三段式距离感知阻尼
      const preciseZoneThreshold = 50;   // 精准响应区：0-50rpx内100%响应
      const dampingZoneThreshold = 100;  // 渐进阻尼区50-100rpx内逐渐衰减
      const absTotalDeltaX = Math.abs(totalDeltaX);

      let dampingFactor = 1.0;

      if (absTotalDeltaX <= preciseZoneThreshold) {
        // 🎯 精准响应区：完美1:1映射，超敏感精确 (50rpx以内)
        dampingFactor = 1.5;
      } else if (absTotalDeltaX <= dampingZoneThreshold) {
        // 🌟 过渡区域：渐进阻尼从0.95到0.85 (50-100rpx间)
        const progress = (absTotalDeltaX - preciseZoneThreshold) / (dampingZoneThreshold - preciseZoneThreshold);
        dampingFactor = 0.95 - (1 - Math.pow(Math.cos(progress * Math.PI / 2), 2)) * 0.15;
      } else {
        // 🔒 强阻尼区域：加速衰减到0.4以下 (20rpx以上)
        const excessDistance = absTotalDeltaX - dampingZoneThreshold;
        dampingFactor = Math.max(0.6, 0.65 * Math.pow(0.96, excessDistance / 8));
      }

      // 2️⃣ 速度控制增强
      // 分析最近几帧的速度趋势，防止突然加速
      const currentDirection = Math.sign(deltaIncrement);
      const lastDirection = Math.sign(this.data.lastDeltaX);
      const velocityChange = Math.abs(currentDirection - lastDirection);

      // 如果方向变化剧烈，增强阻尼（防止抖动）
      if (velocityChange > 0) {
        dampingFactor *= 0.8;
      }

      // 基础速度上限：每帧最大移动15rpx
      const maxSpeed = 15;
      let processedDelta = deltaIncrement * dampingFactor;
      processedDelta = Math.max(-maxSpeed, Math.min(maxSpeed, processedDelta));

      // 3️⃣ 边界弹性处理
      let newTranslateX = lastTranslateX + processedDelta;

      const minTranslate = -(Math.floor((this.properties.max - min) / step)) * markWidth - 60;
      const maxTranslate = 60;

      const boundaryBuffer = 30; // 边界缓冲区

      if (newTranslateX < minTranslate) {
        // 🟥 左边界弹性处理
        const excess = minTranslate - newTranslateX;
        if (excess <= boundaryBuffer) {
          // 缓冲区内：渐进弹性 (二次函数曲线)
          newTranslateX = minTranslate - (excess * excess) / (boundaryBuffer * boundaryBuffer) * boundaryBuffer / 2;
        } else {
          // 强烈阻挡区域：线性递增阻力
          newTranslateX = minTranslate - boundaryBuffer / 2 - (excess - boundaryBuffer) * 0.4;
        }
      } else if (newTranslateX > maxTranslate) {
        // 🟥 右边界弹性处理 (对称处理)
        const excess = newTranslateX - maxTranslate;
        if (excess <= boundaryBuffer) {
          newTranslateX = maxTranslate + (excess * excess) / (boundaryBuffer * boundaryBuffer) * boundaryBuffer / 2;
        } else {
          newTranslateX = maxTranslate + boundaryBuffer / 2 + (excess - boundaryBuffer) * 0.4;
        }
      }

      // 4️⃣ 更新状态和位置映射
      this.setData({
        translateX: newTranslateX,
        lastTouchX: currentX,
        lastDeltaX: deltaIncrement
      });

      // 计算对应值（平滑映射）
      const index = Math.round(-newTranslateX / markWidth);
      const value = Math.max(min, Math.min(this.properties.max, min + index * step));

      if (value !== this.properties.value) {
        this.triggerEvent('change', { value });
      }
    },

    onTouchEnd() {
      this.setData({
        isTouching: false,
        lastTranslateX: this.data.translateX
      });
    }
  }
});
