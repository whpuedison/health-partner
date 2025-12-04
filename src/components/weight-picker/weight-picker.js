Component({
    properties: {
      min: { type: Number, value: 30 },
      max: { type: Number, value: 200 },
      value: { type: Number, value: 70 },
      step: { type: Number, value: 1 },
      unit: { type: String, value: 'kg' }
    },
    data: {
      marks: [],
      translateX: 0,
      markWidth: 10,
      containerWidth: 638,
      touchStartX: 0,
      lastTouchX: 0,
      lastDeltaX: 0,
      isTouching: false,
      lastTranslateX: 0,
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
        console.log('weight-picker initRuler 开始初始化');
        const { min, max, step } = this.properties;
        const marks = [];
  
        for (let i = min; i <= max; i += step) {
          const index = Math.floor((i - min) / step);
          const left = 319 + index * this.data.markWidth;
  
          marks.push({
            value: i,
            isLong: i % 10 === 0,
            left: left
          });
        }
  
        // 计算边界位置
        const maxIndex = Math.floor((max - min) / step);
        const minTranslate = -maxIndex * this.data.markWidth;
        const maxTranslate = 0;
        
        console.log('weight-picker 初始化完成，marks数量:', marks.length);
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
        const { markWidth, minTranslate, maxTranslate } = this.data;
        
        const index = Math.round((value - min) / step);
        const translateX = -index * markWidth;
        
        const clampedTranslateX = Math.max(minTranslate, Math.min(maxTranslate, translateX));
        
        this.setData({
          translateX: clampedTranslateX,
          lastTranslateX: clampedTranslateX
        });
      },
  
      onTouchStart(e) {
        const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
        const touchX = e.touches[0].clientX * pixelRatio;
        
        this.setData({
          touchStartX: touchX,
          lastTouchX: touchX,
          isTouching: true,
          recentVelocities: [],
          recentPositions: []
        });
      },
  
      onTouchMove(e) {
        if (!this.data.isTouching) return;
  
        const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
        const currentX = e.touches[0].clientX * pixelRatio;
        const deltaX = currentX - this.data.lastTouchX;
        
        // 🎯 简单的速度平滑处理（防抖动）
        // 记录最近的位移
        const recentPositions = [...this.data.recentPositions, { x: currentX, time: Date.now() }];
        // 只保留最近5帧
        if (recentPositions.length > 5) recentPositions.shift();
        
        // 计算平滑后的位移
        let smoothedDeltaX = deltaX;
        if (recentPositions.length >= 2) {
          // 使用加权平均：最近的帧权重更高
          smoothedDeltaX = 0;
          let totalWeight = 0;
          for (let i = 0; i < recentPositions.length - 1; i++) {
            const weight = i + 1; // 权重：1, 2, 3...
            const frameDelta = recentPositions[i + 1].x - recentPositions[i].x;
            smoothedDeltaX += frameDelta * weight;
            totalWeight += weight;
          }
          smoothedDeltaX = smoothedDeltaX / totalWeight;
        }
        
        // 限制最大移动速度（防止抖动）
        const maxSpeed = 30; // rpx per move
        smoothedDeltaX = Math.max(-maxSpeed, Math.min(maxSpeed, smoothedDeltaX));
        
        // 🎯 计算新位置（无阻尼，直接移动）
        let newTranslateX = this.data.lastTranslateX + smoothedDeltaX;
        
        // 🎯 边界直接固定（无弹性效果）
        newTranslateX = Math.max(
          this.data.minTranslate, 
          Math.min(this.data.maxTranslate, newTranslateX)
        );
        
        // 🎯 更新状态
        this.setData({
          translateX: newTranslateX,
          lastTouchX: currentX,
          lastTranslateX: newTranslateX,
          recentPositions: recentPositions
        });
        
        // 🎯 实时计算当前值（用于显示，但不立即吸附）
        const { min, step, value } = this.properties;
        const { markWidth } = this.data;
        
        // 计算当前最接近的值（四舍五入到最近的刻度）
        const currentValue = Math.round((-newTranslateX / markWidth) * step + min);
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
        const { markWidth, translateX } = this.data;
        
        // 计算最近的刻度（四舍五入）
        const nearestIndex = Math.round(-translateX / markWidth);
        const nearestValue = min + nearestIndex * step;
        const clampedValue = Math.max(min, Math.min(this.properties.max, nearestValue));
        
        // 计算目标位置
        const targetIndex = (clampedValue - min) / step;
        const targetTranslateX = -targetIndex * markWidth;
        
        // 🎯 直接设置到目标位置（无动画）
        this.setData({
          translateX: targetTranslateX,
          lastTranslateX: targetTranslateX
        });
        
        // 如果值变化了，触发change事件
        if (clampedValue !== value) {
          this.triggerEvent('change', { value: clampedValue });
        }
      }
    }
  });