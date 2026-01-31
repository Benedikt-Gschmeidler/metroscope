import * as React from 'react'
import {
  CalendarIcon,
  CalendarDays,
  CalendarRange,
  CalendarPlusIcon as CalendarLucide,
} from 'lucide-react'
import { ToggleGroup, ToggleOption } from './ToggleGroup'
import { Granularity } from './types'

const GRANULARITY_OPTIONS: ToggleOption<Granularity>[] = [
  { value: 'day', label: 'Day', icon: CalendarLucide, tooltip: 'Group by day' },
  { value: 'week', label: 'Week', icon: CalendarDays, tooltip: 'Group by week' },
  { value: 'month', label: 'Month', icon: CalendarRange, tooltip: 'Group by month' },
]

interface GranularityControlProps {
  isExpanded: boolean
  granularity: Granularity
  onGranularityChange: (value: Granularity) => void
}

export const GranularityControl = React.memo<GranularityControlProps>(
  ({ isExpanded, granularity, onGranularityChange }) => (
    <ToggleGroup
      isExpanded={isExpanded}
      value={granularity}
      onChange={onGranularityChange}
      options={GRANULARITY_OPTIONS}
      label='Granularity'
      labelIcon={CalendarIcon}
    />
  ),
)
GranularityControl.displayName = 'GranularityControl'
