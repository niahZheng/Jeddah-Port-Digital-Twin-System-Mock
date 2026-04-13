import { useEffect, useMemo, useState } from 'react'
import { fetchDirectorOverview, subscribePortSocket } from '../../../api/client'
import type { DirectorOverview, DirectorOverviewKpiLive } from '../../../types/director'

export function useDirectorOverviewData() {
  const [data, setData] = useState<DirectorOverview | null>(null)
  const [live, setLive] = useState<DirectorOverviewKpiLive | null>(null)
  const [wsOn, setWsOn] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void fetchDirectorOverview()
      .then((d) => {
        setData(d)
        setErr(null)
      })
      .catch(() => setErr('无法加载全景数据（请确认后端已启动）'))
  }, [])

  useEffect(() => {
    return subscribePortSocket(
      (msg) => {
        if (msg.type === 'director_overview_update') {
          setLive(msg.payload as DirectorOverviewKpiLive)
        }
      },
      () => setWsOn(true),
      () => setWsOn(false),
    )
  }, [])

  const kpis = data?.kpis
  const cargo = live?.cargoThroughputTeu ?? kpis?.cargoThroughputTeu
  const pax = live?.passengerDispatch ?? kpis?.passengerDispatch
  const planRate = live?.shipPlanCompletionRate ?? kpis?.shipPlanCompletionRate
  const ex = live?.criticalExceptionCount ?? kpis?.criticalExceptionCount

  const trend = data?.hourlyTrend
  const maxCargo = useMemo(
    () => (trend?.cargoTeu.length ? Math.max(...trend.cargoTeu) : 1),
    [trend],
  )
  const maxPax = useMemo(
    () => (trend?.passenger.length ? Math.max(...trend.passenger) : 1),
    [trend],
  )

  return {
    data,
    live,
    wsOn,
    err,
    cargo,
    pax,
    planRate,
    ex,
    trend,
    maxCargo,
    maxPax,
  }
}
