import { Position, Track, Connection, TrackSide } from '@/types/metro'
import { memo, useMemo } from 'react'
import {
  getConnectionByTrackId,
  trackMap,
  stationByIdMap,
  lineByIdMap,
} from '@/data/topologyService'
import { lineColours } from '@/data/lineColours'
import {
  directionToUnitVector,
  getConnectionPosition,
  getIntersectionAt,
  mod,
} from '@/lib/metro-utils'
import {
  BASE_LINE_THICKNESS,
  LINE_SPACING,
  MAX_LINE_THICKNESS,
  STATION_CARDINAL_OFFSET,
  STATION_DIAGONAL_OFFSET,
} from '@/lib/constants'
import * as d3 from 'd3'
import { RenderState } from '@/data/delayData'

interface MetroLineUnifiedProps extends React.SVGProps<SVGPathElement> {
  lineId: string
  trackIds: string[]
  renderState: RenderState
  onHover: (lineId: string) => void
  onHoverEnd: (lineId: string) => void
  isDraggingRef?: React.MutableRefObject<boolean>
  grayedOut?: boolean
  dimmed?: boolean
  baseThickness?: number
  delayCutoff: number
}

interface PathPoint {
  position: Position
  width: number
  overflowWidth: number
  type: 'start' | 'mid' | 'end' | 'interpolated'
  tangent: Position
  offset?: number
}

const getClampedDelayThickness = (delay: number, delayCutoff: number) => {
  if (delayCutoff <= 0) return 0
  const ratio = Math.min(delay / delayCutoff, 1.0)
  return ratio * MAX_LINE_THICKNESS
}

const getSlotOffsetBase = (
  connection: Connection,
  track: Track,
  renderState: RenderState,
  side: TrackSide,
  stationId: string,
  baseThickness: number,
  delayCutoff: number,
): number => {
  if (!track) return 0

  const sameSideTracks = connection.tracks.filter((t) => {
    if (t[side].direction !== track[side].direction) {
      return false
    }
    if (t[side].slot >= track[side].slot) {
      return false
    }
    if (t[side].slot === 0) {
      return true
    }
    if (t[side].slot % 2 === track[side].slot % 2) {
      return true
    }
    return false
  })

  let offset = 0
  sameSideTracks.forEach((t) => {
    const lineId = t.lineId
    const delayKey = `${lineId}::${stationId}`
    const unscaledThickness = renderState.delays.get(delayKey) || 0

    const thickness =
      getClampedDelayThickness(unscaledThickness, delayCutoff) *
      (t[side].slot === 0 ? 0.5 : 1)
    offset += thickness + baseThickness + LINE_SPACING
  })
  if (
    track[side].slot !== 0 &&
    !sameSideTracks.some((t) => t[side].slot === 0)
  ) {
    offset += LINE_SPACING / 2
  }
  return offset
}

export const getSlotOffsetDelayWidth = (
  connection: Connection,
  track: Track,
  renderState: RenderState,
  side: TrackSide,
  baseThickness: number = BASE_LINE_THICKNESS,
  delayCutoff: number,
): number => {
  if (track[side].slot === 0) {
    return 0
  }
  const lineId = track.lineId
  const stationId = connection.stations[side]
  const base = getSlotOffsetBase(
    connection,
    track,
    renderState,
    side,
    stationId,
    baseThickness,
    delayCutoff,
  )

  const unscaledThickness =
    renderState.delays.get(`${lineId}::${stationId}`) || 0

  const thickness = getClampedDelayThickness(unscaledThickness, delayCutoff)

  return (
    (track[side].slot % 2 === 0 ? 1 : -1) *
    (base + (thickness + baseThickness) / 2)
  )
}

