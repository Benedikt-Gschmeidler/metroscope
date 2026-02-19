import * as React from 'react'
import {
  CalendarIcon,
  CalendarDays,
  CalendarRange,
  CalendarPlusIcon as CalendarLucide,
} from 'lucide-react'
import { ToggleGroup, ToggleOption } from './ToggleGroup'
import { Granularity } from './types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const GRANULARITY_OPTIONS: ToggleOption<Granularity>[] = [
  { value: 'day', label: 'Day', icon: CalendarLucide, tooltip: 'Group by day' },
  {
    value: 'week',
    label: 'Week',
    icon: CalendarDays,
    tooltip: 'Group by week',
  },
  {
    value: 'month',
    label: 'Month',
    icon: CalendarRange,
    tooltip: 'Group by month',
  },
]

interface GranularityControlProps {
  isExpanded: boolean
  granularity: Granularity
  onGranularityChange: (value: Granularity) => void
}

export const GranularityControl = React.memo<GranularityControlProps>(
  ({ isExpanded, granularity, onGranularityChange }) => {
    if (!isExpanded) {
      const selectedOption = GRANULARITY_OPTIONS.find(
        (opt) => opt.value === granularity,
      )
      const SelectedIcon = selectedOption?.icon || CalendarIcon

      return (
        <div className='flex flex-col gap-1.5'>
          <div className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 h-3.5'>
            <CalendarIcon className='h-3 w-3' />
            Granularity
          </div>
          <Select
            value={granularity}
            onValueChange={(v) => onGranularityChange(v as Granularity)}
          >
            <SelectTrigger className='w-full h-8 text-xs'>
              <div className='flex items-center gap-2'>
                <SelectedIcon className='h-3.5 w-3.5' />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              {GRANULARITY_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <ToggleGroup
        isExpanded={isExpanded}
        value={granularity}
        onChange={onGranularityChange}
        options={GRANULARITY_OPTIONS}
        label='Granularity'
        labelIcon={CalendarIcon}
      />
    )
  },
)
GranularityControl.displayName = 'GranularityControl'
