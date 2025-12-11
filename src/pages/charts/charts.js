const wxCharts = require('../../utils/wxcharts.js');
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const app = getApp();

Page({
  data: {
    charts: {},
    loading: true,
    hasWeightData: false,
    hasBustData: false,
    hasWaistData: false,
    hasHipData: false,
    hasArmData: false,
    hasThighData: false,
    hasCalfData: false
  },

  onLoad: function (options) {
    this.loadChartsData();
  },

  // 加载图表数据
  async loadChartsData() {
    this.setData({ loading: true });
    
    try {
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      if (!openId) {
        wx.showToast({ title: '请先登录', icon: 'none' });
        return;
      }
      
      const [weightResult, measurementsResult] = await Promise.all([
        Http.get(API.WEIGHT_LATEST, { openId, limit: 10 }),
        Http.get(API.MEASUREMENT_LATEST, { openId, limit: 10 })
      ]);
      
      if (weightResult.success) {
        this.drawWeightChart(weightResult.data);
      }
      
      if (measurementsResult.success) {
        this.drawMeasurementCharts(measurementsResult.data);
      }
    } catch (error) {
      console.error('加载图表数据失败:', error);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 绘制体重图表
  drawWeightChart(data) {
    const hasData = this.isValidData(data);
    this.setData({ hasWeightData: hasData });
    
    if (!hasData) return;
    
    // 服务端已返回 mm-dd 格式
    const dates = data.map(item => item.date);
    const values = data.map(item => item.weight);
    
    this.data.charts.weight = new wxCharts(this.getChartConfig({
      canvasId: 'weightChart',
      name: '体重',
      categories: dates,
      data: values,
      unit: 'kg',
      color: '#FF6B6B',
      yMin: Math.min(...values) - 2,
      yMax: Math.max(...values) + 2
    }));
  },

  // 绘制体围图表
  drawMeasurementCharts(data) {
    if (!data) return;
    
    const types = [
      { key: 'bust', name: '胸围', color: '#E74C3C', dataKey: 'hasBustData' },
      { key: 'waist', name: '腰围', color: '#3498DB', dataKey: 'hasWaistData' },
      { key: 'hip', name: '臀围', color: '#9B59B6', dataKey: 'hasHipData' },
      { key: 'arm', name: '上臂围', color: '#E67E22', dataKey: 'hasArmData' },
      { key: 'thigh', name: '大腿围', color: '#2ECC71', dataKey: 'hasThighData' },
      { key: 'calf', name: '小腿围', color: '#1ABC9C', dataKey: 'hasCalfData' }
    ];

    const updateData = {};

    types.forEach(type => {
      const records = data[type.key];
      const hasData = this.isValidData(records);
      updateData[type.dataKey] = hasData;

      // 确保有数据才绘制
      if (!hasData) return;

      const dates = records.map(item => item.date);
      const values = records.map(item => parseFloat(item.value));

      // 计算上下限，给一些缓冲
      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const padding = 5;

      this.data.charts[type.key] = new wxCharts(this.getChartConfig({
        canvasId: `${type.key}Chart`,
        name: type.name,
        categories: dates,
        data: values,
        unit: 'cm',
        color: type.color,
        yMin: minVal - padding,
        yMax: maxVal + padding
      }));
    });
    
    this.setData(updateData);
  },

  // 验证数据有效性
  isValidData(data) {
    return Array.isArray(data) && data.length > 0;
  },

  // 获取通用图表配置
  getChartConfig({ canvasId, name, categories, data, unit, color, yMin, yMax }) {
    const windowWidth = wx.getSystemInfoSync().windowWidth;
    
    return {
      canvasId,
      type: 'line',
      categories,
      animation: true,
      background: '#ffffff',
      series: [{
        name,
        data,
        format: val => val ? val.toFixed(1) : '-',
        color
      }],
      xAxis: {
        disableGrid: true, // 隐藏网格线
        type: 'calibration' // 刻度模式，有助于对齐
      },
      yAxis: {
        title: `${name} (${unit})`,
        format: val => val.toFixed(1),
        min: yMin,
        max: yMax,
        fontColor: '#7f8c8d',
        gridColor: '#ecf0f1',
        titleFontColor: '#95a5a6'
      },
      width: windowWidth - 32, // 增加宽度，减少挤压
      height: 200,
      dataLabel: true,
      dataPointShape: true,
      legend: false,
      extra: {
        lineStyle: 'curve'
      }
    };
  },

    recordShareAction(scene) {
        const openId = app.globalData.openId || wx.getStorageSync('openId');
        if (!openId) return;
        
        const recordUrl = '/api/v1/user/share';
        Http.post(recordUrl, {
            openId,
            scene: scene, 
            page: 'pages/charts/charts' // 记录来源页面
        }).then(res => {
            if (res.success) {
                this.setData({ isLocked: false });
                wx.showToast({
                    title: '解锁成功',
                    icon: 'success'
                });
            }
        });
      },
  
    onShareAppMessage() {
      this.recordShareAction(1);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
        title: '拍照识热量，轻松控饮食',
        path: `/pages/questionnaire/questionnaire?referrerId=${openId}`,
        imageUrl: 'https://whpuedison.online/images/kongka_share.jpg'
      };
    },
    
    onShareTimeline() {
      this.recordShareAction(2);
      const openId = app.globalData.openId || wx.getStorageSync('openId');
      return {
            title: '拍照识热量，轻松控饮食',
            query: `referrerId=${openId}`,
            imageUrl: 'https://whpuedison.online/images/tomato.jpg'
          };
     }
});