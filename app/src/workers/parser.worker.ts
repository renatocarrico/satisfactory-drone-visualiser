import { Parser } from '@etothepii/satisfactory-file-parser'
import type { DroneNetwork, DronePort, DroneEdge, WorkerInMessage, WorkerOutMessage } from '../types'

self.onmessage = async (e: MessageEvent<WorkerInMessage>) => {
  if (e.data.type !== 'parse') return

  try {
    const saveGame = Parser.ParseSave('save', e.data.buffer as unknown as Buffer)
    const network = extractNetwork(saveGame)
    const msg: WorkerOutMessage = { type: 'done', network }
    self.postMessage(msg)
  } catch (err: unknown) {
    const msg: WorkerOutMessage = {
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(msg)
  }
}

function extractNetwork(saveGame: any): DroneNetwork {
  // Pass 1: collect all objects across all levels into flat maps
  const stationObjects = new Map<string, any>()   // pathName → Build_DroneStation_C object
  const infoObjects    = new Map<string, any>()   // pathName → FGDroneStationInfo object
  const droneObjects   = new Map<string, any>()   // homeStationPath → BP_DroneTransport_C object

  for (const level of Object.values(saveGame.levels) as any[]) {
    for (const obj of Object.values(level.objects ?? {}) as any[]) {
      const tp: string = obj?.typePath ?? ''
      const pn: string = obj?.instanceName ?? ''
      if (tp.includes('Build_DroneStation_C')) stationObjects.set(pn, obj)
      if (tp.includes('FGDroneStationInfo'))   infoObjects.set(pn, obj)
      if (tp.includes('BP_DroneTransport_C')) {
        const home: string = obj?.properties?.mHomeStation?.value?.pathName ?? ''
        if (home) droneObjects.set(home, obj)
      }
    }
  }

  // Pass 2: build ports — name comes from the Info's mBuildingTag, coords from the Station
  // Build a map: stationPathName → infoObject
  const stationToInfo = new Map<string, any>()
  for (const info of infoObjects.values()) {
    const stationRef: string = info.properties?.mStation?.value?.pathName ?? ''
    if (stationRef) stationToInfo.set(stationRef, info)
  }

  const ports = new Map<string, DronePort>()
  for (const [pathName, station] of stationObjects) {
    const info = stationToInfo.get(pathName)
    const t = station.transform?.translation ?? { x: 0, y: 0, z: 0 }
    const name: string =
      info?.properties?.mBuildingTag?.value ||
      pathName.split('.').pop() ||
      pathName

    ports.set(pathName, {
      id: pathName,
      name,
      x: t.x ?? 0,
      y: t.y ?? 0,
      z: t.z ?? 0,
      fuelAmount: null,
      estimatedFuelRate: null,
      inventorySlots: [],
      operationalStatus: getDroneStatus(droneObjects.get(pathName)),
    })
  }

  // Pass 3: build edges from paired Info objects
  // mPairedStation on an Info points to another Info's pathName
  const edges: DroneEdge[] = []
  const seen = new Set<string>()

  for (const [infoPath, info] of infoObjects) {
    const myStationPath: string = info.properties?.mStation?.value?.pathName ?? ''
    const pairedInfoPath: string = info.properties?.mPairedStation?.value?.pathName ?? ''
    if (!myStationPath || !pairedInfoPath) continue

    const pairedInfo = infoObjects.get(pairedInfoPath)
    if (!pairedInfo) continue
    const pairedStationPath: string = pairedInfo.properties?.mStation?.value?.pathName ?? ''
    if (!pairedStationPath) continue

    if (!ports.has(myStationPath) || !ports.has(pairedStationPath)) continue

    // Deduplicate: sort the two paths to form a canonical key
    const key = [myStationPath, pairedStationPath].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)

    edges.push({
      id: key,
      sourceId: myStationPath,
      targetId: pairedStationPath,
    })
  }

  return { ports: Array.from(ports.values()), edges }
}

function getDroneStatus(drone: any): string | null {
  if (!drone) return null

  const rawState: string = drone.properties?.mCurrentDockingState?.value?.properties?.State?.value?.value ?? ''
  // rawState is e.g. "EDroneDockingState::DS_DOCKED" — strip the prefix
  if (rawState) return rawState.replace('EDroneDockingState::DS_', '').toLowerCase()

  // No docking state means the drone is airborne
  const home: string = drone.properties?.mHomeStation?.value?.pathName ?? ''
  const dest: string = drone.properties?.mCurrentDestinationStation?.value?.pathName ?? ''
  return dest && dest !== home ? 'in_flight' : 'idle'
}
