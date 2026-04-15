import {
  DirectorPageShell,
  DirectorSection,
  KpiCard,
} from '../../director/DirectorPrimitives'

type PassengerPage =
  | 'prep'
  | 'flow'
  | 'checkin'
  | 'boarding'
  | 'exceptions'
  | 'service'
  | 'review'

const PAGE_KEY_BY_TYPE: Record<PassengerPage, string> = {
  prep: 'pd_prep',
  flow: 'pd_flow',
  checkin: 'pd_checkin',
  boarding: 'pd_boarding',
  exceptions: 'pd_exceptions',
  service: 'pd_service',
  review: 'pd_review',
}

const basePlanRows = [
  { route: '吉达-延布', voyage: 'PAX-1201', time: '07:30', sold: '1,240', gate: 'A1-A2', status: '准点' },
  { route: '吉达-苏伊士', voyage: 'PAX-2330', time: '10:10', sold: '980', gate: 'B1', status: '准点' },
  { route: '吉达-亚喀巴', voyage: 'PAX-3108', time: '13:40', sold: '1,460', gate: 'A3-A4', status: '高峰' },
  { route: '吉达-塞法杰', voyage: 'PAX-1882', time: '17:20', sold: '1,120', gate: 'B2', status: '预警' },
]

const pageSpec: Record<
  PassengerPage,
  {
    title: string
    subtitle: string
    focus: string[]
    actions: string[]
    metrics: { label: string; value: string; hint: string }[]
  }
> = {
  prep: {
    title: '客轮调度准备',
    subtitle:
      '对接客轮负责人确认到港时间、船舶状态、载客容量，联动泊位与检票口开放计划，并同步旅客展示端信息。',
    focus: ['客轮到港窗口偏差超 15 分钟需即时广播', '热门航线在班前完成检票口冗余预案'],
    actions: [
      '核对班次、载客容量与售票量匹配度，提前识别超售风险。',
      '根据到港动态分配客运泊位与检票口数量。',
      '将延误/提前信息同步到客运站显示屏与旅客服务平台。',
    ],
    metrics: [
      { label: '今日客轮计划', value: '16 班次', hint: '含 2 班高峰加开' },
      { label: '预计发送旅客', value: '9,840 人', hint: '售票率 92%' },
      { label: '已确认到港', value: '11 班次', hint: '其余待船方确认' },
      { label: '可用检票口', value: '8 个', hint: 'A/B 区可切换' },
    ],
  },
  flow: {
    title: '客流疏导调度',
    subtitle:
      '实时监控候车区和检票口客流，在高峰时段调度服务人员到重点区域，保障旅客有序排队与通行。',
    focus: ['13:00-15:00 候车区 B 客流增速明显', '节假日策略：检票口前置分流 + 广播节拍引导'],
    actions: [
      '按分区热度动态投放疏导人员，优先处理拥堵节点。',
      '对老人、亲子、团队旅客设置专线引导。',
      '当排队长度超阈值时，触发临时分流通道展示预案。',
    ],
    metrics: [
      { label: '候车区人数', value: '2,180 人', hint: 'B 区占比 46%' },
      { label: '平均排队时长', value: '8.6 分钟', hint: '目标 <= 10 分钟' },
      { label: '在岗疏导人员', value: '34 人', hint: '重点区已增援 6 人' },
      { label: '拥堵预警点', value: '2 处', hint: '均已处置中' },
    ],
  },
  checkin: {
    title: '旅客检票调度',
    subtitle:
      '按客轮到发计划提前开放检票口，保障车票与身份核验效率，针对误点旅客提供快速登船协同。',
    focus: ['高峰班次提前 35 分钟开放检票口', '误点旅客通过人工核验通道快速放行'],
    actions: [
      '按照班次计划动态开启检票口，平衡各口负载。',
      '核验票证一致性，异常票据转入异常台账展示。',
      '对误点旅客进行班次衔接提示，减少误乘。',
    ],
    metrics: [
      { label: '开放检票口', value: '6 个', hint: 'A 区 4 / B 区 2' },
      { label: '检票通过率', value: '98.7%', hint: '异常票据 1.3%' },
      { label: '平均检票时长', value: '5.2 秒/人', hint: '效率良好' },
      { label: '误点旅客协同', value: '41 人次', hint: '全部完成引导' },
    ],
  },
  boarding: {
    title: '客轮登船调度',
    subtitle:
      '检票后引导旅客分批前往泊位登船，协同客轮工作人员完成人数核对，确保登船安全顺畅。',
    focus: ['泊位 B2 登船高峰时段需双向分流', '重点关注老幼旅客上下引桥安全'],
    actions: [
      '按舱位分批引导旅客登船，减少桥面拥堵。',
      '同步核对登船人数与舱单，确保无遗漏。',
      '根据现场节奏动态调整广播与引导人员位置。',
    ],
    metrics: [
      { label: '待登船旅客', value: '1,260 人', hint: '主要集中 B2 航线' },
      { label: '当前登船效率', value: '214 人/10分钟', hint: '处于正常区间' },
      { label: '安全提示频次', value: '每 8 分钟', hint: '自动广播策略' },
      { label: '未核销名单', value: '17 人', hint: '已通知检票口复核' },
    ],
  },
  exceptions: {
    title: '业务异常处理',
    subtitle:
      '针对客轮延误、检票异常、现场拥堵等情况进行分级响应，联动广播与客服统一口径，减少旅客焦虑。',
    focus: ['客轮延误信息 5 分钟内完成双通道公告', '异常闭环需记录原因与处置时长'],
    actions: [
      '对延误班次发布原因说明与预计恢复时间。',
      '将异常工单分配至检票、疏导、客服责任组。',
      '输出旅客安抚话术与后续班次衔接信息。',
    ],
    metrics: [
      { label: '当日异常工单', value: '7 件', hint: '已闭环 5 件' },
      { label: '平均响应时长', value: '6 分钟', hint: '目标 <= 8 分钟' },
      { label: '延误班次', value: '2 班次', hint: '均已公告' },
      { label: '旅客咨询峰值', value: '73 次/小时', hint: '客服席位已加开' },
    ],
  },
  service: {
    title: '客运服务管控',
    subtitle:
      '关注班次咨询、旅客投诉与站内设施运行状态，确保服务人员及时响应并持续优化出行体验。',
    focus: ['候车区设施巡检每 60 分钟一次', '投诉类事件优先 15 分钟内回访'],
    actions: [
      '集中展示咨询热点与服务压力分布。',
      '跟踪投诉处理进度并同步责任班组。',
      '监控候车座椅、卫生间等设施可用性状态。',
    ],
    metrics: [
      { label: '实时咨询队列', value: '23 条', hint: '班次查询占比 61%' },
      { label: '服务满意度', value: '94.2%', hint: '近 7 日均值' },
      { label: '待处理投诉', value: '3 条', hint: '均处于 1 级响应' },
      { label: '设施可用率', value: '97.8%', hint: '卫生间 1 处维修中' },
    ],
  },
  review: {
    title: '业务复盘',
    subtitle:
      '汇总当日发送旅客、客轮准点率、投诉情况，对比计划与执行偏差，形成次日调度优化建议。',
    focus: ['晚高峰 B 区分流策略显著降低排队时长', '热门航线需继续提升前置广播覆盖'],
    actions: [
      '复核业务计划与实际执行差异并形成复盘要点。',
      '统计客流峰值时段、准点率与投诉分布。',
      '输出次日班前重点关注与资源建议。',
    ],
    metrics: [
      { label: '发送旅客人数', value: '9,412 人', hint: '达成率 95.6%' },
      { label: '客轮准点率', value: '90.8%', hint: '较昨日 +1.3%' },
      { label: '旅客投诉量', value: '11 条', hint: '服务态度类下降' },
      { label: '次日优化项', value: '5 条', hint: '已上报运营总监' },
    ],
  },
}

