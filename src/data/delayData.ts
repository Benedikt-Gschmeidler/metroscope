
export type OptimizedLocationData = {
  times: Float64Array
  values: Int32Array
  active: Int32Array
}

export type DatasetMap = Map<string, OptimizedLocationData>

type RawJsonType = {
  nodeId: string
  line: string
  station: string
  times: number[]
  cumulative: number[]
  active: number[]
}

export type RenderState = {
  delays: Map<string, number>
  maxDelay: { delay: number; lineId: string }
}

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

export const processRawData = (rawJson: RawJsonType[]): DatasetMap => {
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

export const getDelaysForWindow = (
  dataset: DatasetMap,
  windowStart: number,
  windowEnd: number
): RenderState => {
  const delays = new Map<string, number>()
  let maxDelay = { delay: 0, lineId: '' }

  for (const [locationId, data] of dataset) {
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

export const getDelaysForPoint = (
  dataset: DatasetMap,
  pointInTime: number
): RenderState => {
  const delays = new Map<string, number>()
  let maxDelay = { delay: 0, lineId: '' }

  for (const [locationId, data] of dataset) {
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

export const getTotalDelay = (
  dataset: DatasetMap,
  windowStart: number,
  windowEnd: number
): number => {
  let total = 0
  for (const data of dataset.values()) {
    const endIndex = findFloorIndex(data.times, windowEnd)
    if (endIndex === -1) continue

    const startIndex = findFloorIndex(data.times, windowStart)
    const endValue = data.values[endIndex]
    const startValue = startIndex === -1 ? 0 : data.values[startIndex]

    total += endValue - startValue
  }
  return total
}
