import type { ReactNode } from 'react'

export function DemoNotice({ children }: { children: ReactNode }): JSX.Element {
  return (
    <>
      <aside className="container card hy-demo-notice" role="note">
        <strong>Sample report.</strong> Property details, comparable listings and market figures on
        this page are demonstration data, not a current property assessment.
        <a href="/#hero"> Analyze your own property</a>
      </aside>
      {children}
    </>
  )
}
