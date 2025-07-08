import axios from "axios";
import dotenv from "dotenv";
dotenv.config(); // Make sure environment variables are loaded

const GH_KEY = process.env.GH_KEY;
const ORS_KEY = process.env.ORS_KEY;

if (!GH_KEY) throw new Error("❌ Missing GH_KEY in .env");
if (!ORS_KEY) throw new Error("❌ Missing ORS_KEY in .env");

/**
 * Validates coordinate format [latitude, longitude]
 */
function isValidCoord(coord: [number, number]): boolean {
  const [lat, lon] = coord;
  return (
    typeof lat === "number" &&
    typeof lon === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}

/**
 * Returns road distance in kilometers between two [lat, lon] coordinates.
 */
export async function getDistanceKm(
  origin: [number, number],
  dest: [number, number]
): Promise<number> {
  if (!isValidCoord(origin) || !isValidCoord(dest)) {
    throw new Error("Invalid coordinates provided. Must be [lat, lon] format.");
  }

  const originStr = `${origin[0]},${origin[1]}`;
  const destStr = `${dest[0]},${dest[1]}`;

  // 🔄 Try GraphHopper first
  try {
    console.log("🔄 Using GraphHopper...");

    const url = `https://graphhopper.com/api/1/route?point=${originStr}&point=${destStr}&vehicle=car&locale=en&type=json&key=${GH_KEY}`;

    const ghResponse = await axios.get(url);

    const distance = ghResponse.data.paths?.[0]?.distance;
    if (!distance) throw new Error("GraphHopper response missing distance.");

    return distance / 1000;
  } catch (ghError) {
    console.warn(
      "⚠️ GraphHopper failed:",
      (ghError as any)?.response?.data || ghError
    );
  }

  // 🔄 Fallback to OpenRouteService
  try {
    console.log("🔄 Falling back to OpenRouteService...");

    const orsResponse = await axios.post(
      "https://api.openrouteservice.org/v2/matrix/driving-car",
      { locations: [origin.reverse(), dest.reverse()] }, // ORS expects [lon, lat]
      {
        headers: {
          Authorization: ORS_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const distance = orsResponse.data.distances?.[0]?.[1];
    if (!distance) throw new Error("ORS response missing distance.");

    return distance / 1000;
  } catch (orsError) {
    console.error(
      "❌ ORS also failed:",
      (orsError as any)?.response?.data || orsError
    );
    throw new Error(
      "Both GraphHopper and OpenRouteService failed to return distance."
    );
  }
}
