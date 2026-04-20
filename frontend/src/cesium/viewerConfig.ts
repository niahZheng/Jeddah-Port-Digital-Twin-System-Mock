import {
  Cartesian3,
  Cartographic,
  Color,
  EllipsoidTerrainProvider,
  HeadingPitchRange,
  Ion,
  Math as CesiumMath,
  Matrix4,
  Terrain,
  Transforms,
  UrlTemplateImageryProvider,
  Viewer,
  createOsmBuildingsAsync,
  sampleTerrainMostDetailed,
} from 'cesium'
import type { Cesium3DTileset, Ellipsoid } from 'cesium'
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

/** OSM 3D 建筑相对地面的竖向拉伸倍数（ENU 竖轴） */
const OSM_BUILDINGS_HEIGHT_SCALE = 3

/** 半径大于此值视为全球级 tileset（如 Ion OSM Buildings），不能用 boundingSphere.center 做平移锚点 */
const OSM_GLOBAL_TILESET_RADIUS_METERS = 1_000_000

/** 刚性平移超过此值视为异常（例如误用地球尺度包围球中心），放弃平移只做局部竖向缩放 */
const OSM_MAX_BUILDING_TRANSLATION_METERS = 50_000

/** OSM 全球建筑相对地表常整体偏高；沿当地「向地心」方向微移以贴紧地面（米）。可用 VITE_OSM_BUILDINGS_SINK_M 覆盖（环境变量优先于本常量） */
const OSM_BUILDINGS_SINK_DEFAULT_M = 10

function parseOsmBuildingsSinkMeters(): number {
  const raw = import.meta.env.VITE_OSM_BUILDINGS_SINK_M
  if (raw !== undefined && String(raw).trim() !== '') {
    const n = Number(raw)
    return Number.isFinite(n) ? Math.max(0, n) : 0
  }
  return OSM_BUILDINGS_SINK_DEFAULT_M
}

/** 在锚点处沿椭球法线向地心平移 sinkMeters，再左乘到 base（ECEF 固定系） */
function sinkTilesetMatrixTowardGeocenter(
  ellipsoid: Ellipsoid,
  longitudeRad: number,
  latitudeRad: number,
  refHeightMeters: number,
  sinkMeters: number,
  base: Matrix4,
  result: Matrix4,
): Matrix4 {
  if (sinkMeters === 0) {
    return Matrix4.clone(base, result)
  }
  const anchor = Cartesian3.fromRadians(
    longitudeRad,
    latitudeRad,
    refHeightMeters,
    ellipsoid,
    new Cartesian3(),
  )
  const up = Cartesian3.normalize(anchor, new Cartesian3())
  const delta = Cartesian3.multiplyByScalar(up, -sinkMeters, new Cartesian3())
  const sink = Matrix4.fromTranslation(delta, new Matrix4())
  return Matrix4.multiply(sink, base, result)
}

/** 在 (lon,lat,h) 处建立 ENU，沿当地竖轴缩放 heightScale 倍 */
function enuHeightScaleMatrixAt(
  ellipsoid: Ellipsoid,
  longitudeRad: number,
  latitudeRad: number,
  refHeightMeters: number,
  heightScale: number,
  result: Matrix4,
): Matrix4 {
  if (heightScale === 1) {
    return Matrix4.clone(Matrix4.IDENTITY, result)
  }
  const ref = Cartesian3.fromRadians(
    longitudeRad,
    latitudeRad,
    refHeightMeters,
    ellipsoid,
    new Cartesian3(),
  )
  const enuToFixed = Transforms.eastNorthUpToFixedFrame(ref)
  const fixedToEnu = Matrix4.inverse(enuToFixed, new Matrix4())
  const scaleEnu = Matrix4.fromScale(
    new Cartesian3(1, 1, heightScale),
    new Matrix4(),
  )
  const enuScaled = Matrix4.multiply(enuToFixed, scaleEnu, new Matrix4())
  return Matrix4.multiply(enuScaled, fixedToEnu, result)
}

async function waitForGlobeHeight(
  viewer: Viewer,
  longitudeRad: number,
  latitudeRad: number,
  maxFrames: number,
): Promise<number | undefined> {
  const c = Cartographic.fromRadians(longitudeRad, latitudeRad, 0)
  for (let i = 0; i < maxFrames; i++) {
    const h = viewer.scene.globe.getHeight(c)
    if (typeof h === 'number' && Number.isFinite(h)) return h
    viewer.scene.requestRender?.()
    await new Promise<void>((r) => requestAnimationFrame(() => r()))
  }
  return undefined
}

