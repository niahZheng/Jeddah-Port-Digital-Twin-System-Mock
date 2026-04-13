/** 港口运营总监各子页演示数据（REST）；首页 KPI 另见 getDirectorOverviewKpiSnapshot */

const today = () => new Date().toISOString().slice(0, 10)

export function getDirectorOverview() {
  const d = today()
  return {
    date: d,
    kpis: {
      cargoThroughputTeu: 8420,
      cargoThroughputPlanTeu: 9000,
      passengerDispatch: 12880,
      passengerPlan: 13500,
      shipPlanCompletionRate: 0.924,
      criticalExceptionCount: 3,
    },
    shipPlanDigest: {
      arrivedToday: 8,
      departedToday: 6,
      delayedShips: 1,
      onTimeRate: 0.91,
    },
    hourlyTrend: {
      labels: ['06', '08', '10', '12', '14', '16', '18'],
      cargoTeu: [420, 980, 1520, 2100, 2680, 3120, 3650],
      passenger: [620, 1580, 3200, 5100, 7800, 10200, 12880],
    },
    topAlertsPreview: [
      { id: 'EX-1042', title: '集装箱船「红海之星」靠泊计划延误 45 分钟', level: 'high' },
      { id: 'EX-1045', title: 'T2 检票口客流瞬时超阈值 12%', level: 'medium' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

/** WebSocket：每次广播在基准值上小幅波动，模拟实时刷新 */
export function getDirectorOverviewKpiSnapshot() {
  const base = getDirectorOverview().kpis
  const jitter = (n: number, amp: number) =>
    Math.max(0, Math.round(n + (Math.random() - 0.5) * amp))
  const rateJitter = (r: number) =>
    Math.min(0.999, Math.max(0.75, r + (Math.random() - 0.5) * 0.02))
  return {
    cargoThroughputTeu: jitter(base.cargoThroughputTeu, 120),
    passengerDispatch: jitter(base.passengerDispatch, 200),
    shipPlanCompletionRate: rateJitter(base.shipPlanCompletionRate),
    criticalExceptionCount: Math.max(1, Math.min(6, base.criticalExceptionCount + (Math.random() > 0.7 ? 1 : 0) - (Math.random() > 0.85 ? 1 : 0))),
    updatedAt: new Date().toISOString(),
  }
}

export function getDirectorFreight() {
  return {
    date: today(),
    shipMovements: [
      { vessel: '红海之星', mmsi: '403050001', type: '集装箱', eta: '08:20', ata: '09:05', etd: '16:00', status: '在港作业', berth: 'B-03' },
      { vessel: '吉达快航', mmsi: '403050002', type: '集装箱', eta: '11:40', ata: '—', etd: '22:30', status: '预抵', berth: 'B-05' },
      { vessel: '沙漠珍珠', mmsi: '403050003', type: '散货', eta: '06:10', ata: '06:02', etd: '14:20', status: '离港', berth: '—' },
      { vessel: '东方油龙', mmsi: '403050004', type: '油轮', eta: '13:00', ata: '12:48', etd: '次日04:00', status: '在港作业', berth: 'O-01' },
      { vessel: '阿拉伯海迅', mmsi: '403050005', type: '集装箱', eta: '09:00', ata: '09:18', etd: '18:00', status: '在港作业', berth: 'B-02' },
      { vessel: '汉志之峰', mmsi: '403050006', type: '散货', eta: '07:30', ata: '07:25', etd: '15:00', status: '离港', berth: '—' },
      { vessel: '珊瑚快线', mmsi: '403050007', type: '集装箱', eta: '14:20', ata: '—', etd: '23:00', status: '预抵', berth: 'B-08' },
      { vessel: '新月之星', mmsi: '403050008', type: '油轮', eta: '16:00', ata: '15:52', etd: '次日02:00', status: '在港作业', berth: 'O-02' },
      { vessel: '红海勇士', mmsi: '403050009', type: '集装箱', eta: '10:45', ata: '10:50', etd: '19:30', status: '在港作业', berth: 'B-04' },
      { vessel: '麦加货运', mmsi: '403050010', type: '散货', eta: '12:10', ata: '12:05', etd: '21:00', status: '在港作业', berth: 'B-09' },
      { vessel: '灯塔集运', mmsi: '403050011', type: '集装箱', eta: '15:00', ata: '—', etd: '次日01:00', status: '锚泊', berth: '—' },
      { vessel: '苏丹走廊', mmsi: '403050012', type: '集装箱', eta: '18:30', ata: '—', etd: '次日06:00', status: '预抵', berth: 'B-01' },
      { vessel: '近洋先锋', mmsi: '403050013', type: '散货', eta: '05:40', ata: '05:38', etd: '13:30', status: '离港', berth: '—' },
      { vessel: '圣城油运', mmsi: '403050014', type: '油轮', eta: '20:00', ata: '—', etd: '次日08:00', status: '预抵', berth: 'O-01' },
    ],
    loadingProgress: [
      { berth: 'B-03', vessel: '红海之星', cargo: '电子/机械', progressPct: 68, planFinish: '15:30', risk: '正常' },
      { berth: 'O-01', vessel: '东方油龙', cargo: '原油', progressPct: 42, planFinish: '20:00', risk: '正常' },
      { berth: 'B-07', vessel: '萨法快装', cargo: '化肥', progressPct: 55, planFinish: '17:10', risk: '滞缓' },
      { berth: 'B-02', vessel: '阿拉伯海迅', cargo: '家电', progressPct: 72, planFinish: '16:00', risk: '正常' },
      { berth: 'B-04', vessel: '红海勇士', cargo: '纺织品', progressPct: 38, planFinish: '18:20', risk: '正常' },
      { berth: 'B-09', vessel: '麦加货运', cargo: '矿石', progressPct: 61, planFinish: '19:00', risk: '正常' },
      { berth: 'B-06', vessel: '吉达快航', cargo: '空箱调运', progressPct: 12, planFinish: '22:00', risk: '正常' },
      { berth: 'O-02', vessel: '新月之星', cargo: '成品油', progressPct: 28, planFinish: '23:30', risk: '正常' },
      { berth: 'B-08', vessel: '珊瑚快线', cargo: '冷链', progressPct: 0, planFinish: '次日02:00', risk: '待靠' },
      { berth: 'B-05', vessel: '加班驳运', cargo: '拼箱', progressPct: 88, planFinish: '14:00', risk: '正常' },
      { berth: 'B-10', vessel: '支线聚合', cargo: '杂货', progressPct: 49, planFinish: '17:45', risk: '正常' },
      { berth: 'B-11', vessel: '滚装临时', cargo: '车辆', progressPct: 33, planFinish: '20:10', risk: '偏紧' },
    ],
    yardInventory: [
      { zone: 'C区', teu: 4820, utilizationPct: 81, dwellHoursAvg: 18 },
      { zone: 'D 区', teu: 3150, utilizationPct: 74, dwellHoursAvg: 22 },
      { zone: 'E 区', teu: 2680, utilizationPct: 69, dwellHoursAvg: 26 },
    ],
    vehicleTurnaround: {
      avgMinutes: 38,
      targetMinutes: 42,
      onTimePct: 0.88,
      tripsToday: 1260,
    },
    focusShippers: [
      { name: '沙特国家航运', shipments: 14, onTrackPct: 0.93, note: '重点货主' },
      { name: '红海物流联盟', shipments: 9, onTrackPct: 0.86, note: '重点货主' },
      { name: '海湾集运伙伴', shipments: 11, onTrackPct: 0.91, note: '重点货主' },
      { name: '东非贸易通道', shipments: 7, onTrackPct: 0.84, note: '关注' },
      { name: '欧洲回程货代', shipments: 6, onTrackPct: 0.88, note: '关注' },
    ],
    focusCargo: [
      { category: '冷藏集装箱', teu: 620, etaRisk: '低', priority: '高' },
      { category: '汽车滚装', units: 1180, etaRisk: '中', priority: '高' },
      { category: '化工散货', teu: 890, etaRisk: '中', priority: '中' },
      { category: '建材', teu: 1120, etaRisk: '低', priority: '中' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getDirectorPassenger() {
  return {
    date: today(),
    ferrySchedule: [
      { route: '吉达—苏丹港', vessel: '圣城号', planArr: '09:30', planDep: '11:00', paxPlan: 4200, paxActual: 3980, status: '正常' },
      { route: '吉达—萨法加', vessel: '灯塔号', planArr: '10:15', planDep: '12:30', paxPlan: 3100, paxActual: 3350, status: '高峰' },
      { route: '吉达—亚喀巴', vessel: '海岸号', planArr: '14:00', planDep: '15:40', paxPlan: 2800, paxActual: 2650, status: '正常' },
      { route: '吉达—马萨瓦', vessel: '红海口号', planArr: '08:00', planDep: '09:20', paxPlan: 1900, paxActual: 1820, status: '正常' },
      { route: '吉达—索科特拉', vessel: '季风号', planArr: '11:00', planDep: '13:00', paxPlan: 1200, paxActual: 1150, status: '正常' },
      { route: '吉达—柏培拉', vessel: '亚丁湾号', planArr: '16:30', planDep: '18:10', paxPlan: 2400, paxActual: 2380, status: '正常' },
      { route: '吉达—摩加迪沙', vessel: '东非之星', planArr: '07:20', planDep: '09:00', paxPlan: 1600, paxActual: 1580, status: '正常' },
      { route: '吉达—吉布提', vessel: '曼德号', planArr: '13:40', planDep: '15:20', paxPlan: 2100, paxActual: 2090, status: '正常' },
      { route: '吉达—多哈（联程）', vessel: '海湾联程', planArr: '17:00', planDep: '18:30', paxPlan: 980, paxActual: 920, status: '延误风险' },
      { route: '吉达—萨法加（加班）', vessel: '灯塔加班', planArr: '19:00', planDep: '20:40', paxPlan: 1800, paxActual: 1750, status: '加班' },
      { route: '吉达—苏丹港（返程）', vessel: '圣城返程', planArr: '21:00', planDep: '22:30', paxPlan: 3600, paxActual: 3400, status: '正常' },
      { route: '吉达—亚喀巴（夜航）', vessel: '海岸夜航', planArr: '22:10', planDep: '23:50', paxPlan: 1500, paxActual: 1480, status: '正常' },
    ],
    routeVolumes: [
      { route: '吉达—苏丹港', pax: 3980, loadFactor: 0.95 },
      { route: '吉达—萨法加', pax: 3350, loadFactor: 0.92 },
      { route: '吉达—亚喀巴', pax: 2650, loadFactor: 0.88 },
      { route: '吉达—马萨瓦', pax: 1820, loadFactor: 0.79 },
    ],
    checkInProgress: [
      { gate: 'T1-A', processed: 1820, queue: 120, avgWaitMin: 6 },
      { gate: 'T1-B', processed: 1640, queue: 210, avgWaitMin: 9 },
      { gate: 'T2-A', processed: 2100, queue: 380, avgWaitMin: 14 },
      { gate: 'T2-B', processed: 1980, queue: 340, avgWaitMin: 12 },
    ],
    waitingHall: [
      { hall: '北候车厅', occupancyPct: 72, capacity: 5000, trend: '上升' },
      { hall: '南候车厅', occupancyPct: 58, capacity: 4500, trend: '平稳' },
    ],
    peakWindows: [
      { window: '10:00—12:00', intensity: '高', route: '吉达—萨法加' },
      { window: '15:00—17:00', intensity: '中高', route: '多航线叠加' },
    ],
    hotRoutes: [
      { route: '吉达—苏丹港', heat: '热门', delayRisk: '低' },
      { route: '吉达—萨法加', heat: '热门', delayRisk: '中' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getDirectorResources() {
  return {
    date: today(),
    berthUtilization: [
      { name: '货运泊位 B-01—B-08', used: 7, total: 8, rate: 0.875, note: '计划内' },
      { name: '客运泊位 P-01—P-03', used: 3, total: 3, rate: 1.0, note: '满负荷' },
      { name: '油品泊位 O-01—O-02', used: 1, total: 2, rate: 0.5, note: 'O-02 空闲' },
    ],
    equipment: [
      { name: '岸桥 QC', active: 11, total: 12, efficiencyPct: 0.91 },
      { name: '场桥 RTG', active: 18, total: 22, efficiencyPct: 0.84 },
      { name: '客运登船桥', active: 6, total: 6, efficiencyPct: 0.96 },
    ],
    staffing: [
      { shift: '早班', planned: 420, actual: 408, absent: 12 },
      { shift: '中班', planned: 380, actual: 376, absent: 4 },
      { shift: '晚班', planned: 290, actual: 292, absent: 0 },
    ],
    planVsActual: [
      { metric: '货运泊位周转', plan: '4.2 次/日', actual: '3.9 次/日', gap: '-0.3' },
      { metric: '客运检票吞吐', plan: '5200 人/h', actual: '4860 人/h', gap: '-340' },
    ],
    bottlenecks: [
      { area: '客运 T2 检票区', issue: '瞬时客流超设计12%', severity: '紧张' },
      { area: '货运 B-06 泊位', issue: '计划空档3h', severity: '闲置' },
      { area: 'C 区堆场', issue: '利用率81% 接近上限', severity: '偏紧' },
      { area: '岸桥 QC-07', issue: '维保窗口与班轮冲突', severity: '偏紧' },
      { area: '客运 P-02 登船桥', issue: '潮汐客流下周转效率下降', severity: '紧张' },
      { area: '货运内集卡通道', issue: '高峰排队长度超阈值', severity: '偏紧' },
      { area: '冷藏插电位', issue: '插电位占用率 94%', severity: '偏紧' },
      { area: '引航调度', issue: '夜班引航员排班缺口1 席', severity: '偏紧' },
      { area: 'B-12 临时泊位', issue: '未启用，资源闲置', severity: '闲置' },
      { area: '堆场龙门吊班组', issue: '中班交接耗时偏高', severity: '偏紧' },
      { area: '客运安检', issue: '双通道临时封闭检修', severity: '紧张' },
      { area: '油品转输泵', issue: '单泵运行，冗余不足', severity: '偏紧' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getDirectorExceptions() {
  return {
    date: today(),
    items: [
      {
        id: 'EX-1042',
        category: '货运',
        title: '集装箱船「红海之星」靠泊计划延误',
        reason: '引航窗口压缩 + 港池交通',
        impact: 'B-03 泊位占用顺延，后续船舶等待',
        status: '处理中',
        owner: '货运调度',
        progressPct: 45,
        updatedAt: '2026-04-13T09:12:00.000Z',
      },
      {
        id: 'EX-1045',
        category: '客运',
        title: 'T2 检票口客流过载',
        reason: '萨法加航线集中发班',
        impact: '平均等待上升，舆情风险',
        status: '处理中',
        owner: '客运调度',
        progressPct: 60,
        updatedAt: '2026-04-13T09:40:00.000Z',
      },
      {
        id: 'EX-1038',
        category: '货运',
        title: '化肥船「萨法快装」装卸滞缓',
        reason: '劳务班组交接延迟',
        impact: '班轮离港窗口压缩',
        status: '待复核',
        owner: '货运调度',
        progressPct: 20,
        updatedAt: '2026-04-13T08:55:00.000Z',
      },
      {
        id: 'EX-1035',
        category: '综合',
        title: '港内交通信号短暂故障',
        reason: '配电箱受潮',
        impact: '集卡绕行 15 分钟',
        status: '已恢复',
        owner: '港务设施',
        progressPct: 100,
        updatedAt: '2026-04-13T07:40:00.000Z',
      },
      {
        id: 'EX-1050',
        category: '客运',
        title: '北候车厅空调出力不足',
        reason: '冷机负载高',
        impact: '旅客舒适度投诉风险',
        status: '处理中',
        owner: '客运调度',
        progressPct: 35,
        updatedAt: '2026-04-13T10:05:00.000Z',
      },
      {
        id: 'EX-1051',
        category: '货运',
        title: '危险品申报单据待补',
        reason: '货代上传延迟',
        impact: '靠泊许可暂缓',
        status: '处理中',
        owner: '货运调度',
        progressPct: 55,
        updatedAt: '2026-04-13T10:12:00.000Z',
      },
      {
        id: 'EX-1052',
        category: '资源',
        title: 'RTG 燃油补给延误',
        reason: '供应商车辆拥堵',
        impact: '2 台 RTG 低油位运行',
        status: '处理中',
        owner: '设备管理',
        progressPct: 40,
        updatedAt: '2026-04-13T09:58:00.000Z',
      },
      {
        id: 'EX-1053',
        category: '客运',
        title: '轮椅旅客绿色通道短时排队',
        reason: '志愿者人手不足',
        impact: '特殊旅客等待 8 分钟',
        status: '已缓解',
        owner: '客运调度',
        progressPct: 90,
        updatedAt: '2026-04-13T09:30:00.000Z',
      },
      {
        id: 'EX-1054',
        category: '货运',
        title: '冷藏箱插电监测告警',
        reason: '传感器漂移',
        impact: '需人工复核 6 箱',
        status: '待复核',
        owner: '货运调度',
        progressPct: 15,
        updatedAt: '2026-04-13T08:20:00.000Z',
      },
      {
        id: 'EX-1055',
        category: '综合',
        title: '气象短时阵风预警',
        reason: '港区阵风 8 级',
        impact: '岸桥限速 30 分钟',
        status: '已解除',
        owner: '总调',
        progressPct: 100,
        updatedAt: '2026-04-13T06:50:00.000Z',
      },
      {
        id: 'EX-1056',
        category: '货运',
        title: '堆场翻箱请求积压',
        reason: '客户改单集中',
        impact: '内集卡等待上升',
        status: '处理中',
        owner: '货运调度',
        progressPct: 50,
        updatedAt: '2026-04-13T10:18:00.000Z',
      },
      {
        id: 'EX-1057',
        category: '客运',
        title: '票务系统接口抖动',
        reason: '上游 IDC 延迟',
        impact: '检票平均 +12s',
        status: '监控中',
        owner: '信息化',
        progressPct: 70,
        updatedAt: '2026-04-13T10:22:00.000Z',
      },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getDirectorDecisions() {
  return {
    date: today(),
    decisions: [
      {
        id: 'DC-20260413-01',
        title: '调整 B-05/B-06 货运泊位分配',
        basis: '午后集装箱集中到港预测 + 当前滞期风险',
        action: '将「吉达快航」改靠 B-06，释放 B-05 给加班船',
        targets: ['货运调度', '引航站'],
        issuedAt: '2026-04-13T08:30:00.000Z',
        execution: { status: '执行中', effectScore: null },
      },
      {
        id: 'DC-20260413-02',
        title: 'T2 检票区增派服务人员',
        basis: '10—12 时客流高峰预测',
        action: '增开 2 条人工通道 + 1 条应急通道',
        targets: ['客运调度', '安检与票务'],
        issuedAt: '2026-04-13T09:05:00.000Z',
        execution: { status: '已到位', effectScore: 0.82 },
      },
      {
        id: 'DC-20260413-03',
        title: '优先装卸冷藏与高价值货类',
        basis: '班轮衔接窗口紧张',
        action: '调整 QC 作业队列，冷藏 TEU 优先级 +1',
        targets: ['货运调度', '岸桥班组'],
        issuedAt: '2026-04-13T07:50:00.000Z',
        execution: { status: '已完成', effectScore: 0.91 },
      },
      {
        id: 'DC-20260413-04',
        title: '开通 B-12 临时加班靠泊窗口',
        basis: '晚高峰集装箱加班船到港',
        action: '引航优先 + 岸桥预编班',
        targets: ['引航站', '货运调度'],
        issuedAt: '2026-04-13T10:00:00.000Z',
        execution: { status: '执行中', effectScore: null },
      },
      {
        id: 'DC-20260413-05',
        title: '北候车厅冷机降载运行',
        basis: '设备出力与客流匹配',
        action: '切换备用冷机 + 巡检',
        targets: ['设施', '客运调度'],
        issuedAt: '2026-04-13T10:15:00.000Z',
        execution: { status: '执行中', effectScore: null },
      },
      {
        id: 'DC-20260413-06',
        title: '内集卡单循环改双循环试点',
        basis: '通道排队长度持续偏高',
        action: '12:00—14:00 双循环 + 临时引导员',
        targets: ['货运调度', '交通协管'],
        issuedAt: '2026-04-13T09:20:00.000Z',
        execution: { status: '已完成', effectScore: 0.78 },
      },
      {
        id: 'DC-20260413-07',
        title: '客运夜航加开安检通道',
        basis: '夜航客流预测上调',
        action: '增开 1 条安检 + 1 条检票',
        targets: ['客运调度', '安检'],
        issuedAt: '2026-04-13T11:00:00.000Z',
        execution: { status: '待执行', effectScore: null },
      },
      {
        id: 'DC-20260413-08',
        title: '化肥船劳务交接时点固化',
        basis: '重复滞缓事件',
        action: '书面确认07:45/19:15 交接',
        targets: ['货运调度', '外包队长'],
        issuedAt: '2026-04-13T08:00:00.000Z',
        execution: { status: '执行中', effectScore: 0.66 },
      },
      {
        id: 'DC-20260413-09',
        title: '冷藏箱巡检频次 +1',
        basis: '传感器误报增多',
        action: '每 2h 人工巡检登记',
        targets: ['货运调度', '库场'],
        issuedAt: '2026-04-13T07:30:00.000Z',
        execution: { status: '执行中', effectScore: null },
      },
      {
        id: 'DC-20260413-10',
        title: '引航夜班增派预备引航员',
        basis: '排班缺口与船舶密度',
        action: '调班 + 预备名单待命',
        targets: ['引航站', '总调'],
        issuedAt: '2026-04-13T06:45:00.000Z',
        execution: { status: '已到位', effectScore: 0.88 },
      },
      {
        id: 'DC-20260413-11',
        title: 'O-02 泊位承接临时油轮',
        basis: '班轮改期释放窗口',
        action: '调整靠泊顺序，优先吃水限制船',
        targets: ['货运调度', '引航站'],
        issuedAt: '2026-04-13T05:50:00.000Z',
        execution: { status: '已完成', effectScore: 0.92 },
      },
      {
        id: 'DC-20260413-12',
        title: '票务接口降级预案演练',
        basis: '接口抖动事件',
        action: '本地缓存检票 + 人工兜底',
        targets: ['信息化', '客运调度'],
        issuedAt: '2026-04-13T10:25:00.000Z',
        execution: { status: '监控中', effectScore: null },
      },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getDirectorSummary() {
  return {
    date: today(),
    freight: {
      throughputTeu: 8420,
      planTeu: 9000,
      completionRate: 0.936,
      exceptionsClosed: 2,
      exceptionsOpen: 1,
    },
    passenger: {
      dispatch: 12880,
      plan: 13500,
      completionRate: 0.954,
      peakHandled: true,
    },
    resources: {
      berthUtilizationAvg: 0.79,
      equipmentEfficiencyAvg: 0.89,
      staffingAttendance: 0.97,
    },
    exceptions: {
      total: 3,
      avgResolveHours: 2.4,
      repeatIssues: ['客运检票波峰', '化肥船装卸'],
    },
    goalsVsActual: [
      { goal: '日货运吞吐量', target: '9000 TEU', actual: '8420 TEU', verdict: '略低' },
      { goal: '日客运发送量', target: '13500 人', actual: '12880 人', verdict: '接近' },
      { goal: '计划完成率', target: '≥92%', actual: '92.4%', verdict: '达标' },
      { goal: '岸桥平均效率', target: '≥28 TEU/h', actual: '26.2 TEU/h', verdict: '略低' },
      { goal: '客运检票峰值吞吐', target: '5200 人/h', actual: '4860 人/h', verdict: '接近' },
      { goal: '泊位周转', target: '4.2 次/日', actual: '3.9 次/日', verdict: '略低' },
      { goal: '异常闭环时长', target: '≤3h', actual: '2.4h', verdict: '达标' },
      { goal: '集卡周转', target: '≤42 min', actual: '38 min', verdict: '达标' },
      { goal: '堆场平均堆存', target: '≤24 h', actual: '21.3 h', verdict: '达标' },
      { goal: '排班到岗率', target: '≥95%', actual: '97%', verdict: '达标' },
      { goal: '客户满意度（抽样）', target: '≥4.5', actual: '4.42', verdict: '接近' },
      { goal: '能耗强度', target: '≤基线 102%', actual: '99%', verdict: '达标' },
    ],
    insights: [
      '客运 T2 检票在高峰仍存在排队拉长，建议次日继续弹性排班。',
      '货运侧化肥船装卸为短板环节，需与外包劳务协同固化交接时点。',
      'O-02 泊位空闲可承接临时加班船，提升泊位资产利用率。',
      '内集卡双循环试点有效缩短排队，可在高峰窗口常态化。',
      '冷藏箱传感器漂移需与设备商安排批次校准，减少误报处置成本。',
      '引航夜班预备机制降低了窗口冲突，建议写入标准作业。',
      '北候车厅冷机与客流匹配策略可减少投诉并节能。',
      '危险品单证电子化催办流程可缩短靠泊许可等待。',
      'RTG 燃油补给窗口宜与班轮低谷对齐，避免设备低油位运行。',
      '客运夜航安检通道弹性对波峰削峰效果明显。',
      '堆场翻箱请求积压与改单高峰相关，可前置客户截单沟通。',
      '票务接口降级演练应每季度复盘一次，确保人员熟练度。',
    ],
    updatedAt: new Date().toISOString(),
  }
}
