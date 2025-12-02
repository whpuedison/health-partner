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
    lastTranslateX: 0,
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
      const { markWidth, lastTranslateX, touchStartX } = this.data;
      const pixelRatio = 750 / wx.getSystemInfoSync().windowWidth;
      const currentX = e.touches[0].clientX * pixelRatio;
      const deltaX = currentX - touchStartX;

      // 添加阻尼系数，减缓滑动速度
      const dampingFactor = 0.2; // 0.2倍速度，更平滑
      const dampedDeltaX = deltaX * dampingFactor;

      let newTranslateX = lastTranslateX + dampedDeltaX;

      // 限制translateX范围
      const maxTranslate = -(Math.floor((this.properties.max - min) / step)) * markWidth;
      newTranslateX = Math.max(maxTranslate, Math.min(0, newTranslateX));

      const index = Math.round(-newTranslateX / markWidth);
      const value = Math.max(min, Math.min(this.properties.max, min + index * step));

      this.setData({ translateX: newTranslateX });

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
