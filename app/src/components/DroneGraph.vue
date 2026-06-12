<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import cytoscape from 'cytoscape'
import cola from 'cytoscape-cola'
import type { DroneNetwork, DronePort, ViewMode } from '../types'

cytoscape.use(cola)

const props = defineProps<{
  network: DroneNetwork
  viewMode: ViewMode
  searchQuery: string
  selectedPortId: string | null
}>()

const emit = defineEmits<{
  (e: 'select-port', port: DronePort | null): void
}>()

const containerRef = ref<HTMLElement | null>(null)
let cy: cytoscape.Core | null = null

// Satisfactory world bounds in cm — from SC-InteractiveMap (AnthorNet/SC-InteractiveMap)
const MAP_MIN_X = -324698.832031  // mappingBoundWest
const MAP_MAX_X =  425301.832031  // mappingBoundEast
const MAP_MIN_Y = -375000         // mappingBoundNorth (top of image, no Y inversion)
const MAP_MAX_Y =  375000         // mappingBoundSouth

// ── Map image sync ────────────────────────────────────────────────────────────

// The image is positioned/sized explicitly so it tracks cytoscape's pan/zoom.
// mapContentBox() returns the initial (zoom=1, pan=0) rect of the square image
// when object-fit:contain would have placed it — i.e. centred with letterboxing.
const mapImageStyle = ref<Record<string, string | number>>({
  position: 'absolute', left: '0px', top: '0px', width: '0px', height: '0px',
})

function mapContentBox() {
  const container = containerRef.value
  const W = container?.clientWidth ?? 800
  const H = container?.clientHeight ?? 600
  const renderSize = Math.min(W, H)
  const offsetX = (W - renderSize) / 2
  const offsetY = (H - renderSize) / 2
  return { renderSize, offsetX, offsetY }
}

function syncMapImage() {
  if (!cy || props.viewMode !== 'spatial') return
  // Mirror cytoscape's canvas transform onto the image using the same pan/zoom.
  // Both the canvas and the image share the container's top-left as origin, so
  // translate(pan) scale(zoom) keeps them pixel-perfect at any zoom level.
  const z = cy.zoom()
  const { x: px, y: py } = cy.pan()
  mapImageStyle.value = {
    position: 'absolute',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    objectFit: 'contain',
    transformOrigin: '0 0',
    transform: `translate(${px}px, ${py}px) scale(${z})`,
    opacity: 0.45,
    pointerEvents: 'none',
    userSelect: 'none',
    zIndex: 0,
  }
}

// ── Build cytoscape elements from network ────────────────────────────────────

function buildElements(network: DroneNetwork, isSpatial = false) {
  const nodes = network.ports.map((p) => ({
    data: { id: p.id, label: p.name, port: p },
  }))
  const edges = network.edges.map((e) => ({
    data: { id: e.id, source: e.sourceId, target: e.targetId },
  }))
  // Invisible corner nodes pin cytoscape's viewport to the full map extent
  const sentinels = isSpatial
    ? [
        { data: { id: '__map_tl', label: '' }, classes: 'map-sentinel' },
        { data: { id: '__map_br', label: '' }, classes: 'map-sentinel' },
      ]
    : []
  return [...sentinels, ...nodes, ...edges]
}

// ── Coordinate scaling ────────────────────────────────────────────────────────

function spatialPositions(network: DroneNetwork): Record<string, { x: number; y: number }> {
  if (!network.ports.length) return {}

  const { renderSize, offsetX, offsetY } = mapContentBox()
  const scaleX = renderSize / (MAP_MAX_X - MAP_MIN_X)
  const scaleY = renderSize / (MAP_MAX_Y - MAP_MIN_Y)

  const positions: Record<string, { x: number; y: number }> = {}
  positions['__map_tl'] = { x: offsetX,              y: offsetY }
  positions['__map_br'] = { x: offsetX + renderSize,  y: offsetY + renderSize }

  for (const p of network.ports) {
    positions[p.id] = {
      x: offsetX + (p.x - MAP_MIN_X) * scaleX,
      // Game Y: -375000 = north (top of image) — matches screen Y, no inversion
      y: offsetY + (p.y - MAP_MIN_Y) * scaleY,
    }
  }
  return positions
}

