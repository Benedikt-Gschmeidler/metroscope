import * as React from 'react'
import { ScanEye, ScanLine } from 'lucide-react'
import { ToggleGroup, ToggleOption } from './ToggleGroup'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

type FocusMatchValue = 'off' | 'on'

const FOCUS_MATCH_OPTIONS: ToggleOption<FocusMatchValue>[] = [
  { value: 'off', label: 'Off', icon: ScanLine, tooltip: 'Disable focus match' },
  { value: 'on', label: 'On', icon: ScanEye, tooltip: 'Enable focus match' },
]

interface FocusMatchControlProps {
  isExpanded: boolean
  isFocusMatchEnabled: boolean
  onFocusMatchChange: (value: boolean) => void
}

export const FocusMatchControl = React.memo<FocusMatchControlProps>(
  ({ isExpanded, isFocusMatchEnabled, onFocusMatchChange }) => {
    if (!isExpanded) {
      return (
        <div className='flex flex-col gap-1.5'>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 h-3.5 cursor-help w-fit'>
                <ScanEye className='h-3 w-3' />
                Focus Match
              </div>
            </TooltipTrigger>
            <TooltipContent>
              Keeps the timeline&apos;s visible time window synced to
              whatever the map is currently panned/zoomed to.
            </TooltipContent>
          </Tooltip>
          <Select
            value={isFocusMatchEnabled ? 'on' : 'off'}
            onValueChange={(v) => onFocusMatchChange(v === 'on')}
          >
            <SelectTrigger className='w-full h-8 text-xs'>
              <div className='flex items-center gap-2'>
                {isFocusMatchEnabled ? (
                  <ScanEye className='h-3.5 w-3.5' />
                ) : (
                  <ScanLine className='h-3.5 w-3.5' />
                )}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='off'>Off</SelectItem>
              <SelectItem value='on'>On</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <ToggleGroup
        isExpanded={isExpanded}
        value={isFocusMatchEnabled ? 'on' : 'off'}
        onChange={(v) => onFocusMatchChange(v === 'on')}
        options={FOCUS_MATCH_OPTIONS}
        label='Focus Match'
        labelIcon={ScanEye}
        infoTooltip="Keeps the timeline's visible time window synced to whatever the map is currently panned/zoomed to"
      />
    )
  },
)
FocusMatchControl.displayName = 'FocusMatchControl'
