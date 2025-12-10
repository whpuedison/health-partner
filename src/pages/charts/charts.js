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
    console.log('开始绘制体重图表，数据:', weightData);
    
    if (!weightData || !Array.isArray(weightData) || weightData.length === 0) {
      console.warn('体重数据无效或为空:', weightData);
      return;
    }
    
    // 提取日期和体重数据
    const dates = weightData.map(item => {
      if (!item.date) {
        console.warn('体重记录缺少date字段:', item);
        return '未知日期';
      }
      
      // 使用Date对象正确解析时区
      try {
        const dateObj = new Date(item.date);
        if (isNaN(dateObj.getTime())) {
          console.warn('日期解析失败:', item.date);
          return '未知日期';
        }
        
        // 获取本地时区的年、月、日
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        return dateStr;
      } catch (error) {
        console.warn('日期处理异常:', error, '原始值:', item.date);
        return '未知日期';
      }
    });
    
    const weights = weightData.map(item => item.weight || 0);
    
    // 过滤无效数据
    const validIndices = dates.map((date, index) => 
      date !== '未知日期' && weights[index] > 0
    );
    const validDates = dates.filter((_, index) => validIndices[index]);
    const validWeights = weights.filter((_, index) => validIndices[index]);
    
    console.log('有效的日期:', validDates);
    console.log('有效的体重:', validWeights);
    
    // 创建图表实例 - 参考官方案例
    this.data.charts.weight = new wxCharts({
      canvasId: 'weightChart',
      type: 'line',
      categories: validDates,  // 关键：必须正确设置
      series: [{
        name: '体重',
        data: validWeights,
        format: function (val) {
          return val ? val.toFixed(1) : '-';
        },
        color: '#FF6B6B'
      }],
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
      height: 250,
      dataLabel: true,
      dataPointShape: true,
      legend: false,
      extra: {
        lineStyle: 'curve'
      }
    });
    
    console.log('体重图表创建完成，categories数量:', validDates.length);
  },

  // 绘制体围变化图
  drawMeasurementCharts(measurementsData) {
    if (!measurementsData || Object.keys(measurementsData).length === 0) return;
    
    // 日期格式化函数（与体重图表保持一致）
    // 日期格式化函数（正确处理时区）
    const formatDate = (dateStr) => {
      if (!dateStr) {
        console.warn('体围记录缺少date字段');
        return '未知日期';
      }
      
      // 使用Date对象正确解析时区
      try {
        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) {
          console.warn('日期解析失败:', dateStr);
          return '未知日期';
        }
        
        // 获取本地时区的年、月、日
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        
        return formatted;
      } catch (error) {
        console.warn('日期处理异常:', error, '原始值:', dateStr);
        return '未知日期';
      }
    };
    
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
          const formattedDate = formatDate(item.date);
          if (formattedDate !== '未知日期') {
            allDatesSet.add(formattedDate);
          }
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
        const item = typeRecords.find(m => formatDate(m.date) === date);
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
            return val ? val.toFixed(1) : '-';
          },
          color: type.color
        }],
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
        height: 250,
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