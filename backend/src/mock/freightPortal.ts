/** 货运调度员各子页演示数据 */

const today = () => new Date().toISOString().slice(0, 10)

export function getFreightDispatcherOverview() {
  const d = today()
  return {
    date: d,
    kpis: {
      plannedVesselCalls: 22,
      cargoBookedTeu: 7860,
      cargoPlanTeu: 8200,
      berthUtilizationPct: 76,
      yardMoveRate: 248,
      berthOpenSlots: 4,
      stevedoreTeamsOnDuty: 14,
      openGateLanes: 6,
      criticalExceptionCount: 2,
    },
    /** 当日船舶到港 / 离港计划 */
    shipMovePlan: [
      { vessel: '红海之星', voyage: 'RS-2408', type: '集装箱', eta: '08:20', etd: '16:30', berth: 'B-03', status: '在港作业' },
      { vessel: '吉达快航', voyage: 'JF-1092', type: '集装箱', eta: '11:40', etd: '22:10', berth: 'B-05', status: '预抵' },
      { vessel: '东方油龙', voyage: 'ODL-77', type: '油轮', eta: '12:48', etd: '次日04:00', berth: 'O-01', status: '在港作业' },
      { vessel: '沙漠珍珠', voyage: 'SZ-551', type: '散货', eta: '06:02', etd: '14:20', berth: '—', status: '已离港' },
      { vessel: '珊瑚快线', voyage: 'SH-308', type: '集装箱', eta: '14:20', etd: '23:40', berth: 'B-08', status: '锚等' },
      { vessel: '苏丹走廊', voyage: 'SC-441', type: '集装箱', eta: '18:30', etd: '次日06:00', berth: 'B-01', status: '预抵' },
    ],
    /** 货物运输清单：品名、重量、目的地、货主 */
    cargoManifest: [
      { cargoName: '电子元件（40HQ）', weightT: 18.2, unit: 'TEU×42', destination: '鹿特丹', shipper: '沙特国家航运', vessel: '红海之星', blNo: 'BL-JED-90821' },
      { cargoName: '聚乙烯颗粒', weightT: 12400, unit: '吨', destination: '宁波', shipper: '海湾石化贸易', vessel: '麦加货运', blNo: 'BL-JED-90833' },
      { cargoName: '成衣集装箱', weightT: 22.5, unit: 'TEU×38', destination: '汉堡', shipper: '红海物流联盟', vessel: '阿拉伯海迅', blNo: 'BL-JED-90840' },
      { cargoName: '铁矿石', weightT: 28500, unit: '吨', destination: '青岛', shipper: '东非矿业通道', vessel: '萨法快装', blNo: 'BL-JED-90818' },
      { cargoName: '冷鲜牛肉（冷藏）', weightT: 920, unit: '吨', destination: '吉达保税区', shipper: '欧洲回程货代', vessel: '珊瑚快线', blNo: 'BL-JED-90852' },
      { cargoName: '原油', weightT: 118000, unit: '吨', destination: '炼厂交割', shipper: '沙特阿美物流部', vessel: '东方油龙', blNo: 'BL-JED-OIL-12' },
      { cargoName: '空箱调运', weightT: 0, unit: 'TEU×220', destination: '支线中转', shipper: '近洋集运', vessel: '吉达快航', blNo: 'BL-JED-MTY-07' },
    ],
    /** 堆场分配计划 */
    yardAllocationPlan: [
      { block: 'C1', purpose: '进口拆箱 + 查验待提', teuPlanned: 620, priority: '高', linkVessel: '红海之星' },
      { block: 'C2', purpose: '空箱堆存 / 出口预配', teuPlanned: 480, priority: '中', linkVessel: '吉达快航' },
      { block: 'D3', purpose: '中转箱临时堆位', teuPlanned: 310, priority: '中', linkVessel: '多船混靠' },
      { block: 'E1', purpose: '危品 / 隔离堆位', teuPlanned: 85, priority: '高', linkVessel: '化工批次' },
      { block: 'B前沿临时', purpose: '班轮直装缓冲', teuPlanned: 120, priority: '高', linkVessel: '阿拉伯海迅' },
    ],
    /** 车辆转运计划（港内倒运 / 闸口集卡） */
    vehicleTransferPlan: [
      { task: 'C1 → B-03 装船', window: '08:00–12:00', tripsPlanned: 48, trucksAssigned: 14, note: '冷藏箱优先车板' },
      { task: 'N1 闸口 → D3 堆场', window: '全天', tripsPlanned: 220, trucksAssigned: 35, note: '高峰加开 L3' },
      { task: 'O-01 → 炼厂管线区', window: '13:00–18:00', tripsPlanned: 16, trucksAssigned: 8, note: '危运资质车辆' },
      { task: 'B-09 卸船 → C2', window: '10:00–16:00', tripsPlanned: 62, trucksAssigned: 18, note: '散货自卸车队' },
      { task: '空箱回空 →外堆场', window: '夜班', tripsPlanned: 40, trucksAssigned: 10, note: '与支线班轮衔接' },
    ],
    /** 当日业务重点与量化目标 */
    dailyGoals: {
      objectives: [
        '保障 B-03、O-01 两个重点泊位窗口，避免引航链断裂。',
        'C 区堆场控制在 85% 利用率以下，优先消化进口拆箱 backlog。',
        '南翼闸口 14:00 前完成加开通道演练，应对集卡高峰。',
      ],
      targets: [
        { label: '日计划 TEU 完成率', value: '≥95%' },
        { label: '在港船舶准靠率', value: '≥92%' },
        { label: '集卡港内平均周转', value: '≤40分钟' },
        { label: '堆场翻捣次数', value: '≤2.1 次/箱' },
      ],
    },
    planDigest: {
      peakWindows: ['08:00–10:00 集卡入闸高峰', '14:00–16:00 舱内换班'],
      hotTradeLanes: ['红海—东非', '海湾—欧洲回程', '近洋支线中转'],
      focusToday: ['B-03 重点冷藏箱批次', 'O-01 原油轮联检时间窗'],
    },
    hourlyTrend: {
      labels: ['06', '08', '10', '12', '14', '16', '18'],
      berthOccupancyPct: [52, 68, 79, 74, 81, 77, 71],
      yardMovesPerHour: [120, 210, 268, 240, 290, 255, 198],
    },
    topAlertsPreview: [
      { id: 'FD-2103', title: 'B-05 靠泊窗口与引航艇衔接偏差 25 分钟', level: 'high' },
      { id: 'FD-2106', title: 'C 区堆场利用率逼近上限，建议暂缓空箱进场', level: 'medium' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightBerthing() {
  return {
    date: today(),
    berthAllocations: [
      {
        sequence: 1,
        vessel: '红海之星',
        mmsi: '403050001',
        eta: '08:20',
        dwt: 58600,
        cargoType: '集装箱',
        berthPlan: 'B-03',
        pilot: '已派',
        tug: '2+1',
        status: '靠泊中',
        captainNotified: '已同步',
        stevedoreNotified: '已同步',
      },
      {
        sequence: 2,
        vessel: '阿拉伯海迅',
        mmsi: '403050005',
        eta: '09:00',
        dwt: 41200,
        cargoType: '集装箱',
        berthPlan: 'B-02',
        pilot: '已派',
        tug: '2',
        status: '靠泊中',
        captainNotified: '已同步',
        stevedoreNotified: '已同步',
      },
      {
        sequence: 3,
        vessel: '吉达快航',
        mmsi: '403050002',
        eta: '11:40',
        dwt: 67800,
        cargoType: '集装箱',
        berthPlan: 'B-05',
        pilot: '待命',
        tug: '2',
        status: '预抵',
        captainNotified: '已同步',
        stevedoreNotified: '已同步',
      },
      {
        sequence: 4,
        vessel: '珊瑚快线',
        mmsi: '403050007',
        eta: '14:20',
        dwt: 28400,
        cargoType: '冷藏集装箱',
        berthPlan: 'B-08',
        pilot: '计划中',
        tug: '2',
        status: '锚等',
        captainNotified: '已同步',
        stevedoreNotified: '预派班',
      },
      {
        sequence: 5,
        vessel: '苏丹走廊',
        mmsi: '403050012',
        eta: '18:30',
        dwt: 95200,
        cargoType: '集装箱',
        berthPlan: 'B-01',
        pilot: '计划中',
        tug: '2+1',
        status: '预抵',
        captainNotified: '已发预告',
        stevedoreNotified: '待窗口',
      },
    ],
    queueAnchorage: [
      { vessel: '灯塔集运', dwt: 35600, cargoType: '集装箱', waitHours: 1.2, reason: '泊位占用', priority: '高' },
      { vessel: '近洋支线 07', dwt: 8200, cargoType: '集装箱（支线）', waitHours: 0.5, reason: '引航衔接', priority: '中' },
    ],
    bridgeCoordination: [
      { item: '潮高窗口', window: '11:40–13:10', note: 'B区大型集装箱船' },
      { item: '拖轮池', available: '6/8', note: '2 艘外派护航' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightHandling() {
  return {
    date: today(),
    hatchProgress: [
      { berth: 'B-03', vessel: '红海之星', bay: '20–40', progressPct: 68, cranes: 3, shift: '白班', risk: '正常' },
      { berth: 'B-02', vessel: '阿拉伯海迅', bay: '10–30', progressPct: 72, cranes: 2, shift: '白班', risk: '正常' },
      { berth: 'O-01', vessel: '东方油龙', bay: '全船', progressPct: 42, cranes: 1, shift: '连续', risk: '正常' },
      { berth: 'B-07', vessel: '萨法快装', bay: '15–25', progressPct: 55, cranes: 2, shift: '白班', risk: '滞缓' },
    ],
    equipment: [
      { name: '岸桥 QC-12', berth: 'B-03', utilizationPct: 86, nextMaint: '次日02:00' },
      { name: '岸桥 QC-08', berth: 'B-02', utilizationPct: 78, nextMaint: '本周五' },
      { name: '门机 G-04', berth: 'B-09', utilizationPct: 71, nextMaint: '—' },
    ],
    laborHandover: [
      { time: '16:00', from: '白班调度', to: '中班调度', note: 'B-03 重点舱位交接' },
      { time: '00:00', from: '中班', to: '夜班', note: '油轮 O-01 连续作业' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightYard() {
  return {
    date: today(),
    stacks: [
      { block: 'C1', teu: 1620, utilizationPct: 84, hotMoves: '进口拆箱' },
      { block: 'C2', teu: 1480, utilizationPct: 79, hotMoves: '空箱调拨' },
      { block: 'D3', teu: 980, utilizationPct: 72, hotMoves: '中转' },
      { block: 'E1', teu: 720, utilizationPct: 68, hotMoves: '危品隔离区' },
    ],
    reefer: [
      { plugId: 'R-120', setC: '-18', alarm: '无', vessel: '珊瑚快线' },
      { plugId: 'R-118', setC: '+4', alarm: '温度波动', vessel: '红海之星' },
    ],
    gantryRails: [
      { unit: 'RTG-07', block: 'C1', jobsQueued: 4, status: '作业' },
      { unit: 'RTG-11', block: 'D3', jobsQueued: 2, status: '空闲' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightVehicle() {
  return {
    date: today(),
    gateInbound: [
      { gate: 'N1', lane: 'L2', queue: 14, avgWaitMin: 12, peak: false },
      { gate: 'N2', lane: 'L1', queue: 28, avgWaitMin: 22, peak: true },
      { gate: 'S1', lane: 'L1', queue: 9, avgWaitMin: 9, peak: false },
    ],
    internalTransfer: [
      { route: 'C1 → B-03', tripsDone: 86, avgTurnMin: 18, delayNote: '—' },
      { route: 'D3 → N2', tripsDone: 62, avgTurnMin: 24, delayNote: '闸口拥堵' },
    ],
    trailerPool: { available: 42, inUse: 118, maintenance: 6 },
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightExceptions() {
  return {
    date: today(),
    items: [
      {
        id: 'FD-2103',
        category: '靠泊',
        title: 'B-05 计划靠泊时间与引航艇到位偏差',
        impact: '后续 B-01 窗口压缩15 分钟',
        status: '处置中',
        owner: '泊位调度',
        openedAt: '09:12',
      },
      {
        id: 'FD-2098',
        category: '装卸',
        title: '萨法快装舱内吊具传感器告警',
        impact: '单桥效率下降约 12%',
        status: '跟进',
        owner: '装卸督导',
        openedAt: '昨天17:40',
      },
      {
        id: 'FD-2091',
        category: '堆场',
        title: 'C 区龙门吊轨道异物短时停机',
        impact: '3 条移箱指令延迟',
        status: '已恢复',
        owner: '堆场中控',
        openedAt: '昨天 11:05',
      },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightDeparture() {
  return {
    date: today(),
    clearance: [
      { vessel: '沙漠珍珠', etd: '14:20', draftOk: true, lines: '解缆中', cargoSecured: true, status: '离泊准备' },
      { vessel: '汉志之峰', etd: '15:00', draftOk: true, lines: '已解', cargoSecured: true, status: '启航' },
      { vessel: '红海之星', etd: '16:00', draftOk: true, lines: '—', cargoSecured: false, status: '装舱收尾' },
    ],
    pilotTugOut: [
      { vessel: '汉志之峰', pilot: 'P-04', tug: 'T1+T3', slot: '15:05' },
      { vessel: '沙漠珍珠', pilot: 'P-02', tug: 'T2+T5', slot: '14:25' },
    ],
    channelWindow: [
      { window: '13:30–15:00', note: '高潮窗口，优先大型船离泊' },
      { window: '18:00–19:30', note: '能见度良好，备用窗口' },
    ],
    updatedAt: new Date().toISOString(),
  }
}

export function getFreightReview() {
  return {
    date: today(),
    summary: {
      teuHandled: 7980,
      teuPlan: 8200,
      berthProductivity: 32.4,
      onTimeBerthPct: 0.91,
      avgTruckTurnMin: 19,
      openExceptions: 2,
    },
    variance: [
      { metric: '干线班轮准靠', plan: '≥92%', actual: '89%', note: '引航衔接' },
      { metric: '岸桥有效作业小时', plan: '18.5h', actual: '17.9h', note: '短时设备告警' },
      { metric: '闸口平均停留', plan: '≤20min', actual: '19min', note: '达标' },
    ],
    insights: [
      '午后闸口南翼排队上升，建议次日增加一条临时验箱通道。',
      '冷藏箱插桩 R-118 温度波动已通知船代与货主，需夜班复核。',
      'B区连续靠泊窗口偏紧，可与计划室协调将「苏丹走廊」微调 +20 分钟。',
    ],
    updatedAt: new Date().toISOString(),
  }
}
