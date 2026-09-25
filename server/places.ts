// Places WATL can search near: where the network's rooms are, plus the capitals. Shared by the
// app's filters and the MCP server.

export const AREAS_NEAR = [
  { id: 'brisbane', label: 'Brisbane', origin: { lat: -27.47, lng: 153.02 } },
  { id: 'gold-coast', label: 'Gold Coast', origin: { lat: -28.009, lng: 153.405 } },
  { id: 'sydney', label: 'Sydney', origin: { lat: -33.87, lng: 151.2 } },
  { id: 'perth', label: 'Perth', origin: { lat: -31.953, lng: 115.857 } },
  { id: 'snowy', label: 'Snowy Mountains', origin: { lat: -36.416, lng: 148.622 } },
  { id: 'melbourne', label: 'Melbourne', origin: { lat: -37.814, lng: 144.963 } },
  { id: 'adelaide', label: 'Adelaide', origin: { lat: -34.929, lng: 138.601 } },
  { id: 'canberra', label: 'Canberra', origin: { lat: -35.281, lng: 149.13 } },
  { id: 'hobart', label: 'Hobart', origin: { lat: -42.882, lng: 147.327 } },
  { id: 'darwin', label: 'Darwin', origin: { lat: -12.463, lng: 130.845 } },
] as const;
