/**
 * 地形底座（对应方案文档 §6.1）
 * - world: Cesium World Terrain（Ion，需网络；未配置 env 时使用库内置评估 Token）
 * - ellipsoid: 椭球，无高程起伏，适合离线或调试
 */
export type TerrainMode = 'world' | 'ellipsoid'
