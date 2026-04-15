/** 与数据库 `roles.key` 一致 */
export const ROLE_KEYS = {
  PORT_DIRECTOR: 'port_director',
  FREIGHT_DISPATCHER: 'freight_dispatcher',
  PASSENGER_DISPATCHER: 'passenger_dispatcher',
  OPS_ENGINEER: 'ops_engineer',
} as const

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS]

export function navItemsForRoleKey(roleKey: string): string[] {
  switch (roleKey) {
    case ROLE_KEYS.PORT_DIRECTOR:
      return [
        '首页',
        '货运',
        '客运',
        '资源统筹',
        '异常响应',
        '业务决策',
        '业务总结',
      ]
    case ROLE_KEYS.FREIGHT_DISPATCHER:
      return [
        '首页',
        '船舶靠泊调度',
        '货物装卸调度',
        '堆场管理调度',
        '车辆转运调度',
        '业务异常处理',
        '船舶离泊调度',
        '业务复盘',
      ]
    case ROLE_KEYS.PASSENGER_DISPATCHER:
      return [
        '首页',
        '客轮调度准备',
        '客流疏导调度',
        '旅客检票调度',
        '客轮登船调度',
        '业务异常处理',
        '客运服务管控',
        '业务复盘',
      ]
    case ROLE_KEYS.OPS_ENGINEER:
      return [
        '首页',
        '设备日常巡检',
        '故障响应处理',
        '设备维护保养',
        '业务协同配合',
        '设备状态更新',
        '运维复盘',
      ]
    default:
      return []
  }
}