// ── Cytoscape stylesheet ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const stylesheet: any[] = [
  {
    selector: 'node',
    style: {
      'background-color': '#1a1a1a',
      'border-color': '#FF851B',
      'border-width': 2,
      'label': 'data(label)',
      'color': '#e0e0e0',
      'font-size': 11,
      'font-family': '"Rajdhani", "Share Tech Mono", monospace',
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'text-outline-color': '#111111',
      'text-outline-width': 2,
      'width': 24,
      'height': 24,
      'shape': 'octagon',
    },
  },
  {
    selector: 'node.map-sentinel',
    style: {
      'opacity': 0,
      'width': 1,
      'height': 1,
      'label': '',
      'events': 'no',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'background-color': '#FF851B',
      'border-color': '#ffffff',
      'border-width': 3,
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-color': '#ffe066',
      'border-width': 3,
    },
  },
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.25,
    },
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#FF851B',
      'target-arrow-color': '#FF851B',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'width': 2,
      'opacity': 0.7,
      'arrow-scale': 1.2,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.1,
    },
  },
]

// ── Init / re-init cytoscape ──────────────────────────────────────────────────

function initCy() {
  if (!containerRef.value) return
  if (cy) { cy.destroy(); cy = null }

  const isSpatial = props.viewMode === 'spatial'
  const positions = isSpatial ? spatialPositions(props.network) : {}

  cy = cytoscape({
    container: containerRef.value,
    elements: buildElements(props.network, isSpatial),
    style: stylesheet,
    layout: getLayout(positions),
    minZoom: 0.1,
    maxZoom: 10,
    wheelSensitivity: 0.3,
  })

  cy.on('tap', 'node', (evt) => {
    const port: DronePort = evt.target.data('port')
    emit('select-port', port)
  })

  cy.on('tap', (evt) => {
    if (evt.target === cy) emit('select-port', null)
  })

  if (isSpatial) {
    // Keep the background image in sync on every pan/zoom
    cy.on('viewport', syncMapImage)
    // Preset layout runs synchronously, so zoom/pan are already set — sync immediately
    nextTick(syncMapImage)
  }

  applySearch(props.searchQuery)
  applySelection(props.selectedPortId)
}

function getLayout(positions: Record<string, { x: number; y: number }>) {
  if (props.viewMode === 'spatial' && Object.keys(positions).length) {
    return {
      name: 'preset',
      positions: (node: cytoscape.NodeSingular) => positions[node.id()] ?? { x: 0, y: 0 },
      fit: true,
      padding: 0,
    }
  }
  return {
    name: 'cola',
    animate: true,
    animationDuration: 600,
    fit: true,
    padding: 60,
    nodeSpacing: 40,
    edgeLength: 180,
    maxSimulationTime: 3000,
  }
}

// ── Search highlighting ───────────────────────────────────────────────────────

function applySearch(query: string) {
  if (!cy) return
  cy.elements().removeClass('highlighted dimmed')
  if (!query.trim()) return

  const q = query.toLowerCase()
  const matched = cy.nodes().filter((n) =>
    (n.data('label') as string).toLowerCase().includes(q)
  )
  if (matched.length === 0) return

  cy.elements().addClass('dimmed')
  matched.addClass('highlighted').removeClass('dimmed')
  matched.connectedEdges().removeClass('dimmed')
}

// ── Selected node highlight ───────────────────────────────────────────────────

function applySelection(id: string | null) {
  if (!cy) return
  cy.nodes().unselect()
  if (id) cy.getElementById(id).select()
}

// ── Watchers ──────────────────────────────────────────────────────────────────

watch(() => props.network, async () => {
  await nextTick()
  initCy()
})

watch(() => props.viewMode, async () => {
  await nextTick()
  initCy()
})

watch(() => props.searchQuery, (q) => applySearch(q))
watch(() => props.selectedPortId, (id) => applySelection(id))

// ── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => {
  initCy()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  cy?.destroy()
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  cy?.resize()
  if (props.viewMode === 'spatial') {
    const positions = spatialPositions(props.network)
    cy?.layout(getLayout(positions)).run()
    syncMapImage()
  }
}

// ── Export PNG ────────────────────────────────────────────────────────────────

function exportPng() {
  if (!cy) return
  const dataUrl = cy.png({ full: true, scale: 2, bg: '#111111' })
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = 'drone-network.png'
  a.click()
}

defineExpose({ exportPng })
</script>

<template>
  <div class="relative w-full h-full overflow-hidden">
    <!-- Image is positioned/sized by syncMapImage() to track cytoscape's viewport -->
    <img
      v-if="viewMode === 'spatial'"
      src="/satisfactory_map.png"
      :style="mapImageStyle"
      draggable="false"
    />
    <div ref="containerRef" class="absolute inset-0 w-full h-full" style="z-index: 1;" />
  </div>
</template>
