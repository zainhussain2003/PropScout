import { useEffect, useRef, useState } from 'react'
import { useAppDesign } from '../../hooks/useAppDesign'

/** Derives the outline from rendered sections, including honest empty states. */
export function HybridReportContents(): JSX.Element | null {
  const design = useAppDesign()
  const ref = useRef<HTMLElement>(null)
  const [sections, setSections] = useState<HTMLElement[]>([])
  useEffect(() => {
    if (design !== 'hybrid') return
    const root = ref.current?.closest('[data-report-document]') ?? document.body
    const scan = (): void => {
      const next = [...root.querySelectorAll<HTMLElement>('[data-section]')].filter((el) =>
        el.querySelector('[data-section-topic]')
      )
      setSections((current) =>
        current.length === next.length && current.every((el, i) => el === next[i]) ? current : next
      )
    }
    scan()
    const observer = new MutationObserver(scan)
    observer.observe(root, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [design])
  if (design !== 'hybrid') return null
  return (
    <nav ref={ref} className="hy-report-contents" aria-label="Explore report sections">
      <details>
        <summary>
          Explore this report <span>{sections.length} sections</span>
        </summary>
        <ol>
          {sections.map((section) => (
            <li key={section.dataset.section}>
              <button
                type="button"
                onClick={() => {
                  section.scrollIntoView({ block: 'start', behavior: 'instant' })
                  const heading = section.querySelector('h2')
                  if (heading) {
                    heading.tabIndex = -1
                    heading.focus({ preventScroll: true })
                  }
                }}
              >
                <span className="mono">{section.dataset.section}</span>
                {section.querySelector<HTMLElement>('[data-section-topic]')?.dataset.sectionTopic}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  )
}
