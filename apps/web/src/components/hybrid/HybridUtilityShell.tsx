import { Outlet } from 'react-router-dom'
import { useAppDesign } from '../../hooks/useAppDesign'
import { HybridUtilityLayout } from './HybridUtilityLayout'

export function HybridUtilityShell(): JSX.Element {
  return useAppDesign() === 'hybrid' ? <HybridUtilityLayout /> : <Outlet />
}
