/** Render's observed ingress uses a loopback sidecar and one private ingress
 * hop. Validate both addresses and stop before the first public client, never
 * trusting arbitrary peers or earlier client-supplied forwarding entries.
 */
export function renderProxyTrust(address: string, hop: number): boolean {
  if (hop === 0) return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
  return hop === 1 && /^(?:::ffff:)?10\.(?:\d{1,3}\.){2}\d{1,3}$/.test(address)
}
