import {
  DirectorPageShell,
  DirectorSection,
  KpiCard,
} from '../../director/DirectorPrimitives'

type OpsPage =
  | 'inspection'
  | 'fault'
  | 'maintenance'
  | 'collaboration'
  | 'status'
  | 'review'

const PAGE_KEY_BY_TYPE: Record<OpsPage, string> = {
  inspection: 'oe_inspection',
  fault: 'oe_fault',
  maintenance: 'oe_maintenance',
  collaboration: 'oe_collaboration',
  status: 'oe_status',
  review: 'oe_review',
}

const equipmentRows = [
  { area: '货运区', device: '岸桥 QC-12', status: '正常', last: '09:20', note: '液压温度稳定' },
  { area: '货运区', device: '场桥 RTG-07', status: '轻微异常', last: '10:05', note: '运行异响，已处理' },
  { area: '客运区', device: '检票闸机 G-18', status: '正常', last: '10:12', note: '高峰通行正常' },
  { area: '客运区', device: '电梯 E-03', status: '保养中', last: '09:40', note: '润滑与联锁检查' },
  { area: '公用区', device: '航道照明 L-21', status: '正常', last: '08:50', note: '夜航回路已复核' },
]

const specByPage: Record<
  OpsPage,
  {
    title: string
    subtitle: string
    focus: string[]
    details: string[]
    metrics: { label: string; value: string; hint: string }[]
  }
> = {
  inspection: {
    title: '设备日常巡检',
    subtitle:
      '按巡检计划覆盖货运、客运、公用设备，记录运行状态并对轻微异常进行现场处置，防止问题扩大。',
    focus: ['重点检查高频设备声音/参数/外观完好度', '轻微异常现场处理后立即更新记录'],
    details: [
      '执行巡检清单并记录“正常/异常”结果。',
      '对轻微异响、参数轻微波动进行即时处置并复测。',
      '将异常设备纳入后续维护计划，避免重复故障。',
    ],
    metrics: [
      { label: '计划巡检设备', value: '154 台', hint: '已完成 96 台' },
      { label: '异常发现数', value: '11 项', hint: '轻微异常占 73%' },
      { label: '现场即时处理', value: '8 项', hint: '其余转维护计划' },
      { label: '巡检覆盖率', value: '62.3%', hint: '午后继续推进' },
    ],
  },
  fault: {
    title: '故障响应处理',
    subtitle:
      '接收货运/客运调度及系统告警后快速到场，定位原因并执行维修，优先恢复核心业务设备运行。',
    focus: ['优先保障岸桥、检票闸机等核心设备恢复', '故障处理过程同步影响范围与恢复进度'],
    details: [
      '接收告警并查看设备、位置、故障现象和业务影响。',
      '赶赴现场排查根因，制定并执行快速修复方案。',
      '完成修复后回填处理结果并确认业务恢复。',
    ],
    metrics: [
      { label: '当日故障告警', value: '9 起', hint: '核心设备 3 起' },
      { label: '平均到场时长', value: '7 分钟', hint: '目标 <= 10 分钟' },
      { label: '平均修复时长', value: '26 分钟', hint: '核心设备优先' },
      { label: '已恢复设备', value: '8 台', hint: '1 台待备件' },
    ],
  },
  maintenance: {
    title: '设备维护保养',
    subtitle:
      '执行定期保养任务（清洁、润滑、零件更换），优先覆盖高频与易损设备，延长设备生命周期。',
    focus: ['高频设备按班次窗口错峰维护', '易损部件更换后进行联动复测'],
    details: [
      '根据计划对设备进行清洁、润滑和部件更换。',
      '记录维护时间、维护人员和维护内容。',
      '保养后进行空载/负载试运行确认状态稳定。',
    ],
    metrics: [
      { label: '计划保养设备', value: '27 台', hint: '已完成 15 台' },
      { label: '关键部件更换', value: '42 件', hint: '以轴承/传感器为主' },
      { label: '高频设备覆盖', value: '88%', hint: '目标 >= 90%' },
      { label: '保养合格率', value: '100%', hint: '当前无返修' },
    ],
  },
  collaboration: {
    title: '业务协同配合',
    subtitle:
      '在巡检、维修、保养过程中与货运调度、客运调度协同，降低设备作业对业务组织的影响。',
    focus: ['故障设备停用窗口提前告知调度', '维护时间与业务低峰时段对齐'],
    details: [
      '向调度侧同步设备可用状态与恢复时间预估。',
      '协同调整设备使用计划，规避作业冲突。',
      '输出替代设备建议，保障关键业务连续性。',
    ],
    metrics: [
      { label: '协同通知次数', value: '23 次', hint: '货运 14 / 客运 9' },
      { label: '业务冲突避免', value: '6 起', hint: '均提前调整' },
      { label: '计划外停机', value: '1 起', hint: '较昨日下降' },
      { label: '替代方案执行', value: '4 次', hint: '已闭环' },
    ],
  },
  status: {
    title: '设备状态更新',
    subtitle:
      '实时更新设备运行状态、故障处理结果和保养记录，为运营总监及调度角色提供统一设备视图。',
    focus: ['状态更新延迟控制在 3 分钟内', '无法快速修复设备需即时上报并给出替代方案'],
    details: [
      '更新设备状态与故障处理进展到系统。',
      '同步维护记录与设备可用性标签。',
      '对长时间不可用设备提交上报与替代建议。',
    ],
    metrics: [
      { label: '状态更新条目', value: '187 条', hint: '自动+人工汇总' },
      { label: '平均更新时间', value: '2.4 分钟', hint: '满足目标' },
      { label: '长停设备上报', value: '2 台', hint: '均已提交替代方案' },
      { label: '多角色可见率', value: '100%', hint: '总监/调度同步可查' },
    ],
  },
  review: {
    title: '运维复盘',
    subtitle:
      '汇总当日巡检、故障处理、维护保养数据，分析高发环节并制定次日运维计划与优化措施。',
    focus: ['故障高发环节集中在高峰时段检票设备', '场桥易损件寿命需纳入提前更换策略'],
    details: [
      '统计巡检数量、故障效率和保养完成度。',
      '分析故障根因与设备薄弱环节，输出优化措施。',
      '形成次日运维计划并上报运营总监。',
    ],
    metrics: [
      { label: '巡检设备数量', value: '154 台', hint: '完成率 98%' },
      { label: '故障闭环效率', value: '88.9%', hint: '4 小时内闭环' },
      { label: '保养设备数量', value: '27 台', hint: '达成率 100%' },
      { label: '次日重点事项', value: '6 项', hint: '已形成计划' },
    ],
  },
}

