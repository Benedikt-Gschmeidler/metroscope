import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import { throttle } from 'lodash'
import type { Topology, Line } from '@/types/metro'
import MapCanvas, { MapCanvasActions } from './MapCanvas'
import InfoPanel from './InfoPanel'
import Timeline from './Timeline'
import MetaPanel from './MetaPanel'
import { SelectionMode, TimelineControl } from './TimelineControl'
import { DelayLegend } from './DelayLegend'
import { DatasetMap, processRawData, RenderState } from '@/data/delayData'
import {
  TIME_RANGE,
} from '@/lib/constants'
import { Granularity, TimeSelection } from './Timeline/types'
import {
  stationMap,
  connectionMap,
  stationByIdMap,
  lineByIdMap,
} from '@/data/topologyService'
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog'
import { Layers } from 'lucide-react'


const MouseFollowTooltip = ({
  content,
  visible,
  mousePosRef,
  overridePos,
}: {
  content: React.ReactNode
  visible: boolean
  mousePosRef: React.MutableRefObject<{ x: number; y: number }>
  overridePos?: { x: number; y: number } | null
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!visible) return

    const updatePosition = (x: number, y: number) => {
      if (ref.current) {
        ref.current.style.transform = `translate(${x}px, ${y}px)`
      }
    }

    if (overridePos) {
        updatePosition(overridePos.x, overridePos.y)
    } else {
        updatePosition(mousePosRef.current.x, mousePosRef.current.y)
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!overridePos) {
          updatePosition(e.clientX, e.clientY)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [visible, mousePosRef, overridePos])

  if (!mounted || !visible) return null

  return createPortal(
    <div
      ref={ref}
      className='fixed top-0 left-0 z-[100] pointer-events-none'
      style={{ willChange: 'transform' }}
    >
      <div className='flex flex-col items-center -translate-x-1/2 -translate-y-full pb-2'>
        <div className='bg-foreground text-background animate-in fade-in-0 zoom-in-95 rounded-md px-3 py-1.5 text-xs text-balance shadow-md'>
          {content}
        </div>
        <div className='h-2.5 w-2.5 -mt-1.5 rotate-45 rounded-[2px] bg-foreground' />
      </div>
    </div>,
    document.body,
  )
}

interface MetroMapProps {
  topology: Topology
}

