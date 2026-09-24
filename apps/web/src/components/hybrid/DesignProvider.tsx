import { useLayoutEffect, type ReactNode } from 'react'
import { AppDesignContext } from '../../hooks/useAppDesign'
import type { AppDesign } from '../../types/design'

export function DesignProvider({
  design,
  children,
}: {
  design: AppDesign
  children: ReactNode
}): JSX.Element {
  useLayoutEffect(() => {
    const root = document.documentElement
    const previous = root.getAttribute('data-design')
    root.setAttribute('data-design', design)
    return () => {
      if (previous === null) root.removeAttribute('data-design')
      else root.setAttribute('data-design', previous)
    }
  }, [design])

  return <AppDesignContext.Provider value={design}>{children}</AppDesignContext.Provider>
}
