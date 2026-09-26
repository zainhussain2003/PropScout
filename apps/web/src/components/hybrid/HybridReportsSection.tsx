import { Link } from 'react-router-dom'
import { ReportShowcase } from '../landing/ReportShowcase'
import { Icon } from '../shared/Icon'

const groups = [
  {
    title: 'Renting and leasing',
    kind: 'Rental listings',
    reports: [
      {
        name: 'Tenant',
        path: '/tenant-report',
        question: 'Is the rent fair?',
        copy: 'Compare the asking rent, inspect listing concerns and prepare for your viewing.',
      },
      {
        name: 'Landlord',
        path: '/landlord-report',
        question: 'What should I charge?',
        copy: 'Explore rent positioning, operating costs and the assumptions behind the return.',
      },
    ],
  },
  {
    title: 'Buying and investing',
    kind: 'Sale listings',
    reports: [
      {
        name: 'Personal buyer',
        path: '/personal-report',
        question: 'What will it cost to live here?',
        copy: 'Explore ownership costs, comparable sales, schools and the surrounding area.',
      },
      {
        name: 'Investor',
        path: '/investor-report',
        question: 'Does the deal work?',
        copy: 'Inspect cash flow, financing, risk flags and equity scenarios together.',
      },
    ],
  },
] as const

export function HybridReportsSection(): JSX.Element {
  return (
    <section id="reports" className="container hy-section">
      <div className="hy-section-heading">
        <div>
          <div className="eyebrow">One property. Your perspective.</div>
          <h2 className="serif">
            Start with the questions
            <br />
            that matter to you.
          </h2>
        </div>
        <p>
          PropScout detects the listing type, then asks how you plan to use it. Explore the complete
          sample reports below. Each sample is a different example property.
        </p>
      </div>
      <div className="hy-report-groups">
        {groups.map((group) => (
          <div key={group.kind} role="group" aria-label={group.kind}>
            <h3>{group.title}</h3>
            <p className="hy-group-kind">{group.kind}</p>
            <div className="hy-report-choices">
              {group.reports.map((report) => (
                <Link className="hy-report-choice" key={report.path} to={report.path}>
                  <span className="eyebrow">{report.name}</span>
                  <strong className="serif">{report.question}</strong>
                  <p>{report.copy}</p>
                  <span className="hy-text-link">
                    Open sample report <Icon name="arrow" size={14} />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="hy-sample-detail">
        <div className="hy-section-heading">
          <h3 className="serif">Inside a tenant report</h3>
          <Link className="hy-text-link" to="/tenant-report">
            Explore the full tenant example <Icon name="arrow" size={14} />
          </Link>
        </div>
        <ReportShowcase />
        <p className="hy-sample-note">
          Demonstration data in CAD. These examples are not an appraisal or a live assessment.
        </p>
      </div>
    </section>
  )
}