export default function MetroMap({ topology }: MetroMapProps) {
  const [hoveredLine, setHoveredLine] = useState<Line | undefined>(undefined)
  const [hoveredStation, setHoveredStation] = useState<{
    id: string | null
    source: 'map' | 'panel'
  }>({ id: null, source: 'map' })
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('range')
  const [selectedLines, setSelectedLines] = useState<Line[]>([])
  const [pinnedLineIds, setPinnedLineIds] = useState<Set<string>>(new Set())
  const [isFocusMatchEnabled, setIsFocusMatchEnabled] = useState(false)
  const [keepDelayConsistent, setKeepDelayConsistent] = useState(true)

  const [baseLineThickness, setBaseLineThickness] = useState(0.7)
  const [delayCutoff, setDelayCutoff] = useState(8640)


  const [mapViewBounds, setMapViewBounds] = useState<{
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null>(null)
  const [currentZoom, setCurrentZoom] = useState(1)
  const [playbackSpeed, setPlaybackSpeed] = useState(2)
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(false)
  const [isCtrlHeld, setIsCtrlHeld] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)



  const [dataset, setDataset] = useState<DatasetMap | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const workerRef = useRef<Worker | null>(null)
  const [isWorkerReady, setIsWorkerReady] = useState(false)

  const [renderState, setRenderState] = useState<RenderState>({
    delays: new Map(),
    maxDelay: { delay: 0, lineId: '' },
  })

  const [currentTimeSelection, setCurrentTimeSelection] =
    useState<TimeSelection>({
      mode: 'range',
      start: TIME_RANGE.min,
      end: new Date(new Date(TIME_RANGE.min).setMonth(TIME_RANGE.min.getMonth() + 1)),
    })

  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../../workers/delay.worker.ts', import.meta.url),
    )

    workerRef.current.onmessage = (e) => {
      const { type, payload, success } = e.data

      if (type === 'DATA_LOADED') {
        if (success) {
          setIsWorkerReady(true)
        } else {
          console.error('Worker failed to load data')
        }
      } else if (type === 'RESULT') {
        setRenderState(payload)
      }
    }

    async function loadData() {
      try {
        const basePath = process.env.NODE_ENV === 'production' ? '/metroscope' : '';
        const response = await fetch(`${basePath}/data/preprocessed-delays.json`)
        const json = await response.json()
        workerRef.current?.postMessage({ type: 'LOAD_DATA', payload: json })
        const optimizedData = processRawData(json)
        setDataset(optimizedData)
      } catch (error) {
        console.error('Failed to load delay data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      workerRef.current?.terminate()
    }
  }, [])

  const handleLineClick = useCallback(
    (lineId: string | null) => {
      if (!lineId) return
      const line = topology.lines.find((l) => l.id === lineId)
      if (line) {
        setSelectedLines((prev) => {
          if (prev.find((l) => l.id === line.id)) return prev
          return [...prev, line]
        })
      }
    },
    [topology.lines],
  )

  const handleLineHover = useCallback(
    (lineId: string | null) => {
      const line = topology.lines.find((l) => l.id === lineId)
      setHoveredLine(line)
    },
    [topology.lines],
  )

  const handleLineHoverEnd = useCallback(() => {
    setHoveredLine(undefined)
  }, [])

  const handleStationHover = useCallback(
    (stationId: string | null, source: 'map' | 'panel' = 'map') => {
      setHoveredStation({ id: stationId, source })
    },
    [],
  )

  const handleDragStart = useCallback(() => {
    setHoveredLine(undefined)
    setHoveredStation({ id: null, source: 'map' })
  }, [])

  const postMessageThrottled = useRef(
    throttle((worker: Worker, payload: { selection: TimeSelection }) => {
      worker.postMessage({ type: 'CALCULATE', payload })
    }, 100),
  ).current

  useEffect(() => {
    if (!isWorkerReady || !workerRef.current) return

    postMessageThrottled(workerRef.current, {
      selection: currentTimeSelection,
    })
  }, [
    currentTimeSelection,
    granularity,
    isWorkerReady,
    isTimelinePlaying,
    keepDelayConsistent,
    postMessageThrottled,
  ])

  const mapRef = useRef<MapCanvasActions>(null)

  const handleMapViewChange = useMemo(
    () =>
      throttle(
        (bounds: {
          minX: number
          maxX: number
          minY: number
          maxY: number
          zoom: number
        }) => {
          setMapViewBounds(bounds)
          setCurrentZoom(bounds.zoom)
        },
        100,
      ),
    [],
  )

  const handleFocusLine = (lineId: string) => {
    const line = lineByIdMap.get(lineId)
    if (!line || !mapRef.current) return

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    line.connectionIds.forEach((cid) => {
      const conn = connectionMap.get(cid)
      if (conn) {
        ;[conn.stations.from, conn.stations.to].forEach((sid) => {
          const s = stationByIdMap.get(sid)
          if (s) {
            minX = Math.min(minX, s.xMetro)
            maxX = Math.max(maxX, s.xMetro)
            minY = Math.min(minY, s.yMetro)
            maxY = Math.max(maxY, s.yMetro)
          }
        })
      }
    })

    if (minX !== Infinity) {
      mapRef.current.focusOnPoints(
        { x: minX, y: minY },
        { x: maxX, y: maxY },
        0.4,
      )
    }
  }

  const handleFocusAll = () => {
    if (selectedLines.length === 0 || !mapRef.current) return

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity

    selectedLines.forEach((line) => {
      line.connectionIds.forEach((cid) => {
        const conn = connectionMap.get(cid)
        if (conn) {
          ;[conn.stations.from, conn.stations.to].forEach((sid) => {
            const s = stationByIdMap.get(sid)
            if (s) {
              minX = Math.min(minX, s.xMetro)
              maxX = Math.max(maxX, s.xMetro)
              minY = Math.min(minY, s.yMetro)
              maxY = Math.max(maxY, s.yMetro)
            }
          })
        }
      })
    })

    if (minX !== Infinity) {
      mapRef.current.focusOnPoints(
        { x: minX, y: minY },
        { x: maxX, y: maxY },
        0.4,
      )
    }
  }

  const handleToggleHighlight = (lineId: string) => {
    setPinnedLineIds((prev) => {
      const next = new Set(prev)
      if (next.has(lineId)) {
        next.delete(lineId)
      } else {
        next.add(lineId)
      }
      return next
    })
  }

  const handleToggleHighlightAll = () => {
    const allSelectedPinned = selectedLines.every((l) =>
      pinnedLineIds.has(l.id),
    )

    setPinnedLineIds((prev) => {
      const next = new Set(prev)
      selectedLines.forEach((l) => {
        if (allSelectedPinned) {
          next.delete(l.id)
        } else {
          next.add(l.id)
        }
      })
      return next
    })
  }

  const toggleTimelinePlay = () => {
    setIsTimelinePlaying(!isTimelinePlaying)
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return

      if (e.code === 'Space') {
        e.preventDefault()
        setIsTimelinePlaying((prev) => !prev)
      }
      if (e.key === 'Control') {
        setIsCtrlHeld(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') {
        setIsCtrlHeld(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handleSelectionChange = useCallback(
    (selection: TimeSelection | null) => {
      setCurrentTimeSelection(selection!)
    },
    [],
  )

  const highlightedLineIds = useMemo(() => {
    const ids = new Set(pinnedLineIds)
    if (hoveredLine) {
      ids.add(hoveredLine.id)
    }
    return Array.from(ids)
  }, [pinnedLineIds, hoveredLine])

  const pinnedLineIdsArray = useMemo(
    () => Array.from(pinnedLineIds),
    [pinnedLineIds],
  )
  const effectiveDelayCutoff = keepDelayConsistent
    ? delayCutoff
    : renderState.maxDelay.delay > 0
      ? renderState.maxDelay.delay
      : delayCutoff

  const [tooltipPos, setTooltipPos] = useState<{ x: number, y: number } | null>(null)

  useEffect(() => {
     if (hoveredStation.id && hoveredStation.source === 'panel' && mapRef.current) {
         const pos = mapRef.current.getStationScreenPosition(hoveredStation.id)
         setTooltipPos(pos)
     } else {
         setTooltipPos(null)
     }
  }, [hoveredStation])

  if (isLoading) return <div>Loading Delay Data...</div>

  const tooltipContent =
    hoveredStation.id ? (
      <p className='font-medium'>
        {stationMap.get(hoveredStation.id) || hoveredStation.id}
      </p>
    ) : hoveredLine ? (
      <p className='font-medium'>{hoveredLine.id || hoveredLine.id}</p>
    ) : null

  return (
    <>
      <MouseFollowTooltip
        visible={
          (!!hoveredLine ||
            (!!hoveredStation.id)) &&
          !isCtrlHeld
        }
        content={tooltipContent}
        mousePosRef={mousePos}
        overridePos={tooltipPos}
      />

      <div className='fixed inset-0 z-0 pointer-events-auto'>
        <MapCanvas
          topology={topology}
          renderState={renderState}
          highlightedLineIds={highlightedLineIds}
          pinnedLineIds={pinnedLineIdsArray}
          hoveredLineId={hoveredLine?.id || null}
          hoveredStationId={hoveredStation.id}
          onClickLine={handleLineClick}
          onHoverLine={handleLineHover}
          onHoverEndLine={handleLineHoverEnd}
          onHoverStation={handleStationHover}
          onDragStart={handleDragStart}
          ref={mapRef}
          onViewChange={handleMapViewChange}
          baseLineThickness={baseLineThickness}
          delayCutoff={effectiveDelayCutoff}

        />
      </div>

      <div className='fixed inset-0 z-10 flex flex-col pointer-events-none'>
        <div className='relative flex-1 w-full min-h-0'>
          <div className='absolute top-4 left-4 pointer-events-auto'>
            <MetaPanel
              keepDelayConsistent={keepDelayConsistent}
              onKeepDelayConsistentChange={setKeepDelayConsistent}
              baseLineThickness={baseLineThickness}
              onBaseLineThicknessChange={setBaseLineThickness}
              delayCutoff={delayCutoff}
              onDelayCutoffChange={setDelayCutoff}

            />
          </div>

          <div className='absolute bottom-4 left-4 right-4 sm:right-auto flex flex-col-reverse sm:flex-row pointer-events-none items-start sm:items-end gap-3'>
            <TimelineControl
              granularity={granularity}
              selectionMode={selectionMode}
              isTimelinePlaying={isTimelinePlaying}
              onGranularityChange={setGranularity}
              onSelectionModeChange={setSelectionMode}
              onClickTimelinePlay={toggleTimelinePlay}
              currentTimeSelection={currentTimeSelection}
              onTimeSelectionChange={handleSelectionChange}
              isFocusMatchEnabled={isFocusMatchEnabled}
              onFocusMatchChange={setIsFocusMatchEnabled}
              speed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
              className='pointer-events-auto'
            />
            <DelayLegend
              maxDelay={{ delay: effectiveDelayCutoff, lineId: '' }}
              zoom={currentZoom}
              hoveredLine={hoveredLine}
              selectedLine={selectedLines[selectedLines.length - 1]}
              renderState={renderState}
              topology={topology}
              scaleMode={keepDelayConsistent ? 'absolute' : 'relative'}
              isFloating={isCtrlHeld}
              mousePosRef={mousePos}
              baseLineThickness={baseLineThickness}
              className="hidden sm:flex"
            />
          </div>

          {selectedLines.length > 0 && (
            <div className='hidden sm:flex absolute right-4 top-4 max-h-[calc(100%-1rem)] w-[408px] pointer-events-none flex-col overflow-visible'>
              <InfoPanel
                renderState={renderState}
                selectedLines={selectedLines}
                onCloseLine={(id) => {
                  setSelectedLines((prev) => prev.filter((l) => l.id !== id))
                  setPinnedLineIds((prev) => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                  })
                }}
                onFocusLine={handleFocusLine}
                onToggleHighlightLine={handleToggleHighlight}
                highlightedLineIds={Array.from(pinnedLineIds)}
                onCloseAll={() => {
                  setSelectedLines([])
                  setPinnedLineIds(new Set())
                }}
                onFocusAll={handleFocusAll}
                onToggleHighlightAll={handleToggleHighlightAll}
                hoveredLineId={hoveredLine?.id}
                hoveredStationId={
                  hoveredStation.source === 'map' ? hoveredStation.id : null
                }
                onHoverStation={(id) => handleStationHover(id, 'panel')}
              />
            </div>
          )}

          {selectedLines.length > 0 && (
            <div className='sm:hidden absolute right-4 top-4 pointer-events-auto'>
                 <Dialog open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
                    <DialogTrigger asChild>
                        <button className="flex items-center justify-center h-14 w-14 bg-card/95 backdrop-blur-xl border border-border shadow-lg rounded-xl transition-all active:scale-95">
                             <div className="relative flex items-center justify-center">
                                <Layers className="w-6 h-6 text-primary" />
                                <div className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
                                    {selectedLines.length}
                                </div>
                             </div>
                        </button>
                    </DialogTrigger>
                    <DialogContent showCloseButton={false} className="!rounded-b-none !rounded-t-xl w-full h-[80vh] max-w-none bottom-0 top-auto translate-y-0 p-0 gap-0 border-x-0 border-b-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:max-w-lg outline-none overflow-hidden">
                        <DialogTitle className="sr-only">Selected Lines</DialogTitle>
                        <div className="h-full w-full overflow-y-auto p-0">
                            <InfoPanel
                                renderState={renderState}
                                selectedLines={selectedLines}
                                onCloseLine={(id) => {
                                setSelectedLines((prev) => prev.filter((l) => l.id !== id))
                                setPinnedLineIds((prev) => {
                                    const next = new Set(prev)
                                    next.delete(id)
                                    return next
                                })
                                }}
                                onFocusLine={handleFocusLine}
                                onToggleHighlightLine={handleToggleHighlight}
                                highlightedLineIds={Array.from(pinnedLineIds)}
                                onCloseAll={() => {
                                setSelectedLines([])
                                setPinnedLineIds(new Set())
                                }}
                                onFocusAll={handleFocusAll}
                                onToggleHighlightAll={handleToggleHighlightAll}
                                hoveredLineId={hoveredLine?.id}
                                hoveredStationId={
                                hoveredStation.source === 'map' ? hoveredStation.id : null
                                }
                                onHoverStation={(id) => handleStationHover(id, 'panel')}
                                onCloseDrawer={() => setMobileDrawerOpen(false)}
                                className="h-full"
                                isMobile={true}
                            />
                        </div>
                    </DialogContent>
                 </Dialog>
            </div>
          )}
        </div>

        <div
          className='h-[200px] bg-white border-t border-gray-300 pointer-events-auto relative shrink-0'
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
        >
          <Timeline
            year={2024}
            granularity={granularity}
            selectionMode={selectionMode}
            minSegmentWidth={140}
            height={200}
            selection={currentTimeSelection}
            onSelectionChange={handleSelectionChange}
            isPlaying={isTimelinePlaying}
            timelineSpeed={1000 * 60 * 60 * 24 * playbackSpeed}
            dataset={dataset}
            topology={topology}
            mapViewBounds={isFocusMatchEnabled ? mapViewBounds : null}
            pinnedLineIds={Array.from(pinnedLineIds)}
            hoveredLineId={hoveredLine?.id || null}
            shouldDimInactiveDots={true}
          />
        </div>
      </div>
    </>
  )
}
