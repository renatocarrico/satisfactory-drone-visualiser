export interface DronePort {
  id: string              // mInstanceName (internal key)
  name: string            // mStationName (human-readable)
  x: number               // Transform.Translation.X
  y: number               // Transform.Translation.Y
  z: number               // Transform.Translation.Z
  // Advanced metrics (may be null if not available in save)
  fuelAmount: number | null
  estimatedFuelRate: number | null
  inventorySlots: InventorySlot[]
  operationalStatus: string | null
}

export interface InventorySlot {
  itemClass: string
  amount: number
}

export interface DroneEdge {
  id: string
  sourceId: string   // mHomeStation
  targetId: string   // mPairedStation
}

export interface DroneNetwork {
  ports: DronePort[]
  edges: DroneEdge[]
}

export type ViewMode = 'spatial' | 'network' | 'table'

export type ParseStatus =
  | { type: 'idle' }
  | { type: 'parsing' }
  | { type: 'done'; network: DroneNetwork }
  | { type: 'error'; message: string }

// Messages between main thread and parser worker
export type WorkerInMessage = {
  type: 'parse'
  buffer: ArrayBuffer
}

export type WorkerOutMessage =
  | { type: 'done'; network: DroneNetwork }
  | { type: 'error'; message: string }
