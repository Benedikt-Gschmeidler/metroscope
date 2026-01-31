import * as React from 'react'
import { ScanEye, ScanLine } from 'lucide-react'
import { ToggleGroup, ToggleOption } from './ToggleGroup'

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
  ({ isExpanded, isFocusMatchEnabled, onFocusMatchChange }) => (
    <ToggleGroup
      isExpanded={isExpanded}
      value={isFocusMatchEnabled ? 'on' : 'off'}
      onChange={(v) => onFocusMatchChange(v === 'on')}
      options={FOCUS_MATCH_OPTIONS}
      label='Focus Match'
      labelIcon={ScanEye}
    />
  ),
)
FocusMatchControl.displayName = 'FocusMatchControl'
