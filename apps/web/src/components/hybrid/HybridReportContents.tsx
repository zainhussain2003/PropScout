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
      // SectionHead metadata is shared by all four modes. Older personal and
      // landlord sections do not carry the investor rail's data-section marker.
      const next = [
        ...root.querySelectorAll<HTMLElement>('[data-section-topic][data-section-n]'),
      ].filter((el) => el.querySelector('h2'))
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
            <li key={`${section.dataset.sectionN}-${section.dataset.sectionTopic}`}>
              <button
                type="button"
                aria-label={`${section.dataset.sectionN} ${section.dataset.sectionTopic}`}
                onClick={() => {
                  const target = section.closest('section') ?? section
                  target.scrollIntoView({ block: 'start', behavior: 'instant' })
                  const heading = section.querySelector('h2')
                  if (heading) {
                    heading.tabIndex = -1
                    heading.focus({ preventScroll: true })
                  }
                }}
              >
                <span className="mono">{section.dataset.sectionN}</span>{' '}
                {section.dataset.sectionTopic}
              </button>
            </li>
          ))}
        </ol>
      </details>
    </nav>
  )
}
