/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CESIUM_ION_TOKEN?: string
  /** world | ellipsoid */
  readonly VITE_TERRAIN_MODE?: string
  /** osm | carto */
  readonly VITE_BASEMAP?: string
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
