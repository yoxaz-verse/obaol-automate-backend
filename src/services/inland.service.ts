// services/inland.service.ts
import axios from "axios";

const GH_KEY =
  // process.env.GH_KEY! ||
  "0e690407-9b39-42ca-9599-7eca6bab25eb";
const ORS_KEY = process.env.ORS_KEY!;

/**
 * Returns road distance in kilometers between two [lat,lon] points.
 */
export async function getDistanceKm(
  origin: [number, number],
  dest: [number, number]
): Promise<number> {
  // Try GraphHopper first
  try {
    const ghRes = await axios.get("https://graphhopper.com/api/1/route", {
      params: {
        point: [
          [`${origin[0]},${origin[1]}`],
          // , [`${dest[0]},${dest[1]}`]
        ],
        vehicle: "truck",
        key: GH_KEY,
      },
    });
    return ghRes.data.paths[0].distance / 1000;
  } catch {
    // Fallback to OpenRouteService matrix
    const orsRes = await axios.post(
      "https://api.openrouteservice.org/v2/matrix/driving-hgv",
      { locations: [origin, dest] },
      { headers: { Authorization: ORS_KEY } }
    );
    return orsRes.data.distances[0][1] / 1000;
  }
}
