import type { DatasetMap, RenderState } from '../data/delayData'

// --- 1. Internal Types & State ---

type RawJsonType = {
  nodeId: string
  line: string
  station: string
  times: number[]
  cumulative: number[]
  active: number[]
}

let dataset: DatasetMap | null = null

// --- 2. Helper Functions (Moved from delayData.ts) ---

function findFloorIndex(times: Float64Array, targetTime: number): number {
  let left = 0
  let right = times.length - 1
  let idx = -1

  while (left <= right) {
    const mid = (left + right) >> 1
    if (times[mid] <= targetTime) {
      idx = mid
      left = mid + 1
    } else {
      right = mid - 1
    }
  }
  return idx
}

const processRawData = (rawJson: RawJsonType[]): DatasetMap => {
  const map: DatasetMap = new Map()
  for (const item of rawJson) {
    const len = item.times.length
    const times = new Float64Array(len)
    const values = new Int32Array(len)
    const active = new Int32Array(len)

    for (let i = 0; i < len; i++) {
      times[i] = item.times[i]
      values[i] = item.cumulative[i]
      active[i] = item.active[i] || 0
    }
    map.set(item.nodeId, { times, values, active })
  }
  return map
}

const getDelaysForWindow = (
  ds: DatasetMap,
  windowStart: number,
  windowEnd: number
): RenderState => {
  const delays = new Map<string, number>()
  let maxDelay = { delay: 0, lineId: '' }

  for (const [locationId, data] of ds) {
    const endIndex = findFloorIndex(data.times, windowEnd)
    if (endIndex === -1) {
      delays.set(locationId, 0)
      continue
    }

    const startIndex = findFloorIndex(data.times, windowStart)
    const endValue = data.values[endIndex]
    const startValue = startIndex === -1 ? 0 : data.values[startIndex]
    const val = endValue - startValue

    delays.set(locationId, val)

    if (val > maxDelay.delay) {
      maxDelay = { delay: val, lineId: locationId }
    }
  }
  return { delays, maxDelay }
}

const getDelaysForPoint = (
  ds: DatasetMap,
  pointInTime: number
): RenderState => {
  const delays = new Map<string, number>()
  let maxDelay = { delay: 0, lineId: '' }

  for (const [locationId, data] of ds) {
    const index = findFloorIndex(data.times, pointInTime)
    if (index === -1) {
      delays.set(locationId, 0)
      continue
    }

    const delay = data.active[index]
    delays.set(locationId, delay)

    if (delay > maxDelay.delay) {
      maxDelay = { delay, lineId: locationId }
    }
  }
  return { delays, maxDelay }
}

// --- 3. Message Handler ---

self.onmessage = (e: MessageEvent) => {
  const { type, payload } = e.data

  switch (type) {
    case 'LOAD_DATA': {
      try {
        dataset = processRawData(payload)
        self.postMessage({ type: 'DATA_LOADED', success: true })
      } catch (err) {
        console.error('Worker failed to process data', err)
        self.postMessage({ type: 'DATA_LOADED', success: false })
      }
      break
    }

    case 'CALCULATE': {
      if (!dataset) return

      const { selection, maxDelayOverride } = payload
      let result: RenderState

      // Handle Dates being serialized to strings over postMessage
      const start =
        selection.mode === 'point'
          ? new Date(selection.time).getTime()
          : new Date(selection.start).getTime()

      const end =
        selection.mode === 'range' ? new Date(selection.end).getTime() : 0

      if (selection.mode === 'point') {
        result = getDelaysForPoint(dataset, start)
      } else {
        result = getDelaysForWindow(dataset, start, end)
      }

      // Apply consistent scale override if provided
      if (maxDelayOverride !== undefined) {
        result.maxDelay = { delay: maxDelayOverride, lineId: '' }
      }

      self.postMessage({ type: 'RESULT', payload: result })
      break
    }
  }
}
