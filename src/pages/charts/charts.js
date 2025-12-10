// pages/charts/charts.js
const wxCharts = require('../../utils/wxcharts.js');
const { Http } = require('../../utils/http');
const { API } = require('../../config/api');
const app = getApp();

Page({
  data: {
    // 图表实例
    charts: {},
    loading: true
  },

  onLoad: function (options) {
    // 加载数据
    this.loadChartsData();
  },

  onReady: function () {
    // 确保canvas绘制
    // 图表会在数据加载完成后绘制
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
      
      // 同时请求体重和体围数据
      const [weightResult, measurementsResult] = await Promise.all([
        Http.get(API.WEIGHT_LATEST, { openId, limit: 10 }),
        Http.get(API.MEASUREMENT_LATEST, { openId, limit: 10 })
      ]);
      
      // 处理体重数据
      if (weightResult.success && weightResult.data) {
        this.drawWeightChart(weightResult.data);
      }
      
      // 处理体围数据
      if (measurementsResult.success && measurementsResult.data) {
        this.drawMeasurementCharts(measurementsResult.data);
      }
    } catch (error) {
      console.error('加载图表数据失败:', error);
      wx.showToast({ title: '数据加载失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 绘制体重变化图
  drawWeightChart(weightData) {
    if (!weightData || !Array.isArray(weightData) || weightData.length === 0) {
      console.warn('体重数据无效或为空:', weightData);
      return;
    }
    
    // 提取日期和体重数据 - 适配实际数据结构
    const dates = weightData.map(item => {
      // 处理日期格式，去掉时间部分
      const dateStr = item.date.split('T')[0];
      return dateStr;
    });
    
    const weights = weightData.map(item => {
      // 注意：实际数据中是weight字段，不是value字段
      const val = parseFloat(item.weight || item.value);
      return isNaN(val) ? null : val;
    });
    
    // 过滤掉无效数据点
    const validIndices = weights.map((val, index) => val !== null ? index : -1).filter(i => i !== -1);
    if (validIndices.length === 0) {
      console.warn('没有有效的体重数据');
      return;
    }
    
    // 只保留有效数据
    const validDates = validIndices.map(i => dates[i]);
    const validWeights = validIndices.map(i => weights[i]);
    
    // 绘制体重图表
    this.data.charts.weight = new wxCharts({
      canvasId: 'weightChart',
      type: 'line',
      categories: validDates,
      animation: true,
      background: '#ffffff',
      series: [{
        name: '体重',
        data: validWeights,
        format: function (val) {
          return val ? val.toFixed(1) + 'kg' : '-';
        },
        color: '#FF6B6B'
      }],
      xAxis: {
        disableGrid: false,
        fontColor: '#7f8c8d',
        axisLineColor: '#d5d8dc',
        title: '测量日期',
        titleFontColor: '#95a5a6',
        labelCount: validDates.length > 10 ? 10 : validDates.length,
        rotateLabel: validDates.length > 8 ? 45 : 0
      },
      yAxis: {
        title: '体重 (kg)',
        format: function (val) {
          return val.toFixed(1);
        },
        min: Math.min(...validWeights) - 2,
        max: Math.max(...validWeights) + 2,
        fontColor: '#7f8c8d',
        gridColor: '#ecf0f1',
        titleFontColor: '#95a5a6'
      },
      width: wx.getSystemInfoSync().windowWidth - 96,
      height: 400,
      dataLabel: true,
      dataPointShape: true,
      legend: false,
      extra: {
        lineStyle: 'curve'
      }
    });
  },

  // 绘制体围变化图
  drawMeasurementCharts(measurementsData) {
    if (!measurementsData || Object.keys(measurementsData).length === 0) return;
    
    // 体围类型配置
    const measurementTypes = [
      { key: 'bust', name: '胸围', color: '#E74C3C' },
      { key: 'waist', name: '腰围', color: '#3498DB' },
      { key: 'hip', name: '臀围', color: '#9B59B6' },
      { key: 'arm', name: '上臂围', color: '#E67E22' },
      { key: 'thigh', name: '大腿围', color: '#2ECC71' },
      { key: 'calf', name: '小腿围', color: '#1ABC9C' }
    ];
    
    // 获取所有日期（从所有类型的数据中提取）
    const allDatesSet = new Set();
    measurementTypes.forEach(type => {
      if (measurementsData[type.key] && measurementsData[type.key].length > 0) {
        measurementsData[type.key].forEach(item => {
          allDatesSet.add(item.date);
        });
      }
    });
    
    const allDates = Array.from(allDatesSet).sort();
    
    // 为每个体围类型绘制图表
    measurementTypes.forEach(type => {
      const typeRecords = measurementsData[type.key] || [];
      if (typeRecords.length === 0) return;
      
      // 提取该类型的体围数据
      const typeData = [];
      allDates.forEach(date => {
        const item = typeRecords.find(m => m.date === date);
        typeData.push(item ? parseFloat(item.value) : null);
      });
      
      // 过滤掉没有数据的点
      const validData = typeData.filter(val => val !== null);
      if (validData.length === 0) return;
      
      // 绘制图表
      this.data.charts[type.key] = new wxCharts({
        canvasId: `${type.key}Chart`,
        type: 'line',
        categories: allDates,
        animation: true,
        background: '#ffffff',
        series: [{
          name: type.name,
          data: typeData,
          format: function (val) {
            return val ? val.toFixed(1) + 'cm' : '-';
          },
          color: type.color
        }],
        xAxis: {
          disableGrid: false,
          fontColor: '#7f8c8d',
          axisLineColor: '#d5d8dc'
        },
        yAxis: {
          title: `${type.name} (cm)`,
          format: function (val) {
            return val.toFixed(1);
          },
          min: Math.min(...validData) - 5,
          max: Math.max(...validData) + 5,
          fontColor: '#7f8c8d',
          gridColor: '#ecf0f1',
          titleFontColor: '#95a5a6'
        },
        width: wx.getSystemInfoSync().windowWidth - 96,
        height: 400,
        dataLabel: true,
        dataPointShape: true,
        legend: false,
        extra: {
          lineStyle: 'curve'
        }
      });
    });
  }
});