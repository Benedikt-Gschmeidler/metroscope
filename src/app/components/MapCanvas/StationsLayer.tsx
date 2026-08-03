import { memo } from 'react'
import type { Station as StationType } from '@/types/metro'
import { StationsLayerProps } from './types'
import { Station } from './Station'

export const StationsLayer = memo(
  ({
    topology,
    stationTextData,
    hoveredStationId,

    stationToLineIds,
    stationDivergence,
    onHoverLine,
    onHoverEndLine,
    onClickLine,
    onHoverStation,
    isDraggingRef,
  }: StationsLayerProps) => {
    return (
      <g style={{ pointerEvents: 'auto' }}>
        {topology.stations.map((station: StationType) => {
          const isStationHovered = hoveredStationId === station.id
          const textData = stationTextData.get(station.id)
          if (!textData) return null

          return (
            <Station
              key={station.id}
              station={station}
              isHovered={isStationHovered}
              textData={textData}
              stationToLineIds={stationToLineIds}
              stationDivergence={stationDivergence}
              isDraggingRef={isDraggingRef}
              onHoverStation={onHoverStation}
              onHoverLine={onHoverLine}
              onHoverEndLine={onHoverEndLine}
              onClickLine={onClickLine}
            />
          )
        })}
      </g>
    )
  },
)
StationsLayer.displayName = 'StationsLayer'
