import { Line } from '@/types/metro'
import React, { useState, useEffect, useRef } from 'react'
import { X, Eye, EyeOff, Focus, ChevronsUp, ChevronsDown, Layers, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { InfoPanelProps } from './types'
import { ActionButton } from './ActionButton'
import { SingleLinePanel } from './SingleLinePanel'

export default function InfoPanel({
  selectedLines,
  renderState,
  onCloseLine,
  onFocusLine,
  onToggleHighlightLine,
  highlightedLineIds,
  onCloseAll,
  onFocusAll,
  onToggleHighlightAll,
  onCloseDrawer,
  className,
  hoveredLineId,
  hoveredStationId,
  onHoverStation,
  isMobile = false,
}: InfoPanelProps) {
  const [expandedLineId, setExpandedLineId] = useState<string | null>(null)
  const [isMinimized, setIsMinimized] = useState(false)
  const [minimizedPeekId, setMinimizedPeekId] = useState<string | null>(null)
  const [isOverflowOpen, setIsOverflowOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const handleToggleOverflow = (open: boolean) => {
    if (open) {
        setIsOverflowOpen(true)
    } else {
        setIsClosing(true)
        setTimeout(() => {
            setIsOverflowOpen(false)
            setIsClosing(false)
        }, 500)
    }
  }
  
  const [containerWidth, setContainerWidth] = useState(0)
  const [headerHeight, setHeaderHeight] = useState(0)
  
  const containerRef = useRef<HTMLDivElement>(null)
  const compactLayerRef = useRef<HTMLDivElement>(null)
  
  const prevSelectedLinesRef = useRef<Line[]>(selectedLines)
  const lastPeekRef = useRef<Line | null>(null)

  useEffect(() => {
    if (!isMinimized) {
      setMinimizedPeekId(null)
    }
  }, [isMinimized])

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            setContainerWidth(entry.contentRect.width)
        }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!compactLayerRef.current) return
    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
             if (entry.target instanceof HTMLElement) {
                 setHeaderHeight(entry.target.offsetHeight)
             }
        }
    })
    observer.observe(compactLayerRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (expandedLineId && !selectedLines.find((l) => l.id === expandedLineId)) {
      setExpandedLineId(null)
    }
  }, [selectedLines, expandedLineId])

  useEffect(() => {
    const prevLines = prevSelectedLinesRef.current
    const currentLines = selectedLines

    if (currentLines.length > prevLines.length) {
      const newLines = currentLines.filter(
        (l) => !prevLines.find((pl) => pl.id === l.id),
      )

      const anyPrevHighlighted =
        prevLines.length > 0 &&
        prevLines.some((l) => highlightedLineIds.includes(l.id))

      if (anyPrevHighlighted) {
        newLines.forEach((l) => {
          if (!highlightedLineIds.includes(l.id)) {
            onToggleHighlightLine(l.id)
          }
        })
      }
    }
    prevSelectedLinesRef.current = currentLines
  }, [selectedLines, highlightedLineIds, onToggleHighlightLine])

  const toggleExpandLine = (lineId: string) => {
    if (isMinimized) {
        if (minimizedPeekId === lineId) {
             setMinimizedPeekId(null)
        } else {
            setMinimizedPeekId(lineId)
            setExpandedLineId(lineId)
        }
    } else {
        setExpandedLineId((prev) => (prev === lineId ? null : lineId))
    }
  }

  const toggleMinimize = () => {
    setIsMinimized((prev) => !prev)
    setMinimizedPeekId(null)
    if (!isMinimized) {
       setExpandedLineId(null)
    }
  }

  const areAllHighlighted =
    selectedLines.length > 0 &&
    selectedLines.every((l) => highlightedLineIds.includes(l.id))

  if (selectedLines.length === 0) return null

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col max-h-full min-h-0 pointer-events-none relative',
          'overflow-visible',
          className,
        )}
        style={{
            clipPath: 'inset(0 -8px -8px -8px)',
            minHeight: selectedLines.length > 1 && isMinimized && headerHeight ? `${headerHeight + 20}px` : undefined,
            transition: 'min-height 0.3s ease'
        }}
      >
        {(selectedLines.length > 1 || isMobile) && (
            <div className={cn(
             'absolute top-0 left-0 right-0 z-50 p-3 pl-4 pointer-events-auto shrink-0 transition-all',
             isMobile 
                ? 'bg-background border-b border-border'
                : 'bg-card/95 backdrop-blur-xl border border-border shadow-md rounded-xl'
          )}>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2'>
                <Layers className='h-4 w-4 text-muted-foreground' />
                <span className='text-sm font-bold'>
                  {selectedLines.length > 1 ? `${selectedLines.length} Lines Selected` : selectedLines[0]?.id || 'Selected Line'}
                </span>
              </div>
              <div className='flex items-center gap-1'>
                {!isMobile && (
                    <ActionButton
                    onClick={toggleMinimize}
                    icon={isMinimized ? ChevronsDown : ChevronsUp}
                    label={isMinimized ? 'Expand Panel' : 'Minimize Panel'}
                    />
                )}
                <ActionButton
                  onClick={onFocusAll}
                  icon={Focus}
                  label='Focus All'
                />
                <ActionButton
                  onClick={onToggleHighlightAll}
                  icon={areAllHighlighted ? Eye : EyeOff}
                  label={areAllHighlighted ? 'Unhighlight All' : 'Highlight All'}
                  isActive={areAllHighlighted}
                />
                {!isMobile ? (
                    <>
                        <div className='w-px h-4 bg-border/50 mx-1' />
                        <ActionButton
                        onClick={onCloseAll}
                        icon={Trash2}
                        label='Close All'
                        variant='destructive'
                        />
                    </>
                ) : (
                    <>
                        <div className='w-px h-4 bg-border/50 mx-1' />
                        <ActionButton
                        onClick={onCloseAll}
                        icon={Trash2}
                        label='Clear All'
                        variant='destructive'
                        />
                        <ActionButton
                        onClick={onCloseDrawer}
                        icon={X}
                        label='Close Drawer'
                        />
                    </>
                )}
              </div>
            </div>
          </div>
        )}

        {selectedLines.length > 1 && (
          <>

             <div 
               className={cn(
                 'absolute left-0 right-0 z-40 px-2 pb-2 pt-16 pointer-events-auto transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)]',
                 isMobile 
                    ? 'bg-background/50 border-b border-border backdrop-blur-md' 
                    : 'bg-card/95 backdrop-blur-md border-b border-x border-border shadow-sm rounded-xl',
                 isMinimized ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
               )}
               style={{ top: 0 }}
               ref={compactLayerRef}
             >
               <div 
                   ref={containerRef}
                   className='w-full transition-all duration-500'
               >
                 {(() => {
                    const DOT_SIZE = 40
                    const GAP = 4
                    const BTN_SIZE = 40
                    const ITEM_WIDTH = DOT_SIZE + GAP
                    
                    if (containerWidth === 0) return null

                    const capacityFull = Math.floor((containerWidth + GAP) / ITEM_WIDTH)
                    const capacityBtn = Math.floor((containerWidth + GAP - (BTN_SIZE + GAP)) / ITEM_WIDTH)
                    
                    const fitsAll = selectedLines.length <= capacityFull
                    const showAll = isOverflowOpen || fitsAll
                    
                    const visibleCount = showAll ? selectedLines.length : Math.max(1, capacityBtn)
                    const visibleLines = selectedLines.slice(0, visibleCount)
                    
                    const overflowCount = selectedLines.length - visibleLines.length

                     const isSingleLineFull = !isOverflowOpen && (visibleLines.length === capacityFull || overflowCount > 0)
                     const justifyClass = (isOverflowOpen || isSingleLineFull) ? 'justify-between' : 'justify-start'
                     
                     const showCollapse = isOverflowOpen && selectedLines.length > capacityFull
                     const totalGridItems = visibleLines.length + (showCollapse ? 1 : 0)
                     const remainder = totalGridItems % capacityFull
                     const spacersCount = (isOverflowOpen && remainder !== 0) ? capacityFull - remainder : 0

                     const isExpanded = isOverflowOpen && !isClosing

                     return (
                         <div className={cn(
                             'flex flex-wrap gap-1 transition-all duration-500 ease-out overflow-hidden', 
                             justifyClass,
                             isExpanded ? 'max-h-[500px]' : 'max-h-10'
                         )}>
                        {visibleLines.map(line => (
                            <Tooltip key={line.id}>
                                <TooltipTrigger>
                                     <div 
                                        className='group flex items-center justify-center w-10 h-10 cursor-pointer rounded-full hover:bg-muted/50'
                                        onClick={() => { 
                                            const newId = line.id === minimizedPeekId ? null : line.id
                                            setMinimizedPeekId(newId)
                                            if (newId) {
                                                setExpandedLineId(newId)
                                            } else {
                                                setExpandedLineId(null)
                                            }
                                        }}
                                     >
                                         <div className="relative flex items-center justify-center w-10 h-10">
                                            <div 
                                                className={cn(
                                                    'absolute rounded-full opacity-20 transition-all duration-300 ease-out', 
                                                    minimizedPeekId === line.id ? 'w-8 h-8' : 'w-4 h-4 group-hover:w-9 group-hover:h-9'
                                                )}
                                                style={{ backgroundColor: line.color }}
                                            />
                                            
                                            <div 
                                                className={cn(
                                                    'absolute rounded-full border-[1.5px] transition-all duration-300 ease-out',
                                                    minimizedPeekId === line.id ? 'w-8 h-8 opacity-100' : 'w-4 h-4 opacity-0 group-hover:w-9 group-hover:h-9 group-hover:opacity-100'
                                                )}
                                                style={{ borderColor: line.color }}
                                            />

                                            <div 
                                                className={cn(
                                                    'relative rounded-full z-10 transition-all duration-300 ease-out shadow-sm', 
                                                    minimizedPeekId === line.id ? 'w-4 h-4' : 'w-2 h-2 group-hover:w-3 group-hover:h-3'
                                                )}
                                                style={{ backgroundColor: line.color }}
                                            />
                                         </div>
                                     </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{line.id}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                        {overflowCount > 0 && (
                            <div 
                                className='flex items-center justify-center w-10 h-10 rounded-full bg-muted/80 text-[10px] font-bold text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground transition-all'
                                onClick={() => handleToggleOverflow(true)}
                            >
                                +{overflowCount}
                            </div>
                        )}
                        {isOverflowOpen && selectedLines.length > capacityFull && (
                              <div 
                                className='flex items-center justify-center w-10 h-10 rounded-full bg-muted/80 text-muted-foreground cursor-pointer hover:bg-muted hover:text-foreground transition-all'
                                onClick={() => handleToggleOverflow(false)}
                            >
                                <ChevronsUp className="w-4 h-4" />
                            </div>
                        )}
                        {spacersCount > 0 && Array.from({ length: spacersCount }).map((_, i) => (
                             <div key={`spacer-${i}`} className="w-10 h-0 invisible" />
                        ))}
                         </div>
                     )
                  })()}
               </div>
             </div>
          </>
        )}
 
         {isMinimized && (() => {
             const peekLine = selectedLines.find(l => l.id === minimizedPeekId)
             
             if (peekLine) lastPeekRef.current = peekLine
             
             const lineDisplay = peekLine || lastPeekRef.current
             if (!lineDisplay) return null

             const isVisible = !!peekLine

             return (
                 <div 
                    className={cn(
                        "absolute left-0 right-0 bottom-0 z-30 transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] overflow-y-auto scrollbar-none pb-4",
                         isVisible ? "translate-y-0 opacity-100 pointer-events-auto" : "-translate-y-full opacity-0 pointer-events-none"
                    )}
                     style={{
                         top: `${headerHeight + 16}px` 
                    }}
                 >
                    <SingleLinePanel
                        key={lineDisplay.id}
                        line={lineDisplay}
                        isMobile={isMobile}
                        renderState={renderState}
                        onClose={() => {
                            onCloseLine(lineDisplay.id)
                            setMinimizedPeekId(null)
                        }}
                        onFocus={() => onFocusLine(lineDisplay.id)}
                        onToggleHighlight={() => onToggleHighlightLine(lineDisplay.id)}
                        isHighlighted={highlightedLineIds.includes(lineDisplay.id)}
                        isExpanded={true} 
                        onToggleExpand={() => { 
                             setMinimizedPeekId(null)
                        }}
                        isHoveredLine={hoveredLineId === lineDisplay.id && !hoveredStationId}
                        hoveredStationId={hoveredStationId}

                        onHoverStation={onHoverStation}
                    />
                 </div>
             )
         })()}



        <div className={cn(
            'flex flex-col min-h-0 flex-1 pointer-events-auto transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)] z-20 overflow-y-auto', 
            !isMobile && 'px-4 -mx-4 scrollbar-none pb-4',
            isMobile && 'scrollbar-none',
            isMinimized ? '-translate-y-[150%] pointer-events-none opacity-0' : 'translate-y-0 opacity-100'
            )}>
          <div
            className='flex flex-col gap-2'
             style={{
               marginTop: (selectedLines.length > 1 && !isMobile) 
                   ? (isMinimized ? `${headerHeight + 16}px` : '4rem')
                   : '0', 
                paddingTop: isMobile ? '4rem' : 0,
                paddingBottom: isMobile ? '5rem' : 0,
                transition: 'margin-top 1s cubic-bezier(0.19,1,0.22,1)'
             }}
          >
            {selectedLines.map((line, index) => (
                <SingleLinePanel
                key={line.id}
                line={line}
                isMobile={isMobile}
                renderState={renderState}
                onClose={() => onCloseLine(line.id)}
                onFocus={() => onFocusLine(line.id)}
                onToggleHighlight={() => onToggleHighlightLine(line.id)}
                isHighlighted={highlightedLineIds.includes(line.id)}
                isExpanded={expandedLineId === line.id}
                onToggleExpand={() => toggleExpandLine(line.id)}
                hoveredStationId={hoveredStationId}

                onHoverStation={onHoverStation}
                isHoveredLine={hoveredLineId === line.id}
                style={{
                    transitionDelay: `${index * 50}ms`
                }}
                />
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
