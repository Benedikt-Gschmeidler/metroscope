import { memo } from 'react'
import type { Line } from '@/types/metro'
import MetroLineUnified from '../MetroLineUnified'
import { LinesLayerProps } from './types'

export const LinesLayer = memo(
  ({
    topology,
    renderState,
    highlightedLineIds,
    pinnedLineIds,
    effectiveHoveredLineIds,
    anySelected,
    anyHovered,
    memoizedTrackIds,
    onClickLine,
    onHoverLine,
    onHoverEndLine,
    baseLineThickness,
    delayCutoff,
    isDraggingRef,
    shapeRendering,
  }: LinesLayerProps) => {
    return (
      <g style={{ pointerEvents: 'auto' }} shapeRendering={shapeRendering}>
        {topology.lines.map((line: Line) => {
          const isPinned = pinnedLineIds.includes(line.id)
          const isHighlighted = highlightedLineIds.includes(line.id) || isPinned
          const isHovered = effectiveHoveredLineIds.has(line.id)

          let grayedOut = false
          let dimmed = false

          if (anySelected) {
            if (!isHighlighted && !isHovered) grayedOut = true
          } else if (anyHovered) {
            if (!isHovered) dimmed = true
          }

          return (
            <MetroLineUnified
              key={line.id}
              lineId={line.id}
              trackIds={memoizedTrackIds[line.id] || []}
              renderState={renderState}
              onClick={() => onClickLine(line.id)}
              onHover={onHoverLine}
              onHoverEnd={onHoverEndLine}
              isDraggingRef={isDraggingRef}
              grayedOut={grayedOut}
              dimmed={dimmed}
              baseThickness={baseLineThickness}
              delayCutoff={delayCutoff}
            />
          )
        })}
      </g>
    )
  },
)
LinesLayer.displayName = 'LinesLayer'
