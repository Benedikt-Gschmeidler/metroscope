import type { Topology, Position } from '@/types/metro'
import { RenderState } from '@/data/delayData'

export interface MapCanvasActions {
  focusOnPoints: (p1: Position, p2: Position, paddingFactor?: number) => void
  focusOnStation: (stationId: string) => void
  getStationScreenPosition: (stationId: string) => { x: number; y: number } | null
}

export interface MapCanvasProps {
  topology: Topology
  renderState: RenderState
  highlightedLineIds: string[]
  pinnedLineIds?: string[]
  hoveredLineId?: string | null
  hoveredStationId?: string | null
  onClickLine: (lineId: string | null) => void
  onHoverLine: (lineId: string | null) => void
  onHoverEndLine: (lineId: string | null) => void
  onHoverStation?: (stationId: string | null) => void
  onViewChange?: (bounds: {
    minX: number
    maxX: number
    minY: number
    maxY: number
    zoom: number
  }) => void
  baseLineThickness?: number
  delayCutoff: number
  onDragStart?: () => void
}

export interface LinesLayerProps {
  topology: Topology
  renderState: RenderState
  highlightedLineIds: string[]
  pinnedLineIds: string[]
  effectiveHoveredLineIds: Set<string>
  anySelected: boolean
  anyHovered: boolean
  memoizedTrackIds: { [key: string]: string[] }
  onClickLine: (lineId: string) => void
  onHoverLine: (lineId: string | null) => void
  onHoverEndLine: (lineId: string | null) => void
  baseLineThickness: number
  delayCutoff: number
  isDraggingRef: React.MutableRefObject<boolean>
}

export interface StationTextData {
  textX: number
  textY: number
  textAnchor: React.SVGProps<SVGTextElement>['textAnchor']
  dominantBaseline: React.SVGProps<SVGTextElement>['dominantBaseline']
  textTransform?: string
}

export interface StationsLayerProps {
  topology: Topology
  stationTextData: Map<string, StationTextData>
  hoveredStationId: string | null
  stationToLineIds: Map<string, Set<string>>
  stationDivergence: Map<string, number>
  onHoverLine: (lineId: string | null) => void
  onHoverEndLine: (lineId: string | null) => void
  onClickLine: (lineId: string | null) => void
  onHoverStation?: (stationId: string | null) => void
  isDraggingRef?: React.MutableRefObject<boolean>
}

export interface StationProps {
  station: { id: string; xMetro: number; yMetro: number }
  isHovered: boolean
  textData: StationTextData
  stationToLineIds: Map<string, Set<string>>
  stationDivergence: Map<string, number>
  isDraggingRef?: React.MutableRefObject<boolean>
  onHoverStation?: (stationId: string | null) => void
  onHoverLine: (lineId: string) => void
  onHoverEndLine: (lineId: string) => void
  onClickLine: (lineId: string) => void
}
