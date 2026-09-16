/**
 * GuestNudge — the line under the nav on a report the viewer ran as a guest
 * (D-116): sign in to keep it. When the wall is on it also says the free
 * report is used. Rendering only; the facts come from the API.
 */

interface GuestNudgeProps {
  used: number
  limit: number
  limitEnabled: boolean
  onSignIn: () => void
}

export function GuestNudge({ used, limit, limitEnabled, onSignIn }: GuestNudgeProps): JSX.Element {
  const exhausted = limitEnabled && used >= limit
  return (
    <div
      className="container"
      role="status"
      data-testid="guest-nudge"
      style={{ paddingTop: 12, paddingBottom: 0 }}
    >
      <div
        className="card"
        style={{
          padding: '12px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          fontSize: 13.5,
          color: 'var(--ink-2)',
        }}
      >
        <span>
          {exhausted
            ? `This was your free report as a guest (${used} of ${limit}). Sign in to keep it and run more — your reports come with you.`
            : 'Sign in to keep this report in your account — it stays yours, with its flags and history.'}
        </span>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onSignIn}
          style={{ padding: '6px 14px', fontSize: 13 }}
        >
          Sign in
        </button>
      </div>
    </div>
  )
}
