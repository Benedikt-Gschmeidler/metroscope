import { useState, useMemo, useEffect } from 'react'
import * as d3 from 'd3'
import {
  TimeSegment,
  Granularity,
  mapApiDataToEvents,
  DelaySummaryData,
  TimelineEvent,
} from './types'
import { DatasetMap, getDelaysForWindow } from '@/data/delayData'
import { Topology } from '@/types/metro'
import { connectionMap, stationByIdMap } from '@/data/topologyService'
import { lineColours } from '@/data/lineColours'

export const useTimelineData = (
  containerRef: React.RefObject<HTMLDivElement>,
  year: number,
  granularity: Granularity,
  minSegmentWidth: number,
  containerWidth: number,
  dataset: DatasetMap | null,
  topology: Topology,
) => {
  const [allSegments, setAllSegments] = useState<TimeSegment[]>([])
  const [visibleIndices, setVisibleIndices] = useState<{
    start: number
    end: number
  } | null>(null)

  const lineMeta = useMemo(() => {
    return topology.lines.map((line) => {
      const stationIds = new Set<string>()
      line.connectionIds.forEach((cid) => {
        const conn = connectionMap.get(cid)
        if (conn) {
          stationIds.add(conn.stations.from)
          stationIds.add(conn.stations.to)
        }
      })

      let sumX = 0
      let sumY = 0
      let count = 0
      stationIds.forEach((sid) => {
        const station = stationByIdMap.get(sid)
        if (station) {
          sumX += station.xMetro
          sumY += station.yMetro
          count++
        }
      })

      return {
        id: line.id,
        color: lineColours[line.colorIndex] ?? '#000000',
        stationIds: Array.from(stationIds),
        avgX: count > 0 ? sumX / count : 0,
        avgY: count > 0 ? sumY / count : 0,
      }
    })
  }, [topology])

  const baseSegments = useMemo(() => {
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year + 1, 0, 1)
    let timeInterval
    if (granularity === 'month') timeInterval = d3.timeMonth
    else if (granularity === 'week') timeInterval = d3.timeWeek
    else timeInterval = d3.timeDay

    return timeInterval.range(startDate, endDate).map((d, i, arr) => ({
      startDate: d,
      endDate: arr[i + 1] || endDate,
      events: null,
      isLoading: false,
    }))
  }, [year, granularity])

  useEffect(() => {
    setAllSegments(baseSegments)
  }, [baseSegments])

  useEffect(() => {
    const container = containerRef.current
    if (!container || allSegments.length === 0 || containerWidth === 0) return

    const handleScroll = () => {
      const segmentWidth = Math.max(containerWidth, allSegments.length * minSegmentWidth) / allSegments.length
      const { scrollLeft, clientWidth } = container

      const buffer = 3
      const startIndex = Math.max(
        0,
        Math.floor(scrollLeft / segmentWidth) - buffer,
      )
      const endIndex = Math.min(
        allSegments.length,
        Math.ceil((scrollLeft + clientWidth) / segmentWidth) + buffer,
      )

      const newIndices = { start: startIndex, end: endIndex }
      setVisibleIndices((prev) => {
        if (prev && prev.start === startIndex && prev.end === endIndex) {
          return prev
        }
        return newIndices
      })

      if (!dataset) return

      const segmentsToFetch: TimeSegment[] = []
      const indicesToSetLoading: number[] = []

      for (let i = startIndex; i < endIndex; i++) {
        const segment = allSegments[i]
        if (segment && !segment.events && !segment.isLoading) {
          segmentsToFetch.push(segment)
          indicesToSetLoading.push(i)
        }
      }

      if (indicesToSetLoading.length > 0) {
        setAllSegments((prevSegments) =>
          prevSegments.map((segment, index) =>
            indicesToSetLoading.includes(index)
              ? { ...segment, isLoading: true }
              : segment,
          ),
        )
      }

      if (segmentsToFetch.length > 0) {
        const updates = new Map<number, TimelineEvent[]>()
        segmentsToFetch.forEach((segment) => {
          const { startDate, endDate } = segment
          const start = startDate.getTime()
          const end = endDate.getTime()

          const delaysInWindow = getDelaysForWindow(dataset, start, end)

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

          const events = mapApiDataToEvents(delaySummaryData, granularity)
          updates.set(segment.startDate.getTime(), events)
        })

        setAllSegments((currentSegments) =>
          currentSegments.map((s) => {
            const newEvents = updates.get(s.startDate.getTime())
            if (newEvents) {
              return { ...s, events: newEvents, isLoading: false }
            }
            return s
          }),
        )
      }
    }

    handleScroll() 
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [
    allSegments,
    containerWidth,
    granularity,
    minSegmentWidth,
    containerRef,
    dataset,
    lineMeta,
  ])

  return { allSegments, visibleIndices }
}
