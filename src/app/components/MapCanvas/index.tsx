import React, {
  useEffect,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
  memo,
} from 'react'
import type { Topology, Position } from '@/types/metro'
import * as d3 from 'd3'
import {
  STATION_RADIUS,
  BASE_LINE_THICKNESS,
} from '@/lib/constants'
import {
  getTrackByLineIdAndConnectionId,
  connectionMap,
  stationByIdMap,
} from '@/data/topologyService'
import CountryOutline from '../CountryOutline'
import { directionToUnitVector, getDirection } from '@/lib/metro-utils'
import { MapCanvasActions, MapCanvasProps, StationTextData } from './types'
import { LinesLayer } from './LinesLayer'
import { StationsLayer } from './StationsLayer'

const initialTransform = d3.zoomIdentity

const getStationTextOffset = (
  stationId: string,
  topology: Topology,
): Position => {
  const station = stationByIdMap.get(stationId)
  if (!station) return { x: 0, y: -1 }

  const occupiedDirections = new Set<number>()

  topology.connections.forEach((conn) => {
    const isConnected =
      conn.stations.from === stationId || conn.stations.to === stationId

    if (isConnected) {
      const neighborId =
        conn.stations.from === stationId ? conn.stations.to : conn.stations.from
      const neighbor = stationByIdMap.get(neighborId)

      if (neighbor) {
        const p1 = { x: station.xMetro, y: station.yMetro }
        const p2 = { x: neighbor.xMetro, y: neighbor.yMetro }
        const dir = getDirection(p1, p2)
        occupiedDirections.add(dir)
      }
    }
  })

  let bestDir = 0
  let maxMinDist = -1

  const preference = [0, 1, 2, 3, 4, 5, 6, 7]

  for (const candidateDir of preference) {
    if (occupiedDirections.has(candidateDir)) continue

    let minDist = 8
    if (occupiedDirections.size === 0) {
      minDist = 8
    } else {
      for (const occupied of occupiedDirections) {
        let dist = Math.abs(candidateDir - occupied)
        if (dist > 4) dist = 8 - dist
        if (dist < minDist) minDist = dist
      }
    }

    if (minDist > maxMinDist) {
      maxMinDist = minDist
      bestDir = candidateDir
    }
  }

  return directionToUnitVector(bestDir)
}

