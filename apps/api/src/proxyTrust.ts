/** Render's observed ingress connects over loopback. Trust only that immediate
 * peer so rate limits use the nearest forwarded client, never arbitrary peers
 * or a client-supplied address further to the left in the forwarding chain.
 */
export function renderProxyTrust(address: string, hop: number): boolean {
  return hop === 0 && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address)
}
