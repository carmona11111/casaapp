import { networkInterfaces } from 'node:os';

export function lanAddresses(interfaces) {
  const candidates = [];
  for (const [name, addresses] of Object.entries(interfaces)) {
    if (/^(lo|docker|veth|br-|virbr|tun|tap|wg|tailscale)/i.test(name)) continue;
    for (const address of addresses || []) {
      if (address.internal || address.family !== 'IPv4') continue;
      const ip = address.address;
      const parts = ip.split('.').map(Number);
      const privateIp = parts[0] === 10 || (parts[0] === 192 && parts[1] === 168)
        || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
      if (privateIp) candidates.push(ip);
    }
  }
  return [...new Set(candidates)].sort((a, b) => Number(b.startsWith('192.168.')) - Number(a.startsWith('192.168.')));
}

export function detectLanAddresses() {
  try { return lanAddresses(networkInterfaces()); }
  catch { return []; }
}

export function developmentUrl(host, port, addresses) {
  const address = host === '0.0.0.0' || host === '::' ? addresses[0] : host;
  return `http://${address && address !== '127.0.0.1' ? address : 'localhost'}:${port}`;
}
