import * as React from 'react'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'

interface SpeedControlProps {
  isExpanded: boolean
  speed: number
  onSpeedChange: (value: number) => void
}

export const SpeedControl = React.memo<SpeedControlProps>(({ isExpanded, speed, onSpeedChange }) => {
  const secondsPerDay = 1 / speed

  const presets = [
    { label: '0.5x', value: 0.5 },
    { label: '1x', value: 1.0 },
    { label: '2x', value: 2.0 },
    { label: '4x', value: 4.0 },
  ]

  const MIN_SPEED = 0.1
  const MAX_SPEED = 10

  const getSliderValue = (val: number) => {
    const logMin = Math.log(MIN_SPEED)
    const logMax = Math.log(MAX_SPEED)
    const logVal = Math.log(Math.max(MIN_SPEED, Math.min(MAX_SPEED, val)))
    return ((logVal - logMin) / (logMax - logMin)) * 100
  }

  const getSpeedValue = (sliderVal: number) => {
    const t = sliderVal / 100
    const logMin = Math.log(MIN_SPEED)
    const logMax = Math.log(MAX_SPEED)
    return Math.exp(logMin + t * (logMax - logMin))
  }

  const sliderValue = getSliderValue(speed)

  const [minimizedInput, setMinimizedInput] = React.useState(
      secondsPerDay < 0.1 ? secondsPerDay.toFixed(2) : secondsPerDay.toFixed(1)
  )
  const [isFocused, setIsFocused] = React.useState(false)
  
  React.useEffect(() => {
     if (isFocused) return
     setMinimizedInput(secondsPerDay < 0.1 ? secondsPerDay.toFixed(2) : secondsPerDay.toFixed(1))
  }, [secondsPerDay, isFocused])

  const handleMinimizedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMinimizedInput(e.target.value)
  }

  const handleBlur = () => {
      setIsFocused(false)
      const val = parseFloat(minimizedInput)
      if (!isNaN(val) && val > 0) {
          onSpeedChange(1 / val)
      } else {
          setMinimizedInput(secondsPerDay < 0.1 ? secondsPerDay.toFixed(2) : secondsPerDay.toFixed(1))
      }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 transition-all duration-500',
        isExpanded && 'col-span-2',
      )}
    >
      <div
        className={cn(
          'text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 overflow-hidden transition-all duration-500',
          isExpanded ? 'h-4 opacity-100' : 'h-3.5 opacity-100',
        )}
      >
        <Zap className='h-3 w-3' />
        {isExpanded ? (
          <>
            Animation Speed{' '}
            <span className='font-normal text-muted-foreground/70'>
              ({secondsPerDay < 0.1 ? secondsPerDay.toFixed(2) : secondsPerDay.toFixed(1)}s/day)
            </span>
          </>
        ) : (
          'Speed'
        )}
      </div>

      <div className={cn(
          "flex items-center gap-2 transition-all duration-500 w-full",
          isExpanded ? "h-auto min-h-[5rem]" : "h-9" 
      )}>
         {!isExpanded && (
            <div className='relative w-full h-full'>
                <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    className="w-full h-full bg-muted/50 border border-border/50 rounded-lg text-xs font-medium text-center focus:outline-none focus:ring-1 focus:ring-primary px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={minimizedInput}
                    onChange={handleMinimizedChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={(e) => e.stopPropagation()} 
                />
                 <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">s</span>
            </div>
         )}

         {isExpanded && (
            <div className='w-full h-full bg-muted/30 rounded-lg border border-border/50 p-4 flex flex-col justify-center relative'>
               
               <div className="flex flex-col gap-6">
                   <div className='relative w-full h-4 flex items-center'>
                        <Slider
                            min={0}
                            max={100}
                            step={0.1}
                            value={[sliderValue]}
                            onValueChange={([val]) => onSpeedChange(getSpeedValue(val))}
                            className='z-10 w-full'
                        />
                         {presets.map((preset) => {
                            const percent = getSliderValue(preset.value)
                            return (
                            <div
                                key={preset.label}
                                className='absolute top-1/2 mt-2 w-0.5 h-2 bg-muted-foreground/30 rounded-full pointer-events-none'
                                style={{
                                    left: `${percent}%`,
                                    transform: 'translate(-50%, 0)',
                                }}
                            />
                            )
                        })}
                   </div>

                   <div className='relative w-full h-6'>
                      {presets.map((preset) => {
                          const percent = getSliderValue(preset.value)
                          const isActive = Math.abs(speed - preset.value) < 0.1
                          return (
                              <Badge
                                key={preset.label}
                                variant='secondary'
                                className={cn(
                                  'absolute top-0 -translate-x-1/2 cursor-pointer transition-all font-normal text-[10px] px-2 py-0.5 h-5 border justify-center whitespace-nowrap',
                                  isActive
                                    ? 'bg-primary text-primary-foreground border-transparent hover:opacity-90 z-10 scale-105 shadow-sm'
                                    : 'bg-muted text-muted-foreground border-transparent hover:border-border hover:text-foreground'
                                )}
                                style={{
                                    left: `${percent}%`,
                                }}
                                onClick={() => onSpeedChange(preset.value)}
                              >
                                 {preset.label}
                              </Badge>
                          )
                      })}
                   </div>
               </div>
            </div>
         )}
      </div>
    </div>
  )
})
SpeedControl.displayName = 'SpeedControl'
