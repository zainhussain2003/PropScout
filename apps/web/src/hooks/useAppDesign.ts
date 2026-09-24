import { createContext, useContext } from 'react'
import type { AppDesign } from '../types/design'

// Standalone existing components keep their original presentation. The app
// explicitly supplies its selected design, including in the error boundary.
export const AppDesignContext = createContext<AppDesign>('legacy')

export function useAppDesign(): AppDesign {
  return useContext(AppDesignContext)
}
