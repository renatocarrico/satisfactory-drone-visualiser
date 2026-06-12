<script setup lang="ts">
import { ref, computed } from 'vue'
import { useParser } from './composables/useParser'
import DroneGraph from './components/DroneGraph.vue'
import DroneTable from './components/DroneTable.vue'
import Toolbar from './components/Toolbar.vue'
import PortDetail from './components/PortDetail.vue'
import DropZone from './components/DropZone.vue'
import type { DronePort, ViewMode } from './types'

// ── State ─────────────────────────────────────────────────────────────────────
const viewMode = ref<ViewMode>('spatial')
const advancedMetrics = ref(false)
const searchQuery = ref('')
const selectedPort = ref<DronePort | null>(null)

const graphRef = ref<InstanceType<typeof DroneGraph> | null>(null)
const toolbarRef = ref<InstanceType<typeof Toolbar> | null>(null)

const { status, parseFile } = useParser()

const network = computed(() =>
  status.value.type === 'done' ? status.value.network : null
)
const hasNetwork = computed(() => network.value !== null)

// ── Handlers ──────────────────────────────────────────────────────────────────
function onFile(file: File) {
  selectedPort.value = null
  searchQuery.value = ''
  parseFile(file)
}

function onToolbarUpload() {
  // Toolbar triggers its own file input; we read it via the exposed ref
  const input = toolbarRef.value?.fileInputRef
  if (!input) return
  const handler = () => {
    const file = input.files?.[0]
    if (file) onFile(file)
    input.removeEventListener('change', handler)
  }
  input.addEventListener('change', handler)
}

function setView(mode: ViewMode) {
  viewMode.value = mode
}

function onSelectPort(port: DronePort | null) {
  selectedPort.value = port
}

function onJumpToPort(portId: string) {
  const port = network.value?.ports.find((p) => p.id === portId) ?? null
  selectedPort.value = port
}
</script>

<template>
  <div class="w-screen h-screen bg-ficsit-bg overflow-hidden relative flex flex-col">

    <!-- ── Loading overlay ────────────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="status.type === 'parsing'"
        class="absolute inset-0 z-40 flex flex-col items-center justify-center
               bg-ficsit-bg/90 backdrop-blur-sm gap-4"
      >
        <div class="w-10 h-10 border-2 border-ficsit-border border-t-ficsit-orange rounded-full animate-spin" />
        <p class="text-ficsit-muted text-sm">Parsing save file…</p>
      </div>
    </Transition>

    <!-- ── Error banner ───────────────────────────────────────────────────── -->
    <Transition name="fade">
      <div
        v-if="status.type === 'error'"
        class="absolute top-4 left-1/2 -translate-x-1/2 z-50
               bg-red-900/80 border border-red-700 rounded-xl px-5 py-3
               text-sm text-red-200 max-w-lg text-center"
      >
        <span class="font-semibold text-red-400">Parse error: </span>{{ status.message }}
      </div>
    </Transition>

    <!-- ── Drop zone (idle / error state) ────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="!hasNetwork && status.type !== 'parsing'" class="absolute inset-0 z-10">
        <DropZone @file="onFile" />
      </div>
    </Transition>

    <!-- ── Graph ─────────────────────────────────────────────────────────── -->
    <div v-if="hasNetwork && viewMode !== 'table'" class="flex-1 relative">
      <DroneGraph
        ref="graphRef"
        :network="network!"
        :view-mode="viewMode"
        :search-query="searchQuery"
        :selected-port-id="selectedPort?.id ?? null"
        @select-port="onSelectPort"
      />

      <!-- Port count badge -->
      <div class="absolute top-4 left-4 flex gap-2">
        <span class="badge">{{ network!.ports.length }} ports</span>
        <span class="badge">{{ network!.edges.length }} drones</span>
      </div>
    </div>

    <!-- ── Table ─────────────────────────────────────────────────────────── -->
    <div v-if="hasNetwork && viewMode === 'table'" class="flex-1 overflow-hidden">
      <DroneTable
        :network="network!"
        :search-query="searchQuery"
        @select-port="onSelectPort"
      />
    </div>

    <!-- ── Port detail panel ──────────────────────────────────────────────── -->
    <Transition name="slide-right">
      <PortDetail
        v-if="selectedPort && hasNetwork"
        :port="selectedPort"
        :network="network!"
        :advanced-metrics="advancedMetrics"
        @close="selectedPort = null"
        @select-port="onJumpToPort"
      />
    </Transition>

    <!-- ── Toolbar ────────────────────────────────────────────────────────── -->
    <Toolbar
      ref="toolbarRef"
      :view-mode="viewMode"
      :advanced-metrics="advancedMetrics"
      :search-query="searchQuery"
      :has-network="hasNetwork"
      @upload="onToolbarUpload"
      @set-view="setView"
      @toggle-metrics="advancedMetrics = !advancedMetrics"
      @update:search-query="searchQuery = $event"
      @export-png="graphRef?.exportPng()"
    />
  </div>
</template>

<style>
@reference "./style.css";

.badge {
  @apply text-xs font-medium px-2.5 py-1 rounded-lg
         bg-ficsit-surface border border-ficsit-border text-ficsit-muted;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.slide-right-enter-active, .slide-right-leave-active { transition: transform 0.25s ease, opacity 0.2s ease; }
.slide-right-enter-from, .slide-right-leave-to { transform: translateX(2rem); opacity: 0; }
</style>
