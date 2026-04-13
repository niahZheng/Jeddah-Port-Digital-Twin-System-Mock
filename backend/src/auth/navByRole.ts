/** 与数据库 `roles.key` 一致 */
export const ROLE_KEYS = {
  PORT_DIRECTOR: 'port_director',
  FREIGHT_DISPATCHER: 'freight_dispatcher',
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
    default:
      return []
  }
}
