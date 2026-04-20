/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string
  /** 设 world 启用 Ion 全球地形；不设则椭球无起伏 */
  readonly VITE_TERRAIN_MODE?: string
  /** osm | carto */
  readonly VITE_BASEMAP?: string
  /** OSM 3D 建筑沿当地向地心下沉的米数；不设时默认约 10m（椭球与 world 相同） */
  readonly VITE_OSM_BUILDINGS_SINK_M?: string
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
