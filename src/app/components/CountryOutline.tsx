import React, { memo, useMemo } from 'react'
import * as d3 from 'd3'
import curveCircleCorners from 'd3-curve-circlecorners'
import { COUNTRY_OUTLINE } from '@/lib/constants'
import {
  COASTLINE,
  LAND_BORDER,
  ISLANDS,
  WATER_AREAS,
  OutlinePoint,
} from '@/data/country-outlines'

interface CountryOutlineProps {
  strokeWidth?: number
  seaColor?: string
  landColor?: string
  borderColor?: string
  cornerRadius?: number
}

const createOrtholinearPath = (
  points: OutlinePoint[],
  cornerRadius: number = 8,
  closed: boolean = false,
): string => {
  if (points.length < 2) return ''

  const pathPoints =
    closed && points.length >= 3 ? [...points, points[0], points[1]] : points

  const lineGenerator = d3
    .line<OutlinePoint>()
    .x((d) => d.x)
    .y((d) => d.y)
    .curve(curveCircleCorners.radius(cornerRadius))

  const path = lineGenerator(pathPoints)
  return path || ''
}

const CountryOutline: React.FC<CountryOutlineProps> = ({
  strokeWidth = COUNTRY_OUTLINE.strokeWidth,
  seaColor = '#f3f3f3ff',
  landColor = '#ffffff',
  borderColor = '#f3f3f3ff',
  cornerRadius = 6,
}) => {
  const coastline = COASTLINE
  const landBorder = LAND_BORDER
  const islands = ISLANDS
  const waterAreas = WATER_AREAS

  const landBorderPath = useMemo(
    () => createOrtholinearPath(landBorder, cornerRadius, false),
    [landBorder, cornerRadius],
  )

  const landAreaPath = useMemo(() => {

    if (coastline.length === 0) return ''

    const firstPoint = coastline[0]
    const lastPoint = coastline[coastline.length - 1]

    const points: OutlinePoint[] = [
      { x: firstPoint.x, y: -2000 },
      { x: 3000, y: -2000 },
      { x: 3000, y: 3000 },
      { x: lastPoint.x, y: 3000 },
      { x: lastPoint.x, y: lastPoint.y },
      ...coastline.slice().reverse(),
    ]

    return createOrtholinearPath(points, cornerRadius, true)
  }, [coastline, cornerRadius])

  const seaAreaPath = useMemo(() => {

    if (coastline.length === 0) return ''

    const firstPoint = coastline[0]
    const lastPoint = coastline[coastline.length - 1]

    const points: OutlinePoint[] = [
      { x: 3000, y: firstPoint.y },
      ...coastline,
      { x: -3000, y: lastPoint.y },
      { x: -3000, y: -2000 },
      { x: 3000, y: -2000 },
      { x: 3000, y: firstPoint.y },
    ]

    return createOrtholinearPath(points, cornerRadius, true)
  }, [coastline, cornerRadius])

  const islandPaths = useMemo(
    () =>
      islands.map((island) => ({
        id: island.id,
        name: island.name,
        path: createOrtholinearPath(island.points, cornerRadius * 0.5, true),
      })),
    [islands, cornerRadius],
  )

  const waterAreaPaths = useMemo(
    () =>
      waterAreas.map((water) => ({
        id: water.id,
        name: water.name,
        path: createOrtholinearPath(water.points, cornerRadius * 0.5, true),
      })),
    [waterAreas, cornerRadius],
  )

  return (
    <g className='country-outline'>
      <g pointerEvents='none'>
        <path d={seaAreaPath} fill={seaColor} stroke='none' />
        <path d={landAreaPath} fill={landColor} stroke='none' />
        {waterAreaPaths.map((water) => (
          <path key={water.id} d={water.path} fill={seaColor} stroke='none'>
            {water.name && <title>{water.name}</title>}
          </path>
        ))}
        {islandPaths.map((island) => (
          <path key={island.id} d={island.path} fill={landColor} stroke='none'>
            {island.name && <title>{island.name}</title>}
          </path>
        ))}
        <path
          d={landBorderPath}
          fill='none'
          stroke={borderColor}
          strokeWidth={strokeWidth}
          strokeLinecap='round'
          strokeLinejoin='round'
        />
      </g>
    </g>
  )
}

CountryOutline.displayName = 'CountryOutline'

export default memo(CountryOutline)