function PlanTable() {
  return (
    <div className="director-table-wrap">
      <table className="director-table">
        <thead>
          <tr>
            <th>航线</th>
            <th>班次</th>
            <th>到发时间</th>
            <th>售票人数</th>
            <th>检票口</th>
            <th>状态</th>
          </tr>
        </thead>
        <tbody>
          {basePlanRows.map((row) => (
            <tr key={row.voyage}>
              <td>{row.route}</td>
              <td>{row.voyage}</td>
              <td>{row.time}</td>
              <td>{row.sold}</td>
              <td>{row.gate}</td>
              <td>{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PassengerBoardingPanel(props: { page: PassengerPage }) {
  const spec = pageSpec[props.page]
  const layoutSpec = {
    pageKey: PAGE_KEY_BY_TYPE[props.page],
    defaultColumns: 2,
    items: [
      { widgetId: 'pd_kpi', defaultColSpan: 2 },
      { widgetId: 'pd_plan', defaultColSpan: 1 },
      { widgetId: 'pd_focus', defaultColSpan: 1 },
      { widgetId: 'pd_desc', defaultColSpan: 2 },
    ],
  } as const

  return (
    <DirectorPageShell
      title={spec.title}
      subtitle={spec.subtitle}
      sourceNote={`演示数据日期 ${new Date().toISOString().slice(0, 10)} · 仅展示版`}
      layoutSpec={layoutSpec}
    >
      <DirectorSection widgetId="pd_kpi" span="full" title="关键指标">
        <div className="director-kpi-row">
          {spec.metrics.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.value} hint={m.hint} accent />
          ))}
        </div>
      </DirectorSection>

      <DirectorSection widgetId="pd_plan" title="当日班次与检票计划">
        <PlanTable />
      </DirectorSection>

      <DirectorSection widgetId="pd_focus" title="调度重点">
        <ul className="director-insights">
          {spec.focus.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </DirectorSection>

      <DirectorSection widgetId="pd_desc" span="full" title="页面业务说明（展示）">
        <ul className="director-insights">
          {spec.actions.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </DirectorSection>
    </DirectorPageShell>
  )
}
