# Study Improvements — Design

Date: 2026-08-03
Branch: `fix/study-improvements`

## Overview

A batch of 12 independently-scoped UX fixes and small features against the
existing Metroscope app, gathered from user testing / thesis feedback. Three
items were flagged as "might be bug" and needed investigation before a fix
could be proposed; all three turned out to be real, root-caused bugs (see
section C). This spec covers all 12 items; they are small and largely
unrelated, so they're grouped by area rather than given one spec each.

No new dependencies, no architectural changes. All changes are localized to
existing components/utilities.

## A. Playback / timeline controls

### A1. Speed control direction

**File:** `src/app/components/SpeedControl.tsx`

The expanded view (slider + presets) already maps correctly: higher slider
value → higher `speed` → faster playback (confirmed via
`src/app/components/Timeline/index.tsx:339`, `timeAdvance = dt * timelineSpeed`,
and `timelineSpeed = 1000*60*60*24*playbackSpeed` in `MetroMap.tsx:633`).

The bug is the **collapsed** input (lines 96-111): it displays and edits
`secondsPerDay = 1 / speed`, a value that goes *down* as speed goes *up*. A
user typing a bigger number here gets a slower animation — the opposite of
every other speed control in the app.

**Fix:** replace the collapsed input's bound value with `speed` itself,
displayed as a multiplier (e.g. `2.0x`), so typing a bigger number increases
speed. Keep the expanded slider/presets unchanged (already correct). Remove
the now-unneeded `secondsPerDay` display logic, or keep it only as the small
italic annotation next to the expanded label if useful context.

### A2. Default playback speed

**File:** `src/app/components/MetroMap.tsx:127`

`const [playbackSpeed, setPlaybackSpeed] = useState(1)` → `useState(2)`.

### A3. Scroll-to-pan on the timeline

**File:** `src/app/components/Timeline/index.tsx`

The timeline's scroll container (`containerRef`, `overflow-x-auto`) only
pans via horizontal-scroll gestures (trackpad) or dragging the scrollbar —
a plain vertical mouse-wheel scroll does nothing, which is non-obvious.

**Fix:** add a `wheel` event listener on `containerRef` that, when the
event isn't already horizontal-dominant (`deltaX`), translates `deltaY`
into `container.scrollLeft` change (`event.preventDefault()` to stop page
scroll while over the timeline). Reuse the existing scroll/segment-loading
logic in `useTimelineData.ts` unchanged — it already listens for `scroll`
events on the same container.

### A4. Click-to-set-time on the timeline

Investigated and confirmed already working: point mode sets the exact
clicked time (`useTimelineSelection.ts:211-219`), range mode snaps a plain
click to the nearest whole segment (`useTimelineSelection.ts:136-161`). User
confirmed this is fine as-is. **No change.**

### A5. Date picker popover jump past August

**Files:** `src/app/components/TimelineControl/index.tsx`,
`src/components/ui/calendar.tsx`

Root cause (confirmed by running the app): the range-mode calendar shows 3
months at once (`numberOfMonths={3}`). Different months need 5 or 6 grid
rows depending on which weekday they start on. Paging from
Jun/Jul/Aug (tallest visible month = June, 6 rows) to Jul/Aug/Sep (all 5
rows) shrinks the popover's required height. Radix Popover's
`avoidCollisions` (default on) flips which side (`top`/`bottom`) the content
opens on based on available space — the height shrink crosses that flip
threshold, causing the visible jump. It's only reproducible in the expanded
control layout because that's where the trigger sits close enough to the
flip boundary.

**Fix (two parts, both needed to fully stabilize):**
1. In `PopoverContent` for the date picker (`TimelineControl/index.tsx`),
   pin a fixed `side` (`top`, since the trigger sits low in the viewport)
   and set `avoidCollisions={false}` so Radix stops recalculating side.
