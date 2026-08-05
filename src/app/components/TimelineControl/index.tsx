'use client'

import * as React from 'react'
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Calendar as UI_Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { DateRange } from 'react-day-picker'
import { TIME_RANGE } from '@/lib/constants'
import { SpeedControl } from '../SpeedControl'
import { TimelineControlProps } from './types'
import { SelectionModeControl } from './SelectionModeControl'
import { GranularityControl } from './GranularityControl'
import { FocusMatchControl } from './FocusMatchControl'

export type { SelectionMode } from './types'

export function TimelineControl({
  className,
  granularity,
  selectionMode,
  isTimelinePlaying,
  onGranularityChange,
  onSelectionModeChange,
  onClickTimelinePlay,
  currentTimeSelection,
  onTimeSelectionChange,
  isFocusMatchEnabled,
  onFocusMatchChange,
  speed,
  onSpeedChange,
  onReset,
}: TimelineControlProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    currentTimeSelection?.mode === 'point'
      ? currentTimeSelection.time
      : TIME_RANGE.min,
  )
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    currentTimeSelection?.mode === 'range'
      ? { from: currentTimeSelection.start, to: currentTimeSelection.end }
      : {
          from: TIME_RANGE.min,
          to: TIME_RANGE.max,
        },
  )

  const [startTime, setStartTime] = React.useState(
    currentTimeSelection?.mode === 'point'
      ? currentTimeSelection.time.toTimeString().slice(0, 5)
      : currentTimeSelection?.mode === 'range'
        ? currentTimeSelection.start.toTimeString().slice(0, 5)
        : '14:30',
  )
  const [endTime, setEndTime] = React.useState(
    currentTimeSelection?.mode === 'range'
      ? currentTimeSelection.end.toTimeString().slice(0, 5)
      : '16:45',
  )
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  React.useEffect(() => {
    if (currentTimeSelection) {
      if (currentTimeSelection.mode === 'point') {
        setDate(currentTimeSelection.time)
        setStartTime(currentTimeSelection.time.toTimeString().slice(0, 5))
      } else {
        setDateRange({
          from: currentTimeSelection.start,
          to: currentTimeSelection.end,
        })
        setStartTime(currentTimeSelection.start.toTimeString().slice(0, 5))
        setEndTime(currentTimeSelection.end.toTimeString().slice(0, 5))
      }
    }
  }, [currentTimeSelection])

  const formatDate = (date: Date | undefined) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-DE', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date)
  }

  const formatTime = (date: Date | undefined) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('en-DE', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const [hours, minutes] = startTime.split(':')
      const newDate = new Date(selectedDate)
      newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))
      setDate(newDate)

      if (selectionMode === 'point') {
        onTimeSelectionChange({ mode: 'point', time: newDate })
      }
    }
  }

  const handleRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range?.to && selectionMode === 'range') {
      const [startHours, startMinutes] = startTime.split(':')
      const [endHours, endMinutes] = endTime.split(':')

      const newStart = new Date(range.from)
      newStart.setHours(
        Number.parseInt(startHours),
        Number.parseInt(startMinutes),
      )

      const newEnd = new Date(range.to)
      newEnd.setHours(Number.parseInt(endHours), Number.parseInt(endMinutes))

      onTimeSelectionChange({ mode: 'range', start: newStart, end: newEnd })
    }
  }

  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    const [hours, minutes] = time.split(':')

    if (selectionMode === 'point' && date) {
      const newDate = new Date(date)
      newDate.setHours(Number.parseInt(hours), Number.parseInt(minutes))
      setDate(newDate)
      onTimeSelectionChange({ mode: 'point', time: newDate })
    } else if (selectionMode === 'range' && dateRange?.from && dateRange?.to) {
      const newStart = new Date(dateRange.from)
      newStart.setHours(Number.parseInt(hours), Number.parseInt(minutes))
      setDateRange({ ...dateRange, from: newStart })

      const [endHours, endMinutes] = endTime.split(':')
      const newEnd = new Date(dateRange.to)
      newEnd.setHours(Number.parseInt(endHours), Number.parseInt(endMinutes))

      onTimeSelectionChange({ mode: 'range', start: newStart, end: newEnd })
    }
  }

  const handleEndTimeChange = (time: string) => {
    setEndTime(time)
    if (selectionMode === 'range' && dateRange?.to && dateRange?.from) {
      const [hours, minutes] = time.split(':')
      const newEnd = new Date(dateRange.to)
      newEnd.setHours(Number.parseInt(hours), Number.parseInt(minutes))
      setDateRange({ ...dateRange, to: newEnd })

      const [startHours, startMinutes] = startTime.split(':')
      const newStart = new Date(dateRange.from)
      newStart.setHours(
        Number.parseInt(startHours),
        Number.parseInt(startMinutes),
      )

      onTimeSelectionChange({ mode: 'range', start: newStart, end: newEnd })
    }
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'bg-card/95 backdrop-blur-xl border border-border shadow-lg rounded-xl origin-bottom-left overflow-hidden',
          'transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto',
          isExpanded ? 'w-full sm:w-[520px]' : 'w-full sm:w-[380px]',
          'max-w-[calc(100vw-32px)]',
          className,
        )}
        style={{
          height: isExpanded ? '260px' : '144px',
          transition:
            'width 500ms cubic-bezier(0.32, 0.72, 0, 1), height 500ms cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className='h-full flex flex-col'>
          <div className='p-3 flex items-center gap-2 shrink-0'>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onClickTimelinePlay}
                  className='h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0'
                >
                  {isTimelinePlaying ? (
                    <Pause className='h-4 w-4 fill-current' />
                  ) : (
                    <Play className='h-4 w-4 fill-current ml-0.5' />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isTimelinePlaying ? 'Pause timeline' : 'Play timeline'}</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onReset}
                  className='h-9 w-9 rounded-lg bg-muted hover:bg-muted/70 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors shrink-0'
                >
                  <RotateCcw className='h-4 w-4' />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset selection</p>
              </TooltipContent>
            </Tooltip>

            <SelectionModeControl
              isExpanded={isMobile ? false : isExpanded}
              selectionMode={selectionMode}
              onSelectionModeChange={onSelectionModeChange}
            />

            <div className='flex-1 min-w-0 ml-1'>
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button className='w-full text-left hover:bg-muted/50 rounded px-1 -mx-1 transition-colors group overflow-hidden'>
                        <div className='h-10 w-full flex items-center'>
                          <div className='flex flex-col items-start min-w-0 justify-center shrink-0 z-20'>
                            <div
                              className={cn(
                                'font-medium text-foreground truncate leading-tight transition-all duration-500',
                                isExpanded ? 'text-sm' : 'text-xs',
                              )}
                            >
                              {formatDate(
                                selectionMode === 'point'
                                  ? date
                                  : dateRange?.from,
                              )}
                            </div>
                            <div
                              className={cn(
                                'text-muted-foreground font-mono truncate leading-tight transition-all duration-500',
                                isExpanded ? 'text-sm' : 'text-xs',
                              )}
                            >
                              {formatTime(
                                selectionMode === 'point'
                                  ? date
                                  : dateRange?.from,
                              )}
                            </div>
                          </div>

                          <div
                            className={cn(
                              'flex items-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                              selectionMode === 'range'
                                ? cn(
                                    'opacity-100 translate-x-0',
                                    isExpanded ? 'w-8 ml-3' : 'w-4 ml-1',
                                  )
                                : 'w-0 opacity-0 ml-0 -translate-x-2',
                            )}
                          >
                            <svg
                              className={cn(
                                'h-4 text-muted-foreground shrink-0 transition-all duration-500',
                                isExpanded ? 'w-8' : 'w-4',
                              )}
                              viewBox='0 0 32 24'
                              fill='none'
                              stroke='currentColor'
                              strokeWidth='2'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            >
                              <path d='M4 12h24m-6-6 6 6-6 6' />
                            </svg>
                          </div>

                          <div
                            className={cn(
                              'flex flex-col items-start min-w-0 justify-center overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
                              selectionMode === 'range'
                                ? 'max-w-[200px] opacity-100 ml-3 translate-x-0 delay-75'
                                : 'max-w-0 opacity-0 ml-0 -translate-x-4 delay-0',
                            )}
                          >
                            <div
                              className={cn(
                                'font-medium text-foreground truncate leading-tight transition-all duration-500',
                                isExpanded ? 'text-sm' : 'text-xs',
                              )}
                            >
                              {formatDate(dateRange?.to)}
                            </div>
                            <div
                              className={cn(
                                'text-muted-foreground font-mono truncate leading-tight transition-all duration-500',
                                isExpanded ? 'text-sm' : 'text-xs',
                              )}
                            >
                              {formatTime(dateRange?.to)}
                            </div>
                          </div>
                        </div>
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Change date and time</p>
                  </TooltipContent>
                </Tooltip>
                <PopoverContent
                  className='w-auto p-3'
                  align='start'
                  side='top'
                  avoidCollisions={false}
                >
                  {selectionMode === 'point' ? (
                    <div className='space-y-3'>
                      <div style={{ minHeight: '21rem' }}>
                        <UI_Calendar
                          mode='single'
                          selected={date}
                          onSelect={handleDateSelect}
                          initialFocus
                          defaultMonth={date}
                        />
                      </div>
                      <input
                        type='time'
                        value={startTime}
                        onChange={(e) => handleStartTimeChange(e.target.value)}
                        className='w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20'
                      />
                    </div>
                  ) : (
                    <div className='space-y-4'>
                      <div style={{ minHeight: '21rem' }}>
                        <UI_Calendar
                          mode='range'
                          selected={dateRange}
                          onSelect={handleRangeSelect}
                          numberOfMonths={3}
                          startMonth={new Date(2024, 0)}
                          endMonth={new Date(2025, 1)}
                          initialFocus
                          defaultMonth={dateRange?.from}
                        />
                      </div>
                      <div className='flex gap-4'>
                        <div className='flex-1 space-y-2'>
                          <label className='text-xs font-medium text-muted-foreground'>
                            Start Time
                          </label>
                          <input
                            type='time'
                            value={startTime}
                            onChange={(e) =>
                              handleStartTimeChange(e.target.value)
                            }
                            className='w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20'
                          />
                        </div>
                        <div className='flex-1 space-y-2'>
                          <label className='text-xs font-medium text-muted-foreground'>
                            End Time
                          </label>
                          <input
                            type='time'
                            value={endTime}
                            onChange={(e) =>
                              handleEndTimeChange(e.target.value)
                            }
                            className='w-full bg-muted/50 border border-border/50 rounded-lg px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20'
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='h-9 w-9 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0'
                >
                  {isExpanded ? (
                    <Minimize2 className='h-4 w-4' />
                  ) : (
                    <Maximize2 className='h-4 w-4' />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isExpanded ? 'Collapse controls' : 'Expand controls'}</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className='flex-1' />

          <div
            className={cn(
              'grid gap-2 px-3 pb-3 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]',
              isExpanded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-3',
            )}
          >
            <GranularityControl
              isExpanded={isExpanded}
              granularity={granularity}
              onGranularityChange={onGranularityChange}
            />

            <FocusMatchControl
              isExpanded={isExpanded}
              isFocusMatchEnabled={isFocusMatchEnabled}
              onFocusMatchChange={onFocusMatchChange}
            />

            <SpeedControl
              isExpanded={isExpanded}
              speed={speed}
              onSpeedChange={onSpeedChange}
              granularity={granularity}
            />
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
