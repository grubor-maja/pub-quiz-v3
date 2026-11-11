import { createContext, useContext, type ReactNode } from 'react'

export interface Toast {
  id: number
  message: ReactNode
  icon?: ReactNode
  action?: { label: string; onClick: () => void }
}

export type Show = (t: Omit<Toast, 'id'>) => void

export const ToastContext = createContext<Show>(() => {})

/** Shows a short message near the bottom of the screen. */
export const useToast = () => useContext(ToastContext)
