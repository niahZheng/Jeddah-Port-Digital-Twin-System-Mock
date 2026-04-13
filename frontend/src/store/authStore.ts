import { create } from 'zustand'
import { fetchMe, loginApi } from '../api/client'
import type { AuthUser } from '../types/auth'

const STORAGE_KEY = 'jeddah-port-token'

type AuthState = {
  token: string | null
  user: AuthUser | null
  navItems: string[]
  hydrated: boolean
  hydrate: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  navItems: [],
  hydrated: false,
  hydrate: async () => {
    const token = localStorage.getItem(STORAGE_KEY)
    if (!token) {
      set({ hydrated: true })
      return
    }
    try {
      const me = await fetchMe(token)
      set({
        token,
        user: me.user,
        navItems: me.navItems,
        hydrated: true,
      })
    } catch {
      localStorage.removeItem(STORAGE_KEY)
      set({
        token: null,
        user: null,
        navItems: [],
        hydrated: true,
      })
    }
  },
  login: async (username, password) => {
    const res = await loginApi(username, password)
    localStorage.setItem(STORAGE_KEY, res.token)
    set({
      token: res.token,
      user: res.user,
      navItems: res.navItems,
    })
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ token: null, user: null, navItems: [] })
  },
}))
