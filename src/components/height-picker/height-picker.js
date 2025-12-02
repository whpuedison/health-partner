Component({
  properties: {
    min: { type: Number, value: 120 },
    max: { type: Number, value: 220 },
    value: { type: Number, value: 170 },
    step: { type: Number, value: 1 },
    unit: { type: String, value: 'cm' }
  },
  data: {
    marks: [],
    translateY: 0,
    markHeight: 10, // rpx per step
    containerHeight: 500, // rpx
    touchStartY: 0,
    lastTouchY: 0,    // 上次触点位置
    lastDeltaY: 0,     // 上次增量
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
      console.log('ruler-picker initRuler 开始初始化');
      const { min, max, step } = this.properties;
      const marks = [];

      for (let i = min; i <= max; i += step) {
        const index = Math.floor((i - min) / step);
        const top = 250 + index * this.data.markHeight; // 从中心线开始向下分布

        marks.push({
          value: i,
          isLong: i % 10 === 0,
          top: top
        });
      }

      console.log('ruler-picker 初始化完成，marks数量:', marks.length);
      this.setData({ marks });
      this.updateScrollPosition();
    },

    updateScrollPosition() {
      const { value, min, step } = this.properties;
      const { markHeight } = this.data;
      const index = Math.round((value - min) / step);
      const translateY = -index * markHeight;

      // 确保translateY在合理范围内
      const minTranslate = -(Math.floor((this.properties.max - min) / step)) * markHeight;
      this.setData({
        translateY: Math.max(minTranslate, Math.min(0, translateY)),
        lastTranslateY: Math.max(minTranslate, Math.min(0, translateY))
      });
    },

    onTouchStart(e) {
      const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
      this.setData({
        touchStartY: e.touches[0].clientY * pixelRatio,
        isTouching: true
      });
    },

    onTouchMove(e) {
      if (!this.data.isTouching) return;

      const { min, step } = this.properties;
      const { markHeight, touchStartY, lastTranslateY, lastTouchY } = this.data;
      const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
      const currentY = e.touches[0].clientY * pixelRatio;

      // 计算总移动距离和每次增量
      const totalDeltaY = currentY - touchStartY;
      const deltaIncrement = currentY - this.data.lastTouchY;

      // 🚀 高级阻尼系统设计

      // 1️⃣ 三段式距离感知阻尼
      const preciseZoneThreshold = 50;   // 精准响应区：0-8rpx内100%响应
      const dampingZoneThreshold = 100;  // 渐进阻尼区：8-20rpx内逐渐衰减
      const absTotalDeltaY = Math.abs(totalDeltaY);

      let dampingFactor = 1.0;

      if (absTotalDeltaY <= preciseZoneThreshold) {
        // 🎯 精准响应区：完美1:1映射，超敏感精确 (50rpx以内)
        dampingFactor = 1.5;
      } else if (absTotalDeltaY <= dampingZoneThreshold) {
        // 🌟 过渡区域：渐进阻尼从0.95到0.8 (50-100rpx间)
        const progress = (absTotalDeltaY - preciseZoneThreshold) / (dampingZoneThreshold - preciseZoneThreshold);
        dampingFactor = 0.95 - (1 - Math.pow(Math.cos(progress * Math.PI / 2), 2)) * 0.15;
      } else {
        // 🔒 强阻尼区域：加速衰减到0.6以下 （100rpx以上)
        const excessDistance = absTotalDeltaY - dampingZoneThreshold;
        dampingFactor = Math.max(0.6, 0.65 * Math.pow(0.96, excessDistance / 8));
      }

      // 2️⃣ 速度控制增强
      // 分析最近几帧的速度趋势，防止突然加速
      const currentDirection = Math.sign(deltaIncrement);
      const lastDirection = Math.sign(this.data.lastDeltaY);
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
      let newTranslateY = lastTranslateY + processedDelta;

      const minTranslate = -(Math.floor((this.properties.max - min) / step)) * markHeight - 60;
      const maxTranslate = 60;

      const boundaryBuffer = 30; // 边界缓冲区

      if (newTranslateY < minTranslate) {
        // 🔴 下边界弹性处理
        const excess = minTranslate - newTranslateY;
        if (excess <= boundaryBuffer) {
          // 缓冲区内：渐进弹性 (二次函数曲线)
          newTranslateY = minTranslate - (excess * excess) / (boundaryBuffer * boundaryBuffer) * boundaryBuffer / 2;
        } else {
          // 强烈阻挡区域：线性递增阻力
          newTranslateY = minTranslate - boundaryBuffer / 2 - (excess - boundaryBuffer) * 0.4;
        }
      } else if (newTranslateY > maxTranslate) {
        // 🔴 上边界弹性处理 (对称处理)
        const excess = newTranslateY - maxTranslate;
        if (excess <= boundaryBuffer) {
          newTranslateY = maxTranslate + (excess * excess) / (boundaryBuffer * boundaryBuffer) * boundaryBuffer / 2;
        } else {
          newTranslateY = maxTranslate + boundaryBuffer / 2 + (excess - boundaryBuffer) * 0.4;
        }
      }

      // 4️⃣ 更新状态和位置映射
      this.setData({
        translateY: newTranslateY,
        lastTouchY: currentY,
        lastDeltaY: deltaIncrement
      });

      // 计算对应数值（平滑映射）
      const index = Math.round(-newTranslateY / markHeight);
      const value = Math.max(min, Math.min(this.properties.max, min + index * step));

      if (value !== this.properties.value) {
        this.triggerEvent('change', { value });
      }
    },

    onTouchEnd() {
      this.setData({
        isTouching: false,
        lastTranslateY: this.data.translateY
      });
    }
  }
});
