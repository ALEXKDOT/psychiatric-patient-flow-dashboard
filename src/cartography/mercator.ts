export const mercatorLat = (lat: number) =>
  (Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * 180) / Math.PI
export const latitudeOf = (y: number) =>
  ((2 * Math.atan(Math.exp((y * Math.PI) / 180)) - Math.PI / 2) * 180) / Math.PI