function EquipmentTable() {
  return (
    <div className="director-table-wrap">
      <table className="director-table">
        <thead>
          <tr>
            <th>区域</th>
            <th>设备</th>
            <th>状态</th>
            <th>最近记录</th>
            <th>备注</th>
          </tr>
        </thead>
        <tbody>
          {equipmentRows.map((r) => (
            <tr key={`${r.area}-${r.device}`}>
              <td>{r.area}</td>
              <td>{r.device}</td>
              <td>{r.status}</td>
              <td>{r.last}</td>
              <td>{r.note}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function OpsEngineerPanel(props: { page: OpsPage }) {
  const spec = specByPage[props.page]
  const layoutSpec = {
    pageKey: PAGE_KEY_BY_TYPE[props.page],
    defaultColumns: 2,
    items: [
      { widgetId: 'oe_kpi', defaultColSpan: 2 },
      { widgetId: 'oe_table', defaultColSpan: 1 },
      { widgetId: 'oe_focus', defaultColSpan: 1 },
      { widgetId: 'oe_detail', defaultColSpan: 2 },
    ],
  } as const

  return (
    <DirectorPageShell
      title={spec.title}
      subtitle={spec.subtitle}
      sourceNote={`演示数据日期 ${new Date().toISOString().slice(0, 10)} · 仅展示版`}
      layoutSpec={layoutSpec}
    >
      <DirectorSection widgetId="oe_kpi" span="full" title="关键指标">
        <div className="director-kpi-row">
          {spec.metrics.map((m) => (
            <KpiCard key={m.label} label={m.label} value={m.value} hint={m.hint} accent />
          ))}
        </div>
      </DirectorSection>
      <DirectorSection widgetId="oe_table" title="设备巡检/维护清单">
        <EquipmentTable />
      </DirectorSection>
      <DirectorSection widgetId="oe_focus" title="当日运维重点">
        <ul className="director-insights">
          {spec.focus.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </DirectorSection>
      <DirectorSection widgetId="oe_detail" span="full" title="页面业务说明（展示）">
        <ul className="director-insights">
          {spec.details.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </DirectorSection>
    </DirectorPageShell>
  )
}
