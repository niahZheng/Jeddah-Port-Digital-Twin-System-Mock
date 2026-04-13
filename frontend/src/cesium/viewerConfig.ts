import {
  Cartesian3,
  Color,
  EllipsoidTerrainProvider,
  HeadingPitchRange,
  Ion,
  Math as CesiumMath,
  Matrix4,
  Terrain,
  UrlTemplateImageryProvider,
  Viewer,
  createOsmBuildingsAsync,
} from 'cesium'
import type { TerrainMode } from '../types/terrain'

/**
 * 吉达港灯塔（Jeddah Light）— 维基坐标约 21.4687°N, 39.1497°E
 * @see https://en.wikipedia.org/wiki/Jeddah_Light
 */
export const JEDDAH_LIGHTHOUSE = {
  longitude: 39.1497,
  latitude: 21.4687,
  /** 构图用参考高度（米），取塔高约131m 的中上段 */
  lookAtHeightMeters: 95,
}

/** 斜视灯塔：相对目标的方位角、俯仰角（-45°）、距离（米） */
const LIGHTHOUSE_ORBIT = {
  headingDegrees: 48,
  pitchDegrees: -45,
  rangeMeters: 2350,
}

/**
 * 若配置了 VITE_CESIUM_ION_TOKEN 则替换为自有 Key（商用/提额）；
 * 未配置时保留 Cesium 内置评估用 Ion.defaultAccessToken，可直接使用 World Terrain 与 Ion 影像。
 */
export function configureIonFromEnv() {
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN
  if (token) Ion.defaultAccessToken = token
}

/** 以约 45° 俯角斜视吉达灯塔，并解除 lookAt 参考系（相机位置留在世界坐标系） */
export function flyToJeddahLighthouse(viewer: Viewer) {
  const { longitude, latitude, lookAtHeightMeters } = JEDDAH_LIGHTHOUSE
  const target = Cartesian3.fromDegrees(longitude, latitude, lookAtHeightMeters)
  const heading = CesiumMath.toRadians(LIGHTHOUSE_ORBIT.headingDegrees)
  const pitch = CesiumMath.toRadians(LIGHTHOUSE_ORBIT.pitchDegrees)
  const range = LIGHTHOUSE_ORBIT.rangeMeters
  viewer.camera.lookAt(target, new HeadingPitchRange(heading, pitch, range))
  viewer.camera.lookAtTransform(Matrix4.IDENTITY)
}

/** Home 按钮恢复灯塔斜视 */
export function bindHomeToLighthouse(viewer: Viewer) {
  const cmd = viewer.homeButton.viewModel.command
  cmd.beforeExecute.addEventListener((evt) => {
    evt.cancel = true
    flyToJeddahLighthouse(viewer)
  })
  viewer.homeButton.viewModel.tooltip = '恢复吉达灯塔斜视'
}

export function terrainFromMode(mode: TerrainMode, options?: any): Terrain {
  return mode === 'world'
    ? Terrain.fromWorldTerrain(options)
    : new Terrain(Promise.resolve(new EllipsoidTerrainProvider()))
}

/** 创建 Viewer；影像由 {@link applyOsmStreetBasemap} 设置 */
export function createViewer(
  container: HTMLElement,
  terrainMode: TerrainMode,
): Viewer {
  const viewer = new Viewer(container, {
    animation: false,
    timeline: false,
    baseLayerPicker: false,
    geocoder: false,
    homeButton: true,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    vrButton: false,
    infoBox: false,
    selectionIndicator: false,
    terrain: terrainFromMode(terrainMode),
    baseLayer: false,
  })

  viewer.scene.globe.baseColor = Color.fromCssColorString('#1a3a52')
  return viewer
}

/** OpenStreetMap 街道栅格（默认底图） */
export function applyOsmStreetBasemap(viewer: Viewer): void {
  viewer.imageryLayers.removeAll()
  viewer.imageryLayers.addImageryProvider(
    new UrlTemplateImageryProvider({
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      minimumLevel: 0,
      maximumLevel: 19,
      credit: '© OpenStreetMap contributors',
    }),
  )
}

/** 启用 Cesium 地理3D模型（建筑物等） */
export async function applyCesiumGeographicModel(viewer: Viewer): Promise<any> {
  // 加载Cesium Ion的3D建筑物图层（更详细的3D模型）
  const osmBuildings = await createOsmBuildingsAsync()
  viewer.scene.primitives.add(osmBuildings)

  // 确保底图仍然是街道图
  if (viewer.imageryLayers.length === 0) {
    applyOsmStreetBasemap(viewer)
  }

  // 确保大海颜色保持为原始颜色
  viewer.scene.globe.baseColor = Color.fromCssColorString('#1a3a52')

  return osmBuildings
}
