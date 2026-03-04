import { useEffect } from 'react'
import * as d3 from 'd3'
import { Granularity } from './types'

export const useTimelineAxes = (
  g: d3.Selection<SVGGElement, unknown, null, undefined> | null,
  xScale: d3.ScaleTime<number, number> | null,
  chartHeight: number,
  granularity: Granularity
) => {
  useEffect(() => {
    if (!g || !xScale) return

    const axisGenerator = d3.axisBottom(xScale)
    switch (granularity) {
      case 'month':
        axisGenerator
          .ticks(d3.timeMonth.every(1))
          .tickFormat((domainValue) => d3.timeFormat('%B')(domainValue as Date))
        break
      case 'week':
        axisGenerator
          .ticks(d3.timeMonth.every(1))
          .tickFormat((domainValue) => d3.timeFormat('%B')(domainValue as Date))
        break
      case 'day':
        axisGenerator
          .ticks(d3.timeWeek.every(1))
          .tickFormat((domainValue) =>
            d3.timeFormat('%b %d')(domainValue as Date)
          )
        break
    }

    const axisGroup = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0, ${chartHeight})`)
      .call(axisGenerator)

    axisGroup.select('.domain').attr(
      'class',
      `
          domain
          stroke-foreground
          `
    )

    axisGroup.selectAll('.tick line').attr(
      'class',
      `
          tick line
          stroke-foreground
          `
    )

    axisGroup.selectAll('.tick text')
      .attr(
        'class',
        `
          tick text
          text-xs
          font-mono
          fill-foreground
          select-none
          `
      )
      .style('text-anchor', (_, i, nodes) => {
        if (i === 0) return 'start'
        if (i === nodes.length - 1) return 'end'
        return 'middle'
      })

    return () => {
      axisGroup.remove()
    }
  }, [g, xScale, chartHeight, granularity])
}
