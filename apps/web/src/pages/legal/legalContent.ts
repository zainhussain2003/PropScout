// legalContent.ts — pure data, no JSX.
// Body strings are HTML; render with dangerouslySetInnerHTML in LegalShell.

export interface LegalSection {
  id: string
  title: string
  body: string
}

export interface LegalMeta {
  title: string
  eyebrow: string
  intro: string
  contact: string
}

// ── Privacy ──────────────────────────────────────────────────────────────────

export const PRIVACY_META: LegalMeta = {
  title: 'Privacy Policy',
  eyebrow: 'PIPEDA-compliant · effective May 24, 2026',
  intro:
    'PropScout Analytics Inc. ("we", "us", "PropScout") respects your privacy. This Privacy Policy explains what personal information we collect, why we collect it, how long we keep it, and the rights you have under the Personal Information Protection and Electronic Documents Act (PIPEDA). If a clause here ever conflicts with what you\'d expect a reasonable Canadian privacy-conscious software company to do — please let us know.',
  contact:
    'For privacy questions, write to privacy@propscout.ca. Our Privacy Officer responds within 30 days as required under PIPEDA.',
}

export const PRIVACY_SECTIONS: LegalSection[] = [
  {
    id: 'collect',
    title: 'What we collect',
    body: `<p>We collect three categories of personal information:</p>
<ul>
  <li><strong>Account information</strong> — your email address, name (if you provide it), and authentication tokens. We never store passwords in plain text; we use Supabase Auth, which hashes them with bcrypt.</li>
  <li><strong>Analysis data</strong> — the listing URLs you paste, the property details we scrape from them, your saved analyses, and any field values you override (financing assumptions, household income estimates, etc.).</li>
  <li><strong>Usage data</strong> — anonymized analytics from Plausible (page views, button clicks, no cookies, no cross-site tracking). We log API request counts per user account to enforce free-tier limits.</li>
</ul>
<p>We do <strong>not</strong> collect, and never have: government ID, social insurance numbers, your credit score, or your real bank-account balances. Stripe handles all billing data — we only see a customer ID and subscription status.</p>`,
  },
  {
    id: 'use',
    title: 'How we use it',
    body: `<p>Your personal information is used solely to:</p>
<ul>
  <li>Operate the PropScout service — running analyses, saving them to your account, generating share links, sending verification emails.</li>
  <li>Enforce the free-tier monthly limit (we count analyses per email per month).</li>
  <li>Email you transactional messages: signup confirmation, password reset, your shareable report links, billing receipts via Stripe.</li>
  <li>Improve the product — anonymized usage patterns help us understand which sections of a report get the most attention.</li>
</ul>
<p>We will not use your data to train external machine-learning models. The Claude API calls we make for AI verdicts are sent with property-specific structured data, not your account identity.</p>`,
  },
  {
    id: 'share',
    title: 'Sharing & third parties',
    body: `<p>The third parties we share data with, and the strict reason for each:</p>
<ul>
  <li><strong>Supabase</strong> (Toronto, Canada) — our database and authentication provider. All data is stored within Canadian data centres.</li>
  <li><strong>Stripe</strong> — billing only. They see your name, email, and payment method. We see a subscription status.</li>
  <li><strong>Anthropic Claude API</strong> — the property's structured data (price, beds, comp data) is sent to generate your AI verdict. Account identity is not sent.</li>
  <li><strong>Resend</strong> — transactional email delivery (verification, password reset, share-link emails).</li>
  <li><strong>Mapbox, Google Places, Walk Score, CMHC</strong> — your property's coordinates are sent to retrieve map tiles, school listings, walkability scores, and vacancy data. No account identity is sent.</li>
</ul>
<p>We do <em>not</em> sell, rent, or trade your personal information. Ever.</p>`,
  },
  {
    id: 'retain',
    title: 'Data retention',
    body: `<p>Active accounts keep all data indefinitely so you can return to past analyses. Closed accounts have their personal data deleted within 30 days of closure, with two exceptions:</p>
<ul>
  <li>Anonymized listing data and rental comps remain in our market database (you cannot be identified from this data).</li>
  <li>Billing records are retained for 7 years to satisfy CRA requirements.</li>
</ul>
<p>You can request a hard delete at any time by writing to <a href="mailto:privacy@propscout.ca">privacy@propscout.ca</a>. We respond within 30 days.</p>`,
  },
  {
    id: 'rights',
    title: 'Your rights under PIPEDA',
    body: `<p>You have the right to:</p>
<ul>
  <li><strong>Access</strong> — request a copy of everything we hold about you.</li>
  <li><strong>Correct</strong> — fix any incorrect or out-of-date personal information.</li>
  <li><strong>Delete</strong> — request full deletion of your account and associated data.</li>
  <li><strong>Export</strong> — receive a portable copy of your saved analyses as JSON or PDF.</li>
  <li><strong>Withdraw consent</strong> — opt out of any data processing not strictly required to operate the service.</li>
</ul>
<p>Email <a href="mailto:privacy@propscout.ca">privacy@propscout.ca</a> to exercise any of these rights. If you're unsatisfied with our response, you can file a complaint with the Office of the Privacy Commissioner of Canada at <a href="https://www.priv.gc.ca">priv.gc.ca</a>.</p>`,
  },
  {
    id: 'security',
    title: 'Security',
    body: `<p>All data is encrypted in transit (TLS 1.3) and at rest (AES-256 via Supabase). Access to production databases requires hardware-key authentication. Backups are encrypted and rotated nightly.</p>
<p>If a breach affecting your personal information occurs, we will notify you and the Office of the Privacy Commissioner of Canada within 72 hours, as required.</p>`,
  },
  {
    id: 'cookies',
    title: 'Cookies & tracking',
    body: `<p>We use a single first-party cookie to keep you signed in. We use no advertising trackers, no cross-site cookies, and no Google Analytics. Plausible Analytics provides aggregate page-view counts using only the referring URL and a daily-rotating hash — no individual user is ever identifiable.</p>`,
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: `<p>If we make material changes to this policy, we will notify you by email at least 30 days before they take effect. The previous version remains accessible from the footer of every page.</p>`,
  },
  {
    id: 'contact',
    title: 'Contact',
    body: `<p>For any privacy question, request, or complaint:</p>
<p><strong>Privacy Officer</strong><br/>PropScout Analytics Inc.<br/><a href="mailto:privacy@propscout.ca">privacy@propscout.ca</a></p>
<p>For general support, email <a href="mailto:support@propscout.ca">support@propscout.ca</a>.</p>`,
  },
]

