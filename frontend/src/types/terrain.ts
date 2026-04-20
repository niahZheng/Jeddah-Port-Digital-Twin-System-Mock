/**
 * 地形底座
 * - ellipsoid: 椭球，无高程起伏（当前默认）
 * - world: Cesium World Terrain（Ion，需网络；设 VITE_TERRAIN_MODE=world）
 */
export type TerrainMode = 'world' | 'ellipsoid'
