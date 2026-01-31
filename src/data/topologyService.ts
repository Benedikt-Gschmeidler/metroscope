import { Connection, Track, Station, Line } from '@/types/metro'
import { topology } from './topology'

const computeTrackMap = () => {
  const trackMap = new Map<string, Track>()

  topology.connections.forEach((connection) => {
    connection.tracks.forEach((track: Track) => {
      trackMap.set(track.id, track)
    })
  })
  return trackMap
}

export const trackMap = computeTrackMap()
const computeConnectionMapByTrackId = () => {
  const connectionMap = new Map<string, Connection>()

  topology.connections.forEach((connection: Connection) => {
    connection.tracks.forEach((track: Track) => {
      connectionMap.set(track.id, connection)
    })
  })
  return connectionMap
}

export const connectionMapByTrackId = computeConnectionMapByTrackId()

export const getConnectionByTrackId = (trackId: string) => {
  return connectionMapByTrackId.get(trackId) || null
}

const computeConnectionMap = () => {
  const map = new Map<string, Connection>()
  topology.connections.forEach((connection) => {
    map.set(connection.id, connection)
  })
  return map
}

export const connectionMap = computeConnectionMap()

export const getConnectionById = (connectionId: string) => {
  return connectionMap.get(connectionId) || null
}

export const getTrackByLineIdAndConnectionId = (
  lineId: string,
  connectionId: string,
) => {
  const connection = connectionMap.get(connectionId)
  if (!connection) return null

  return connection.tracks.find((track) => track.lineId === lineId) || null
}

export const stationMap = computeStationMap()
function computeStationMap() {
  const map = new Map<string, string>()
  topology.stations.forEach((station) => {
    map.set(station.id, station.name)
  })
  return map
}

const computeStationByIdMap = () => {
  const map = new Map<string, Station>()
  topology.stations.forEach((station) => {
    map.set(station.id, station)
  })
  return map
}

export const stationByIdMap = computeStationByIdMap()

export const getStationById = (stationId: string) => {
  return stationByIdMap.get(stationId) || null
}

const computeLineByIdMap = () => {
  const map = new Map<string, Line>()
  topology.lines.forEach((line) => {
    map.set(line.id, line)
  })
  return map
}

export const lineByIdMap = computeLineByIdMap()

export const getLineById = (lineId: string) => {
  return lineByIdMap.get(lineId) || null
}
