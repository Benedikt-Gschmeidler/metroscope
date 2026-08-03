'use client'

import React, { useRef, useState, useLayoutEffect, useEffect, useMemo } from 'react'
import { Spinner } from '@/components/ui/spinner'
import { throttle } from 'lodash'

import { TimeSelection, TimelineProps } from './types'
import { useTimelineData } from './useTimelineData'
import { useTimelineCore } from './useTimelineCore'
import { useTimelineSegments } from './useTimelineSegments'
import { useTimelineEventDots } from './useTimelineEventDots'
import { useTimelineAxes } from './useTimelineAxes'
import { useTimelineSelection } from './useTimelineSelection'

interface TimelineTooltipHandle {
  show: (date: Date, x: number) => void
  showRange: (
    startDate: Date,
    startX: number,
    endDate: Date,
    endX: number
  ) => void
  hide: () => void
}

const TimelineTooltip = React.forwardRef<TimelineTooltipHandle, object>(
  (_, ref) => {
    const [state, setState] = useState<{
      type: 'single' | 'range'
      date: Date
      x: number
      endDate?: Date
      endX?: number
    } | null>(null)

    React.useImperativeHandle(ref, () => ({
      show: (date, x) => setState({ type: 'single', date, x }),
      showRange: (startDate, startX, endDate, endX) =>
        setState({ type: 'range', date: startDate, x: startX, endDate, endX }),
      hide: () => setState(null),
    }))

    if (!state) return null

    const renderTooltip = (date: Date, x: number, key: string) => (
      <div
        key={key}
        className='pointer-events-none absolute top-0 z-50 h-full'
        style={{ left: x }}
      >
        <div className='absolute left-0 top-0 h-[180px] w-px -translate-x-1/2 bg-foreground' />

        <div className='absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-foreground px-3 py-1.5 text-xs text-background animate-in fade-in-0 zoom-in-95'>
          {date.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          })}
          <div className='absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 rounded-[1px] bg-foreground' />
        </div>
      </div>
    )

    if (state.type === 'single') {
      return renderTooltip(state.date, state.x, 'single')
    }

    return (
      <>
        {renderTooltip(state.date, state.x, 'start')}
        {state.endDate &&
          state.endX !== undefined &&
          renderTooltip(state.endDate, state.endX, 'end')}
      </>
    )
  }
)
TimelineTooltip.displayName = 'TimelineTooltip'

