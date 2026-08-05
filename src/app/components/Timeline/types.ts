import * as d3 from 'd3'
import { MAX_DELAYS_P100 } from '@/lib/constants'
import { DatasetMap } from '@/data/delayData'
import { Topology } from '@/types/metro'

export type TimeSelection =
  | { mode: 'point'; time: Date }
  | { mode: 'range'; start: Date; end: Date }

export interface TimelineProps {
  year: number
  granularity: 'month' | 'week' | 'day'
  selectionMode: 'point' | 'range'
  minSegmentWidth?: number
  height?: number
  onSelectionChange: (selection: TimeSelection | null) => void
  isPlaying: boolean
  onInteractionStart?: () => void
  timelineSpeed: number
  selection?: TimeSelection | null
  dataset: DatasetMap | null
  topology: Topology
  mapViewBounds?: {
    minX: number
    maxX: number
    minY: number
    maxY: number
  } | null
  highlightedLineIds?: string[]
  shouldDimInactiveDots?: boolean
}

export type Granularity = 'month' | 'week' | 'day'

export interface TimelineEvent {
  x: number
  y: number
  color: string
  size: number
  lineId: string
}

export interface TimeSegment {
  startDate: Date
  endDate: Date
  events: TimelineEvent[] | null
  isLoading: boolean
}

export interface DelaySummaryData {
  maxDelayMinutes: number
  lineColor: string
  gridX: number
  gridY: number
  lineId: string
}

export const sizeScale = (granularity: Granularity) => {
  return d3
    .scaleSqrt()
    .domain([0, MAX_DELAYS_P100[granularity]])
    .range([0, 15])
    .clamp(true)
}

export function getSegmentForGranularity(
  date: Date,
  granularity: Granularity
): { start: Date; end: Date } {
  const interval =
    granularity === 'month'
      ? d3.timeMonth
      : granularity === 'week'
        ? d3.timeWeek
        : d3.timeDay

  const start = interval.floor(date)
  const end = interval.offset(start, 1)
  return { start, end }
}

export function mapApiDataToEvents(
  apiData: DelaySummaryData[],
  granularity: Granularity
): TimelineEvent[] {
  const itemCount = apiData.length
  return apiData.map((lineData, i) => {
    const xPos = lineData.gridX
    const yPos = lineData.gridY
    return {
      x: xPos || (1000 / (itemCount + 1)) * (i + 1),
      y: yPos || 500,
      size: sizeScale(granularity)(lineData.maxDelayMinutes),
      color: lineData.lineColor,
      lineId: lineData.lineId,
    }
  })
}
