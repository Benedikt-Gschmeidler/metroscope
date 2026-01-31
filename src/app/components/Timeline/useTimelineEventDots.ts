import { useEffect } from 'react'
import * as d3 from 'd3'
import { TimeSegment } from './types'

export const useTimelineEventDots = (
  g: d3.Selection<SVGGElement, unknown, null, undefined> | null,
  allSegments: TimeSegment[],
  visibleIndices: { start: number; end: number } | null,
  xScale: d3.ScaleTime<number, number> | null,
  chartHeight: number,
  mapViewBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null,
  pinnedLineIds: string[] = [],
  hoveredLineId: string | null = null,
  shouldDimInactiveDots: boolean = true,
) => {
  useEffect(() => {
    if (!g || !xScale || !visibleIndices) return

    const visualSquareSize = chartHeight
    const fullMapSize = 1000
    const clipId = 'timeline-segment-clip'

    const segmentsToRender = allSegments.slice(
      visibleIndices.start,
      visibleIndices.end,
    )

    let defs = g.select<SVGDefsElement>('defs')
    if (defs.empty()) {
      defs = g.append('defs')
    }

    defs
      .selectAll(`#${clipId}`)
      .data([null])
      .join('clipPath')
      .attr('id', clipId)
      .selectAll('rect')
      .data([null])
      .join('rect')
      .attr('x', -visualSquareSize / 2)
      .attr('y', -visualSquareSize / 2)
      .attr('width', visualSquareSize)
      .attr('height', visualSquareSize)

    let xMin = 0
    let xMax = 1000
    let yMin = 0
    let yMax = 1000
    let zoomFactor = 1

    if (mapViewBounds) {
      xMin = mapViewBounds.minX
      xMax = mapViewBounds.maxX
      yMin = mapViewBounds.minY
      yMax = mapViewBounds.maxY

      const currentHeight = Math.max(1, yMax - yMin)
      zoomFactor = fullMapSize / currentHeight
    }

    const xPositionScale = d3
      .scaleLinear()
      .domain([xMin, xMax])
      .range([-visualSquareSize / 2, visualSquareSize / 2])

    const yPositionScale = d3
      .scaleLinear()
      .domain([yMin, yMax])
      .range([-visualSquareSize / 2, visualSquareSize / 2])

    const segmentGroups = g
      .selectAll('.segment-group')
      .data(
        segmentsToRender.filter((d) => d.events && d.events.length > 0),
        (d) => (d as TimeSegment).startDate.getTime(),
      )
      .join('g')
      .attr('class', 'segment-group')
      .attr('transform', (d) => {
        const segmentWidth = xScale(d.endDate) - xScale(d.startDate)
        const centerX = xScale(d.startDate) + segmentWidth / 2
        const centerY = chartHeight / 2
        return `translate(${centerX}, ${centerY})`
      })
      .attr('clip-path', `url(#${clipId})`)

    segmentGroups.raise()

    const forwardEvent = (event: MouseEvent) => {
      const el = event.currentTarget as HTMLElement
      const prevPointerEvents = el.style.pointerEvents

      el.style.pointerEvents = 'none'

      const target = document.elementFromPoint(event.clientX, event.clientY)

      if (target) {
        const newEvent = new MouseEvent(event.type, {
          bubbles: true,
          cancelable: true,
          view: window,
          detail: event.detail,
          screenX: event.screenX,
          screenY: event.screenY,
          clientX: event.clientX,
          clientY: event.clientY,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          shiftKey: event.shiftKey,
          metaKey: event.metaKey,
          button: event.button,
          buttons: event.buttons,
          relatedTarget: event.relatedTarget,
        })
        target.dispatchEvent(newEvent)
      }

      el.style.pointerEvents = prevPointerEvents
    }

    segmentGroups
      .selectAll('.event-dot')
      .data((d) => d.events || [])
      .join('circle')
      .attr('class', 'event-dot')
      .attr('cx', (d) => xPositionScale(d.x))
      .attr('cy', (d) => yPositionScale(d.y))
      .attr('r', (d) => d.size * zoomFactor)
      .attr('fill', (d) => {
        const hasPins = pinnedLineIds.length > 0
        const isPinned = pinnedLineIds.includes(d.lineId)
        const isHovered = hoveredLineId === d.lineId

        if (hasPins && !isPinned && !isHovered) {
          return 'none'
        }
        return d.color
      })
      .attr('fill-opacity', 0.4)
      .attr('stroke', (d) => {
        const hasPins = pinnedLineIds.length > 0
        const isPinned = pinnedLineIds.includes(d.lineId)
        const isHovered = hoveredLineId === d.lineId

        if (hasPins && !isPinned && !isHovered) {
          return '#ccc'
        }
        return d.color
      })
      .attr('stroke-width', 1)
      .attr('opacity', (d) => {
        if (!shouldDimInactiveDots) return 1

        const hasPins = pinnedLineIds.length > 0

        if (hasPins) return 1

        if (hoveredLineId) {
          const isHovered = hoveredLineId === d.lineId

          if (isHovered) return 1

          return 0.1
        }

        return 1
      })
      .on('mousedown', (event) => forwardEvent(event))
      .on('click', (event) => forwardEvent(event))
  }, [
    g,
    allSegments,
    visibleIndices,
    xScale,
    chartHeight,
    mapViewBounds,
    pinnedLineIds,
    hoveredLineId,
    shouldDimInactiveDots,
  ])
}
