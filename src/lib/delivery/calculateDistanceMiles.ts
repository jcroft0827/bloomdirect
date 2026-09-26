type Coordinates = {
  lat: number;
  lng: number;
};

const EARTH_RADIUS_MILES = 3958.7613;

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMiles(
  origin: Coordinates,
  destination: Coordinates,
): number {
  const originLat = degreesToRadians(origin.lat);
  const destinationLat = degreesToRadians(destination.lat);

  const latitudeDifference = degreesToRadians(
    destination.lat - origin.lat,
  );

  const longitudeDifference = degreesToRadians(
    destination.lng - origin.lng,
  );

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(originLat) *
      Math.cos(destinationLat) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_MILES * c;
}