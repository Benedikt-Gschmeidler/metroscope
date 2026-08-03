# Study Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the 12-item batch of UX fixes/small features from
`docs/superpowers/specs/2026-08-03-study-improvements-design.md`, including
three confirmed bugs (legend/crosshair color mismatch, timeline aggregation
over-counting, invisible country border).

**Architecture:** No new components, no new dependencies, no architectural
change. Each task is a small, surgical edit to an existing file, matching
the root causes documented in the spec.

**Tech Stack:** Next.js 15 (Turbopack) + React 19 + TypeScript + D3 +
Tailwind. Dev server: `pnpm dev` (or `npx pnpm@latest dev` if `pnpm` isn't
on PATH — this environment doesn't have global pnpm; `npx pnpm@latest`
resolves it via npm's cache). Data must be preprocessed once via
`pnpm preprocess` before `pnpm dev` will show real delay data (already done
in this environment — `public/data/preprocessed-delays.json` exists).

## Global Constraints

- No new dependencies. No architectural changes. Every change below is
  localized to the named files.
- This repo has **no automated test framework** (no jest/vitest/testing
  library in `package.json`). "Tests" in this plan means: TypeScript
  type-checking (`npx tsc --noEmit`), `pnpm lint`, and manual verification
  in a running `pnpm dev` session — there is no way to write an automated
  failing-test-first step here, so each task instead states the exact
  manual repro/verification steps.
- Copy changes: "Absolute" → "Advanced", "Relative" → "Auto" (task 6) —
  apply consistently everywhere those words describe the delay-scale mode.
- Commit after each task with a `fix:` or `feat:` prefix matching the
  nature of the change (bug fixes vs. new capability).
- The dev server may already be running in this environment on
  `http://localhost:3000` (started during investigation). If not:
  `npx pnpm@latest run preprocess && npx pnpm@latest run dev`. Turbopack
  hot-reloads on file save, so no restart is needed between tasks unless
  the server has stopped.
- Spec item A4 ("click timeline to set current time point") has **no
  task** below — investigation (spec section A4) confirmed this already
  works as-is and the user confirmed it's fine, so it's intentionally
  excluded rather than missing.

---

### Task 1: Speed control direction + default speed

**Files:**
- Modify: `src/app/components/SpeedControl.tsx`
- Modify: `src/app/components/MetroMap.tsx:127`

**Interfaces:**
- `SpeedControlProps` (unchanged): `{ isExpanded: boolean; speed: number;
  onSpeedChange: (value: number) => void }`
- No changes to any consumer signature — `TimelineControl` still passes
  `speed`/`onSpeedChange` straight through.

- [ ] **Step 1: Change the default playback speed**

In `src/app/components/MetroMap.tsx:127`, change:

```ts
const [playbackSpeed, setPlaybackSpeed] = useState(1)
```

to:

```ts
const [playbackSpeed, setPlaybackSpeed] = useState(2)
```

- [ ] **Step 2: Fix the collapsed input to show speed, not inverse seconds-per-day**

In `src/app/components/SpeedControl.tsx`, replace the whole component body
from the `secondsPerDay` line through the collapsed `<input>` block. The
current code (lines 13-64) computes `secondsPerDay = 1 / speed` and binds
the collapsed input to that inverse value. Replace it so the collapsed
input directly reflects `speed` as a multiplier:

```tsx
export const SpeedControl = React.memo<SpeedControlProps>(({ isExpanded, speed, onSpeedChange }) => {
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

  const [minimizedInput, setMinimizedInput] = React.useState(speed.toFixed(1))
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
     if (isFocused) return
     setMinimizedInput(speed.toFixed(1))
  }, [speed, isFocused])

  const handleMinimizedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMinimizedInput(e.target.value)
  }

  const handleBlur = () => {
      setIsFocused(false)
      const val = parseFloat(minimizedInput)
      if (!isNaN(val) && val > 0) {
          onSpeedChange(Math.max(MIN_SPEED, Math.min(MAX_SPEED, val)))
      } else {
          setMinimizedInput(speed.toFixed(1))
      }
  }
```

Then, further down in the JSX, update the expanded label (which currently
shows `secondsPerDay`) to show the speed multiplier instead. Replace:

```tsx
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
```

with:

```tsx
        {isExpanded ? (
          <>
            Animation Speed{' '}
            <span className='font-normal text-muted-foreground/70'>
              ({speed.toFixed(1)}x)
            </span>
          </>
        ) : (
          'Speed'
        )}
```

And update the collapsed `<input>` block's suffix label from `s` (seconds)
to `x` (multiplier):

```tsx
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">x</span>
```

The rest of the file (the expanded slider + presets block) is unchanged —
it already maps slider position to `speed` correctly increasing.

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit`
Expected: no errors related to `SpeedControl.tsx` or `MetroMap.tsx`
(pre-existing unrelated errors, if any, are not this task's concern).

Run: `pnpm lint` (or `npx pnpm@latest run lint`)
Expected: no new lint errors in the two changed files.

- [ ] **Step 4: Manual verification**

With `pnpm dev` running, open `http://localhost:3000`:
1. On load, the collapsed Speed control (bottom-left panel) should show
   `2.0x` (not `0.5s/day` or similar).
2. Expand the controls (maximize icon). The label should read
   "Animation Speed (2.0x)", and the slider thumb should sit at the "2x"
   preset tick.
3. Drag the slider to the right (toward 4x/10x) — animation speed
   (observable via Play) should visibly speed up, not slow down.
4. Collapse the controls again, type `4` into the compact input and blur
   it — the expanded view (re-open) should confirm speed is now 4.0x, and
   playback should be visibly faster than at 2x.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/SpeedControl.tsx src/app/components/MetroMap.tsx
git commit -m "fix: correct inverted speed control and raise default to 2x"
```

---

### Task 2: Scroll-to-pan on the timeline

**Files:**
- Modify: `src/app/components/Timeline/index.tsx`

**Interfaces:** No prop/type changes — purely an added internal effect.

- [ ] **Step 1: Add a wheel handler that converts vertical scroll into horizontal pan**

In `src/app/components/Timeline/index.tsx`, find the existing effect that
attaches `mousemove`/`mouseleave` listeners to `wrapperRef`/`containerRef`
(around line 177-221). Add a new effect right after it (before the
`useTimelineSegments(...)` call), attaching a `wheel` listener to
`containerRef.current`:

```tsx
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      const isMostlyVertical = Math.abs(e.deltaY) > Math.abs(e.deltaX)
      if (!isMostlyVertical) return

      e.preventDefault()
      container.scrollLeft += e.deltaY
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [])
```

This only intercepts wheel events that are dominantly vertical (a plain
mouse wheel), leaving native horizontal trackpad panning and pinch-zoom
untouched (`deltaX`-dominant events pass through unhandled).

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in `Timeline/index.tsx`.

- [ ] **Step 3: Manual verification**

With `pnpm dev` running, open the app, ensure the timeline strip at the
bottom is showing (expand controls if needed so it's visible), then hover
over the timeline strip and scroll the mouse wheel down/up (not shift+wheel,
not a trackpad swipe). The timeline should pan left/right in response to
plain vertical wheel scroll, and the segment loading logic in
`useTimelineData.ts` (which listens for `scroll` events on the same
container) should keep fetching new segments as you pan — new
day/week/month segments should populate as you scroll far enough.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/Timeline/index.tsx
git commit -m "feat: pan the timeline horizontally with the mouse wheel"
```

