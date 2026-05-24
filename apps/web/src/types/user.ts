// User, tier, and subscription types

export type Tier = 'free' | 'pro' | 'professional' | 'team'

export interface Subscription {
  tier: Tier
  status: 'active' | 'cancelled' | 'past_due' | 'trialing'
  currentPeriodEnd: string | null   // ISO 8601
  stripeCustomerId: string | null
}

export interface User {
  id: string
  email: string
  subscription: Subscription
  analysesThisMonth: number         // free tier: capped at 10
  createdAt: string
}
