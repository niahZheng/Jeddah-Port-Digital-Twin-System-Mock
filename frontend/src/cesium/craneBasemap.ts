import type { BasemapEntity } from '../types/basemap'

export function pickQuayCraneCode(ent: BasemapEntity): string | null {
  const fromLabel = (ent.labelText ?? '').trim().toUpperCase()
  if (/^(QC|GC)-\d{2}$/.test(fromLabel)) return fromLabel
  const m = (ent.name ?? '').toUpperCase().match(/(QC|GC)-\d{2}/)
  return m ? m[0]! : null
}

export function findQuayCraneBasemapByCode(
  entities: BasemapEntity[],
  code: string,
): BasemapEntity | null {
  const u = code.trim().toUpperCase()
  for (const e of entities) {
    if (e.kind !== 'model' || !e.visible) continue
    if (!e.glbUri?.includes('crane_harbour') && !e.glbUri?.includes('gantry_crane')) continue
    if (pickQuayCraneCode(e) === u) return e
  }
  return null
}