---

### Task 3: Fix date-picker popover jump past August

**Files:**
- Modify: `src/app/components/TimelineControl/index.tsx`

**Interfaces:** No prop/type changes.

- [ ] **Step 1: Pin the popover's side and disable collision-based flipping**

In `src/app/components/TimelineControl/index.tsx`, find:

```tsx
                <PopoverContent className='w-auto p-3' align='start'>
```

Change it to:

```tsx
                <PopoverContent
                  className='w-auto p-3'
                  align='start'
                  side='top'
                  avoidCollisions={false}
                >
```

(The control panel is anchored near the bottom of the viewport
`absolute bottom-4 left-4` in `MetroMap.tsx`, so `side='top'` is always the
correct opening direction — pinning it removes Radix's automatic
side-flipping, which was the direct cause of the jump.)

- [ ] **Step 2: Stabilize the calendar's rendered height so it never fluctuates between month pages**

Still in `src/app/components/TimelineControl/index.tsx`, wrap both
`<UI_Calendar>` usages (point mode around line 329 and range mode around
line 345) in a container with a fixed minimum height, so the popover's
measured content height stays constant regardless of whether the visible
month(s) need 5 or 6 grid rows (which is what previously changed the
popover's height and triggered the Radix flip).

Note: `--cell-size` is a CSS custom property defined on the `DayPicker`
root element itself (inside `src/components/ui/calendar.tsx`), which is a
*descendant* of the wrapper div we're adding — CSS custom properties only
cascade downward from ancestor to descendant, so `var(--cell-size)` is
**not** visible on an ancestor wrapper. Use a concrete `rem` value instead
(computed for the worst case: 1 weekday-header row + 6 week rows, each
built from `--cell-size: 2rem` cells with `mt-2` row spacing, plus the
month caption row — roughly `21rem` total is a safe generous floor).

Change:

```tsx
                  {selectionMode === 'point' ? (
                    <div className='space-y-3'>
                      <UI_Calendar
                        mode='single'
                        selected={date}
                        onSelect={handleDateSelect}
                        initialFocus
                        defaultMonth={date}
                      />
```

to:

```tsx
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
```

And change:

```tsx
                    <div className='space-y-4'>
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
```

to:

```tsx
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
```

(`21rem` covers 1 weekday-label row + 6 possible week rows, the maximum
any single month grid can need — this guarantees the popover never has to
shrink below that floor as you page through months. If manual verification
in Step 4 shows any remaining size change when a 6-row month is visible,
increase this value until it doesn't.) Make sure the closing `</div>` for
each new wrapper is added in the right place (immediately after the
`<UI_Calendar ... />` self-closing tag, before the existing `<input
type='time' .../>` / time-fields `<div>` that follows).

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in `TimelineControl/index.tsx`.

- [ ] **Step 4: Manual verification**

With `pnpm dev` running:
1. Expand the timeline controls (maximize icon).
2. Switch selection mode to "range" (if not already).
3. Open the date popover.
4. Click the ">" next-month arrow repeatedly, paging from
   Jun/Jul/Aug 2024 through to Jul/Aug/Sep 2024 and beyond.
5. Confirm the popover no longer jumps position at any point during
   paging — it should stay anchored above the date button throughout.
6. Repeat with controls collapsed, to confirm no regression there either.
7. Switch to "point" mode and confirm the single-month calendar also opens
   consistently above the trigger and doesn't jump when paging months.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/TimelineControl/index.tsx
git commit -m "fix: stop date picker popover from jumping position when paging months"
```

---

### Task 4: "Reset selection" button

**Files:**
- Modify: `src/app/components/TimelineControl/types.ts`
- Modify: `src/app/components/TimelineControl/index.tsx`
- Modify: `src/app/components/MetroMap.tsx`

**Interfaces:**
- `TimelineControlProps` gains: `onReset: () => void`

- [ ] **Step 1: Add the `onReset` prop to `TimelineControlProps`**

In `src/app/components/TimelineControl/types.ts`, add to the
`TimelineControlProps` interface (after `onSpeedChange`):

```ts
  onSpeedChange: (speed: number) => void
  onReset: () => void
```

- [ ] **Step 2: Destructure the new prop and render the button**

In `src/app/components/TimelineControl/index.tsx`, add `onReset` to the
destructured props:

```tsx
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
```

Add the `RotateCcw` icon to the existing `lucide-react` import at the top
of the file:

```tsx
import {
  Play,
  Pause,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react'
```

Then add a reset button right after the Play/Pause button (which ends with
`</Tooltip>` around line 224), before the `<SelectionModeControl ... />`:

```tsx
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
```

- [ ] **Step 3: Implement the reset handler in `MetroMap.tsx` and pass it down**

In `src/app/components/MetroMap.tsx`, add a handler near the other
`handle*` callbacks (e.g. right after `handleDragStart`, around line 239).
It needs the initial default `currentTimeSelection` value, which already
exists at lines 145-150 — extract it to a shared constant so the reset
handler and the initial `useState` call use the exact same value:

Find:

```ts
  const [currentTimeSelection, setCurrentTimeSelection] =
    useState<TimeSelection>({
      mode: 'range',
      start: TIME_RANGE.min,
      end: new Date(new Date(TIME_RANGE.min).setMonth(TIME_RANGE.min.getMonth() + 1)),
    })
```

Replace with (moving the literal above the component, or just above this
line, as a module-level constant so it's reused by the reset handler
below):

```ts
  const [currentTimeSelection, setCurrentTimeSelection] =
    useState<TimeSelection>(DEFAULT_TIME_SELECTION)
```

Add, above the `export default function MetroMap` declaration:

```ts
const DEFAULT_TIME_SELECTION: TimeSelection = {
  mode: 'range',
  start: TIME_RANGE.min,
  end: new Date(new Date(TIME_RANGE.min).setMonth(TIME_RANGE.min.getMonth() + 1)),
}
```

Then add the reset handler (after `handleDragStart`):

```ts
  const handleResetSelection = useCallback(() => {
    setSelectedLines([])
    setPinnedLineIds(new Set())
    setHoveredLine(undefined)
    setCurrentTimeSelection(DEFAULT_TIME_SELECTION)
  }, [])
```

Finally, wire it into the `<TimelineControl>` usage (around line 507-521):

```tsx
            <TimelineControl
              granularity={granularity}
              selectionMode={selectionMode}
              isTimelinePlaying={isTimelinePlaying}
              onGranularityChange={setGranularity}
              onSelectionModeChange={setSelectionMode}
              onClickTimelinePlay={toggleTimelinePlay}
              currentTimeSelection={currentTimeSelection}
              onTimeSelectionChange={handleSelectionChange}
              isFocusMatchEnabled={isFocusMatchEnabled}
              onFocusMatchChange={setIsFocusMatchEnabled}
              speed={playbackSpeed}
              onSpeedChange={setPlaybackSpeed}
              onReset={handleResetSelection}
              className='pointer-events-auto'
            />
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors (in particular, verify
`TimeSelection` is already imported in `MetroMap.tsx`; it is, since
`currentTimeSelection` already uses it).
Run: `pnpm lint` — expect no new errors in the three changed files.

- [ ] **Step 5: Manual verification**

With `pnpm dev` running:
1. Click a metro line on the map to select it (InfoPanel opens).
2. Drag-select a custom time range on the timeline, different from the
   default Jan 2024 range.
3. Click the new reset button (next to Play/Pause).
4. Confirm: the InfoPanel closes (no lines selected), any pinned
   highlight is cleared, and the timeline selection jumps back to the
   default Jan 1 2024 – Feb 1 2024 range.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/TimelineControl/types.ts src/app/components/TimelineControl/index.tsx src/app/components/MetroMap.tsx
git commit -m "feat: add reset selection button to clear lines and timeline selection"
```

---

### Task 5: Minutes → hours formatter

**Files:**
- Modify: `src/lib/metro-utils.ts`
- Modify: `src/app/components/DelayLegend.tsx`
- Modify: `src/app/components/InfoPanel/SingleLinePanel.tsx`

**Interfaces:**
- New export: `formatDelayDuration(minutes: number): string` from
  `src/lib/metro-utils.ts`.

- [ ] **Step 1: Add the formatter**

In `src/lib/metro-utils.ts`, add (near `getNiceSteps`, at the end of the
file):

```ts
export const formatDelayDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes.toFixed(0)} min`
  return `${(minutes / 60).toFixed(1)}h`
}
```

- [ ] **Step 2: Use it in `DelayLegend.tsx`**

In `src/app/components/DelayLegend.tsx`, add the import:

```ts
import { getNiceSteps, formatDelayDuration } from '@/lib/metro-utils'
```

Replace the base item label:

```ts
  items.push({
    id: 'base',
    delay: 0,
    label: '0 min',
```

with:

```ts
  items.push({
    id: 'base',
    delay: 0,
    label: formatDelayDuration(0),
```

Replace the step label:

```ts
    items.push({
      id: `step-${step}`,
      delay: step,
      label: `${step} min`,
```

with:

```ts
    items.push({
      id: `step-${step}`,
      delay: step,
      label: formatDelayDuration(step),
```

Replace both occurrences of `{Math.round(maxDelay.delay)} min` in the
`label` construction for the `'max'` item:

```tsx
    const label = maxDelayLine ? (
      <span style={{ color: lineColours[maxDelayLine.colorIndex], fontWeight: 700 }}>
        {Math.round(maxDelay.delay)} min
      </span>
    ) : (
      <span style={{ fontWeight: 700 }}>
        {scaleMode === 'absolute' ? 'Limit: ' : ''}
        {Math.round(maxDelay.delay)} min
      </span>
    )
```

with:

```tsx
    const label = maxDelayLine ? (
      <span style={{ color: lineColours[maxDelayLine.colorIndex], fontWeight: 700 }}>
        {formatDelayDuration(maxDelay.delay)}
      </span>
    ) : (
      <span style={{ fontWeight: 700 }}>
        {scaleMode === 'absolute' ? 'Limit: ' : ''}
        {formatDelayDuration(maxDelay.delay)}
      </span>
    )
```

Replace the per-line item label:

```tsx
      label: (
        <span style={{ color: lineColours[line.colorIndex], fontWeight: 700 }}>
          {Math.round(delay)} min
        </span>
      ),
```

with:

```tsx
      label: (
        <span style={{ color: lineColours[line.colorIndex], fontWeight: 700 }}>
          {formatDelayDuration(delay)}
        </span>
      ),
```

- [ ] **Step 3: Use it in `SingleLinePanel.tsx`**

In `src/app/components/InfoPanel/SingleLinePanel.tsx`, add the import:

```ts
import { formatDelayDuration } from '@/lib/metro-utils'
```

Replace:

```tsx
              {item.delay > 0 && (
                <div className='absolute top-2 ml-16 pointer-events-auto'>
                    <span className='font-mono text-red-500 dark:text-red-400 whitespace-nowrap tabular-nums text-sm font-bold'>
                      {item.delay.toFixed(0)} min
                    </span>
                </div>
              )}
```

with:

```tsx
              {item.delay > 0 && (
                <div className='absolute top-2 ml-16 pointer-events-auto'>
                    <span className='font-mono text-red-500 dark:text-red-400 whitespace-nowrap tabular-nums text-sm font-bold'>
                      {formatDelayDuration(item.delay)}
                    </span>
                </div>
              )}
```

- [ ] **Step 4: Confirm no other minute-labeled call sites were missed**

Run: `grep -rn "} min\|toFixed(0)} min\|Math.round.*min" src/app/components src/lib`
Expected: no remaining raw `"X min"` string constructions for delay values
outside the ones just changed. If any turn up, apply the same
`formatDelayDuration` substitution there too before moving on.

- [ ] **Step 5: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in the three changed files.

- [ ] **Step 6: Manual verification**

With `pnpm dev` running:
1. Select a line with a small delay (under 60 min) somewhere in the
   InfoPanel — confirm it still reads e.g. `"23 min"`.
2. Select a time range/line combination with a large aggregated delay
   (switch granularity to "Month", pick a busy month) — confirm the
   DelayLegend's max/step labels and the InfoPanel's per-station numbers
   now show as e.g. `"12.4h"` instead of `"744 min"`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/metro-utils.ts src/app/components/DelayLegend.tsx src/app/components/InfoPanel/SingleLinePanel.tsx
git commit -m "feat: format large delay durations in hours instead of minutes"
```

---

### Task 6: Relabel Absolute/Relative → Advanced/Auto

**Files:**
- Modify: `src/app/components/MetaPanel.tsx`
- Modify: `src/app/components/DelayLegend.tsx`

**Interfaces:** No prop/type changes — copy only. Internal prop/state names
(`keepDelayConsistent`, `scaleMode: 'relative' | 'absolute'`) are untouched.

- [ ] **Step 1: Relabel the toggle buttons in `MetaPanel.tsx`**

Replace:

```tsx
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
```

with:

```tsx
                <button
                  onClick={() => onKeepDelayConsistentChange(true)}
                  className={cn(
                    'flex-1 flex items-center justify-center py-1.5 text-xs font-medium rounded-md transition-colors z-10',
                    keepDelayConsistent
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  Advanced
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
                  Auto
                </button>
```

- [ ] **Step 2: Reword the helper paragraph in `MetaPanel.tsx`**

Replace:

```tsx
              <p className='text-[10px] text-muted-foreground px-1 leading-tight'>
                {keepDelayConsistent
                  ? 'Scale is fixed to the sensitivity setting below.'
                  : 'Scale adapts to the maximum delay in the current view.'}
              </p>
```

with:

```tsx
              <p className='text-[10px] text-muted-foreground px-1 leading-tight'>
                {keepDelayConsistent
                  ? 'Advanced: scale is fixed to the sensitivity setting below, independent of what you have selected.'
                  : 'Auto: scale adapts to the largest aggregated delay in your current selection.'}
              </p>
```

- [ ] **Step 3: Reword the DelayLegend caption in `DelayLegend.tsx`**

Replace:

```tsx
        <span className='text-[9px] text-muted-foreground px-1.5 -mt-1'>
          {scaleMode === 'absolute' ? 'Fixed (Clamped)' : 'Dynamic (Local)'}
        </span>
```

with:

```tsx
        <span className='text-[9px] text-muted-foreground px-1.5 -mt-1'>
          {scaleMode === 'absolute' ? 'Advanced (Fixed)' : 'Auto (Adaptive)'}
        </span>
```

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in the two changed files.

- [ ] **Step 5: Manual verification**

With `pnpm dev` running, open Settings (gear icon) in the top-left panel:
confirm the toggle now reads "Advanced" / "Auto" instead of "Absolute" /
"Relative", the helper text below it references the new names, and the
DelayLegend's small caption under "Delay Scale" reads "Advanced (Fixed)"
or "Auto (Adaptive)" depending on which mode is active.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/MetaPanel.tsx src/app/components/DelayLegend.tsx
git commit -m "docs: relabel Absolute/Relative scale modes to Advanced/Auto"
```

---

### Task 7: Richer tooltip copy for Base Width, Sensitivity, and Focus Match

**Files:**
- Modify: `src/app/components/MetaPanel.tsx`
- Modify: `src/app/components/TimelineControl/FocusMatchControl.tsx`

**Interfaces:** No prop/type changes — copy only.

- [ ] **Step 1: Expand the Base Width tooltip**

In `src/app/components/MetaPanel.tsx`, replace:

```tsx
                    <TooltipContent>Adjust base width</TooltipContent>
```

(the one inside the Base Width slider's `Tooltip`, not the "Reset to
default" one a few lines above it) with:

```tsx
                    <TooltipContent>
                      The minimum line thickness, used wherever there is no
                      delay. Every line renders at least this wide.
                    </TooltipContent>
```

- [ ] **Step 2: Expand the Sensitivity tooltip**

Replace:

```tsx
                    <TooltipContent>
                      Higher sensitivity makes smaller delays appear larger
                    </TooltipContent>
```

with:

```tsx
                    <TooltipContent>
                      Sets &#964; (tau): the delay, in minutes, that maps to
                      maximum line width in Advanced mode. Delays beyond
                      &#964; still render at max width, with a hatch pattern.
                      Higher sensitivity means a lower &#964;, so smaller
                      delays reach full width sooner.
                    </TooltipContent>
```

- [ ] **Step 3: Reword the Focus Match tooltip and add it to the collapsed variant**

In `src/app/components/TimelineControl/FocusMatchControl.tsx`, the
expanded `ToggleGroup` variant already passes an `infoTooltip` string —
reword it. Replace:

```tsx
        infoTooltip='Matches the timeline view to the map view'
```

with:

```tsx
        infoTooltip='Keeps the timeline\'s visible time window synced to whatever the map is currently panned/zoomed to'
```

The collapsed `Select` variant (the `if (!isExpanded)` branch, lines 28-55)
has no tooltip at all today. Wrap its label row in a `Tooltip` so the same
explanation is available when collapsed. Add the needed imports at the top
of the file:

```tsx
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
```

Then replace:

```tsx
          <div className='text-[10px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 h-3.5'>
            <ScanEye className='h-3 w-3' />
            Focus Match
          </div>
```

with:

```tsx
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
```

Note: this file does not currently wrap its collapsed-variant return value
in a `TooltipProvider`. Check whether an ancestor (e.g. `TimelineControl`'s
top-level `<TooltipProvider>` in `TimelineControl/index.tsx`) already
supplies one — it does (`TimelineControl` wraps everything in
`<TooltipProvider>`), so no additional provider is needed here.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in the two changed files.

- [ ] **Step 5: Manual verification**

With `pnpm dev` running:
1. Open Settings, hover the info icon / label next to "Base Width" —
   confirm the new explanatory tooltip appears.
2. Hover the "Sensitivity" label/slider — confirm the tooltip explains τ,
   max line width, and the hatch pattern.
3. In the bottom-left timeline controls, hover "Focus Match" in both the
   collapsed (Select) and expanded (ToggleGroup) states — confirm both now
   show an explanatory tooltip.

- [ ] **Step 6: Commit**

```bash
git add src/app/components/MetaPanel.tsx src/app/components/TimelineControl/FocusMatchControl.tsx
git commit -m "docs: add explanatory tooltips for base width, sensitivity, and focus match"
```

---

### Task 8: Fix crosshair/legend color mismatch

**Files:**
- Modify: `src/data/delayData.ts`
- Modify: `src/app/components/MetroMap.tsx`
- Modify: `src/app/components/DelayLegend.tsx`

**Interfaces:**
- `RenderState.maxDelay.lineId` now always holds a plain line id (e.g.
  `"Almelo - Zwolle"`), never a `line::station` composite key. This is a
  behavior fix, not a type change — `RenderState` (in `delayData.ts`) keeps
  the same shape.

- [ ] **Step 1: Fix `delayData.ts` to store a plain line id**

In `src/data/delayData.ts`, in `getDelaysForWindow`, replace:

```ts
    if (val > maxDelay.delay) {
      maxDelay = { delay: val, lineId: locationId }
    }
```

with:

```ts
    if (val > maxDelay.delay) {
      maxDelay = { delay: val, lineId: locationId.split('::')[0] }
    }
```

In the same file, in `getDelaysForPoint`, replace:

```ts
    if (delay > maxDelay.delay) {
      maxDelay = { delay, lineId: locationId }
    }
```

with:

```ts
    if (delay > maxDelay.delay) {
      maxDelay = { delay, lineId: locationId.split('::')[0] }
    }
```

- [ ] **Step 2: Pass the real line id from `MetroMap.tsx`, only when it's meaningful**

In `src/app/components/MetroMap.tsx`, replace:

```tsx
            <DelayLegend
              maxDelay={{ delay: effectiveDelayCutoff, lineId: '' }}
```

with:

```tsx
            <DelayLegend
              maxDelay={{
                delay: effectiveDelayCutoff,
                lineId: keepDelayConsistent ? '' : renderState.maxDelay.lineId,
              }}
```

(In Advanced/`keepDelayConsistent` mode, `effectiveDelayCutoff` is a
user-set threshold with no single line behind it, so `lineId` stays `''`
deliberately — that's the one case where empty is correct. In Auto mode,
`effectiveDelayCutoff` **is** `renderState.maxDelay.delay`, so its
`lineId` is now the real line that produced that max, fixed in Step 1.)

- [ ] **Step 3: Remove the fragile value-tie fallback in `DelayLegend.tsx`**

Replace:

```ts
  const maxDelayLine = useMemo(() => {
    if (maxDelay.delay <= 0) return undefined
    if (maxDelay.lineId) {
      const line = topology.lines.find((l) => l.id === maxDelay.lineId)
      if (line) return line
    }
    for (const [key, value] of renderState.delays.entries()) {
      if (Math.abs(value - maxDelay.delay) < 0.001) {
        const lineId = key.split('::')[0]
        return topology.lines.find((l) => l.id === lineId)
      }
    }
    return undefined
  }, [maxDelay, renderState.delays, topology.lines])
```

with:

```ts
  const maxDelayLine = useMemo(() => {
    if (maxDelay.delay <= 0 || !maxDelay.lineId) return undefined
    return topology.lines.find((l) => l.id === maxDelay.lineId)
  }, [maxDelay, topology.lines])
```

`renderState.delays` is still used elsewhere in this file (inside
`getMaxDelayForLine`), so no import/prop becomes unused.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in the three changed files.

- [ ] **Step 5: Manual verification**

With `pnpm dev` running:
1. Switch the Delay Scale to "Auto" (was "Relative").
2. Hover over a line on the map with a visible delay. Hold Ctrl and move
   the mouse to snap the legend to the cursor (per the app's existing
   "Snap Legend to Cursor" shortcut).
3. Confirm the legend's "max" ring/label color now always matches the
   color of the line you're actually hovering/selecting (check against
   several different lines, including ones where multiple stations might
   tie on delay value) — it should never show an unrelated line's color.
4. Switch to "Advanced" mode and confirm the "Limit: Xh" max label renders
   in a neutral color (no line color), since there's no specific line tied
   to a user-set threshold.

- [ ] **Step 6: Commit**

```bash
git add src/data/delayData.ts src/app/components/MetroMap.tsx src/app/components/DelayLegend.tsx
git commit -m "fix: stop legend max-delay marker from showing the wrong line's color"
```

---

### Task 9: Fix aggregation over-counting in timeline dot sizing

**Files:**
- Modify: `src/app/components/Timeline/useTimelineData.ts`

**Interfaces:** No type changes — `DelaySummaryData.totalDelayMinutes`
keeps its name; only the value computed for it changes.

- [ ] **Step 1: Replace the sum-across-stations with max-across-stations**

In `src/app/components/Timeline/useTimelineData.ts`, replace:

```ts
          const delaySummaryData: DelaySummaryData[] = lineMeta.map((meta) => {
            let totalDelay = 0
            let maxDelay = 0
            meta.stationIds.forEach((sid) => {
              const key = `${meta.id}::${sid}`
              totalDelay += delaysInWindow.delays.get(key) || 0
              maxDelay = Math.max(maxDelay, delaysInWindow.delays.get(key) || 0)
            })

            return {
              totalDelayMinutes: totalDelay,
              lineColor: meta.color,
              gridX: meta.avgX,
              gridY: meta.avgY,
              lineId: meta.id, 
            }
          })
```

with:

```ts
          const delaySummaryData: DelaySummaryData[] = lineMeta.map((meta) => {
            let maxDelay = 0
            meta.stationIds.forEach((sid) => {
              const key = `${meta.id}::${sid}`
              maxDelay = Math.max(maxDelay, delaysInWindow.delays.get(key) || 0)
            })

            return {
              totalDelayMinutes: maxDelay,
              lineColor: meta.color,
              gridX: meta.avgX,
              gridY: meta.avgY,
              lineId: meta.id, 
            }
          })
```

(This matches the max-across-stations semantics `DelayLegend`'s
`getMaxDelayForLine` and the map's per-segment line thickness already use
— previously, a single incident spanning N stations on a line inflated
this line's timeline-dot size by a factor of N, since the same incident's
full duration was summed once per station it touched.)

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in `useTimelineData.ts`.

- [ ] **Step 3: Manual verification**

With `pnpm dev` running:
1. Set granularity to "Day", scroll the timeline to early January 2024
   (the `Almelo - Zwolle` line had a 176-minute, 6-station incident on
   2024-01-01 per `src/data/delays.ts` id `51321`).
2. Compare the size of that line's event dot on 2024-01-01 against the
   `DelayLegend`'s max-delay reading for the same line/day (select the
   line, check its InfoPanel per-station delay, which should read ~176
   min / ~2.9h for the affected stations) — the dot size should now
   correspond to that ~176-minute figure (via `sizeScale`), not
   ~1056 minutes.
3. Spot-check a couple of other large multi-station incidents in
   `src/data/delays.ts` the same way to confirm dot sizes track the
   per-station max, not a station-count-inflated sum.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/Timeline/useTimelineData.ts
git commit -m "fix: stop timeline dot size from scaling with incident station-count"
```

---

### Task 10: Make the country border visible on the map

**Files:**
- Modify: `src/app/components/CountryOutline.tsx`

**Interfaces:** No signature changes — only a default prop value.

- [ ] **Step 1: Wire the border color default to the intended constant**

In `src/app/components/CountryOutline.tsx`, confirm `COUNTRY_OUTLINE` is
already imported (it is, at the top of the file, and its `strokeWidth`
default already uses it). Replace:

```tsx
const CountryOutline: React.FC<CountryOutlineProps> = ({
  strokeWidth = COUNTRY_OUTLINE.strokeWidth,
  seaColor = '#f3f3f3ff',
  landColor = '#ffffff',
  borderColor = '#f3f3f3ff',
  cornerRadius = 6,
}) => {
```

with:

```tsx
const CountryOutline: React.FC<CountryOutlineProps> = ({
  strokeWidth = COUNTRY_OUTLINE.strokeWidth,
  seaColor = '#f3f3f3ff',
  landColor = '#ffffff',
  borderColor = COUNTRY_OUTLINE.strokeColor,
  cornerRadius = 6,
}) => {
```

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in `CountryOutline.tsx`.

- [ ] **Step 3: Manual verification**

With `pnpm dev` running, load the app and look at the map background: the
Netherlands' national outline should now be visibly drawn in a light
blue-gray (`#c8d1dc`) instead of being indistinguishable from the
background. Zoom/pan the map to confirm the border tracks correctly with
the rest of the map content.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/CountryOutline.tsx
git commit -m "fix: make country border visible using its intended stroke color"
```

---

### Task 11: Speed preset dropdown (replace collapsed free-text input)

**Files:**
- Modify: `src/app/components/SpeedControl.tsx`

**Interfaces:** No prop/type changes — `SpeedControlProps` stays
`{ isExpanded: boolean; speed: number; onSpeedChange: (value: number) => void }`.

Follow-up requested after Task 1 landed: the collapsed view currently
shows a free-text number input for speed. Replace it with a `Select`
dropdown of labeled presets, matching the same collapsed-`Select` pattern
already used by `GranularityControl` and `FocusMatchControl` elsewhere in
this app (`@/components/ui/select`'s `Select`/`SelectTrigger`/
`SelectContent`/`SelectItem`/`SelectValue`). The expanded view's slider and
badges are unchanged — they remain the fine-grained control.

- [ ] **Step 1: Add descriptions to the existing presets and drop the
  now-unused free-text state**

In `src/app/components/SpeedControl.tsx`, replace:

```tsx
export const SpeedControl = React.memo<SpeedControlProps>(({ isExpanded, speed, onSpeedChange }) => {
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

  const [minimizedInput, setMinimizedInput] = React.useState(speed.toFixed(1))
  const [isFocused, setIsFocused] = React.useState(false)

  React.useEffect(() => {
     if (isFocused) return
     setMinimizedInput(speed.toFixed(1))
  }, [speed, isFocused])

  const handleMinimizedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setMinimizedInput(e.target.value)
  }

  const handleBlur = () => {
      setIsFocused(false)
      const val = parseFloat(minimizedInput)
      if (!isNaN(val) && val > 0) {
          onSpeedChange(Math.max(MIN_SPEED, Math.min(MAX_SPEED, val)))
      } else {
          setMinimizedInput(speed.toFixed(1))
      }
  }
```

with:

```tsx
export const SpeedControl = React.memo<SpeedControlProps>(({ isExpanded, speed, onSpeedChange }) => {
  const presets = [
    { label: '0.5x', value: 0.5, description: 'Slower' },
    { label: '1x', value: 1.0, description: 'Normal' },
    { label: '2x', value: 2.0, description: 'Faster' },
    { label: '4x', value: 4.0, description: 'Very Fast' },
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

  const closestPreset = presets.reduce(
    (closest, p) =>
      Math.abs(speed - p.value) < Math.abs(speed - closest.value) ? p : closest,
    presets[0],
  )
```

(`minimizedInput`, `isFocused`, `handleMinimizedChange`, `handleBlur`, and
the `useEffect` syncing them are all deleted — the collapsed view no
longer has free-text entry, so none of this state is needed anymore.
`closestPreset` finds whichever preset is numerically nearest to the
current `speed`, so the dropdown always shows a sensible selected label
even if `speed` was fine-tuned to a non-preset value via the expanded
slider.)

- [ ] **Step 2: Add the Select import**

At the top of the file, add to the existing imports:

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
```

- [ ] **Step 3: Replace the collapsed free-text input with the Select dropdown**

Replace:

```tsx
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
                 <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">x</span>
            </div>
         )}
```

with:

```tsx
         {!isExpanded && (
            <Select
                value={String(closestPreset.value)}
                onValueChange={(v) => onSpeedChange(parseFloat(v))}
            >
                <SelectTrigger className='w-full h-9 text-xs'>
                    <div className='flex items-center gap-2'>
                        <Zap className='h-3.5 w-3.5' />
                        <SelectValue />
                    </div>
                </SelectTrigger>
                <SelectContent>
                    {presets.map((preset) => (
                        <SelectItem key={preset.label} value={String(preset.value)}>
                            {preset.label} — {preset.description}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
         )}
```

The `{isExpanded && (...)}` block (slider + badges) directly below is
unchanged.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors (in particular, confirm no
"unused variable" errors for the deleted free-text state).
Run: `pnpm lint` — expect no new errors in `SpeedControl.tsx`.

- [ ] **Step 5: Manual verification**

With `pnpm dev` running:
1. Collapse the timeline controls. The Speed control should now show a
   dropdown reading one of "0.5x — Slower", "1x — Normal", "2x — Faster",
   "4x — Very Fast" (whichever is closest to the current speed).
2. Open the dropdown and pick "4x — Very Fast" — confirm playback speed
   changes accordingly, and expanding the controls shows the slider/badge
   at the 4x position.
3. Expand the controls, drag the slider to an arbitrary value (e.g. 6x),
   then collapse again — confirm the dropdown now shows whichever preset
   is numerically closest to 6x (should be "4x — Very Fast", since 6 is
   closer to 4 than to any higher value the slider allows, given presets
   top out at 4x).

- [ ] **Step 6: Commit**

```bash
git add src/app/components/SpeedControl.tsx
git commit -m "feat: replace collapsed speed input with a labeled preset dropdown"
```

---

### Task 12: Extend the delay-duration formatter with a days tier

**Files:**
- Modify: `src/lib/metro-utils.ts`

**Interfaces:** `formatDelayDuration(minutes: number): string` keeps its
signature — only its internal thresholds change.

Follow-up requested after Task 5 landed: accumulated delays can reach
hundreds of hours (e.g. a busy month at a major junction), and "312.0h" is
harder to read than "13.0d". Add a third tier: durations of 24 hours
(1440 minutes) or more format as days.

- [ ] **Step 1: Add the days tier**

In `src/lib/metro-utils.ts`, replace:

```ts
export const formatDelayDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes.toFixed(0)} min`
  return `${(minutes / 60).toFixed(1)}h`
}
```

with:

```ts
export const formatDelayDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes.toFixed(0)} min`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`
  return `${(minutes / 1440).toFixed(1)}d`
}
```

(1440 = 24 × 60 minutes in a day. No call sites change — every existing
consumer of `formatDelayDuration` from Task 5 — `DelayLegend.tsx`,
`SingleLinePanel.tsx` — picks up the new tier automatically.)

- [ ] **Step 2: Type-check and lint**

Run: `npx tsc --noEmit` — expect no new errors.
Run: `pnpm lint` — expect no new errors in `metro-utils.ts`.

- [ ] **Step 3: Manual verification**

With `pnpm dev` running, find a view with a large aggregated delay (a busy
month at a well-connected station) — confirm the DelayLegend/InfoPanel now
shows something like `"13.0d"` instead of `"312.0h"` once the value crosses
24 hours (1440 minutes), while values between 1h and 24h still show as
`"X.Xh"`, and values under 1h still show as `"X min"`.

- [ ] **Step 4: Commit**

```bash
git add src/lib/metro-utils.ts
git commit -m "feat: format multi-day accumulated delays in days instead of hours"
```

---

## Final verification (after all tasks)

- [ ] Run `npx tsc --noEmit` once more over the whole repo — expect no
  errors introduced by this batch.
- [ ] Run `pnpm lint` (or `npx pnpm@latest run lint`) once more over the
  whole repo — expect no errors introduced by this batch.
- [ ] Run `pnpm build` (or `npx pnpm@latest run build`) to confirm the
  production build (which also re-runs `pnpm preprocess`) still succeeds.
- [ ] Walk through every "Manual verification" step above once more in a
  single fresh `pnpm dev` session, back to back, to catch any interaction
  between tasks (e.g. reset button + relabeled toggle + hours formatting
  all visible in the same session).
