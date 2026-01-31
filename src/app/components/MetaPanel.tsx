'use client'

import * as React from 'react'
import {
  Settings2,
  Info,
  Scaling,
  Ruler,
  TrainFront,
  RotateCcw,
  Github,
  GitBranch,

} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Slider } from '@/components/ui/slider'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'
import { Badge } from '@/components/ui/badge'


interface MetaPanelProps {
  keepDelayConsistent: boolean
  onKeepDelayConsistentChange: (val: boolean) => void
  baseLineThickness: number
  onBaseLineThicknessChange: (val: number) => void
  delayCutoff: number
  onDelayCutoffChange: (val: number) => void

}

const DEFAULT_BASE_THICKNESS = 0.5

const MIN_CUTOFF_MINUTES = 5 
const MAX_CUTOFF_MINUTES = 100000



const UNIFIED_PRESETS = [
  { label: 'Month', value: 8409, color: 'bg-blue-500' },
  { label: 'Week', value: 2321, color: 'bg-emerald-500' },
  { label: 'Day', value: 177, color: 'bg-orange-500' },
]

export default function MetaPanel({
  keepDelayConsistent,
  onKeepDelayConsistentChange,
  baseLineThickness,
  onBaseLineThicknessChange,
  delayCutoff,
  onDelayCutoffChange,

}: MetaPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const getSensitivity = React.useCallback((cutoffVal: number) => {
    const logMin = Math.log(MIN_CUTOFF_MINUTES)
    const logMax = Math.log(MAX_CUTOFF_MINUTES)
    const logVal = Math.log(Math.max(MIN_CUTOFF_MINUTES, cutoffVal))

    const t = (logVal - logMin) / (logMax - logMin)
    return Math.max(0, Math.min(100, (1 - t) * 100))
  }, [])

  const sensitivity = React.useMemo(() => {
    return getSensitivity(delayCutoff)
  }, [delayCutoff, getSensitivity])

  const handleSensitivityChange = (val: number) => {
    const t = 1 - val / 100
    const logMin = Math.log(MIN_CUTOFF_MINUTES)
    const logMax = Math.log(MAX_CUTOFF_MINUTES)
    const cutoff = Math.exp(logMin + t * (logMax - logMin))
    onDelayCutoffChange(cutoff)
  }

  const activePresets = UNIFIED_PRESETS

  return (
    <TooltipProvider>
      <div
        className={cn(
          'bg-card/95 backdrop-blur-xl border border-border shadow-lg rounded-xl origin-top-left overflow-hidden',
          'transition-all duration-[500ms] ease-[cubic-bezier(0.32,0.72,0,1)] pointer-events-auto',
          isExpanded ? 'w-[340px]' : 'w-[260px]',
        )}
      >
        <div className='flex flex-col'>
          <div className='flex items-center justify-between p-3'>
            <div className='flex items-center gap-3'>
              <div className='h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0'>
                <TrainFront className='h-5 w-5' />
              </div>
              <span className='font-semibold text-sm tracking-tight whitespace-nowrap'>
                Metro Delay
              </span>
            </div>

            <div className='flex items-center gap-1'>


              <Dialog>
                <DialogTrigger asChild>
                  <Button variant='ghost' size='icon' className='h-8 w-8'>
                    <Info className='h-4 w-4' />
                    <span className='sr-only'>About</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className='sm:max-w-[425px]'>
                  <DialogHeader>
                    <DialogTitle>Dutch Railways Metro Delay Map 2024</DialogTitle>
                  </DialogHeader>
                  <div className='grid gap-4 py-4'>
                  <DialogDescription>
                    Exploring the metro map metaphor on a dynamic network.
                    Visualizing delays on the Dutch railway network throughout
                    2024.
                  </DialogDescription>
                    
                    <div className='pt-2'>
                      <p className='text-xs font-semibold mb-2'>
                        Check out the source code:
                      </p>
                      <div className='flex gap-2 w-full'>
                        <Button variant="outline" className="flex-1 gap-2" asChild>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                <Github className="w-4 h-4" />
                                GitHub
                            </a>
                        </Button>
                        <Button variant="outline" className="flex-1 gap-2" asChild>
                            <a href="#" target="_blank" rel="noopener noreferrer">
                                <GitBranch className="w-4 h-4" />
                                Codeberg
                            </a>
                        </Button>
                      </div>
                    </div>

                    <div className='border-t pt-4 mt-2'>
                        <h4 className='text-sm font-medium mb-3'>Controls</h4>
                        <div className='grid gap-2'>
                             <div className='flex items-center justify-between text-sm'>
                                <span className='text-muted-foreground'>Snap Legend to Cursor</span>
                                <div className='flex gap-1'>
                                    <Kbd>Ctrl</Kbd>
                                    <span className='text-muted-foreground text-xs flex items-center'>+</span>
                                    <span className='text-xs text-muted-foreground flex items-center'>Move</span>
                                </div>
                            </div>
                            <div className='flex items-center justify-between text-sm'>
                                <span className='text-muted-foreground'>Pause / Play</span>
                                <Kbd>Space</Kbd>
                            </div>
                        </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                      'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
                      isExpanded
                        ? 'bg-muted text-foreground'
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Settings2 className='h-4 w-4' />
                  </button>
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                  <p>{isExpanded ? 'Close settings' : 'Open settings'}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div
            className={cn(
              'space-y-5 px-4 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden',
              isExpanded
                ? 'opacity-100 max-h-[600px] pb-4 pt-2'
                : 'opacity-0 max-h-0 py-0',
            )}
          >
            <div className='h-px bg-border/50' />

            <div className='space-y-2.5'>
              <div className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
                <Scaling className='h-3 w-3' />
                Delay Scale
              </div>
              <div className='flex items-center bg-muted/50 rounded-lg border border-border/50 p-0.5 relative isolate'>
                <div
                  className='absolute top-0.5 bottom-0.5 bg-background shadow-sm rounded-md transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] -z-10'
                  style={{
                    left: keepDelayConsistent ? '2px' : 'calc(50% + 1px)',
                    width: 'calc(50% - 3px)',
                  }}
                />
                <button
                  onClick={() => onKeepDelayConsistentChange(true)}
                  className={cn(
                    'flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-colors z-10',
                    keepDelayConsistent
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Absolute
                </button>
                <button
                  onClick={() => onKeepDelayConsistentChange(false)}
                  className={cn(
                    'flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-colors z-10',
                    !keepDelayConsistent
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Relative
                </button>
              </div>
              <p className='text-[10px] text-muted-foreground px-1 leading-tight'>
                {keepDelayConsistent
                  ? 'Scale is fixed to the sensitivity setting below.'
                  : 'Scale adapts to the maximum delay in the current view.'}
              </p>
            </div>

            <div className='h-px bg-border/50' />

            <div className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5'>
                  <Ruler className='h-3 w-3' />
                  Visualization Settings
                </div>
              </div>

              <div className='space-y-4'>
                <div className='space-y-3'>
                  <div className='flex justify-between items-center text-xs'>
                    <div className='flex items-center gap-1.5'>
                      <span>Base Width</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-4 w-4 text-muted-foreground hover:text-foreground'
                            onClick={() =>
                              onBaseLineThicknessChange(DEFAULT_BASE_THICKNESS)
                            }
                          >
                            <RotateCcw className='h-2.5 w-2.5' />
                            <span className='sr-only'>Reset</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Reset to default ({DEFAULT_BASE_THICKNESS}px)
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <span className='font-mono text-muted-foreground'>
                      {baseLineThickness}px
                    </span>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Slider
                          min={0.1}
                          max={2}
                          step={0.1}
                          value={[baseLineThickness]}
                          onValueChange={([val]) =>
                            onBaseLineThicknessChange(val)
                          }
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>Adjust base width</TooltipContent>
                  </Tooltip>
                </div>

                <div
                  className={cn(
                    'space-y-3',
                    !keepDelayConsistent &&
                      'opacity-50 pointer-events-none grayscale',
                  )}
                >
                  <div className='flex justify-between items-center text-xs'>
                    <div className='flex items-center gap-1.5'>
                      <span>Sensitivity</span>
                    </div>
                    <div className='flex flex-col items-end'>
                      <span className='font-mono font-medium'>
                        {Math.round(sensitivity)}%
                      </span>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className='relative w-full h-8 flex items-center'>
                        <Slider
                          min={0}
                          max={100}
                          step={0.1}
                          value={[sensitivity]}
                          onValueChange={([val]) =>
                            handleSensitivityChange(val)
                          }
                          className='z-10 w-full [&>.bg-primary]:bg-amber-500 [&_[data-slot=slider-thumb]]:z-20'
                        />
                        {activePresets.map((preset) => {
                          const percent = getSensitivity(preset.value)
                          return (
                            <div
                              key={preset.label}
                              className={cn(
                                'absolute top-1/2 mt-3 w-1 h-1.5 rounded-full pointer-events-none transition-opacity duration-300',
                                preset.color,
                              )}
                              style={{
                                left: `calc(9px + ${percent}% - ${
                                  percent * 0.18
                                }px)`,
                                transform: 'translate(-50%, 0)',
                              }}
                            />
                          )
                        })}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      Higher sensitivity makes smaller delays appear larger
                    </TooltipContent>
                  </Tooltip>



                   <div className='pt-1'>
                    <p className='text-[10px] text-muted-foreground mb-2'>
                      Recommended Presets Per Granularity:
                    </p>
                    <div className='flex flex-wrap gap-1.5'>
                      {activePresets.map((preset) => {
                        const isActive =
                          Math.abs(delayCutoff - preset.value) < 1
                        return (
                          <Badge
                            key={preset.label}
                            variant='secondary'
                            className={cn(
                              'cursor-pointer transition-all font-normal text-[10px] px-2 py-0.5 h-5 border',
                              isActive
                                ? cn(
                                    preset.color,
                                    'text-white border-transparent hover:opacity-90',
                                  )
                                : 'bg-muted text-muted-foreground border-transparent hover:border-border hover:text-foreground',
                            )}
                            onClick={() => onDelayCutoffChange(preset.value)}
                          >
                            {!isActive && (
                              <span
                                className={cn(
                                  'w-1.5 h-1.5 rounded-full mr-1.5',
                                  preset.color,
                                )}
                              />
                            )}
                            {preset.label}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