const MapCanvas = forwardRef<MapCanvasActions, MapCanvasProps>(
  (
    {
      topology,
      renderState,
      highlightedLineIds,
      pinnedLineIds = [],
      hoveredLineId = null,
      hoveredStationId = null,
      onClickLine,
      onHoverLine,
      onHoverEndLine,
      onHoverStation,
      onViewChange,
      baseLineThickness = BASE_LINE_THICKNESS,
      delayCutoff,
      onDragStart,
    },
    ref,
  ) => {
    const svgRef = useRef<SVGSVGElement | null>(null)
    const gRef = useRef<SVGGElement | null>(null)
    const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
    const onViewChangeRef = useRef(onViewChange)

    const isDraggingRef = useRef(false)
    const onDragStartRef = useRef(onDragStart)

    useEffect(() => {
      onViewChangeRef.current = onViewChange
    }, [onViewChange])

    useEffect(() => {
      onDragStartRef.current = onDragStart
    }, [onDragStart])

    const [currentTransform, setCurrentTransform] =
      useState<d3.ZoomTransform>(initialTransform)

    const stationToLineIds = useMemo(() => {
      const map = new Map<string, Set<string>>()
      topology.lines.forEach((line) => {
        if (!line.connectionIds) return
        line.connectionIds.forEach((connId) => {
          const conn = connectionMap.get(connId)
          if (conn) {
            if (!map.has(conn.stations.from))
              map.set(conn.stations.from, new Set())
            if (!map.has(conn.stations.to)) map.set(conn.stations.to, new Set())
            map.get(conn.stations.from)!.add(line.id)
            map.get(conn.stations.to)!.add(line.id)
          }
        })
      })
      return map
    }, [topology])

    const stationOffsets = useMemo(() => {
      const offsets = new Map<string, Position>()
      topology.stations.forEach((s) => {
        offsets.set(s.id, getStationTextOffset(s.id, topology))
      })
      return offsets
    }, [topology])

    const stationTextData = useMemo(() => {
      const data = new Map<string, StationTextData>()
      const textPadding = 2
      const baseRadius = STATION_RADIUS

      topology.stations.forEach((station) => {
        const offset = stationOffsets.get(station.id) || { x: 0, y: 0 }
        const textX = station.xMetro + offset.x * (baseRadius + textPadding)
        const textY = station.yMetro + offset.y * (baseRadius + textPadding)

        let textAnchor: React.SVGProps<SVGTextElement>['textAnchor'] = 'middle'
        let dominantBaseline: React.SVGProps<SVGTextElement>['dominantBaseline'] =
          'middle'

        if (offset.x > 0.1) textAnchor = 'start'
        else if (offset.x < -0.1) textAnchor = 'end'

        if (offset.y > 0.1) dominantBaseline = 'hanging'
        else if (offset.y < -0.1) dominantBaseline = 'auto'

        data.set(station.id, { textX, textY, textAnchor, dominantBaseline })
      })
      return data
    }, [topology, stationOffsets])

    const effectiveHoveredLineIds = useMemo(() => {
      const ids = new Set<string>()
      if (hoveredLineId) ids.add(hoveredLineId)
      if (hoveredStationId) {
        const lines = stationToLineIds.get(hoveredStationId)
        if (lines) lines.forEach((id) => ids.add(id))
      }
      return ids
    }, [hoveredLineId, hoveredStationId, stationToLineIds])

    const anySelected = useMemo(() => {
      const otherHighlightedIds = highlightedLineIds.filter(
        (id) => !effectiveHoveredLineIds.has(id),
      )
      return otherHighlightedIds.length > 0 || pinnedLineIds.length > 0
    }, [highlightedLineIds, pinnedLineIds, effectiveHoveredLineIds])

    const anyHovered = effectiveHoveredLineIds.size > 0

    const memoizedTrackIds = useMemo(() => {
      const lineToTrackIdsMap: {
        [key: string]: string[]
      } = {}

      topology.lines.forEach((line) => {
        const lineId = line.id
        const connectionIdsInLineOrder = line.connectionIds || []

        const trackIds: string[] = []

        connectionIdsInLineOrder.forEach((connectionId) => {
          const track = getTrackByLineIdAndConnectionId(lineId, connectionId)

          if (track) {
            trackIds.push(track.id)
          }
        })

        lineToTrackIdsMap[lineId] = trackIds
      })

      return lineToTrackIdsMap
    }, [topology.lines])

    useEffect(() => {
      if (!svgRef.current || !gRef.current) return

      const svg = d3.select(svgRef.current)

      const minZoom = 0.75
      const maxZoom = 8
      const viewbox = [-800, -1200, 2000, 2000]

      const reportViewChange = (t: d3.ZoomTransform) => {
        if (!svgRef.current || !onViewChangeRef.current) return

        const svgCtm = svgRef.current.getScreenCTM()
        const pixelRatio = svgCtm ? svgCtm.a : 1

        const zoom = t.k * pixelRatio

        const minX = (0 - t.x) / t.k
        const maxX = (1000 - t.x) / t.k
        const minY = (0 - t.y) / t.k
        const maxY = (1000 - t.y) / t.k

        onViewChangeRef.current({
          minX,
          maxX,
          minY,
          maxY,
          zoom,
        })
      }

      const zoom = d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([minZoom, maxZoom])
        .translateExtent([
          [viewbox[0], viewbox[1]],
          [viewbox[2], viewbox[3]],
        ])
        .filter((event) => {
          return (!event.ctrlKey || event.type === 'wheel') && !event.button
        })
        .on('start', () => {
          isDraggingRef.current = true
          onDragStartRef.current?.()
        })
        .on('zoom', (event) => {
          const t = event.transform
          setCurrentTransform(t)
          reportViewChange(t)
        })
        .on('end', () => {
          isDraggingRef.current = false
        })

      svg.call(zoom)

      zoomRef.current = zoom

      svg.call(zoom.transform, initialTransform)
      const resizeObserver = new ResizeObserver(() => {
        if (svgRef.current) {
          const t = d3.zoomTransform(svgRef.current)
          reportViewChange(t)
        }
      })
      resizeObserver.observe(svgRef.current)

      return () => {
        resizeObserver.disconnect()
        zoom.on('zoom', null)
      }
    }, [])

    useImperativeHandle(ref, () => ({
      focusOnPoints: (
        p1: Position,
        p2: Position,
        paddingFactor: number = 0.2,
      ) => {
        if (!svgRef.current || !zoomRef.current) {
          console.warn('MapCanvas not ready to zoom.')
          return
        }

        const svg = d3.select(svgRef.current)
        const zoom = zoomRef.current

        const [minZoom, maxZoom] = zoom.scaleExtent()

        const viewWidth = 1000
        const viewHeight = 1000
        const bottomPadding = 180
        const availableHeight = viewHeight - bottomPadding

        const bboxWidth = Math.abs(p1.x - p2.x)
        const bboxHeight = Math.abs(p1.y - p2.y)
        const paddedWidth = bboxWidth * (1 + paddingFactor)
        const paddedHeight = bboxHeight * (1 + paddingFactor)

        let k: number
        if (paddedWidth < 1 && paddedHeight < 1) {
          k = maxZoom / 2
        } else {
          const scaleX = paddedWidth > 1 ? viewWidth / paddedWidth : Infinity
          const scaleY =
            paddedHeight > 1 ? availableHeight / paddedHeight : Infinity
          k = Math.min(scaleX, scaleY)
        }

        k = Math.max(minZoom, Math.min(maxZoom, k))

        const centerX = (p1.x + p2.x) / 2
        const centerY = (p1.y + p2.y) / 2

        const tx = viewWidth / 2 - k * centerX
        const ty = availableHeight / 2 - k * centerY

        const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k)

        svg.transition().duration(750).call(zoom.transform, newTransform)
      },

      focusOnStation: (stationId: string) => {
        const station = topology.stations.find((s) => s.id === stationId)
        if (!station || !svgRef.current || !zoomRef.current) return

        const svg = d3.select(svgRef.current)
        const zoom = zoomRef.current

        const viewWidth = 1000
        const viewHeight = 1000
        const bottomPadding = 180
        const availableHeight = viewHeight - bottomPadding

        const targetZoom = 3.5
        const k = targetZoom

        const tx = viewWidth / 2 - k * station.xMetro
        const ty = availableHeight / 2 - k * station.yMetro

        const newTransform = d3.zoomIdentity.translate(tx, ty).scale(k)

        svg.transition().duration(750).call(zoom.transform, newTransform)
      },

      getStationScreenPosition: (stationId: string) => {
          const station = topology.stations.find((s) => s.id === stationId)
          if (!station || !gRef.current) return null

          const ctm = gRef.current.getScreenCTM()
          if (!ctm) return null

          return {
              x: station.xMetro * ctm.a + ctm.e,
              y: station.yMetro * ctm.d + ctm.f
          }
      }
    }))

    return (
      <svg
        ref={svgRef}
        width={'100%'}
        height={'100%'}
        viewBox={`0 0 1000 1000`}
        className='border border-gray-300 rounded-lg bg-white size-full flex-1 absolute'
      >
        <defs>
          <pattern
            id='clamped-pattern'
            patternUnits='userSpaceOnUse'
            width='4'
            height='4'
            patternTransform='rotate(22.5)'
          >
            <rect
              width='2'
              height='4'
              transform='translate(0,0)'
              fill='#00000033'
            />
            <rect
              width='2'
              height='4'
              transform='translate(2,0)'
              fill='#00000066'
            />
          </pattern>
        </defs>

        <g ref={gRef} transform={currentTransform.toString()}>
          <CountryOutline />

          <LinesLayer
            topology={topology}
            renderState={renderState}
            highlightedLineIds={highlightedLineIds}
            pinnedLineIds={pinnedLineIds}
            effectiveHoveredLineIds={effectiveHoveredLineIds}
            anySelected={anySelected}
            anyHovered={anyHovered}
            memoizedTrackIds={memoizedTrackIds}
            onClickLine={onClickLine}
            onHoverLine={onHoverLine}
            onHoverEndLine={onHoverEndLine}
            shapeRendering='optimizeSpeed'
            baseLineThickness={baseLineThickness}
            delayCutoff={delayCutoff}
            isDraggingRef={isDraggingRef}
          />

          <StationsLayer
            topology={topology}
            stationTextData={stationTextData}
            hoveredStationId={hoveredStationId || null}
            stationToLineIds={stationToLineIds}
            onHoverLine={onHoverLine}
            onHoverEndLine={onHoverEndLine}
            onClickLine={onClickLine}
            onHoverStation={onHoverStation}
            isDraggingRef={isDraggingRef}
          />
        </g>
      </svg>
    )
  },
)

MapCanvas.displayName = 'MapCanvas'

export default memo(MapCanvas)
export type { MapCanvasActions }
