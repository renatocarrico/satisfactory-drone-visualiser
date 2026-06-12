<script setup lang="ts">
import { ref } from 'vue'
import type { ViewMode } from '../types'

const props = defineProps<{
  viewMode: ViewMode
  advancedMetrics: boolean
  searchQuery: string
  hasNetwork: boolean
}>()

const emit = defineEmits<{
  (e: 'upload'): void
  (e: 'set-view', mode: import('../types').ViewMode): void
  (e: 'toggle-metrics'): void
  (e: 'update:searchQuery', val: string): void
  (e: 'export-png'): void
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerUpload() {
  fileInputRef.value?.click()
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.[0]) {
    emit('upload')
    // Reset so same file can be re-uploaded
    input.value = ''
  }
}

// Expose file input so parent can read the chosen file
defineExpose({ fileInputRef })
</script>

<template>
  <div
    class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
           flex items-center gap-3 px-4 py-3
           bg-ficsit-surface border border-ficsit-border rounded-xl shadow-2xl
           backdrop-blur-sm"
  >
    <!-- Hidden file input -->
    <input
      ref="fileInputRef"
      type="file"
      accept=".sav"
      class="hidden"
      @change="onFileChange"
    />

    <!-- Upload -->
    <button
      class="toolbar-btn"
      title="Upload Save File"
      @click="triggerUpload"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
      </svg>
      <span class="hidden sm:inline">Upload Save</span>
    </button>

    <div class="w-px h-6 bg-ficsit-border" />

    <!-- View mode toggle -->
    <button
      :disabled="!hasNetwork"
      class="toolbar-btn"
      :class="{ 'opacity-40 cursor-not-allowed': !hasNetwork, 'toolbar-btn-active': viewMode === 'spatial' && hasNetwork }"
      title="Spatial Map"
      @click="emit('set-view', 'spatial')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" stroke-width="2"/>
        <path stroke-linecap="round" stroke-width="2" d="M3 12h3m12 0h3M12 3v3m0 12v3"/>
      </svg>
      <span class="hidden sm:inline">Spatial</span>
    </button>

    <button
      :disabled="!hasNetwork"
      class="toolbar-btn"
      :class="{ 'opacity-40 cursor-not-allowed': !hasNetwork, 'toolbar-btn-active': viewMode === 'network' && hasNetwork }"
      title="Network Layout"
      @click="emit('set-view', 'network')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6-3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"/>
      </svg>
      <span class="hidden sm:inline">Network</span>
    </button>

    <button
      :disabled="!hasNetwork"
      class="toolbar-btn"
      :class="{ 'opacity-40 cursor-not-allowed': !hasNetwork, 'toolbar-btn-active': viewMode === 'table' && hasNetwork }"
      title="Table View"
      @click="emit('set-view', 'table')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M3 10h18M3 6h18M3 14h18M3 18h18"/>
      </svg>
      <span class="hidden sm:inline">Table</span>
    </button>

    <!-- Advanced metrics toggle -->
    <button
      :disabled="!hasNetwork"
      class="toolbar-btn"
      :class="{
        'opacity-40 cursor-not-allowed': !hasNetwork,
        'text-ficsit-orange border-ficsit-orange': advancedMetrics && hasNetwork,
      }"
      title="Toggle Advanced Metrics"
      @click="emit('toggle-metrics')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </svg>
      <span class="hidden sm:inline">Metrics</span>
    </button>

    <div class="w-px h-6 bg-ficsit-border" />

    <!-- Search -->
    <div class="relative flex items-center">
      <svg class="absolute left-2 w-3.5 h-3.5 text-ficsit-muted pointer-events-none"
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
      </svg>
      <input
        type="text"
        placeholder="Search ports…"
        :disabled="!hasNetwork"
        :value="searchQuery"
        class="pl-7 pr-3 py-1.5 bg-ficsit-bg border border-ficsit-border rounded-lg
               text-sm text-ficsit-text placeholder-ficsit-muted
               focus:outline-none focus:border-ficsit-orange
               disabled:opacity-40 w-36"
        @input="emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
      />
    </div>

    <div class="w-px h-6 bg-ficsit-border" />

    <!-- Export PNG -->
    <button
      :disabled="!hasNetwork"
      class="toolbar-btn"
      :class="{ 'opacity-40 cursor-not-allowed': !hasNetwork }"
      title="Export as PNG"
      @click="emit('export-png')"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="hidden sm:inline">Export PNG</span>
    </button>
  </div>
</template>

<style scoped>
@reference "../style.css";

.toolbar-btn {
  @apply flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
         text-ficsit-text border border-transparent
         hover:border-ficsit-orange hover:text-ficsit-orange
         transition-colors duration-150;
}
.toolbar-btn-active {
  @apply text-ficsit-orange border-ficsit-orange bg-ficsit-orange/10;
}
</style>
