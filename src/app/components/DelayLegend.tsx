import React, { memo, useEffect, useMemo, useRef } from 'react'
import type { Line, Topology } from '@/types/metro'
import { RenderState } from '@/data/delayData'
import { MAX_LINE_THICKNESS } from '@/lib/constants'
import { getNiceSteps } from '@/lib/metro-utils'
import { connectionMap } from '@/data/topologyService'
import { lineColours } from '@/data/lineColours'

interface LegendItem {
  id: string
  delay: number
  label: React.ReactNode
  color: string
  style: 'solid' | 'dashed'
  thickness: number
  zIndex: number
}

const getMaxDelayForLine = (line: Line, renderState: RenderState) => {
  let max = 0
  line.connectionIds.forEach((cid) => {
    const conn = connectionMap.get(cid)
    if (conn) {
      ;[conn.stations.from, conn.stations.to].forEach((sid) => {
        const val = renderState.delays.get(`${line.id}::${sid}`) || 0
        if (val > max) max = val
      })
    }
  })
  return max
}

export const DelayLegend = memo(function DelayLegend({
  maxDelay,
  zoom,
  hoveredLine,
  selectedLine,
  renderState,
  topology,
  scaleMode,
  isFloating,
  mousePosRef,
  baseLineThickness,
  className,
}: {
  maxDelay: { delay: number; lineId: string }
  zoom: number
  hoveredLine?: Line
  selectedLine?: Line
  renderState: RenderState
  topology: Topology
  scaleMode: 'relative' | 'absolute'
  isFloating: boolean
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>
  baseLineThickness: number
  className?: string
}) {
  const baseThickness = baseLineThickness * zoom
  const rootRef = useRef<HTMLDivElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const getDiameter = (delay: number) => {
    if (maxDelay.delay === 0) return baseThickness
    const ratio = Math.min(delay / maxDelay.delay, 1.0)
    return (baseLineThickness + ratio * MAX_LINE_THICKNESS) * zoom
  }

  const maxDelayLine = useMemo(() => {
    if (maxDelay.delay <= 0) return undefined
    if (maxDelay.lineId) {
      const line = topology.lines.find((l) => l.id === maxDelay.lineId)
      if (line) return line
    }
    for (const [key, value] of renderState.delays.entries()) {
      if (Math.abs(value - maxDelay.delay) < 0.001) {
        const lineId = key.split('::')[0]
        return topology.lines.find((l) => l.id === lineId)
      }
    }
    return undefined
  }, [maxDelay, renderState.delays, topology.lines])

  const items: LegendItem[] = []

  items.push({
    id: 'base',
    delay: 0,
    label: '0 min',
    color: 'currentColor',
    style: 'dashed',
    thickness: 1,
    zIndex: 10,
  })

  const steps = getNiceSteps(maxDelay.delay)
  steps.forEach((step) => {
    if (step >= maxDelay.delay || Math.abs(step - maxDelay.delay) < maxDelay.delay * 0.05) return
    items.push({
      id: `step-${step}`,
      delay: step,
      label: `${step} min`,
      color: 'currentColor',
      style: 'dashed',
      thickness: 1,
      zIndex: 20,
    })
  })

  if (maxDelay.delay > 0) {
    const label = maxDelayLine ? (
      <span style={{ color: lineColours[maxDelayLine.colorIndex], fontWeight: 700 }}>
        {Math.round(maxDelay.delay)} min
      </span>
    ) : (
      <span style={{ fontWeight: 700 }}>
        {scaleMode === 'absolute' ? 'Limit: ' : ''}
        {Math.round(maxDelay.delay)} min
      </span>
    )

    items.push({
      id: 'max',
      delay: maxDelay.delay,
      label,
      color: maxDelayLine ? lineColours[maxDelayLine.colorIndex] : 'currentColor',
      style: 'solid',
      thickness: maxDelayLine ? 2 : 1,
      zIndex: 30,
    })
  }

  const addLineItem = (line: Line) => {
    const delay = getMaxDelayForLine(line, renderState)
    if (delay <= 0) return
    if (
      maxDelayLine &&
      line.id === maxDelayLine.id &&
      Math.abs(delay - maxDelay.delay) < 0.001
    )
      return

    items.push({
      id: `line-${line.id}`,
      delay,
      label: (
        <span style={{ color: lineColours[line.colorIndex], fontWeight: 700 }}>
          {Math.round(delay)} min
        </span>
      ),
      color: lineColours[line.colorIndex],
      style: 'solid',
      thickness: 2,
      zIndex: 100,
    })
  }

  if (selectedLine) addLineItem(selectedLine)
  if (hoveredLine && hoveredLine.id !== selectedLine?.id)
    addLineItem(hoveredLine)

  const maxDelayInItems = Math.max(maxDelay.delay, ...items.map((i) => i.delay))
  const maxDiameter = getDiameter(maxDelayInItems)
  const containerHeight = Math.max(24, maxDiameter)
  const containerWidth = Math.max(64, maxDiameter)

  useEffect(() => {
    if (!isFloating || !rootRef.current || !wrapperRef.current) {
      if (rootRef.current) {
        rootRef.current.style.position = ''
        rootRef.current.style.left = ''
        rootRef.current.style.top = ''
        rootRef.current.style.transform = ''
        rootRef.current.style.pointerEvents = ''
        rootRef.current.style.zIndex = ''
      }
      return
    }

    const updatePos = (x: number, y: number) => {
      if (!rootRef.current || !wrapperRef.current) return

      const wrapperTop = wrapperRef.current.offsetTop
      const wrapperLeft = wrapperRef.current.offsetLeft

      const offsetX = wrapperLeft + containerWidth / 2
      const offsetY = wrapperTop + containerHeight / 2

      rootRef.current.style.position = 'fixed'
      rootRef.current.style.left = '0'
      rootRef.current.style.top = '0'
      rootRef.current.style.zIndex = '9999'
      rootRef.current.style.pointerEvents = 'none'
      rootRef.current.style.transform = `translate(${x - offsetX}px, ${
        y - offsetY
      }px)`
    }

    updatePos(mousePosRef.current.x, mousePosRef.current.y)

    const handleMouseMove = (e: MouseEvent) => {
      updatePos(e.clientX, e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isFloating, containerWidth, containerHeight, mousePosRef])

  const itemPositions = items.map((item) => {
    const diameter = getDiameter(item.delay)
    return {
      ...item,
      idealY: -diameter / 2,
      actualY: -diameter / 2,
    }
  })

  itemPositions.sort((a, b) => b.idealY - a.idealY)

  const LABEL_HEIGHT = 24
  for (let i = 1; i < itemPositions.length; i++) {
    const prev = itemPositions[i - 1]
    const curr = itemPositions[i]
    if (curr.actualY > prev.actualY - LABEL_HEIGHT) {
      curr.actualY = prev.actualY - LABEL_HEIGHT
    }
  }

  const LABEL_GAP = 32

  return (
    <div ref={rootRef} className={`flex flex-col gap-1 select-none pb-1 pl-2 ${className || ''}`}>
      <div className='mb-1 flex flex-col'>
        <span className='text-[10px] uppercase tracking-wider font-bold text-foreground px-1.5 py-0.5 rounded backdrop-blur-[1px]'>
          Delay Scale
        </span>
        <span className='text-[9px] text-muted-foreground px-1.5 -mt-1'>
          {scaleMode === 'absolute' ? 'Fixed (Clamped)' : 'Dynamic (Local)'}
        </span>
      </div>

      <div ref={wrapperRef} className='relative flex items-center'>
        <div
          className='flex items-center justify-center relative text-foreground'
          style={{ width: containerWidth, height: containerHeight }}
        >
          {items.map((item) => {
            const diameter = getDiameter(item.delay)
            return (
              <React.Fragment key={item.id}>
                <div
                  className='absolute rounded-full'
                  style={{
                    width: diameter,
                    height: diameter,
                    borderColor: item.color,
                    borderStyle: item.style,
                    borderWidth: item.thickness,
                    zIndex: item.zIndex,
                    backgroundColor:
                      item.id === 'max' ? 'rgba(0,0,0,0.02)' : 'transparent',
                  }}
                />
              </React.Fragment>
            )
          })}
        </div>

        <div
          className='absolute left-full h-fit w-32'
          style={{ marginLeft: LABEL_GAP }}
        >
          {itemPositions.map((item) => {
            const startY = item.idealY - item.actualY
            const svgWidth = containerWidth / 2 + LABEL_GAP

            return (
              <div
                key={item.id}
                className='absolute left-0 text-xs font-mono flex items-center whitespace-nowrap text-foreground'
                style={{
                  top: '50%',
                  marginTop: item.actualY,
                  transform: 'translateY(-50%)',
                  zIndex: item.zIndex,
                }}
              >
                <svg
                  style={{
                    position: 'absolute',
                    left: -svgWidth,
                    top: '50%',
                    overflow: 'visible',
                    pointerEvents: 'none',
                  }}
                  width={svgWidth}
                  height={1}
                >
                  <path
                    d={`M 0 ${startY} L ${
                      containerWidth / 2
                    } ${startY} L ${svgWidth} 0`}
                    fill='none'
                    stroke={item.color}
                    strokeWidth={1}
                    opacity={item.style === 'dashed' ? 0.5 : 1}
                    strokeDasharray={
                      item.style === 'dashed' ? '3 3' : undefined
                    }
                  />
                </svg>

                <div className='flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white shadow-[0_0_8px_4px_white]'>
                  <span
                    className='w-2 h-2 rounded-full inline-block shadow-sm shrink-0'
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
})
