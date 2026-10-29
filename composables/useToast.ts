export interface Toast {
  id: number
  icon: string
  title: string
  body?: string
}

let nextToastId = 1

/** Confirmations only — form errors always render inline (spec 05 §16). */
export function useToast() {
  const toasts = useState<Toast[]>('sv:toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  function push(title: string, body = '', icon = '✓') {
    if (import.meta.server) return
    const toast = { id: nextToastId++, icon, title, body }
    toasts.value = [...toasts.value, toast]
    setTimeout(() => dismiss(toast.id), 4500)
  }

  return { toasts, push, dismiss }
}