function MetroLineUnified({
  lineId,
  trackIds,
  renderState,
  onHover,
  onHoverEnd,
  isDraggingRef,
  grayedOut,
  dimmed,
  baseThickness = BASE_LINE_THICKNESS,
  delayCutoff,
  ...rest
}: MetroLineUnifiedProps) {
  const line = lineByIdMap.get(lineId)

  const { delayPath, corePath, overflowPath } = useMemo(() => {
    if (!trackIds.length)
      return { delayPath: '', corePath: '', overflowPath: '' }

    const allPoints: PathPoint[] = []
    let hasAnyClamping = false

    trackIds.forEach((trackId, index) => {
      const track = trackMap.get(trackId)
      const connection = getConnectionByTrackId(trackId)

      if (!track || !connection) return

      const fromStation = stationByIdMap.get(connection.stations.from)
      const toStation = stationByIdMap.get(connection.stations.to)

      if (!fromStation || !toStation) return

      let actualFromStation = fromStation
      let actualToStation = toStation
      let isTrackReversed = false

      if (index < trackIds.length - 1) {
        const nextTrack = trackMap.get(trackIds[index + 1])
        const nextConnection = getConnectionByTrackId(trackIds[index + 1])

        if (nextTrack && nextConnection) {
          const sharedStationId =
            connection.stations.from === nextConnection.stations.from ||
            connection.stations.from === nextConnection.stations.to
              ? connection.stations.from
              : connection.stations.to

          if (sharedStationId === connection.stations.from) {
            actualFromStation = toStation
            actualToStation = fromStation
            isTrackReversed = true
          }
        }
      } else if (index > 0) {
        const prevTrack = trackMap.get(trackIds[index - 1])
        const prevConnection = getConnectionByTrackId(trackIds[index - 1])

        if (prevTrack && prevConnection) {
          const sharedStationId =
            connection.stations.from === prevConnection.stations.from ||
            connection.stations.from === prevConnection.stations.to
              ? connection.stations.from
              : connection.stations.to

          if (sharedStationId === connection.stations.to) {
            actualFromStation = toStation
            actualToStation = fromStation
            isTrackReversed = true
          }
        }
      }

      const fromStationPosition = {
        x: actualFromStation.xMetro,
        y: actualFromStation.yMetro,
      }
      const toStationPosition = {
        x: actualToStation.xMetro,
        y: actualToStation.yMetro,
      }

      const actualFromDirection = isTrackReversed
        ? track.to.direction
        : track.from.direction
      const actualToDirection = isTrackReversed
        ? track.from.direction
        : track.to.direction

      const fromOffset =
        mod(actualFromDirection, 2) === 0
          ? STATION_CARDINAL_OFFSET
          : STATION_DIAGONAL_OFFSET
      const toOffset =
        mod(actualToDirection, 2) === 0
          ? STATION_CARDINAL_OFFSET
          : STATION_DIAGONAL_OFFSET

      const tangentDirActualFrom = actualFromDirection
      const tangentDirActualTo = actualToDirection
      const tangentFrom = directionToUnitVector(tangentDirActualFrom + 4)
      const tangentTo = directionToUnitVector(tangentDirActualTo)

      const fromSlotOffset = getSlotOffsetDelayWidth(
        connection,
        track,
        renderState,
        isTrackReversed ? 'to' : 'from',
        baseThickness,
        delayCutoff,
      )
      const toSlotOffset = getSlotOffsetDelayWidth(
        connection,
        track,
        renderState,
        isTrackReversed ? 'from' : 'to',
        baseThickness,
        delayCutoff,
      )

      const fromPosition = getConnectionPosition(
        fromStationPosition,
        actualFromDirection,
        fromOffset,
        fromSlotOffset,
      )
      const toPosition = getConnectionPosition(
        toStationPosition,
        actualToDirection,
        toOffset,
        toSlotOffset,
      )

      const renderStateThicknessFrom =
        renderState.delays.get(`${lineId}::${actualFromStation.id}`) || 0
      const renderStateThicknessTo =
        renderState.delays.get(`${lineId}::${actualToStation.id}`) || 0
      const delayWidthFrom =
        baseThickness +
        getClampedDelayThickness(renderStateThicknessFrom, delayCutoff)
      const delayWidthTo =
        baseThickness +
        getClampedDelayThickness(renderStateThicknessTo, delayCutoff)

      const isClampedFrom = renderStateThicknessFrom > delayCutoff
      const isClampedTo = renderStateThicknessTo > delayCutoff

      if (isClampedFrom || isClampedTo) {
        hasAnyClamping = true
      }

      const borderSize = MAX_LINE_THICKNESS * 0.3

      const overflowWidthFrom = isClampedFrom
        ? delayWidthFrom + borderSize
        : delayWidthFrom
      const overflowWidthTo = isClampedTo
        ? delayWidthTo + borderSize
        : delayWidthTo

      allPoints.push({
        position: fromPosition,
        width: delayWidthFrom,
        overflowWidth: overflowWidthFrom,
        tangent: tangentFrom,
        type: 'start',
        offset: fromOffset,
      })

      if (track.midpointSlots.length === 1) {
        const mp = connection.midpoints[0]
        const distanceFromToMP = Math.sqrt(
          Math.pow(mp.x - fromPosition.x, 2) +
            Math.pow(mp.y - fromPosition.y, 2),
        )
        const distanceMPToTo = Math.sqrt(
          Math.pow(toPosition.x - mp.x, 2) + Math.pow(toPosition.y - mp.y, 2),
        )
        const totalDistance = distanceFromToMP + distanceMPToTo
        const t = distanceFromToMP / totalDistance
        const delayWidth = delayWidthFrom + (delayWidthTo - delayWidthFrom) * t

        const overflowWidth =
          overflowWidthFrom + (overflowWidthTo - overflowWidthFrom) * t

        allPoints.push({
          position: getIntersectionAt(
            mp,
            actualFromDirection,
            getSlotOffsetDelayWidth(
              connection,
              track,
              renderState,
              isTrackReversed ? 'to' : 'from',
              baseThickness,
              delayCutoff,
            ),
            actualToDirection,
            getSlotOffsetDelayWidth(
              connection,
              track,
              renderState,
              isTrackReversed ? 'from' : 'to',
              baseThickness,
              delayCutoff,
            ),
          ),
          width: delayWidth,
          overflowWidth: overflowWidth,
          tangent: tangentFrom,
          type: 'mid',
        })
      } else if (track.midpointSlots.length > 1) {
        const midpoints = isTrackReversed
          ? [...connection.midpoints].reverse()
          : connection.midpoints

        const getSideForDirection = (dir: number): TrackSide => {
          const fromDir = actualFromDirection
          const toDir = actualToDirection
          const diff = (a: number, b: number) => {
            const d = Math.abs(a - b) % 8
            return Math.min(d, 8 - d)
          }
          const sideBase =
            diff(dir, fromDir) <= diff(dir, toDir) ? 'from' : 'to'
          return isTrackReversed
            ? sideBase === 'from'
              ? 'to'
              : 'from'
            : sideBase
        }

        midpoints.forEach((mp, index) => {
          const dir1 =
            index === 0 ? actualFromDirection : midpoints[index - 1].direction
          const dir2 =
            index === midpoints.length - 1
              ? actualToDirection
              : midpoints[index].direction

          const side1 = getSideForDirection(dir1)
          const side2 = getSideForDirection(dir2)

          const position = getIntersectionAt(
            mp,
            dir1,
            getSlotOffsetDelayWidth(
              connection,
              track,
              renderState,
              side1,
              baseThickness,
              delayCutoff,
            ),
            dir2,
            getSlotOffsetDelayWidth(
              connection,
              track,
              renderState,
              side2,
              baseThickness,
              delayCutoff,
            ),
          )
          const tangentMP = directionToUnitVector(dir1 + 4)
          allPoints.push({
            position,
            width: delayWidthTo,
            overflowWidth: overflowWidthTo,
            tangent: tangentMP,
            type: 'mid',
          })
        })
      }

      allPoints.push({
        position: toPosition,
        width: delayWidthTo,
        overflowWidth: overflowWidthTo,
        tangent: tangentTo,
        type: 'end',
        offset: toOffset,
      })
    })

    const addStationInterpolations = (points: PathPoint[]): PathPoint[] => {
      const interpolatePoints = (
        p0: PathPoint,
        p1: PathPoint,
        numSamples: number,
      ): PathPoint[] => {
        const scale =
          (Math.sqrt(
            Math.pow(p1.position.x - p0.position.x, 2) +
              Math.pow(p1.position.y - p0.position.y, 2),
          ) || 1) / 3

        const cp1 = {
          x: p0.position.x - p0.tangent.x * scale,
          y: p0.position.y - p0.tangent.y * scale,
        }
        const cp2 = {
          x: p1.position.x + p1.tangent.x * scale,
          y: p1.position.y + p1.tangent.y * scale,
        }

        const points: PathPoint[] = []
        for (let i = 0; i <= numSamples; i++) {
          const t = i / numSamples
          const mt = 1 - t
          const mt2 = mt * mt
          const t2 = t * t

          const x =
            mt2 * mt * p0.position.x +
            3 * mt2 * t * cp1.x +
            3 * mt * t2 * cp2.x +
            t2 * t * p1.position.x
          const y =
            mt2 * mt * p0.position.y +
            3 * mt2 * t * cp1.y +
            3 * mt * t2 * cp2.y +
            t2 * t * p1.position.y

          const dx =
            3 * mt2 * (cp1.x - p0.position.x) +
            6 * mt * t * (cp2.x - cp1.x) +
            3 * t2 * (p1.position.x - cp2.x)
          const dy =
            3 * mt2 * (cp1.y - p0.position.y) +
            6 * mt * t * (cp2.y - cp1.y) +
            3 * t2 * (p1.position.y - cp2.y)
          const len = Math.sqrt(dx * dx + dy * dy) || 1

          const width = p0.width + (p1.width - p0.width) * t
          const overflowWidth =
            p0.overflowWidth + (p1.overflowWidth - p0.overflowWidth) * t

          points.push({
            position: { x, y },
            width,
            overflowWidth,
            tangent: { x: -dx / len, y: -dy / len },
            type: 'interpolated',
          })
        }
        return points
      }

      const getPointOnLineXAway = (
        p0: Position,
        p1: Position,
        distance: number,
      ) => {
        const dir = {
          x: p1.x - p0.x,
          y: p1.y - p0.y,
        }
        const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y) || 1
        return {
          x: p0.x + (dir.x / len) * distance,
          y: p0.y + (dir.y / len) * distance,
        }
      }

      const result: PathPoint[] = []
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i]
        const p1 = points[i + 1]
        result.push(p0)
        if (p0.type === 'end' && p1.type === 'start') {
          const interpolated = interpolatePoints(p0, p1, 10)
          result.push(...interpolated.slice(1, -1))
        }
        if (p0.type === 'mid') {
          result.splice(result.length - 1, 1)
          const pMinus1 = points[i - 1]

          const prev = getPointOnLineXAway(p0.position, pMinus1.position, 1.5)
          const next = getPointOnLineXAway(p0.position, p1.position, 1.5)

          const prevPoint: PathPoint = {
            position: prev,
            width: p0.width,
            overflowWidth: p0.overflowWidth,
            tangent: p0.tangent,
            type: 'interpolated',
          }

          const nextPoint: PathPoint = {
            position: next,
            width: p0.width,
            overflowWidth: p0.overflowWidth,
            tangent: p1.tangent,
            type: 'interpolated',
          }

          const interpolated = interpolatePoints(prevPoint, nextPoint, 10)
          result.push(...interpolated.slice(1, -1))
        }
      }
      result.push(points[points.length - 1])
      return result
    }

    const interpolatedPoints = addStationInterpolations(allPoints)
    allPoints.length = 0
    allPoints.push(...interpolatedPoints)

    const generateTaperedPath = (
      pathPoints: PathPoint[],
      widthSelector: (p: PathPoint) => number,
    ): string => {
      if (pathPoints.length < 2) return ''

      const leftEdge: Position[] = []
      const rightEdge: Position[] = []

      for (let i = 0; i < pathPoints.length; i++) {
        const point = pathPoints[i]
        const halfWidth = widthSelector(point) / 2
        const normal = {
          x: -point.tangent.y,
          y: point.tangent.x,
        }

        let pos = point.position

        if (i === 0) {
          const extension = (point.offset ?? STATION_CARDINAL_OFFSET) * 2
          pos = {
            x: pos.x + point.tangent.x * extension,
            y: pos.y + point.tangent.y * extension,
          }
        }
        if (i === pathPoints.length - 1) {
          const extension = (point.offset ?? STATION_CARDINAL_OFFSET) * 2
          pos = {
            x: pos.x - point.tangent.x * extension,
            y: pos.y - point.tangent.y * extension,
          }
        }

        leftEdge.push({
          x: pos.x + normal.x * halfWidth,
          y: pos.y + normal.y * halfWidth,
        })
        rightEdge.push({
          x: pos.x - normal.x * halfWidth,
          y: pos.y - normal.y * halfWidth,
        })
      }

      let path = `M ${leftEdge[0].x} ${leftEdge[0].y}`

      for (let i = 1; i < leftEdge.length; i++) {
        path += ` L ${leftEdge[i].x} ${leftEdge[i].y}`
      }
      const endPoint = pathPoints[pathPoints.length - 1]
      const endRadius = widthSelector(endPoint) / 2
      const endTarget = rightEdge[rightEdge.length - 1]
      path += ` A ${endRadius} ${endRadius} 0 0 1 ${endTarget.x} ${endTarget.y}`

      for (let i = rightEdge.length - 2; i >= 0; i--) {
        path += ` L ${rightEdge[i].x} ${rightEdge[i].y}`
      }
      const startPoint = pathPoints[0]
      const startRadius = widthSelector(startPoint) / 2
      const startTarget = leftEdge[0]
      path += ` A ${startRadius} ${startRadius} 0 0 1 ${startTarget.x} ${startTarget.y}`

      return path + ' Z'
    }

    const delayPath = generateTaperedPath(allPoints, (p) => p.width)

    const overflowPath = hasAnyClamping
      ? generateTaperedPath(allPoints, (p) => p.overflowWidth)
      : ''

    const corePath = generateTaperedPath(allPoints, () => baseThickness)

    return { delayPath, corePath, overflowPath }
  }, [trackIds, renderState, baseThickness, delayCutoff, lineId])

  const baseColor = line ? lineColours[line.colorIndex] : '#000'

  const { fillColor, opacity } = useMemo(() => {
    if (grayedOut) {
      const h = d3.hsl(baseColor)
      const desaturated = d3.hsl(h.h, 0, h.l)
      return { fillColor: desaturated.formatHex(), opacity: 0.5 }
    } else if (dimmed) {
      return { fillColor: baseColor, opacity: 0.2 }
    }
    return { fillColor: baseColor, opacity: 1 }
  }, [baseColor, grayedOut, dimmed])

  return (
    <g
      id={`line-unified-${lineId}`}
      className={`cursor-pointer transition-opacity ease-in-out duration-150`}
      onMouseOver={() => {
        if (isDraggingRef?.current) return
        onHover(lineId)
      }}
      onMouseLeave={() => {
        if (isDraggingRef?.current) return
        onHoverEnd(lineId)
      }}
      style={{ color: fillColor } as React.CSSProperties}
    >
      {overflowPath && (
        <path
          d={`${overflowPath} ${delayPath}`}
          fill='url(#clamped-pattern)'
          fillRule='evenodd'
          opacity={opacity}
          {...rest}
        />
      )}
      <path
        d={delayPath}
        fill={fillColor}
        fillRule='nonzero'
        opacity={opacity * 0.5}
        {...rest}
      />
      <path
        d={corePath}
        fill={fillColor}
        fillRule='nonzero'
        opacity={opacity}
        {...rest}
      />
    </g>
  )
}

export default memo(MetroLineUnified)