/**
 * 将 OSM 建筑与当前场景中的地形/地表对齐，再施加竖向拉伸。
 * 须先把 tileset 加入 primitives，以便 sampleHeightMostDetailed 可排除建筑射线拾取地形。
 */
function whenTilesetInitialGeometryReady(tileset: Cesium3DTileset): Promise<void> {
  return new Promise((resolve) => {
    if (tileset.tilesLoaded) {
      resolve()
      return
    }
    const remove = tileset.initialTilesLoaded.addEventListener(() => {
      remove()
      resolve()
    })
  })
}

async function alignOsmBuildingsToTerrainThenScale(
  viewer: Viewer,
  tileset: Cesium3DTileset,
  heightScale: number,
) {
  await whenTilesetInitialGeometryReady(tileset)
  const ellipsoid = viewer.scene.globe.ellipsoid
  const bs = tileset.boundingSphere
  /** Ion OSM Buildings 等全球数据：包围球极大，center 不是港区地面点，平移会把整层模型移没 */
  const treatAsGlobal = bs.radius > OSM_GLOBAL_TILESET_RADIUS_METERS

  let lo: number
  let la: number
  let centerH: number | undefined

  if (treatAsGlobal) {
    lo = CesiumMath.toRadians(JEDDAH_LIGHTHOUSE.longitude)
    la = CesiumMath.toRadians(JEDDAH_LIGHTHOUSE.latitude)
    centerH = undefined
  } else {
    const centerCarto = Cartographic.fromCartesian(bs.center, ellipsoid, new Cartographic())
    lo = centerCarto.longitude
    la = centerCarto.latitude
    centerH = centerCarto.height
    if (!Number.isFinite(centerH)) return
  }

  let hTerrain: number | undefined

  if (viewer.scene.sampleHeightSupported) {
    const positions = [Cartographic.fromRadians(lo, la, 0, new Cartographic())]
    try {
      await viewer.scene.sampleHeightMostDetailed(positions, [tileset])
      const h = positions[0]?.height
      if (typeof h === 'number' && Number.isFinite(h)) hTerrain = h
    } catch {
      /* 地形瓦片未就绪等 */
    }
  }

  if (hTerrain === undefined) {
    hTerrain = await waitForGlobeHeight(viewer, lo, la, 120)
  }

  if (hTerrain === undefined) {
    try {
      const positions = [Cartographic.fromRadians(lo, la, 0, new Cartographic())]
      await sampleTerrainMostDetailed(viewer.scene.globe.terrainProvider, positions)
      const h = positions[0]?.height
      if (typeof h === 'number' && Number.isFinite(h)) hTerrain = h
    } catch {
      /* 椭球地形等 */
    }
  }

  const refH = typeof hTerrain === 'number' && Number.isFinite(hTerrain) ? hTerrain : 0
  const scaleM = enuHeightScaleMatrixAt(ellipsoid, lo, la, refH, heightScale, new Matrix4())
  const sinkM = parseOsmBuildingsSinkMeters()

  let base: Matrix4
  if (treatAsGlobal || centerH === undefined) {
    base = heightScale === 1 ? Matrix4.clone(Matrix4.IDENTITY, new Matrix4()) : scaleM
    tileset.modelMatrix = sinkTilesetMatrixTowardGeocenter(
      ellipsoid,
      lo,
      la,
      refH,
      sinkM,
      base,
      new Matrix4(),
    )
    return
  }

  const atCenter = Cartesian3.fromRadians(lo, la, centerH, ellipsoid, new Cartesian3())
  const atTerrain = Cartesian3.fromRadians(lo, la, refH, ellipsoid, new Cartesian3())
  const translation = Cartesian3.subtract(atTerrain, atCenter, new Cartesian3())
  const transLen = Cartesian3.magnitude(translation)
  if (transLen > OSM_MAX_BUILDING_TRANSLATION_METERS) {
    base = heightScale === 1 ? Matrix4.clone(Matrix4.IDENTITY, new Matrix4()) : scaleM
    tileset.modelMatrix = sinkTilesetMatrixTowardGeocenter(
      ellipsoid,
      lo,
      la,
      refH,
      sinkM,
      base,
      new Matrix4(),
    )
    return
  }

  const transM = Matrix4.fromTranslation(translation, new Matrix4())
  if (heightScale === 1) {
    base = transM
  } else {
    base = Matrix4.multiply(scaleM, transM, new Matrix4())
  }
  tileset.modelMatrix = sinkTilesetMatrixTowardGeocenter(
    ellipsoid,
    lo,
    la,
    refH,
    sinkM,
    base,
    new Matrix4(),
  )
}

