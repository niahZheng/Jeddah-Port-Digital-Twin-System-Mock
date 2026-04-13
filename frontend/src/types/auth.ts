export type AuthRole = { key: string; name: string }

export type AuthUser = {
  id: number
  username: string
  role: AuthRole
}

export type LoginResponse = {
  token: string
  user: AuthUser
  navItems: string[]
}

export type MeResponse = {
  user: AuthUser
  navItems: string[]
}
