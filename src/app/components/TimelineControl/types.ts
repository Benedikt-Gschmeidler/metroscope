export type Granularity = 'day' | 'week' | 'month'
export type SelectionMode = 'point' | 'range'

export interface TimelineControlProps {
  className?: string
  granularity: Granularity
  selectionMode: SelectionMode
  isTimelinePlaying: boolean
  onGranularityChange: (value: Granularity) => void
  onSelectionModeChange: (value: SelectionMode) => void
  onClickTimelinePlay: () => void
  currentTimeSelection:
    | { mode: 'point'; time: Date }
    | { mode: 'range'; start: Date; end: Date }
    | null
  onTimeSelectionChange: (
    selection:
      | { mode: 'point'; time: Date }
      | { mode: 'range'; start: Date; end: Date },
  ) => void
  onFocusMatchChange: (enabled: boolean) => void
  isFocusMatchEnabled: boolean
  speed: number
  onSpeedChange: (speed: number) => void
  onReset: () => void
}

export interface SelectionModeControlProps {
  isExpanded: boolean
  selectionMode: SelectionMode
  onSelectionModeChange: (value: SelectionMode) => void
}

export interface GranularityControlProps {
  isExpanded: boolean
  granularity: Granularity
  onGranularityChange: (value: Granularity) => void
}

export interface FocusMatchControlProps {
  isExpanded: boolean
  isFocusMatchEnabled: boolean
  onFocusMatchChange: (value: boolean) => void
}
