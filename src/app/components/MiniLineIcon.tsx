import React, { useMemo } from 'react'
import { Line } from '@/types/metro'
import { stationByIdMap, getConnectionById } from '@/data/topologyService'
import * as d3 from 'd3'
import { lineColours } from '@/data/lineColours'
import { cn } from '@/lib/utils'

interface MiniLineIconProps {
  line: Line
  className?: string
  strokeWidth?: number
  color?: string
}

export const MiniLineIcon = ({
  line,
  className,
  strokeWidth = 2,
  color,
}: MiniLineIconProps) => {
  const { pathData, viewBox } = useMemo(() => {
    const points: [number, number][] = []

    for (let i = 0; i < line.stationIds.length; i++) {
      const stationId = line.stationIds[i]
      const station = stationByIdMap.get(stationId)
      if (!station) continue
      
      points.push([station.xMetro, station.yMetro])

      if (i < line.stationIds.length - 1) {
        const nextStationId = line.stationIds[i + 1]
        
        const connectionId = line.connectionIds.find(cid => {
          const conn = getConnectionById(cid)
          if (!conn) return false
          return (conn.stations.from === stationId && conn.stations.to === nextStationId) ||
                 (conn.stations.to === stationId && conn.stations.from === nextStationId)
        })

        if (connectionId) {
          const conn = getConnectionById(connectionId)
          if (conn && conn.midpoints) {
            if (conn.stations.from === stationId && conn.stations.to === nextStationId) {
              conn.midpoints.forEach(mp => points.push([mp.x, mp.y]))
            } else {
              [...conn.midpoints].reverse().forEach(mp => points.push([mp.x, mp.y]))
            }
          }
        }
      }
    }

    if (points.length < 2) {
      return { pathData: '', viewBox: '0 0 100 100' }
    }

    const xValues = points.map((p) => p[0])
    const yValues = points.map((p) => p[1])
    const minX = Math.min(...xValues)
    const maxX = Math.max(...xValues)
    const minY = Math.min(...yValues)
    const maxY = Math.max(...yValues)

    const width = maxX - minX
    const height = maxY - minY
    
    const padding = strokeWidth * 2
    const vbMinX = minX - padding
    const vbMinY = minY - padding
    const vbWidth = width + padding * 2
    const vbHeight = height + padding * 2

    const lineGenerator = d3
      .line()
      .x((d) => d[0])
      .y((d) => d[1])
      .curve(d3.curveLinear)

    const d = lineGenerator(points) || ''

    return {
      pathData: d,
      viewBox: `${vbMinX} ${vbMinY} ${vbWidth} ${vbHeight}`,
    }
  }, [line, strokeWidth])

  if (!pathData) return null

  return (
    <div className={cn('relative flex items-center justify-center', className)}>
        <svg
        viewBox={viewBox}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        >
        <path
            d={pathData}
            fill="none"
            stroke={color || lineColours[line.colorIndex]}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
        />
        </svg>
    </div>
  )
}
