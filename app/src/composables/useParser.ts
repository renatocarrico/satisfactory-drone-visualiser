import { ref } from 'vue'
import type { ParseStatus, WorkerOutMessage } from '../types'

export function useParser() {
  const status = ref<ParseStatus>({ type: 'idle' })

  function parseFile(file: File) {
    status.value = { type: 'parsing' }

    const worker = new Worker(
      new URL('../workers/parser.worker.ts', import.meta.url),
      { type: 'module' }
    )

    worker.onmessage = (e: MessageEvent<WorkerOutMessage>) => {
      if (e.data.type === 'done') {
        status.value = { type: 'done', network: e.data.network }
      } else {
        status.value = { type: 'error', message: e.data.message }
      }
      worker.terminate()
    }

    worker.onerror = (e) => {
      status.value = { type: 'error', message: e.message }
      worker.terminate()
    }

    file.arrayBuffer().then((buf) => {
      worker.postMessage({ type: 'parse', buffer: buf }, [buf])
    })
  }

  return { status, parseFile }
}
