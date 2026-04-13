import { useEffect, useState } from 'react'
import { fetchFreightOverview } from '../../../api/client'
import type { FreightDispatcherOverview } from '../../../types/freightDispatcher'

export function useFreightDispatcherOverviewData() {
  const [data, setData] = useState<FreightDispatcherOverview | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void fetchFreightOverview()
      .then((d) => {
        setData(d)
        setErr(null)
      })
      .catch(() => setErr('无法加载业务准备数据（请确认后端已启动）'))
  }, [])

  return { data, err }
}
