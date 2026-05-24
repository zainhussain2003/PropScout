// Rate limiting is registered in app.ts.
// This file exists as a reference for per-route override configuration.
//
// To apply stricter limits on a specific route:
//
//   fastify.post('/analysis', {
//     config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
//   }, handler)
//
// See @fastify/rate-limit docs for full options.

export {}
