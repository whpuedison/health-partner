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
      recentPositions: [],
      // 震动反馈相关
      lastTickValue: null, // 上次触发震动的值
      currentPreciseValue: 0, // 当前精确值
      previousPreciseValue: 0 // 上一次的精确值，用于检测经过了多少个刻度
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
          maxTranslate,
          lastTickValue: this.properties.value, // 初始化为当前值
          currentPreciseValue: this.properties.value,
          previousPreciseValue: this.properties.value
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
          lastTranslateY: clampedTranslateY,
          currentPreciseValue: value, // 同步精确值
          previousPreciseValue: value,
          lastTickValue: value // 重置最后一次震动的值
        });
      },
  
      onTouchStart(e) {
        const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
        const touchY = e.touches[0].clientY * pixelRatio;
        const currentValue = this.properties.value;
        
        this.setData({
          touchStartY: touchY,
          lastTouchY: touchY,
          isTouching: true,
          recentVelocities: [],
          recentPositions: [],
          lastTickValue: currentValue, // 触摸开始时重置
          currentPreciseValue: currentValue,
          previousPreciseValue: currentValue
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
        
        // 🎯 实时计算当前精确值
        const { min, step, value } = this.properties;
        const { markHeight } = this.data;
        
        // 计算当前精确值（不四舍五入）
        const preciseValue = (-newTranslateY / markHeight) * step + min;
        const currentValue = Math.round(preciseValue);
        const clampedValue = Math.max(min, Math.min(this.properties.max, currentValue));
        
        // 🎯 保存当前精确值
        this.setData({ 
          currentPreciseValue: preciseValue 
        });
        
        // 🎯 检测经过了多少个整数刻度并触发震动
        this.checkTickFeedback();
        
        // 更新上一次精确值为当前精确值
        this.setData({
          previousPreciseValue: preciseValue
        });
        
        // 只有当值发生变化时才触发change事件
        if (clampedValue !== value) {
          this.triggerEvent('change', { value: clampedValue });
        }
      },
  
      // 🎯 检测经过了多少个整数刻度并触发震动
      checkTickFeedback() {
        const { min, max, step } = this.properties;
        const { previousPreciseValue, currentPreciseValue } = this.data;
        
        // 计算上一次和当前的四舍五入值
        const previousRounded = Math.round(previousPreciseValue);
        const currentRounded = Math.round(currentPreciseValue);
        
        // 如果四舍五入后的值相同，说明还在同一个整数刻度内，不触发震动
        if (previousRounded === currentRounded) {
          return;
        }
        
        // 🎯 计算经过了多少个整数刻度
        const direction = currentRounded > previousRounded ? 1 : -1; // 1:向上，-1:向下
        const startValue = direction === 1 ? previousRounded : previousRounded;
        const endValue = direction === 1 ? currentRounded : currentRounded;
        
        // 确保值在[min, max]范围内
        const clampedStart = Math.max(min, Math.min(max, startValue));
        const clampedEnd = Math.max(min, Math.min(max, endValue));
        
        // 计算需要震动的次数（经过了多少个整数刻度）
        const tickCount = Math.abs(clampedEnd - clampedStart);
        
        if (tickCount > 0) {
          // 🎯 对经过的每个整数刻度都触发一次震动
          for (let i = 1; i <= tickCount; i++) {
            // 使用setTimeout分散震动时间，避免同时触发
            setTimeout(() => {
              this.triggerVibration();
            }, i * 5); // 每个震动间隔5ms
          }
        }
      },
  
      // 🎯 触发震动
      triggerVibration() {
        // 检查是否支持震动API
        if (wx.vibrateShort) {
          try {
            wx.vibrateShort({
              type: 'light', // 使用轻触模式
              success: () => {
                // 震动成功
              },
              fail: (err) => {
                console.warn('震动失败:', err);
              }
            });
          } catch (error) {
            console.warn('震动API不可用:', error);
          }
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
  
      // 🎯 吸附到最近刻度
      snapToNearestMark() {
        const { min, step, value } = this.properties;
        const { markHeight, translateY } = this.data;
        
        const nearestIndex = Math.round(-translateY / markHeight);
        const nearestValue = min + nearestIndex * step;
        const clampedValue = Math.max(min, Math.min(this.properties.max, nearestValue));
        
        const targetIndex = (clampedValue - min) / step;
        const targetTranslateY = -targetIndex * markHeight;
        
        // 🎯 吸附时也触发震动
        this.triggerVibration();
        
        this.setData({
          translateY: targetTranslateY,
          lastTranslateY: targetTranslateY,
          lastTickValue: clampedValue,
          currentPreciseValue: clampedValue,
          previousPreciseValue: clampedValue
        });
        
        if (clampedValue !== value) {
          this.triggerEvent('change', { value: clampedValue });
        }
      }
    }
  });