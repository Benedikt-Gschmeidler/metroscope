import { Line, Track, Station } from '@/types/metro'
import React, { useMemo } from 'react'
import {
  getConnectionByTrackId,
  getTrackByLineIdAndConnectionId,
  stationByIdMap,
} from '@/data/topologyService'
import { X, Eye, EyeOff, Focus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  INFO_PANEL_ITEM_HEIGHT,
  INFO_PANEL_TRACK_BASE_THICKNESS,
  INFO_PANEL_TRACK_MAX_THICKNESS,
  INFO_PANEL_TRACK_CENTER_X,
  INFO_PANEL_TOP_PADDING,
  INFO_PANEL_BOTTOM_PADDING,
} from '@/lib/constants'
import * as d3 from 'd3'
import { SingleLinePanelProps } from './types'
import { ActionButton } from './ActionButton'
import { lineColours } from '@/data/lineColours'

const getTracksForLine = (line: Line) => {
  const tracks: Track[] = []
  line.connectionIds.forEach((cId) => {
    const track = getTrackByLineIdAndConnectionId(line.id, cId)
    if (track) tracks.push(track)
  })
  return tracks
}

export const SingleLinePanel = ({
  line,
  renderState,
  onClose,
  onFocus,
  onToggleHighlight,
  isHighlighted,
  isExpanded,
  onToggleExpand,
  isHoveredLine,
  hoveredStationId,
  onHoverStation,
  isMobile,
  style,
}: SingleLinePanelProps) => {
  const tracks = useMemo(
    () => getTracksForLine(line),
    [line],
  )

  const { stationData, totalHeight } = useMemo(() => {
    if (!tracks || tracks.length === 0 || !line)
      return { stationData: [], totalHeight: 0 }

    const result: {
      station: Station
      delay: number
      y: number
    }[] = []

    const getConn = (t: Track) => getConnectionByTrackId(t.id)

    let currentStationId: string | null = null
    const firstConn = getConn(tracks[0])

    if (!firstConn) return { stationData: [], totalHeight: 0 }

    if (tracks.length > 1) {
      const secondConn = getConn(tracks[1])
      if (secondConn) {
        if (
          firstConn.stations.from === secondConn.stations.from ||
          firstConn.stations.from === secondConn.stations.to
        ) {
          currentStationId = firstConn.stations.to
        } else {
          currentStationId = firstConn.stations.from
        }
      }
    } else {
      currentStationId = firstConn.stations.from
    }

    if (!currentStationId) return { stationData: [], totalHeight: 0 }

    const startStation = stationByIdMap.get(currentStationId)

    let currentY = INFO_PANEL_TOP_PADDING

    if (startStation) {
      const delay =
        renderState.delays.get(`${line.id}::${startStation.id}`) || 0
      result.push({ station: startStation, delay, y: currentY })
    }

    let prevStation = startStation

    for (const track of tracks) {
      const conn = getConn(track)
      if (!conn || !prevStation) continue

      const nextStationId =
        conn.stations.from === prevStation.id
          ? conn.stations.to
          : conn.stations.from
      const nextStation = stationByIdMap.get(nextStationId)

      if (nextStation) {
        const gap = INFO_PANEL_ITEM_HEIGHT

        currentY += gap

        const delay =
          renderState.delays.get(`${line.id}::${nextStation.id}`) || 0
        result.push({ station: nextStation, delay, y: currentY })

        prevStation = nextStation
      }
    }

    const lastItem = result[result.length - 1]
    const hasLastStationDelay = lastItem && lastItem.delay > 0

    const dynamicBottomPadding = hasLastStationDelay ? INFO_PANEL_BOTTOM_PADDING : 24

    return { stationData: result, totalHeight: currentY + dynamicBottomPadding }
  }, [tracks, line, renderState])

  const pathData = useMemo(() => {
    if (stationData.length < 2) return ''

    const maxLineDelay = Math.max(...stationData.map((d) => d.delay), 1)

    const areaData: [number, number, number][] = stationData.map((item) => {
      const delayVal = item.delay
      const width =
        INFO_PANEL_TRACK_BASE_THICKNESS + (delayVal / maxLineDelay) * INFO_PANEL_TRACK_MAX_THICKNESS
      const halfWidth = width / 2

      return [INFO_PANEL_TRACK_CENTER_X - halfWidth, INFO_PANEL_TRACK_CENTER_X + halfWidth, item.y]
    })

    const areaGenerator = d3
      .area<[number, number, number]>()
      .y((d) => d[2])
      .x0((d) => d[0])
      .x1((d) => d[1])
      .curve(d3.curveLinear)

    return areaGenerator(areaData) || ''
  }, [stationData])

  const gridLines = useMemo(() => {
    if (stationData.length < 2) return null

    const maxRadius = (INFO_PANEL_TRACK_MAX_THICKNESS + INFO_PANEL_TRACK_BASE_THICKNESS) / 2
    const halfRadius = maxRadius / 2
    const y1 = stationData[0].y
    const y2 = stationData[stationData.length - 1].y

    const commonProps = {
      y1,
      y2,
      stroke: 'currentColor',
      strokeOpacity: 0.3,
      strokeDasharray: '3 3',
      strokeWidth: 1,
    }

    return (
      <>
        <line
          x1={INFO_PANEL_TRACK_CENTER_X - maxRadius}
          x2={INFO_PANEL_TRACK_CENTER_X - maxRadius}
          {...commonProps}
        />
        <line
          x1={INFO_PANEL_TRACK_CENTER_X + maxRadius}
          x2={INFO_PANEL_TRACK_CENTER_X + maxRadius}
          {...commonProps}
        />
        <line
          x1={INFO_PANEL_TRACK_CENTER_X - halfRadius}
          x2={INFO_PANEL_TRACK_CENTER_X - halfRadius}
          {...commonProps}
        />
        <line
          x1={INFO_PANEL_TRACK_CENTER_X + halfRadius}
          x2={INFO_PANEL_TRACK_CENTER_X + halfRadius}
          {...commonProps}
        />
      </>
    )
  }, [stationData])

  const formattedLineName = useMemo(() => {
    const parts = line.id.split(' - ')
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {index > 0 && (
          <>
            &nbsp;-
            <br />
          </>
        )}
        <span className='whitespace-nowrap'>
          {part.replace(/ /g, '\u00A0')}
        </span>
      </React.Fragment>
    ))
  }, [line])

  return (
    <div
      className={cn(
        'transition-all duration-1000 ease-[cubic-bezier(0.19,1,0.22,1)]',
        'max-h-none opacity-100 translate-y-0'
      )}
      style={style}
    >
    <div
      className={cn(
        'flex flex-col overflow-hidden transition-all duration-300 group shrink-0',
        isMobile ? 'bg-transparent border-b border-border/10' : 'bg-card/95 backdrop-blur-xl border border-border shadow-lg rounded-xl',
        isHoveredLine ? 'ring-2' : ''
      )}
      style={{
        boxShadow: (isHoveredLine && !isMobile)
          ? `0 0 15px 2px ${lineColours[line.colorIndex]}40, 0 4px 12px rgba(0,0,0,0.1)`
          : undefined,
        borderColor: isHoveredLine ? lineColours[line.colorIndex] : undefined,
      }}
    >
      <div
        className='sticky top-0 flex items-center justify-between p-3 pl-4 shrink-0 z-20 hover:bg-accent/50 transition-colors cursor-pointer relative overflow-hidden border-b border-border/40 bg-muted/30'
        onClick={onToggleExpand}
      >
        <div className='flex items-center gap-3 overflow-hidden'>
          <div className='relative flex items-center justify-center w-4 h-4'>
            <div
              className='absolute w-full h-full rounded-full opacity-20'
              style={{ backgroundColor: lineColours[line.colorIndex] }}
            />
            <div
              className='w-1.5 h-1.5 rounded-full z-10'
              style={{ backgroundColor: lineColours[line.colorIndex] }}
            />
          </div>
          <h2 className='text-sm font-bold font-mono text-foreground'>
            {formattedLineName}
          </h2>
        </div>

        <div
          className='flex items-center gap-1 shrink-0'
          onClick={(e) => e.stopPropagation()}
        >
          {!isMobile && (
              <>
                <ActionButton onClick={onFocus} icon={Focus} label='Focus Line' />
                <ActionButton
                    onClick={onToggleHighlight}
                    icon={isHighlighted ? Eye : EyeOff}
                    label={isHighlighted ? 'Unhighlight' : 'Highlight'}
                    isActive={isHighlighted}
                />
                <div className='w-px h-4 bg-border/50 mx-1' />
                <ActionButton
                    onClick={onClose}
                    icon={X}
                    label='Close'
                    variant='destructive'
                />
              </>
          )}
        </div>
      </div>

      <div
        className={cn(
          'relative transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden',
          isExpanded ? 'opacity-100' : 'opacity-0',
        )}
        style={{ height: isExpanded ? totalHeight : 0 }}
      >
        <div
          className='relative w-full p-8 pt-2'
          style={{ height: totalHeight }}
        >
          <svg
            className='absolute top-0 w-full h-full pointer-events-none overflow-visible'
            style={{ left: `${INFO_PANEL_TRACK_MAX_THICKNESS / 2}px` }}
          >
            {gridLines}
            <path d={pathData} fill={lineColours[line.colorIndex]} opacity={0.5} />
            {stationData.length >= 2 && (
              <line
                x1={INFO_PANEL_TRACK_CENTER_X}
                y1={stationData[0].y}
                x2={INFO_PANEL_TRACK_CENTER_X}
                y2={stationData[stationData.length - 1].y}
                stroke={lineColours[line.colorIndex]}
                strokeWidth={2}
              />
            )}
          </svg>

          {stationData.map((item) => (
            <div
              key={item.station.id}
              className='absolute pointer-events-none'
              style={{
                left: `${INFO_PANEL_TRACK_MAX_THICKNESS / 2}px`,
                right: 0,
                top: item.y,
              }}
            >
              <div
                className={cn(
                  'absolute w-full -translate-y-1/2 flex items-center group/station pointer-events-auto transition-all duration-200 rounded-lg pl-4 pr-0 -ml-4 py-1 hover:!bg-transparent hover:!border-transparent hover:!shadow-none select-none cursor-pointer',
                )}
                style={{
                    backgroundColor: hoveredStationId === item.station.id ? `${lineColours[line.colorIndex]}15` : undefined,
                    border: hoveredStationId === item.station.id ? `1px solid ${lineColours[line.colorIndex]}` : '1px solid transparent',
                    boxShadow: hoveredStationId === item.station.id ? `0 0 10px ${lineColours[line.colorIndex]}30` : 'none',
                }}
                onMouseEnter={() => onHoverStation(item.station.id)}
                onMouseLeave={() => onHoverStation(null)}
              >
                <div
                  className='absolute w-3 h-3 rounded-full border-2 border-foreground bg-background z-10 shadow-sm'
                  style={{
                    left: INFO_PANEL_TRACK_CENTER_X + 15,
                    transform: 'translateX(-50%)',
                  }}
                />

                <div className='ml-16 flex items-baseline gap-2 text-xs flex-1 min-w-0 pr-4'>
                  <span className='font-mono font-bold text-foreground shrink-0 w-10'>
                    {item.station.id}
                  </span>

                  <span className={cn('text-muted-foreground truncate font-medium transition-colors group-hover/station:!text-muted-foreground group-hover/station:!font-medium', hoveredStationId === item.station.id ? 'text-foreground font-bold' : '')}>
                    {item.station.name}
                  </span>

                </div>
              </div>

              {item.delay > 0 && (
                <div className='absolute top-2 ml-16 pointer-events-auto'>
                    <span className='font-mono text-red-500 dark:text-red-400 whitespace-nowrap tabular-nums text-sm font-bold'>
                      {item.delay.toFixed(0)} min
                    </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
