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
      lastTouchY: 0,
      lastDeltaY: 0,
      isTouching: false,
      lastTranslateY: 0,
      minTranslate: 0,
      maxTranslate: 0,
      // 防抖动的速度平滑处理
      recentVelocities: [],
      recentPositions: []
    },
    lifetimes: {
      attached() {
        this.initRuler();
      }
    },
    observers: {
      'value': function(value) {
        if (this.data.marks.length > 0 && !this.data.isTouching) {
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
  
        // 计算边界位置
        const maxIndex = Math.floor((max - min) / step);
        const minTranslate = -maxIndex * this.data.markHeight; // 最大值的边界（最下方）
        const maxTranslate = 0; // 最小值的边界（最上方）
        
        console.log('ruler-picker 初始化完成，marks数量:', marks.length);
        console.log('边界范围:', minTranslate, '到', maxTranslate);
        
        this.setData({ 
          marks,
          minTranslate,
          maxTranslate
        });
        this.updateScrollPosition();
      },
  
      updateScrollPosition() {
        const { value, min, step } = this.properties;
        const { markHeight, minTranslate, maxTranslate } = this.data;
        
        const index = Math.round((value - min) / step);
        const translateY = -index * markHeight;
        
        const clampedTranslateY = Math.max(minTranslate, Math.min(maxTranslate, translateY));
        
        this.setData({
          translateY: clampedTranslateY,
          lastTranslateY: clampedTranslateY
        });
      },
  
      onTouchStart(e) {
        const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
        const touchY = e.touches[0].clientY * pixelRatio;
        
        this.setData({
          touchStartY: touchY,
          lastTouchY: touchY,
          isTouching: true,
          recentVelocities: [],
          recentPositions: []
        });
      },
  
      onTouchMove(e) {
        if (!this.data.isTouching) return;
  
        const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
        const currentY = e.touches[0].clientY * pixelRatio;
        const deltaY = currentY - this.data.lastTouchY;
        
        // 🎯 简单的速度平滑处理（防抖动）
        // 记录最近的位置
        const recentPositions = [...this.data.recentPositions, { y: currentY, time: Date.now() }];
        // 只保留最近5帧
        if (recentPositions.length > 5) recentPositions.shift();
        
        // 计算平滑后的位移
        let smoothedDeltaY = deltaY;
        if (recentPositions.length >= 2) {
          // 使用加权平均：最近的帧权重更高
          smoothedDeltaY = 0;
          let totalWeight = 0;
          for (let i = 0; i < recentPositions.length - 1; i++) {
            const weight = i + 1; // 权重：1, 2, 3...
            const frameDelta = recentPositions[i + 1].y - recentPositions[i].y;
            smoothedDeltaY += frameDelta * weight;
            totalWeight += weight;
          }
          smoothedDeltaY = smoothedDeltaY / totalWeight;
        }
        
        // 限制最大移动速度（防止抖动）
        const maxSpeed = 30; // rpx per move
        smoothedDeltaY = Math.max(-maxSpeed, Math.min(maxSpeed, smoothedDeltaY));
        
        // 🎯 计算新位置（无阻尼，直接移动）
        let newTranslateY = this.data.lastTranslateY + smoothedDeltaY;
        
        // 🎯 边界直接固定（无弹性效果）
        newTranslateY = Math.max(
          this.data.minTranslate, 
          Math.min(this.data.maxTranslate, newTranslateY)
        );
        
        // 🎯 更新状态
        this.setData({
          translateY: newTranslateY,
          lastTouchY: currentY,
          lastTranslateY: newTranslateY,
          recentPositions: recentPositions
        });
        
        // 🎯 实时计算当前值（用于显示，但不立即吸附）
        const { min, step, value } = this.properties;
        const { markHeight } = this.data;
        
        // 计算当前最接近的值（四舍五入到最近的刻度）
        const currentValue = Math.round((-newTranslateY / markHeight) * step + min);
        const clampedValue = Math.max(min, Math.min(this.properties.max, currentValue));
        
        // 只有当值发生变化时才触发change事件
        if (clampedValue !== value) {
          this.triggerEvent('change', { value: clampedValue });
        }
      },
  
      onTouchEnd() {
        if (!this.data.isTouching) return;
        
        this.setData({
          isTouching: false
        });
        
        // 🎯 触摸结束后直接吸附到最接近的刻度
        this.snapToNearestMark();
      },
  
      // 🎯 吸附到最近刻度（触摸结束后调用）
      snapToNearestMark() {
        const { min, step, value } = this.properties;
        const { markHeight, translateY } = this.data;
        
        // 计算最近的刻度（四舍五入）
        const nearestIndex = Math.round(-translateY / markHeight);
        const nearestValue = min + nearestIndex * step;
        const clampedValue = Math.max(min, Math.min(this.properties.max, nearestValue));
        
        // 计算目标位置
        const targetIndex = (clampedValue - min) / step;
        const targetTranslateY = -targetIndex * markHeight;
        
        // 🎯 直接设置到目标位置（无动画）
        this.setData({
          translateY: targetTranslateY,
          lastTranslateY: targetTranslateY
        });
        
        // 如果值变化了，触发change事件
        if (clampedValue !== value) {
          this.triggerEvent('change', { value: clampedValue });
        }
      }
    }
  });