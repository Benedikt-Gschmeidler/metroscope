import { RenderState } from '@/data/delayData'
import { Line } from '@/types/metro'

export interface InfoPanelProps {
  selectedLines: Line[]
  renderState: RenderState
  onCloseLine: (lineId: string) => void
  onFocusLine: (lineId: string) => void
  onToggleHighlightLine: (lineId: string) => void
  highlightedLineIds: string[]
  onCloseAll: () => void
  onFocusAll: () => void
  onToggleHighlightAll: () => void
  onCloseDrawer?: () => void
  className?: string
  hoveredLineId?: string | null
  hoveredStationId?: string | null
  onHoverStation: (stationId: string | null) => void
  isMobile?: boolean
}

export interface SingleLinePanelProps {
  line: Line
  renderState: RenderState
  onClose: () => void
  onFocus: () => void
  onToggleHighlight: () => void
  isHighlighted: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  isHoveredLine?: boolean
  hoveredStationId?: string | null

  onHoverStation: (stationId: string | null) => void
  isMobile?: boolean
  style?: React.CSSProperties
}

export interface ActionButtonProps {
  onClick?: () => void
  icon: React.ElementType
  label: string
  isActive?: boolean
  variant?: 'default' | 'destructive'
}
