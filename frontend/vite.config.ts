import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import cesium from 'vite-plugin-cesium'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * npm workspaces 常把 cesium 装到仓库根 `../node_modules`。
 * 插件默认 `frontend/node_modules/cesium/Build` 不存在时，/cesium/Assets/* 会落到 SPA 的 index.html，
 * 导致 ApproximateTerrainHeights / IAU2006 等 JSON.parse 收到 `<!doctype`。
 */
function resolveCesiumBuildDirs(): { buildRoot: string; publishDir: string } {
  const candidates = [
    path.join(__dirname, '..', 'node_modules', 'cesium', 'Build'),
    path.join(__dirname, 'node_modules', 'cesium', 'Build'),
  ]
  for (const buildRoot of candidates) {
    if (fs.existsSync(path.join(buildRoot, 'CesiumUnminified'))) {
      return {
        buildRoot,
        publishDir: path.join(buildRoot, 'Cesium'),
      }
    }
  }
  return {
    buildRoot: candidates[0],
    publishDir: path.join(candidates[0], 'Cesium'),
  }
}

const { buildRoot: cesiumBuildRootPath, publishDir: cesiumBuildPath } = resolveCesiumBuildDirs()

const apiProxy = {
  '/api': { target: 'http://localhost:3001', changeOrigin: true },
  '/ws': { target: 'ws://localhost:3001', ws: true },
} as const

export default defineConfig({
  plugins: [
    react(),
    cesium({
      cesiumBuildRootPath,
      cesiumBuildPath: `${cesiumBuildPath}${path.sep}`,
    }),
  ],
  server: {
    port: 5173,
    proxy: { ...apiProxy },
  },
  /** 与 dev 一致：preview 时 /api、/ws 仍转发到后端，避免 /api 命中 SPA 返回 HTML 被当成 JSON */
  preview: {
    port: 4173,
    proxy: { ...apiProxy },
  },
})
