import { Direction, Slot, Position } from '../types/metro'


export const slotIndexToPosition = (slotIndex: Slot): number => {
  return Math.pow(-1, slotIndex + 1) * Math.ceil(slotIndex / 2)
}

export const getConnectionPosition = (
  stationPosition: Position,
  direction: Direction,
  offset: number,
  orthogonalOffset: number
): Position => {
  const tangent = directionToUnitVector(direction)

  const normal = { x: -tangent.y, y: tangent.x }

  return {
    x:
      stationPosition.x +
      normal.x * orthogonalOffset +
      tangent.x * offset,
    y:
      stationPosition.y +
      normal.y * orthogonalOffset +
      tangent.y * offset,
  }
}

export const getDirection = (
  positionA: Position,
  positionB: Position
): Direction => {
  const dx = positionB.x - positionA.x
  const dy = positionB.y - positionA.y
  const angle = Math.atan2(-dy, dx) - (67.5 * Math.PI) / 180

  return Math.floor(mod(angle / (Math.PI / 4), 8))
}

export function getIntersectionAt(
  position: Position,
  dir1: Direction,
  dist1: number,
  dir2: Direction,
  dist2: number
): Position {
  const t1 = directionToUnitVector(dir1)
  const t2 = directionToUnitVector(dir2)

  const n1 = { x: -t1.y, y: t1.x }
  const n2 = { x: -t2.y, y: t2.x }

  const a = n1.x
  const b = n1.y
  const c = n2.x
  const d = n2.y

  const determinant = a * d - c * b

  if (Math.abs(determinant) < 1e-6) {
    return {
      x: position.x + (n1.x * dist1 + n2.x * dist2) / 2,
      y: position.y + (n1.y * dist1 + n2.y * dist2) / 2,
    }
  }

  const x = (dist1 * d - dist2 * b) / determinant
  const y = (dist2 * a - dist1 * c) / determinant

  return { x: position.x + x, y: position.y + y }
}

export const directionToUnitVector = (direction: Direction): Position => {
  const angle = ((4 + mod(direction, 8)) * Math.PI) / 4
  return { x: Math.sin(angle), y: Math.cos(angle) }
}

export const isOppositeSlots = (slotA: Slot, slotB: Slot): boolean => {
  return slotIndexToPosition(slotA) + slotIndexToPosition(slotB) === 0
}



export const mod = (a: number, b: number): number => {
  return ((a % b) + b) % b
}

export const getNiceSteps = (max: number) => {
  if (max <= 0) return []

  const candidates: number[] = []
  let power = 1
  while (power <= max * 10) {
    candidates.push(power)
    candidates.push(power * 5)
    power *= 10
  }
  candidates.sort((a, b) => a - b)

  const ceilingIndex = candidates.findIndex((c) => c >= max)

  if (ceilingIndex === -1) return []
  const indices = [ceilingIndex, ceilingIndex - 1]

  return indices
    .map((i) => candidates[i])
    .filter((val) => val !== undefined && val > 0)
    .sort((a, b) => b - a)
}

export const formatDelayDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes.toFixed(0)} min`
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}h`
  return `${(minutes / 1440).toFixed(1)}d`
}
