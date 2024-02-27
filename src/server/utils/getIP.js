import { networkInterfaces } from 'os';

export const getIp = () => {
  const interfaces = networkInterfaces();

  const ipAddresses = Object.keys(interfaces)
    .map((name) => interfaces[name].find((iface) => iface.family === 'IPv4'
            && !iface.internal && iface.address !== '127.0.0.1'))
    .filter(Boolean);

  return ipAddresses[0]?.address ?? '127.0.0.1';
};
