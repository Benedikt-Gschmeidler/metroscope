import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { LucideIcon } from 'lucide-react'

export interface ToggleOption<T extends string> {
  value: T
  label: string
  icon: LucideIcon
  tooltip?: string
}

export interface ToggleGroupProps<T extends string> {
  isExpanded: boolean
  value: T
  onChange: (value: T) => void
  options: ToggleOption<T>[]
  label: string
  labelIcon: LucideIcon
  infoTooltip?: string
}

export function ToggleGroup<T extends string>({
  isExpanded,
  value,
  onChange,
  options,
  label,
  labelIcon: LabelIcon,
  infoTooltip,
}: ToggleGroupProps<T>) {
  const selectedIndex = options.findIndex((opt) => opt.value === value)

  return (
    <div className='flex flex-col gap-1.5 transition-all duration-500'>
      <div
        className={cn(
          'text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 overflow-hidden transition-all duration-500',
          isExpanded ? 'h-4 opacity-100' : 'h-3.5 opacity-100',
        )}
      >
        <LabelIcon className='h-3 w-3' />
        {infoTooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className='cursor-help underline decoration-dotted underline-offset-2 decoration-muted-foreground/50 hover:decoration-foreground/50 transition-all'>
                {label}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{infoTooltip}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          label
        )}
      </div>
      <div className='flex items-center bg-muted/50 rounded-lg border border-border/50 p-0.5 relative isolate overflow-hidden'>
        <div
          className='absolute top-0.5 bottom-0.5 bg-background shadow-sm rounded-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] -z-10'
          style={{
            left: isExpanded
              ? `calc(${selectedIndex} * ((100% - 4px) / ${options.length}) + 2px)`
              : '2px',
            width: isExpanded
              ? `calc((100% - 4px) / ${options.length})`
              : 'calc(100% - 4px)',
          }}
        />
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = value === opt.value

          return (
            <button
              key={opt.value}
              onClick={() => {
                if (isExpanded) {
                  onChange(opt.value)
                } else {
                  const nextIndex = (selectedIndex + 1) % options.length
                  onChange(options[nextIndex].value)
                }
              }}
              className={cn(
                'flex items-center justify-center font-medium rounded-md transition-all duration-500 text-xs gap-1.5 whitespace-nowrap overflow-hidden z-10',
                isSelected
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
                isExpanded
                  ? 'flex-1 px-2 py-1.5'
                  : isSelected
                    ? 'w-full px-2 py-1.5'
                    : 'w-0 px-0 py-0 opacity-0',
              )}
            >
              <Icon className='h-3.5 w-3.5 shrink-0' />
              <span className='capitalize'>{opt.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
