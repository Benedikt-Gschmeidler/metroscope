import { memo } from 'react'
import { STATION_RADIUS } from '@/lib/constants'
import { StationProps } from './types'

export const Station = memo(
  ({
    station,
    isHovered,
    textData,
    stationToLineIds,
    isDraggingRef,

    onHoverStation,
    onHoverLine,
    onHoverEndLine,
    onClickLine,
  }: StationProps) => {
    const stationId = station.id
    const lineCount = stationToLineIds.get(stationId)?.size ?? 1
    const baseRadius = STATION_RADIUS * (1 + Math.log2(Math.max(1, lineCount)))
    const currentRadius = isHovered ? baseRadius * 1.8 : baseRadius

    const handleMouseEnter = () => {
      if (isDraggingRef?.current) return
      onHoverStation?.(stationId)
      const lines = stationToLineIds.get(stationId)
      lines?.forEach((l) => onHoverLine(l))
    }

    const handleMouseLeave = () => {
      if (isDraggingRef?.current) return
      onHoverStation?.(null)
      const lines = stationToLineIds.get(stationId)
      lines?.forEach((l) => onHoverEndLine(l))
    }

    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation()
      const lines = stationToLineIds.get(stationId)
      lines?.forEach((l) => onClickLine(l))
    }

    return (
      <>
        <circle
          cx={station.xMetro}
          cy={station.yMetro}
          r={currentRadius}
          fill='white'
          stroke='black'
          opacity={1}
          strokeWidth={0.4 * baseRadius}
          className='transition-[r] duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] cursor-pointer'
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        />
        <text
          x={textData.textX}
          y={textData.textY}
          textAnchor={textData.textAnchor}
          dominantBaseline={textData.dominantBaseline}
          transform={textData.textTransform}
          opacity={1}
          fontSize='0.15em'
          fill='black'
          stroke='white'
          strokeWidth='0.03em'
          paintOrder='stroke fill'
          className='pointer-events-none font-mono'
        >
          {station.id}
        </text>
      </>
    )
  },
)
Station.displayName = 'Station'