// ── Terms ────────────────────────────────────────────────────────────────────

export const TERMS_META: LegalMeta = {
  title: 'Terms of Service',
  eyebrow: 'Effective May 24, 2026',
  intro:
    'These Terms of Service govern your use of PropScout, a Canadian real estate analysis platform operated by PropScout Analytics Inc. ("we", "us"). Please read them — particularly the section on Not financial or legal advice, which is important and which we mean.',
  contact: 'Questions about these terms? Email legal@propscout.ca.',
}

export const TERMS_SECTIONS: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance',
    body: `<p>By creating a PropScout account or using any part of the service, you agree to these Terms. If you don't agree, please don't use PropScout. That's fine.</p>
<p>If you are using PropScout on behalf of a company or organization, you confirm that you have authority to bind that entity to these Terms.</p>`,
  },
  {
    id: 'service',
    title: 'The service',
    body: `<p>PropScout is software that analyzes Canadian real estate listings. You paste a URL; we return a report containing scraped property data, comparable rental and sale data, calculated investment metrics, neighbourhood data, sun-path analysis, risk flags, and a written verdict generated by an AI model (currently Anthropic's Claude).</p>
<p>The service is currently available for Ontario properties only. Other provinces will be supported as our data and tax engines are calibrated.</p>`,
  },
  {
    id: 'not-advice',
    title: 'Not financial or legal advice',
    body: `<p><strong>This is the most important section. Please read it.</strong></p>
<p>PropScout is an information tool. The reports, scores, verdicts, AI narratives, and any calculation outputs we produce are <em>not</em> financial, legal, tax, real estate, or mortgage advice. They are estimates and analyses based on data sourced from public listings, public datasets, and our scraped rental comparables database.</p>
<p>Real estate decisions involve hundreds of thousands of dollars in commitments and meaningful legal obligations. Always engage qualified professionals before signing anything:</p>
<ul>
  <li>A licensed real estate agent or broker</li>
  <li>A real estate lawyer for the closing</li>
  <li>A mortgage broker or bank for financing</li>
  <li>An accountant for tax implications</li>
  <li>A home inspector before any conditional offer</li>
</ul>
<p>PropScout is not a substitute for any of these. We do not guarantee the accuracy, completeness, or timeliness of any data, calculation, or AI-generated text we display.</p>`,
  },
  {
    id: 'account',
    title: 'Your account & security',
    body: `<p>You're responsible for keeping your sign-in credentials secret and for all activity that happens under your account. Tell us immediately at <a href="mailto:security@propscout.ca">security@propscout.ca</a> if you suspect unauthorized access.</p>
<p>You must be at least 18 years old to use PropScout.</p>`,
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions, billing & cancellation',
    body: `<p>PropScout offers a Free tier and paid tiers (Investor Pro, Professional, Team) billed monthly or annually via Stripe. Subscriptions renew automatically until you cancel.</p>
<p>You can cancel at any time from your account settings, which links to your Stripe customer portal. Cancellation takes effect at the end of your current billing cycle; you retain access until then.</p>
<p>We offer a <strong>14-day satisfaction refund</strong> on your first paid month. After 14 days, charges are non-refundable except where required by law.</p>
<p>Annual subscribers receive a pro-rata refund of any unused months if they cancel due to a documented PropScout product defect.</p>`,
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable use',
    body: `<p>Don't do the obvious bad things: don't scrape PropScout itself, don't redistribute reports commercially under a different brand, don't attempt to reverse-engineer our calculation engine, don't abuse the API to attack other services. Don't use PropScout to harass tenants, landlords, or sellers. Don't submit URLs that aren't real listings — it wastes our scraper budget.</p>
<p>If we detect abuse, we may suspend or terminate your account without notice.</p>`,
  },
  {
    id: 'ip',
    title: 'Intellectual property',
    body: `<p>PropScout's software, design, calculation engine, deal-score formula, and AI prompts are our intellectual property. The PropScout name, logo, and "Scout-Mark" are trademarks.</p>
<p>The reports you generate are yours — you can save them, share them, send them to clients, post them on the internet. We grant you a perpetual, royalty-free license to use any report you generate, even if you later cancel your subscription.</p>
<p>Listing data, rental comparables, and public data we display remain the intellectual property of their respective sources.</p>`,
  },
  {
    id: 'liability',
    title: 'Limitation of liability',
    body: `<p>To the maximum extent allowed by law:</p>
<ul>
  <li>PropScout is provided "as is" without warranty of any kind — express, implied, statutory, or otherwise.</li>
  <li>We are not liable for any indirect, incidental, consequential, special, or punitive damages, including lost profits, lost data, or business interruption.</li>
  <li>Our total liability to you in any 12-month period is capped at the amount you paid us for PropScout in that period, or <code>$100 CAD</code>, whichever is greater.</li>
</ul>
<p>Nothing in these Terms excludes liability that cannot lawfully be excluded.</p>`,
  },
  {
    id: 'law',
    title: 'Governing law',
    body: `<p>These Terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable in Ontario. Any dispute is subject to the exclusive jurisdiction of the courts of Ontario, sitting in Toronto.</p>`,
  },
  {
    id: 'changes-tos',
    title: 'Changes to these terms',
    body: `<p>If we make material changes to these Terms, we will notify you by email at least 30 days before they take effect. Continued use of PropScout after the effective date constitutes acceptance of the revised Terms.</p>`,
  },
  {
    id: 'contact-tos',
    title: 'Contact',
    body: `<p>For questions about these Terms, email <a href="mailto:legal@propscout.ca">legal@propscout.ca</a>.</p>
<p>For general support, write to <a href="mailto:support@propscout.ca">support@propscout.ca</a>.</p>`,
  },
]
