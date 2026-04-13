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
        '业务准备',
        '客轮调度',
        '客流疏导调度',
        '旅客检票调度',
        '客轮登船调度',
        '客轮离港调度',
        '客运服务管控',
        '业务复盘',
      ]
    default:
      return []
  }
}
