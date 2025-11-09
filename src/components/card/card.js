// components/card/card.js
Component({
  options: {
    multipleSlots: true,
  },

  properties: {
    title: {
      type: String,
      value: '',
    },
    padding: {
      type: String,
      value: '32rpx',
    },
  },

  data: {},

  methods: {
    onCardTap() {
      this.triggerEvent('tap');
    },
  },
});

