import { networkInterfaces } from "node:os";

export function resolvePublicUrl(config, interfaces = networkInterfaces()) {
  if (config.publicUrl) return config.publicUrl;
  let hostname = config.host;
  if (["0.0.0.0", "::"].includes(hostname)) {
    const addresses = Object.values(interfaces).flat().filter(
      (entry) => entry && !entry.internal && entry.family === "IPv4",
    );
    const privateAddress = addresses.find(({ address }) =>
      /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address),
    );
    hostname = (privateAddress || addresses[0])?.address || "127.0.0.1";
  }
  return `http://${hostname.includes(":") ? `[${hostname}]` : hostname}:${config.port}`;
}
