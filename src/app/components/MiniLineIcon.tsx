import React, { useMemo } from 'react'
import { Line } from '@/types/metro'
import { stationByIdMap } from '@/data/topologyService'
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
    const stations = line.stationIds
      .map((id) => stationByIdMap.get(id))
      .filter((s) => s !== undefined)

    if (stations.length < 2) {
      return { pathData: '', viewBox: '0 0 100 100' }
    }

    const points: [number, number][] = stations.map((s) => [s!.xMetro, s!.yMetro])

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
