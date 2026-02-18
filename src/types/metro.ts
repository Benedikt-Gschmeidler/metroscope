// number from 0 to 7
export type Direction = number

export type Position = {
  x: number
  y: number
}
export type Slot = number

export interface Station {
  id: string
  country: string
  name: string
  xGeo: number
  yGeo: number
  xMetro: number
  yMetro: number
}

export interface Midpoint {
  id: string
  x: number
  y: number
  direction: number
}

export interface TrackMidpointSlot {
  midpointId: string
  slot: number
}

export type TrackSide = 'from' | 'to'

export interface Track {
  id: string
  lineId: string
  from: { direction: number; slot: number }
  to: { direction: number; slot: number }
  midpointSlots: TrackMidpointSlot[]
}

export interface Line {
  id: string
  colorIndex: number
  stationIds: string[]
  connectionIds: string[]
}

export interface Connection {
  id: string
  stations: { from: string; to: string }
  midpoints: Midpoint[]
  tracks: Track[]
}

export interface Topology {
  stations: Station[]
  connections: Connection[]
  lines: Line[]
}

export interface Delay {
  id: string
  startTime: string
  endTime: string
  lines: string[]
  stations: string[]
  cause: string
  causeStatistical: string
  causeGroup: string
  durationMinutes: number
}