/** 斜视灯塔：相对目标的方位角、俯仰角（-45°）、距离（米） */
const LIGHTHOUSE_ORBIT = {
  headingDegrees: 48,
  pitchDegrees: -45,
  rangeMeters: 2350,
}

type CameraViewState = {
  longitude: number
  latitude: number
  height: number
  heading: number
  pitch: number
  roll: number
}

export const DEFAULT_CAMERA_VIEW_KEY = 'jeddah-port.default-camera-view'

/**
 * 若配置了 VITE_CESIUM_ION_TOKEN 则替换为自有 Key（商用/提额）；
 * 未配置时保留 Cesium 内置评估用 Ion.defaultAccessToken，可直接使用 World Terrain 与 Ion 影像。
 */
export function configureIonFromEnv() {
  const token = import.meta.env.VITE_CESIUM_ION_TOKEN
  if (token) Ion.defaultAccessToken = token
}

/**
 * 地形：默认椭球（无起伏）；需要全球高程时设环境变量 VITE_TERRAIN_MODE=world（依赖 Ion）。
 */
export function terrainModeFromEnv(): TerrainMode {
  return import.meta.env.VITE_TERRAIN_MODE === 'world' ? 'world' : 'ellipsoid'
}

/**
 * 底图：默认 OSM；部分网络下 tile.openstreetmap.org 会返回非 PNG（如 HTML），导致解码失败。
 * 可设 VITE_BASEMAP=carto 使用 CARTO 栅格（仍基于 OSM 数据，需标注 © OSM © CARTO）。
 */
export function applyConfiguredBasemap(viewer: Viewer): void {
  const mode = (import.meta.env.VITE_BASEMAP ?? 'osm').toLowerCase()
  if (mode === 'carto') {
    viewer.imageryLayers.removeAll()
    viewer.imageryLayers.addImageryProvider(
      new UrlTemplateImageryProvider({
        url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        minimumLevel: 0,
        maximumLevel: 20,
        credit: '© OpenStreetMap contributors © CARTO',
      }),
    )
    return
  }
  applyOsmStreetBasemap(viewer)
}

/** 以约 45° 俯角斜视吉达灯塔，并解除 lookAt 参考系（相机位置留在世界坐标系） */
export function flyToJeddahLighthouse(viewer: Viewer, defaultView?: CameraViewState | null) {
  if (defaultView) {
    applyCameraView(viewer, defaultView)
    return
  }

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

export function captureCameraView(viewer: Viewer): CameraViewState | null {
  const cartographic = Cartographic.fromCartesian(viewer.camera.positionWC)
  if (!cartographic) return null

  return {
    longitude: CesiumMath.toDegrees(cartographic.longitude),
    latitude: CesiumMath.toDegrees(cartographic.latitude),
    height: cartographic.height,
    heading: viewer.camera.heading,
    pitch: viewer.camera.pitch,
    roll: viewer.camera.roll,
  }
}

export function applyCameraView(viewer: Viewer, view: CameraViewState) {
  viewer.camera.flyTo({
    destination: Cartesian3.fromDegrees(view.longitude, view.latitude, view.height),
    orientation: {
      heading: view.heading,
      pitch: view.pitch,
      roll: view.roll,
    },
    duration: 0,
  })
}

export function terrainFromMode(mode: TerrainMode, options?: any): Terrain {
  return mode === 'world'
    ? Terrain.fromWorldTerrain(options)
    : new Terrain(Promise.resolve(new EllipsoidTerrainProvider()))
}

/** 创建 Viewer；影像由 {@link applyConfiguredBasemap} 设置 */
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
export async function applyCesiumGeographicModel(viewer: Viewer): Promise<Cesium3DTileset> {
  // 加载Cesium Ion的3D建筑物图层（更详细的3D模型）
  const osmBuildings = await createOsmBuildingsAsync()
  viewer.scene.primitives.add(osmBuildings)
  await alignOsmBuildingsToTerrainThenScale(viewer, osmBuildings, OSM_BUILDINGS_HEIGHT_SCALE)

  // 确保底图仍然是街道图
  if (viewer.imageryLayers.length === 0) {
    applyOsmStreetBasemap(viewer)
  }

  // 确保大海颜色保持为原始颜色
  viewer.scene.globe.baseColor = Color.fromCssColorString('#1a3a52')

  return osmBuildings
}

/** 已加载的 OSM tileset 按当前下沉/缩放常量重新计算 modelMatrix（供开发 HMR 或运行时调试） */
export async function realignOsmBuildingsTileset(
  viewer: Viewer,
  tileset: Cesium3DTileset,
): Promise<void> {
  await alignOsmBuildingsToTerrainThenScale(viewer, tileset, OSM_BUILDINGS_HEIGHT_SCALE)
}