const useResizeObserver = <T extends HTMLElement>(ref: React.RefObject<T>) => {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      if (entries[0]) {
        setWidth(entries[0].contentRect.width)
      }
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

type ExtendedTimelineProps = TimelineProps & {
  pinnedLineIds?: string[]
  hoveredLineId?: string | null
}

const Timeline: React.FC<ExtendedTimelineProps> = ({
  year,
  granularity,
  selectionMode,
  minSegmentWidth = 80,
  height = 120,
  onSelectionChange,
  isPlaying,
  timelineSpeed,
  selection,
  dataset,
  topology,
  mapViewBounds,
  highlightedLineIds = [],
  pinnedLineIds,
  hoveredLineId,
  shouldDimInactiveDots = true,
}) => {
  const svgRef = useRef<SVGSVGElement>(null!)
  const containerRef = useRef<HTMLDivElement>(null!)
  const containerWidth = useResizeObserver(containerRef)

  const [currentSelection, setCurrentSelection] =
    useState<TimeSelection | null>(selection || null)

  useEffect(() => {
    if (selection !== undefined && !isPlaying) {
      setCurrentSelection(selection)
    }
  }, [selection, isPlaying])

  const onSelectionChangeRef = useRef(onSelectionChange)
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange
  }, [onSelectionChange])

  const throttledOnSelectionChange = useMemo(
    () =>
      throttle((newSelection: TimeSelection) => {
        onSelectionChangeRef.current(newSelection)
      }, 32),
    []
  )

  useEffect(() => {
    return () => {
      throttledOnSelectionChange.cancel()
    }
  }, [throttledOnSelectionChange])

  const { allSegments, visibleIndices } = useTimelineData(
    containerRef,
    year,
    granularity,
    minSegmentWidth,
    containerWidth,
    dataset,
    topology
  )

  const { g, xScale, margin, chartWidth, chartHeight } = useTimelineCore(
    svgRef,
    allSegments,
    containerWidth,
    height,
    minSegmentWidth
  )

  const wrapperRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<TimelineTooltipHandle>(null)
  const isDraggingRef = useRef(false)

  const latestDataRef = useRef({ xScale, margin, chartWidth })
  useLayoutEffect(() => {
    latestDataRef.current = { xScale, margin, chartWidth }
  }, [xScale, margin, chartWidth])

  useEffect(() => {
    const wrapper = wrapperRef.current
    const container = containerRef.current
    if (!wrapper || !container) return

    const calculatePoint = (clientX: number) => {
      const { xScale, margin } = latestDataRef.current
      if (!xScale || !margin) return null

      const wrapperRect = wrapper.getBoundingClientRect()
      const visualX = clientX - wrapperRect.left
      const xInChart = visualX + container.scrollLeft - margin.left
      const date = xScale.invert(xInChart)
      return { visualX, date, xInChart }
    }

    const onHoverMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return

      const point = calculatePoint(e.clientX)
      if (!point) return
      const { visualX, date, xInChart } = point
      const { chartWidth } = latestDataRef.current

      if (xInChart >= 0 && xInChart <= chartWidth) {
        tooltipRef.current?.show(date, visualX)
      } else {
        tooltipRef.current?.hide()
      }
    }

    const onMouseLeave = () => {
      if (!isDraggingRef.current) {
        tooltipRef.current?.hide()
      }
    }

    wrapper.addEventListener('mousemove', onHoverMove)
    wrapper.addEventListener('mouseleave', onMouseLeave)

    return () => {
      wrapper.removeEventListener('mousemove', onHoverMove)
      wrapper.removeEventListener('mouseleave', onMouseLeave)
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return
      const isMostlyVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX)
      if (!isMostlyVertical) return

      e.preventDefault()
      container.scrollLeft += e.deltaY
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])

  useTimelineSegments(g, allSegments, xScale, chartHeight)
  useTimelineEventDots(
    g,
    allSegments,
    visibleIndices,
    xScale,
    chartHeight,
    mapViewBounds,
    pinnedLineIds || highlightedLineIds,
    hoveredLineId,
    shouldDimInactiveDots
  )
  useTimelineAxes(g, xScale, chartHeight, granularity)

  useTimelineSelection(
    g,
    xScale,
    chartWidth,
    chartHeight,
    selectionMode,
    currentSelection,
    onSelectionChange,
    setCurrentSelection,
    isPlaying,
    allSegments,
    {
      start: () => {
        isDraggingRef.current = true
      },
      update: (start, end, startX, endX) => {
        if (!margin || !containerRef.current) return

        const scrollLeft = containerRef.current.scrollLeft
        const visualStartX = startX + margin.left - scrollLeft
        const visualEndX = endX + margin.left - scrollLeft

        tooltipRef.current?.showRange(start, visualStartX, end, visualEndX)

        throttledOnSelectionChange({
          mode: 'range',
          start,
          end,
        })
      },
      end: () => {
        isDraggingRef.current = false
        tooltipRef.current?.hide()
      },
    }
  )

  const currentSelectionRef = useRef<TimeSelection | null>(currentSelection)

  useEffect(() => {
    currentSelectionRef.current = currentSelection
  }, [currentSelection])

  const animationFrameRef = useRef<number | null>(null)
  const lastTimestampRef = useRef<number | null>(null)

  useEffect(() => {
    if (
      !isPlaying ||
      !currentSelection ||
      !xScale ||
      !containerRef.current ||
      !margin
    ) {
      return
    }

    const container = containerRef.current
    const containerClientWidth = container.clientWidth

    let selectionCenterX: number

    if (currentSelection.mode === 'point') {
      selectionCenterX = xScale(currentSelection.time)
    } else {
      const startX = xScale(currentSelection.start)
      const endX = xScale(currentSelection.end)
      selectionCenterX = (startX + endX) / 2
    }

    selectionCenterX += margin.left

    const desiredScrollLeft = selectionCenterX - containerClientWidth / 2

    container.scrollTo({
      left: desiredScrollLeft,
      behavior: 'smooth',
    })
  }, [currentSelection, isPlaying, xScale, margin])

  useEffect(() => {
    if (!isPlaying || !xScale) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      return
    }

    if (animationFrameRef.current === null) {
      lastTimestampRef.current = null
    }

    const animate = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp
        animationFrameRef.current = requestAnimationFrame(animate)
        return
      }

      const dt = (timestamp - lastTimestampRef.current) / 1000
      lastTimestampRef.current = timestamp
      const timeAdvance = dt * timelineSpeed

      const timelineEnd = xScale.domain()[1]
      const prevSelection = currentSelectionRef.current

      if (!prevSelection) {
         animationFrameRef.current = requestAnimationFrame(animate)
         return
      }

      let newSelection: TimeSelection | null = null

      if (prevSelection.mode === 'point') {
        const newTime = new Date(prevSelection.time.getTime() + timeAdvance)
        if (newTime >= timelineEnd) {
          return 
        }
        newSelection = { ...prevSelection, time: newTime }
      } else if (prevSelection.mode === 'range') {
        const rangeDuration =
          prevSelection.end.getTime() - prevSelection.start.getTime()
        const newStart = new Date(prevSelection.start.getTime() + timeAdvance)
        const newEnd = new Date(newStart.getTime() + rangeDuration)

        if (newEnd >= timelineEnd) {
           return
        }
        newSelection = { ...prevSelection, start: newStart, end: newEnd }
      }

      if (newSelection) {
          currentSelectionRef.current = newSelection
          throttledOnSelectionChange(newSelection)
          setCurrentSelection(newSelection)
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [isPlaying, xScale, timelineSpeed, throttledOnSelectionChange])

  useEffect(() => {
    if (currentSelection && !isPlaying) {
       throttledOnSelectionChange(currentSelection)
    }
  }, [currentSelection, isPlaying, throttledOnSelectionChange])

  return (
    <div ref={wrapperRef} className='relative w-full'>
      <TimelineTooltip ref={tooltipRef} />

      <div ref={containerRef} className='relative w-full overflow-x-auto'>
        <svg ref={svgRef} className='cursor-crosshair' />

        {visibleIndices && xScale && margin && (
          <div
            className='absolute'
            style={{
              top: `${margin.top}px`,
              left: `${margin.left}px`,
              width: `${chartWidth}px`,
              height: `${chartHeight}px`,
              pointerEvents: 'none',
            }}
          >
            {allSegments
              .slice(visibleIndices.start, visibleIndices.end)
              .map((segment) => {
                if (!segment.isLoading) return null

                const x = xScale(segment.startDate)
                const segmentWidth =
                  xScale(segment.endDate) - xScale(segment.startDate)

                return (
                  <div
                    key={segment.startDate.getTime()}
                    className='absolute top-0 flex h-full items-center justify-center'
                    style={{
                      left: `${x}px`,
                      width: `${segmentWidth}px`,
                    }}
                  >
                    <Spinner />
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Timeline
