<script setup lang="ts">
import type { DroneNetwork, DronePort } from '../types'

const props = defineProps<{
  network: DroneNetwork
  searchQuery: string
}>()

const emit = defineEmits<{
  (e: 'select-port', port: DronePort): void
}>()

const STATUS_LABEL: Record<string, string> = {
  docked:    'Docked',
  docking:   'Docking',
  takeoff:   'Taking Off',
  in_flight: 'In Flight',
  idle:      'Idle',
}

const STATUS_CLASS: Record<string, string> = {
  docked:    'status-docked',
  docking:   'status-docking',
  takeoff:   'status-takeoff',
  in_flight: 'status-flight',
  idle:      'status-idle',
}

function pairedPort(port: DronePort): DronePort | null {
  const edge = props.network.edges.find(
    e => e.sourceId === port.id || e.targetId === port.id
  )
  if (!edge) return null
  const pairedId = edge.sourceId === port.id ? edge.targetId : edge.sourceId
  return props.network.ports.find(p => p.id === pairedId) ?? null
}

function filteredPorts(): DronePort[] {
  const q = props.searchQuery.trim().toLowerCase()
  if (!q) return props.network.ports
  return props.network.ports.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (pairedPort(p)?.name ?? '').toLowerCase().includes(q)
  )
}
</script>

<template>
  <div class="w-full h-full overflow-auto px-6 py-6">
    <table class="w-full border-collapse text-sm">
      <thead>
        <tr class="text-left border-b border-ficsit-border">
          <th class="pb-2 pr-6 text-xs font-medium text-ficsit-muted uppercase tracking-wider">Port</th>
          <th class="pb-2 pr-6 text-xs font-medium text-ficsit-muted uppercase tracking-wider">Destination</th>
          <th class="pb-2 text-xs font-medium text-ficsit-muted uppercase tracking-wider">Status</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="port in filteredPorts()"
          :key="port.id"
          class="border-b border-ficsit-border hover:bg-ficsit-surface cursor-pointer transition-colors"
          @click="emit('select-port', port)"
        >
          <td class="py-2.5 pr-6 font-medium text-ficsit-text">{{ port.name }}</td>
          <td class="py-2.5 pr-6 text-ficsit-muted">{{ pairedPort(port)?.name ?? '—' }}</td>
          <td class="py-2.5">
            <span
              v-if="port.operationalStatus"
              class="status-badge"
              :class="STATUS_CLASS[port.operationalStatus] ?? 'status-idle'"
            >
              {{ STATUS_LABEL[port.operationalStatus] ?? port.operationalStatus }}
            </span>
            <span v-else class="text-ficsit-muted">—</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="filteredPorts().length === 0" class="text-ficsit-muted text-sm mt-6">No ports match your search.</p>
  </div>
</template>

<style scoped>
@reference "../style.css";

.status-badge {
  @apply inline-block px-2 py-0.5 rounded text-xs font-medium;
}
.status-docked  { @apply bg-green-900/50  text-green-300  border border-green-700; }
.status-docking { @apply bg-yellow-900/50 text-yellow-300 border border-yellow-700; }
.status-takeoff { @apply bg-orange-900/50 text-orange-300 border border-orange-700; }
.status-flight  { @apply bg-blue-900/50   text-blue-300   border border-blue-700; }
.status-idle    { @apply bg-ficsit-surface text-ficsit-muted border border-ficsit-border; }
</style>
