import {
  DatasetMap,
  RenderState,
  processRawData,
  getDelaysForWindow,
  getDelaysForPoint,
} from '../data/delayData'

let dataset: DatasetMap | null = null

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

      if (maxDelayOverride !== undefined) {
        result.maxDelay = { delay: maxDelayOverride, lineId: '' }
      }

      self.postMessage({ type: 'RESULT', payload: result })
      break
    }
  }
}
