<script setup lang="ts">
import type { DronePort, DroneNetwork } from '../types'

const props = defineProps<{
  port: DronePort
  network: DroneNetwork
  advancedMetrics: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-port', portId: string): void
}>()

function connectedPorts(): DronePort[] {
  const ids = new Set<string>()
  for (const edge of props.network.edges) {
    if (edge.sourceId === props.port.id) ids.add(edge.targetId)
    if (edge.targetId === props.port.id) ids.add(edge.sourceId)
  }
  return props.network.ports.filter((p) => ids.has(p.id))
}

function fmt(val: number | null, unit = '', decimals = 1): string {
  if (val === null || val === undefined) return '—'
  return `${val.toFixed(decimals)}${unit ? ' ' + unit : ''}`
}

function shortClass(cls: string): string {
  return cls.split('.').pop()?.replace(/_C$/, '') ?? cls
}
</script>

<template>
  <div
    class="fixed top-4 right-4 z-50 w-72
           bg-ficsit-surface border border-ficsit-border rounded-xl shadow-2xl
           flex flex-col overflow-hidden"
  >
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-ficsit-border">
      <div class="flex items-center gap-2 min-w-0">
        <span class="w-2.5 h-2.5 rounded-full bg-ficsit-orange shrink-0" />
        <h2 class="text-sm font-semibold text-ficsit-text truncate">{{ port.name }}</h2>
      </div>
      <button
        class="text-ficsit-muted hover:text-ficsit-text transition-colors ml-2 shrink-0"
        @click="emit('close')"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <div class="px-4 py-3 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-10rem)]">

      <!-- Coordinates -->
      <section>
        <p class="text-xs font-medium text-ficsit-muted uppercase tracking-wider">Position</p>
        <p class="text-sm text-ficsit-text mt-0.5 font-mono">
          X {{ port.x.toFixed(0) }} &nbsp; Y {{ port.y.toFixed(0) }} &nbsp; Z {{ port.z.toFixed(0) }}
        </p>
      </section>

      <!-- Connections -->
      <section>
        <p class="text-xs font-medium text-ficsit-muted uppercase tracking-wider">Connections ({{ connectedPorts().length }})</p>
        <div v-if="connectedPorts().length" class="flex flex-col gap-1 mt-1">
          <button
            v-for="cp in connectedPorts()"
            :key="cp.id"
            class="text-left text-xs text-ficsit-orange hover:underline truncate"
            @click="emit('select-port', cp.id)"
          >
            → {{ cp.name }}
          </button>
        </div>
        <p v-else class="value text-ficsit-muted">No connections</p>
      </section>

      <!-- Advanced metrics -->
      <template v-if="advancedMetrics">
        <div class="w-full h-px bg-ficsit-border" />

        <section>
          <p class="label">Operational Status</p>
          <p class="value">{{ port.operationalStatus ?? '—' }}</p>
        </section>

        <section>
          <p class="label">Fuel Level</p>
          <p class="value">{{ fmt(port.fuelAmount) }}</p>
        </section>

        <section>
          <p class="label">Est. Fuel Rate</p>
          <p class="value">{{ fmt(port.estimatedFuelRate, 'units/trip') }}</p>
        </section>

        <section>
          <p class="label">Inventory ({{ port.inventorySlots.length }} items)</p>
          <div v-if="port.inventorySlots.length" class="flex flex-col gap-0.5 mt-1">
            <div
              v-for="(slot, i) in port.inventorySlots"
              :key="i"
              class="flex justify-between text-xs"
            >
              <span class="text-ficsit-muted truncate mr-2">{{ shortClass(slot.itemClass) }}</span>
              <span class="text-ficsit-text shrink-0">{{ slot.amount }}</span>
            </div>
          </div>
          <p v-else class="value text-ficsit-muted">Empty</p>
        </section>
      </template>

    </div>
  </div>
</template>

<style scoped>
@reference "../style.css";

.label {
  @apply text-xs font-medium text-ficsit-muted uppercase tracking-wider;
}
.value {
  @apply text-sm text-ficsit-text mt-0.5;
}
</style>
