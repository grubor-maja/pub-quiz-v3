import { useCallback, useEffect, useRef, useState } from 'react'
import { ToastContext, type Show, type Toast } from './toast'

/** One message at a time near the bottom of the screen, gone after a few seconds. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)

  const show = useCallback<Show>((t) => {
    window.clearTimeout(timer.current)
    setToast({ ...t, id: Date.now() })
    timer.current = window.setTimeout(() => setToast(null), 4500)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <div key={toast.id} className="toast" role="status">
          {toast.icon}
          <span style={{ flex: 1, fontSize: 14 }}>{toast.message}</span>
          {toast.action && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { toast.action!.onClick(); setToast(null) }}
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}
    </ToastContext.Provider>
  )
}
