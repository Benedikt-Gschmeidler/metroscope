import { useEffect, useRef, useCallback, useState } from 'react'
import * as d3 from 'd3'
import { TimeSelection, TimeSegment } from './types'

export const useTimelineSelection = (
  g: d3.Selection<SVGGElement, unknown, null, undefined> | null,
  xScale: d3.ScaleTime<number, number> | null,
  chartWidth: number,
  chartHeight: number,
  selectionMode: 'point' | 'range',
  currentSelection: TimeSelection | null,
  onSelectionChange: (selection: TimeSelection | null) => void,
  setCurrentSelection: React.Dispatch<
    React.SetStateAction<TimeSelection | null>
  >,
  isPlaying: boolean,
  allSegments: TimeSegment[],
  onBrushInteraction?: {
    start: () => void
    update: (start: Date, end: Date, x0: number, x1: number) => void
    end: () => void
  }
) => {
  const interactionLayerRef = useRef<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null)
  const brushRef = useRef<d3.BrushBehavior<unknown> | null>(null)
  const selectionLineRef = useRef<d3.Selection<
    SVGLineElement,
    unknown,
    null,
    undefined
  > | null>(null)
  const lastValidSelectionRef = useRef<TimeSelection | null>(currentSelection)

  const allSegmentsRef = useRef(allSegments)
  useEffect(() => {
    allSegmentsRef.current = allSegments
  }, [allSegments])

  const onSelectionChangeRef = useRef(onSelectionChange)
  const setCurrentSelectionRef = useRef(setCurrentSelection)
  const onBrushInteractionRef = useRef(onBrushInteraction)
  const currentSelectionRef = useRef(currentSelection)
  const isPlayingRef = useRef(isPlaying)

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
    setCurrentSelectionRef.current = setCurrentSelection
    onBrushInteractionRef.current = onBrushInteraction
    currentSelectionRef.current = currentSelection
    isPlayingRef.current = isPlaying
  }, [onSelectionChange, setCurrentSelection, onBrushInteraction, currentSelection, isPlaying])

  const snapToClosestSegment = useCallback((clickTime: Date) => {
    const segments = allSegmentsRef.current
    if (segments.length === 0) return null

    let closestSegment = segments[0]
    let minDistance = Math.abs(
      closestSegment.startDate.getTime() - clickTime.getTime()
    )

    for (const segment of segments) {
      const segmentCenter = new Date(
        (segment.startDate.getTime() + segment.endDate.getTime()) / 2
      )
      const distance = Math.abs(segmentCenter.getTime() - clickTime.getTime())
      if (distance < minDistance) {
        minDistance = distance
        closestSegment = segment
      }
    }

    return {
      mode: 'range' as const,
      start: closestSegment.startDate,
      end: closestSegment.endDate,
    }
  }, [])

  const isBrushingRef = useRef(false)

  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!g || !xScale) {
        setIsReady(false)
        return
    }

    g.select('.interaction-layer').remove()

    const interactionLayer = g.append('g').attr('class', 'interaction-layer')
    interactionLayerRef.current = interactionLayer

    if (selectionMode === 'range') {
      let brushStartX: number | null = null

      const brush = d3
        .brushX()
        .extent([
          [0, 0],
          [chartWidth, chartHeight],
        ])
        .on('start', (event) => {
          isBrushingRef.current = true
          if (onBrushInteractionRef.current)
            onBrushInteractionRef.current.start()
          if (event.sourceEvent) {
            const [x] = d3.pointer(event.sourceEvent)
            brushStartX = x
          }
        })
        .on('brush', (event) => {
            if (event.selection && onBrushInteractionRef.current && xScale && event.sourceEvent) {
            const [x0, x1] = event.selection as [number, number]
            onBrushInteractionRef.current.update(
              xScale.invert(x0),
              xScale.invert(x1),
              x0,
              x1
            )
          }
        })
        .on('end', (event) => {
          isBrushingRef.current = false
          if (onBrushInteractionRef.current) onBrushInteractionRef.current.end()
          if (!event.sourceEvent) return

          const selection = event.selection as [number, number] | null

          if (!selection && brushStartX !== null) {
            const clickTime = xScale.invert(brushStartX)
            const newSelection = snapToClosestSegment(clickTime)
            if (newSelection) {
              setCurrentSelectionRef.current(newSelection)
              onSelectionChangeRef.current(newSelection)
            }
            brushStartX = null
            return
          }

          if (selection) {
            const [x0, x1] = selection
            const minWidth = 40

            if (x1 - x0 < minWidth) {
              const clickX = (x0 + x1) / 2
              const clickTime = xScale.invert(clickX)
              const newSelection = snapToClosestSegment(clickTime)
              if (newSelection) {
                setCurrentSelectionRef.current(newSelection)
                onSelectionChangeRef.current(newSelection)
              }
              brushStartX = null
              return
            }

            const newSelection = {
              mode: 'range' as const,
              start: xScale.invert(x0),
              end: xScale.invert(x1),
            }
            setCurrentSelectionRef.current(newSelection)
            onSelectionChangeRef.current(newSelection)
            brushStartX = null
          }
        })

      interactionLayer.call(brush)
      interactionLayer
        .selectAll('.selection')
        .attr(
          'class',
          `
          selection
          fill-neutral-500/50
          stroke-foreground
          stroke-[1.5]
          `
        )
        .style('shape-rendering', 'auto')
        .attr('rx', 6)
        .attr('ry', 6)
      brushRef.current = brush
      selectionLineRef.current = null
    } else {
      const selectionLine = interactionLayer
        .append('line')
        .attr('class', 'selection-line')
        .attr('y1', 0)
        .attr('y2', chartHeight)
        .style('stroke', 'steelblue')
        .style('stroke-width', 2)
        .style('pointer-events', 'none')
        .style('opacity', 0)

      selectionLineRef.current = selectionLine

      interactionLayer
        .append('rect')
        .attr('class', 'overlay')
        .attr('width', chartWidth)
        .attr('height', chartHeight)
        .style('fill', 'none')
        .style('pointer-events', 'all')
        .on('click', (event) => {
          const [x] = d3.pointer(event)
          const newSelection = {
            mode: 'point' as const,
            time: xScale.invert(x),
          }
          setCurrentSelectionRef.current(newSelection)
          onSelectionChangeRef.current(newSelection)
        })

      brushRef.current = null
    }

    setIsReady(true)

    const selectionToRestore = isPlayingRef.current
      ? currentSelectionRef.current
      : lastValidSelectionRef.current || currentSelectionRef.current

    if (selectionMode === 'range' && brushRef.current && interactionLayerRef.current) {
         if (selectionToRestore?.mode === 'range') {
             const selectionPixels = [
                 xScale(selectionToRestore.start),
                 xScale(selectionToRestore.end)
             ] as [number, number]
             interactionLayerRef.current.call(brushRef.current.move, selectionPixels)
         } else {
             interactionLayerRef.current.call(brushRef.current.move, null)
         }
    } else if (selectionMode === 'point' && selectionLineRef.current) {
        if (selectionToRestore?.mode === 'point') {
            const xPos = xScale(selectionToRestore.time)
            selectionLineRef.current
                .attr('x1', xPos)
                .attr('x2', xPos)
                .style('opacity', 1)
        }
    }

    return () => {
      interactionLayer.remove()
      interactionLayerRef.current = null
      brushRef.current = null
      selectionLineRef.current = null
      setIsReady(false)
    }
  }, [g, xScale, chartWidth, chartHeight, selectionMode, snapToClosestSegment])

  useEffect(() => {
    if (currentSelection) {
      lastValidSelectionRef.current = currentSelection
    }
  }, [currentSelection])

  useEffect(() => {
    if (!xScale || !isReady) return

    if (isBrushingRef.current) return

    const selectionToRender = isPlaying
      ? currentSelection
      : lastValidSelectionRef.current || currentSelection

    if (selectionMode === 'range') {
      const brush = brushRef.current
      const interactionLayer = interactionLayerRef.current
      if (!brush || !interactionLayer) return

      if (selectionToRender?.mode === 'range') {
        const selectionPixels = [
          xScale(selectionToRender.start),
          xScale(selectionToRender.end),
        ] as d3.BrushSelection

        interactionLayer.call(brush.move, selectionPixels)
      } else {
         interactionLayer.call(brush.move, null)
      }
    } else {
      const selectionLine = selectionLineRef.current
      if (!selectionLine) return

      if (selectionToRender?.mode === 'point') {
        const xPos = xScale(selectionToRender.time)
        selectionLine.attr('x1', xPos).attr('x2', xPos).style('opacity', 1)
      } else {
        selectionLine.style('opacity', 0)
      }
    }
  }, [currentSelection, xScale, selectionMode, isPlaying, isReady])
}
