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
    lastTranslateY: 0,
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
      const { markHeight, lastTranslateY, touchStartY } = this.data;
      const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
      const currentY = e.touches[0].clientY * pixelRatio;
      const deltaY = currentY - touchStartY;

      // 添加阻尼系数，减缓滑动速度
      const dampingFactor = 0.05; // 0.2倍速度，更平滑
      const dampedDeltaY = deltaY * dampingFactor;

      let newTranslateY = lastTranslateY + dampedDeltaY;

      // 限制translateY范围
      const minTranslate = -(Math.floor((this.properties.max - min) / step)) * markHeight;
      newTranslateY = Math.max(minTranslate, Math.min(0, newTranslateY));

      const index = Math.round(-newTranslateY / markHeight);
      const value = Math.max(min, Math.min(this.properties.max, min + index * step));

      this.setData({ translateY: newTranslateY });

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
