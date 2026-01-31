import { Delay } from '@/types/metro'
import fs from 'fs'
import path from 'path'
import { pathToFileURL } from 'url'

interface PreprocessedNode {
  nodeId: string
  line: string
  station: string
  times: number[]
  cumulative: number[]
  active: number[]
}

function preprocessDelaysByNode(delays: Delay[]): PreprocessedNode[] {
  if (delays.length === 0) {
    console.warn('No raw delay data found. Returning empty array.')
    return []
  }
  console.log(`Processing ${delays.length} raw delay entries...`)

  const nodeBoundaries = new Map<
    string,
    { t: number; cumulativeChange: number; activeChange: number }[]
  >()

  const addEvent = (
    nodeId: string,
    time: number,
    cumulativeChange: number,
    activeChange: number
  ) => {
    if (!nodeBoundaries.has(nodeId)) {
      nodeBoundaries.set(nodeId, [])
    }
    nodeBoundaries.get(nodeId)!.push({ t: time, cumulativeChange, activeChange })
  }

  delays.forEach((d) => {
    const start = new Date(d.startTime).getTime()

    const amount =
      d.durationMinutes ?? (new Date(d.endTime).getTime() - start) / 60000

    const end = start + amount * 60 * 1000
    d.lines.forEach((lineName: string) => {
      d.stations.forEach((stationCode: string) => {
        const nodeId = `${lineName}::${stationCode}`

        addEvent(nodeId, start, amount, amount)

        addEvent(nodeId, end, 0, -amount)
      })
    })
  })

  console.log(`Found ${nodeBoundaries.size} unique Station-Line Nodes.`)

  const result: PreprocessedNode[] = []

  for (const [nodeId, boundaries] of nodeBoundaries) {
    boundaries.sort((a, b) => a.t - b.t)

    const times: number[] = []
    const cumulative: number[] = []
    const active: number[] = []

    let currentCumulative = 0
    let currentActive = 0

    if (boundaries.length === 0) continue

    for (const b of boundaries) {
      currentCumulative += b.cumulativeChange
      currentActive += b.activeChange

      if (times.length > 0 && times[times.length - 1] === b.t) {
        cumulative[cumulative.length - 1] = currentCumulative
        active[active.length - 1] = currentActive
      } else {
        times.push(b.t)
        cumulative.push(currentCumulative)
        active.push(currentActive)
      }
    }

    const [line, station] = nodeId.split('::')

    result.push({
      nodeId,
      line,
      station,
      times,
      cumulative,
      active,
    })
  }

  return result
}

async function main() {
  const rawDataPath = path.join(process.cwd(), 'src/data/delays.ts')
  let rawDelays: Delay[] = []

  try {
    const fileUrl = pathToFileURL(rawDataPath).toString()

    const importedModule = await import(fileUrl)
    rawDelays = importedModule.delays || importedModule.default?.delays || []
  } catch (e) {
    console.error(
      `ERROR: Could not load raw data from ${rawDataPath}. Please verify your data file and tsx setup.`
    )
    if (e instanceof Error) {
      console.error(`Import Error Details: ${e.message}`)
    } else {
      console.error(`Unknown Import Error: ${String(e)}`)
    }

    const fallbackDelay: Delay = {
      id: 'F001',
      stations: ['FALL'],
      lines: ['Fallback Line'],
      startTime: '2024-01-01T00:00:00.000Z',
      endTime: '2024-01-01T00:01:00.000Z',
      durationMinutes: 1,
      causeGroup: 'test',
      cause: 'test',
      causeStatistical: 'test',
    }
    rawDelays = [fallbackDelay]
    console.log(`Using fallback data to continue preprocessing.`)
  }

  const processedData = preprocessDelaysByNode(rawDelays)

  const outputPath = path.join(
    process.cwd(),
    'public/data/preprocessed-delays.json'
  )
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2))

  console.log(
    `\n✅ Preprocessing Complete. Optimized data saved to ${outputPath}`
  )
  console.log(
    `Total data points generated: ${processedData.reduce(
      (acc, d) => acc + d.times.length,
      0
    )}`
  )
}

main().catch(console.error)
