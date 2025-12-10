// pages/charts/charts.js
import * as echarts from '../../components/ec-canvas/echarts';

Page({
  data: {
    ec: {
      lazyLoad: true
    },
    echarts: echarts,
    startDate: '',
    endDate: '',
    dayCount: 30,
    showDatePopup: false,
    currentDate: new Date().getTime(),
    
    // Mock Data
    weightData: [],
    measureData: {}
  },

  onLoad(options) {
    this.initDates();
    this.generateMockData();
    
    // 延迟初始化图表
    this.weightComponent = this.selectComponent('#weight-chart');
    this.measureComponent = this.selectComponent('#measure-chart');
    
    setTimeout(() => {
        this.initCharts();
    }, 500);
  },

  initDates() {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 29);

    this.setData({
      startDate: this.formatDate(start),
      endDate: this.formatDate(end),
      dayCount: 30
    });
  },

  formatDate(date) {
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  },
  
  generateMockData() {
      // Create last 30 days dates
      const dates = [];
      const weights = [];
      const waist = [];
      const chest = [];
      const hip = [];
      
      let currentWeight = 65.5;
      
      for (let i = 0; i < 30; i++) {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          dates.push(`${d.getMonth() + 1}/${d.getDate()}`);
          
          // Pseudo random weight walk
          const change = (Math.random() - 0.6) * 0.5; // slight downward trend
          currentWeight += change;
          weights.push(currentWeight.toFixed(1));
          
          // Random measurements
          waist.push((75 + Math.sin(i * 0.1) * 2).toFixed(1));
          chest.push((90 + Math.cos(i * 0.1)).toFixed(1));
          hip.push((95 - i * 0.05).toFixed(1));
      }
      
      this.setData({
          chartDates: dates,
          weightData: weights,
          measureData: { waist, chest, hip }
      });
  },

  initCharts() {
    this.initWeightChart();
    this.initMeasureChart();
  },

  initWeightChart() {
    this.weightComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      canvas.setChart(chart);

      const option = {
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            containLabel: true
        },
        tooltip: {
            trigger: 'axis'
        },
        xAxis: {
            type: 'category',
            data: this.data.chartDates,
            axisLine: { lineStyle: { color: '#999' } },
            axisLabel: { color: '#666' }
        },
        yAxis: {
            type: 'value',
            scale: true,
            axisLine: { show: false },
            splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
        },
        series: [{
            name: '体重',
            type: 'line',
            smooth: true,
            data: this.data.weightData,
            itemStyle: { color: '#009688' },
            areaStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                    offset: 0,
                    color: 'rgba(0, 150, 136, 0.3)'
                }, {
                    offset: 1,
                    color: 'rgba(0, 150, 136, 0.01)'
                }])
            }
        }]
      };

      chart.setOption(option);
      return chart;
    });
  },

  initMeasureChart() {
    this.measureComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      canvas.setChart(chart);

      const option = {
         tooltip: {
            trigger: 'axis'
        },
        legend: {
            data: ['腰围', '胸围', '臀围'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: this.data.chartDates,
            axisLine: { lineStyle: { color: '#999' } }
        },
        yAxis: {
            type: 'value',
            scale: true,
            splitLine: { lineStyle: { type: 'dashed', color: '#eee' } }
        },
        series: [
            {
                name: '腰围',
                type: 'line',
                data: this.data.measureData.waist,
                itemStyle: { color: '#FF9800' }
            },
            {
                name: '胸围',
                type: 'line',
                data: this.data.measureData.chest,
                itemStyle: { color: '#2196F3' }
            },
            {
                name: '臀围',
                type: 'line',
                data: this.data.measureData.hip,
                itemStyle: { color: '#9C27B0' }
            }
        ]
      };

      chart.setOption(option);
      return chart;
    });
  },

  showDatePicker() {
      // 简化处理：实际中可以弹出选择器选择开始/结束时间
      wx.showToast({
          title: '已自动切换至最近30天',
          icon: 'none'
      });
  },
  
  onCloseDatePopup() {
      this.setData({ showDatePopup: false });
  }
});
