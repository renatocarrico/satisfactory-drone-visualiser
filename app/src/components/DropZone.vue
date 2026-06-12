<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'file', file: File): void
}>()

const isDragging = ref(false)

function onDragOver(e: DragEvent) {
  e.preventDefault()
  isDragging.value = true
}
function onDragLeave() {
  isDragging.value = false
}
function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files[0]
  if (file && file.name.endsWith('.sav')) emit('file', file)
}
function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) emit('file', file)
}
</script>

<template>
  <div
    class="flex flex-col items-center justify-center w-full h-full select-none"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <label
      class="flex flex-col items-center justify-center gap-6 cursor-pointer
             border-2 border-dashed rounded-2xl px-16 py-20 transition-all duration-200"
      :class="isDragging
        ? 'border-ficsit-orange bg-ficsit-orange/10 scale-105'
        : 'border-ficsit-border hover:border-ficsit-orange/60'"
    >
      <!-- FICSIT logo-ish icon -->
      <svg class="w-16 h-16" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="26" y="26" width="12" height="12" rx="2" fill="#FF851B"/>
        <rect x="4"  y="4"  width="16" height="16" rx="3" fill="#FF851B" opacity="0.5"/>
        <rect x="44" y="4"  width="16" height="16" rx="3" fill="#FF851B" opacity="0.5"/>
        <rect x="4"  y="44" width="16" height="16" rx="3" fill="#FF851B" opacity="0.5"/>
        <rect x="44" y="44" width="16" height="16" rx="3" fill="#FF851B" opacity="0.5"/>
        <line x1="12" y1="20" x2="28" y2="28" stroke="#FF851B" stroke-width="2" opacity="0.4"/>
        <line x1="52" y1="20" x2="36" y2="28" stroke="#FF851B" stroke-width="2" opacity="0.4"/>
        <line x1="12" y1="44" x2="28" y2="36" stroke="#FF851B" stroke-width="2" opacity="0.4"/>
        <line x1="52" y1="44" x2="36" y2="36" stroke="#FF851B" stroke-width="2" opacity="0.4"/>
      </svg>

      <div class="text-center">
        <p class="text-ficsit-text text-lg font-semibold">
          {{ isDragging ? 'Drop to load save' : 'Drop your save file here' }}
        </p>
        <p class="text-ficsit-muted text-sm mt-1">or click to browse &mdash; <span class="text-ficsit-orange">.sav</span> files only</p>
      </div>

      <input type="file" accept=".sav" class="hidden" @change="onFileInput" />
    </label>

    <p class="mt-6 text-ficsit-muted text-xs">
      All processing happens locally &mdash; your save file never leaves your device.
    </p>
  </div>
</template>
