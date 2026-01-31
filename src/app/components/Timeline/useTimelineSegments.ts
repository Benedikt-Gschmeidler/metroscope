import { useEffect } from 'react'
import * as d3 from 'd3'
import { TimeSegment } from './types'

export const useTimelineSegments = (
  g: d3.Selection<SVGGElement, unknown, null, undefined> | null,
  allSegments: TimeSegment[],
  xScale: d3.ScaleTime<number, number> | null,
  chartHeight: number
) => {
  useEffect(() => {
    if (!g || !xScale) return

    g.selectAll('.segment')
      .data(allSegments)
      .join('rect')
      .attr('class', 'segment')
      .attr('x', (d) => xScale(d.startDate))
      .attr('y', 0)
      .attr('width', (d) => xScale(d.endDate) - xScale(d.startDate))
      .attr('height', chartHeight)
      .attr('fill', 'none')
      .attr('stroke', '#ddd')
  }, [g, allSegments, xScale, chartHeight])
}