2. In `calendar.tsx` / the `UI_Calendar` usage for range mode, force a
   consistent row count across all displayed months (e.g. pad each month
   grid to 6 rows via `showOutsideDays` + CSS, or a `weekStartsOn`-aware
   fixed-height wrapper) so the popover's content height never fluctuates
   between month pages.

### A6. "Reset selection" button

**Files:** `src/app/components/TimelineControl/index.tsx`,
`src/app/components/MetroMap.tsx`

New button next to Play/Pause in `TimelineControl`. Per user: resets
*everything* — both timeline selection and line selection.

**Fix:** add `onReset` callback prop to `TimelineControlProps`, wired in
`MetroMap.tsx` to a handler that:
- clears `selectedLines` → `[]`
- clears `highlightedLineIds` → `[]`
- clears `hoveredLine` → `undefined`
- resets the timeline selection to the app's default (initial point/range
  used on first load)

## B. Delay scale & labeling

### B1. Minutes → hours formatter

**New file or addition to** `src/lib/metro-utils.ts`

Add `formatDelayDuration(minutes: number): string`:
- `< 60` → `"{minutes.toFixed(0)} min"`
- `>= 60` → `"{(minutes/60).toFixed(1)}h"`

Apply everywhere a raw delay-minutes value is currently rendered as
`"{n} min"`:
- `src/app/components/DelayLegend.tsx` (base/step/max labels)
- `src/app/components/InfoPanel/SingleLinePanel.tsx` (per-station delay)
- any other call site found during implementation (grep for `min</span>` /
  `.toFixed(0)} min` patterns before considering this item done).

### B2. Relabel Absolute/Relative → Advanced/Auto

**File:** `src/app/components/MetaPanel.tsx` (lines ~217, 228, 232-234)

