import os from 'os';

/**
 * Get local IPv4 addresses (Wi-Fi, Hotspot, Ethernet)
 * excluding internal/loopback addresses.
 */
export function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          interface: name,
          address: net.address,
        });
      }
    }
  }

  // Prioritize Wi-Fi, WLAN, or Wireless interfaces
  addresses.sort((a, b) => {
    const isWifiA = /wi-fi|wlan|wireless|hotspot/i.test(a.interface);
    const isWifiB = /wi-fi|wlan|wireless|hotspot/i.test(b.interface);
    if (isWifiA && !isWifiB) return -1;
    if (!isWifiA && isWifiB) return 1;
    return 0;
  });

  return addresses;
}
