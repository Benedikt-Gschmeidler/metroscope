import { useMemo, useEffect, useState, useRef } from 'react'
import * as d3 from 'd3'
import { TimeSegment } from './types'

export const useTimelineCore = (
  svgRef: React.RefObject<SVGSVGElement>,
  allSegments: TimeSegment[],
  containerWidth: number,
  height: number,
  minSegmentWidth: number
) => {
  const isInitializedRef = useRef(false)

  const startDate = allSegments.length > 0 ? allSegments[0].startDate : null
  const endDate = allSegments.length > 0 ? allSegments[allSegments.length - 1].endDate : null
  const segmentCount = allSegments.length

  const { totalWidth, margin, chartWidth, chartHeight, xScale } =
    useMemo(() => {
      const margin = { top: 20, right: 20, bottom: 40, left: 20 }

      if (!startDate || !endDate || containerWidth === 0) {
        return {
          totalWidth: 0,
          margin,
          chartWidth: 0,
          chartHeight: 0,
          xScale: null,
        }
      }

      const requiredWidth = segmentCount * minSegmentWidth
      const totalWidth = Math.max(containerWidth, requiredWidth)
      const chartWidth = totalWidth - margin.left - margin.right
      const chartHeight = height - margin.top - margin.bottom

      const xScale = d3
        .scaleTime()
        .domain([startDate, endDate])
        .range([0, chartWidth])

      return { totalWidth, margin, chartWidth, chartHeight, xScale }
    }, [startDate, endDate, segmentCount, containerWidth, height, minSegmentWidth])

  const [svg, setSvg] = useState<d3.Selection<
    SVGSVGElement,
    unknown,
    null,
    undefined
  > | null>(null)
  const [g, setG] = useState<d3.Selection<
    SVGGElement,
    unknown,
    null,
    undefined
  > | null>(null)

  useEffect(() => {
    if (!svgRef.current || !xScale) {
      if (svgRef.current) {
        d3.select(svgRef.current).selectAll('*').remove()
        isInitializedRef.current = false
      }
      setSvg(null)
      setG(null)
      return
    }

    const svgSelection = d3.select(svgRef.current)

    if (!isInitializedRef.current) {


      svgSelection.selectAll('*').remove()

      const defs = svgSelection.append('defs')

      const filter = defs.append('filter').attr('id', 'goo')
      filter
        .append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', '2')
        .attr('result', 'blur')
      filter
        .append('feColorMatrix')
        .attr('in', 'blur')
        .attr('mode', 'matrix')
        .attr('values', '1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7')
        .attr('result', 'goo')
      filter
        .append('feComposite')
        .attr('in', 'SourceGraphic')
        .attr('in2', 'goo')
        .attr('operator', 'atop')

      const blurfilter = defs.append('filter').attr('id', 'blur')
      blurfilter
        .append('feGaussianBlur')
        .attr('in', 'SourceGraphic')
        .attr('stdDeviation', '2')
        .attr('result', 'blur')

      const gSelection = svgSelection
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)

      setSvg(svgSelection)
      setG(gSelection)

      isInitializedRef.current = true
    }

    svgSelection.attr('width', totalWidth).attr('height', height)

    const gSelection = svgSelection.select<SVGGElement>('g')
    if (!gSelection.empty()) {
      gSelection.attr('transform', `translate(${margin.left}, ${margin.top})`)

      if (!g || g.node() !== gSelection.node()) {
        setG(gSelection)
      }
      if (!svg || svg.node() !== svgSelection.node()) {
        setSvg(svgSelection)
      }
    }
  }, [svgRef, xScale, totalWidth, height, margin, g, svg])

  useEffect(() => {
    isInitializedRef.current = false
  }, [allSegments.length])

  return { svg, g, xScale, margin, chartWidth, chartHeight, totalWidth }
}
