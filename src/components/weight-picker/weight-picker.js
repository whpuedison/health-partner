Component({
  properties: {
    min: { type: Number, value: 30 },
    max: { type: Number, value: 200 },
    value: { type: Number, value: 70 },
    step: { type: Number, value: 1 },
    unit: { type: String, value: 'kg' },
    markWidth: { type: Number, value: 10 }
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
      },
      'markWidth': function(newMarkWidth) {
        // markWidth变化时重新初始化刻度尺
        if (this.data.marks.length > 0) {
          this.initRuler();
        }
      },
      'min,max,step': function() {
        // 这些属性变化时也需要重新初始化
        this.initRuler();
      }
    },
    methods: {
      initRuler() {
        console.log('weight-picker initRuler 开始初始化');
        const { min, max, step, markWidth } = this.properties;
        const marks = [];

        for (let i = min; i <= max; i += step) {
          const index = Math.floor((i - min) / step);
          const left = 319 + index * markWidth;

          marks.push({
            value: i,
            isLong: i % 10 === 0,
            left: left
          });
        }

        // 计算边界位置
        const maxIndex = Math.floor((max - min) / step);
        const minTranslate = -maxIndex * markWidth;
        const maxTranslate = 0;

        console.log('weight-picker 初始化完成，marks数量:', marks.length);
        console.log('markWidth:', markWidth);
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
        const { markWidth, minTranslate, maxTranslate } = this.data;
        
        const index = Math.round((value - min) / step);
        const translateX = -index * markWidth;
        
        const clampedTranslateX = Math.max(minTranslate, Math.min(maxTranslate, translateX));
        
        this.setData({
          translateX: clampedTranslateX,
          lastTranslateX: clampedTranslateX,
          currentPreciseValue: value, // 同步精确值
          previousPreciseValue: value,
          lastTickValue: value // 重置最后一次震动的值
        });
      },
  
      onTouchStart(e) {
        const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
        const touchX = e.touches[0].clientX * pixelRatio;
        const currentValue = this.properties.value;
        
        this.setData({
          touchStartX: touchX,
          lastTouchX: touchX,
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
        
        // 🎯 实时计算当前精确值
        const { min, step, value } = this.properties;
        const { markWidth } = this.data;
        
        // 计算当前精确值（不四舍五入）
        const preciseValue = (-newTranslateX / markWidth) * step + min;
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
        const direction = currentRounded > previousRounded ? 1 : -1; // 1:向右，-1:向左
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
        const { markWidth, translateX } = this.data;
        
        const nearestIndex = Math.round(-translateX / markWidth);
        const nearestValue = min + nearestIndex * step;
        const clampedValue = Math.max(min, Math.min(this.properties.max, nearestValue));
        
        const targetIndex = (clampedValue - min) / step;
        const targetTranslateX = -targetIndex * markWidth;
        
        // 🎯 吸附时也触发震动
        this.triggerVibration();
        
        this.setData({
          translateX: targetTranslateX,
          lastTranslateX: targetTranslateX,
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
