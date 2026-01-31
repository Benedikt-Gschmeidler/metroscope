import * as React from 'react'
import { Target, MoveHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { SelectionModeControlProps } from './types'

export const SelectionModeControl = React.memo<SelectionModeControlProps>(
  ({ isExpanded, selectionMode, onSelectionModeChange }) => (
    <div className='flex items-center bg-muted/50 rounded-lg border border-border/50 p-0.5 h-9 shrink-0 relative isolate'>
      <div
        className='absolute top-0.5 bottom-0.5 bg-background shadow-sm rounded-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] -z-10'
        style={{
          left: isExpanded
            ? selectionMode === 'point'
              ? '2px'
              : 'calc(50% + 1px)'
            : '2px',
          width: isExpanded ? 'calc(50% - 3px)' : 'calc(100% - 4px)',
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              if (isExpanded) {
                onSelectionModeChange('point')
              } else {
                onSelectionModeChange(
                  selectionMode === 'point' ? 'range' : 'point',
                )
              }
            }}
            className={cn(
              'h-full flex items-center justify-center rounded-md transition-all duration-500',
              selectionMode === 'point'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              isExpanded
                ? 'w-8'
                : selectionMode === 'point'
                  ? 'w-8'
                  : 'w-0 opacity-0 overflow-hidden px-0',
            )}
          >
            <Target className='h-4 w-4' />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Point selection</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              if (isExpanded) {
                onSelectionModeChange('range')
              } else {
                onSelectionModeChange(
                  selectionMode === 'point' ? 'range' : 'point',
                )
              }
            }}
            className={cn(
              'h-full flex items-center justify-center rounded-md transition-all duration-500',
              selectionMode === 'range'
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
              isExpanded
                ? 'w-8'
                : selectionMode === 'range'
                  ? 'w-8'
                  : 'w-0 opacity-0 overflow-hidden px-0',
            )}
          >
            <MoveHorizontal className='h-4 w-4' />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Range selection</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
)
SelectionModeControl.displayName = 'SelectionModeControl'
