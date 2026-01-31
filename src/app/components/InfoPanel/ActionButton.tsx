import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { ActionButtonProps } from './types'

export const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  isActive = false,
  variant = 'default',
}: ActionButtonProps) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        onClick={onClick}
        className={cn(
          'h-8 w-8 rounded-md flex items-center justify-center transition-colors shrink-0',
          isActive
            ? 'bg-secondary text-secondary-foreground'
            : variant === 'destructive'
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <Icon className='h-4 w-4' />
      </button>
    </TooltipTrigger>
    <TooltipContent side='bottom'>
      <p>{label}</p>
    </TooltipContent>
  </Tooltip>
)