- Button label `Absolute` → `Advanced`
- Button label `Relative` → `Auto`
- Helper text below (currently "Scale is fixed to the sensitivity setting
  below." / "Scale adapts to the maximum delay in the current view.") kept,
  reworded to reference the new names.

**File:** `src/app/components/DelayLegend.tsx` (line ~237)

Secondary caption `Fixed (Clamped)` / `Dynamic (Local)` reworded to match
the new Advanced/Auto terminology for consistency (e.g. `Advanced (Fixed)` /
`Auto (Adaptive)`).

Prop names (`keepDelayConsistent`, `scaleMode: 'relative' | 'absolute'`)
are internal and unaffected — only user-facing copy changes.

### B3. Tooltip copy for Base Width / Sensitivity / Focus Match

**Files:** `src/app/components/MetaPanel.tsx`,
`src/app/components/TimelineControl/FocusMatchControl.tsx`

Current tooltips are minimal ("Adjust base width", "Higher sensitivity
makes smaller delays appear larger", "Matches the timeline view to the map
view"). Per the thesis framing, expand to explain the actual mechanics:

- **Base Width**: the minimum line thickness used when there's no delay at
  all — the visual floor every line renders at.
- **Sensitivity (Advanced/Absolute mode)**: sets τ, the delay value (in
  minutes) that maps to maximum line width. Delays above τ are still shown
  at max width with a hatch pattern, so the scale stays fixed regardless of
  what's currently selected — useful for comparing across different time
  windows.
- **Auto/Relative mode** (contrast, worth stating somewhere near the
  toggle): the max reference is the largest aggregated delay actually
  present in the current selection, so the scale reshapes itself to
  whatever you've selected.
- **Focus Match**: keeps the timeline's visible time window synced to
  whatever the map's current pan/zoom viewport covers.

Also add the missing tooltip on the collapsed `FocusMatchControl` select
variant (currently only the expanded `ToggleGroup` variant has
`infoTooltip`).

## C. Confirmed bugs

### C1. Crosshair / legend color mismatch

**Files:** `src/data/delayData.ts`, `src/app/components/MetroMap.tsx`,
`src/app/components/DelayLegend.tsx`

Root cause: `getDelaysForWindow` / `getDelaysForPoint` in `delayData.ts`
iterate over `dataset` keyed by `${line}::${station}` and set
`maxDelay = { delay: val, lineId: locationId }` — but `locationId` **is**
the full `line::station` key, not a plain line id. Separately,
`MetroMap.tsx:522` hardcodes `maxDelay={{ delay: effectiveDelayCutoff,
lineId: '' }}` when building the legend's prop, discarding whatever real
line id would apply. `DelayLegend.tsx`'s `maxDelayLine` memo (lines 68-81)
never gets a usable `lineId`, so it falls back to scanning *all* entries in
`renderState.delays` for the first one whose value ties with `maxDelay.delay`
— which can belong to a completely unrelated line, and is exactly what
causes the ring/label color to mismatch the line you're actually looking
at.

**Fix:**
1. In `delayData.ts`, store `lineId: locationId.split('::')[0]` (the plain
   line id) instead of the raw `locationId`.
2. In `MetroMap.tsx`, pass a real `lineId` when one is meaningful — i.e. in
   Auto/Relative mode, use `renderState.maxDelay.lineId` from the fixed
   dataset above; in Advanced/Absolute mode, there's no single line tied to
   the user-set threshold, so pass `''` deliberately (this is the one case
   where empty is correct).
3. In `DelayLegend.tsx`, remove or narrow the value-tie fallback scan so it
   only ever colors the marker when a `lineId` was explicitly provided,
   never by guessing from tied values.

### C2. Aggregation over-counting (unrealistic timeline dot sizes)

**File:** `src/app/components/Timeline/useTimelineData.ts` (lines 141-149)

Root cause: `preprocessDelays.ts:46-53` writes each delay incident's full
duration to **every** station the incident lists (`d.stations`), for each
line it applies to — this is correct/intentional for per-station-per-line
data (an incident's effects are genuinely felt at each of those stations
simultaneously; the map's per-segment thickness and `DelayLegend`'s
per-line max both already rely on this and are fine, since they take a
**max**, not a sum).

The bug is specifically in `useTimelineData.ts`, which computes each line's
timeline-dot size as `totalDelay += delaysInWindow.delays.get(key)` summed
across **every station on the line**. A single 176-minute incident spanning
6 stations on one line becomes `6 × 176 = 1056` minutes of dot size —
inflated by however many stations each incident happened to span, which is
incidental to how the data is recorded, not a meaningful measure of delay
magnitude.

**Fix:** drop the `totalDelay` accumulator; size the dot using the
`maxDelay` value already computed in the same loop (line 147), matching the
same max-across-stations semantics `DelayLegend` and the map's line
thickness already use. This also keeps the whole app internally consistent
about what "the delay for line X right now" means.

### C3. Country border not visible on the map

**File:** `src/app/components/CountryOutline.tsx`

`CountryOutline` is already rendered in `MapCanvas/index.tsx:422` with no
props — but its default `borderColor` prop (line 45) is a hardcoded
`'#f3f3f3ff'` (near-white), instead of the `COUNTRY_OUTLINE.strokeColor`
constant (`'#c8d1dc'`, a light blue-gray) defined in `src/lib/constants.ts`
specifically for this purpose. `strokeWidth`'s default correctly references
`COUNTRY_OUTLINE.strokeWidth` — `borderColor` just never got wired to the
matching constant. The border renders, it's just practically invisible
against the map background.

**Fix:** change the default value of `borderColor` to
`COUNTRY_OUTLINE.strokeColor`.

## Testing notes

- No new automated tests exist for these components today; verification
  will be manual (`pnpm dev`) per item, covering: speed control direction
  and default, wheel-scroll panning, date-picker paging past August in
  both collapsed and expanded control states, reset button clearing both
  line selection and timeline selection, hour formatting at both small and
  large delay values, relabeled toggle + tooltips, legend color matching
  hovered/selected line, timeline dot sizes no longer scaling with
  incident station-count, and the country border being visible on load.
- `pnpm lint` should pass after all changes.
