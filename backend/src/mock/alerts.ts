export function getAlerts() {
  return [
    { id: '1', level: 'warning', message: '航道南侧模拟拥堵预警（演示数据）', time: new Date().toISOString() },
    { id: '2', level: 'info', message: '3号泊位岸桥维护窗口14:00–16:00', time: new Date().toISOString() },
  ]
}
