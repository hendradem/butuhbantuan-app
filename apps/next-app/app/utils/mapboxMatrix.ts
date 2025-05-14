import config from "../config";
import { fetcher } from "../libs/fetcher";
import axios from "axios";

export interface Location {
  id: string;
  name: string;
  coordinates: [number, number];
  address?: string;
}

const DIRECTIONS_URL_API = `${config.BACKEND_HOST}/directions`;
const MATRIX_URL_API = `${config.BACKEND_HOST}/directions/matrix`;

export const getDirectionsRoute = async (
  origin: [number, number],
  destination: [number, number]
) => {
  const response = await axios.get(
    `${DIRECTIONS_URL_API}?origin=${origin[0]},${origin[1]}&destination=${destination[0]},${destination[1]}`
  );

  return response?.data?.data;
};

export const getDistanceMatrix = async (
  origin: [number, number],
  destinations: any[]
): Promise<any> => {
  const coordinates = [origin, ...destinations.map((dest) => dest.coordinates)]
    .map((coord) => coord.join(","))
    .join(";");

  try {
    const response = await axios.get(
      `${MATRIX_URL_API}?coordinates=${coordinates}`
    );
    const matrixResponse = response.data.data;

    // First row contains durations from origin to all destinations
    const durations = matrixResponse.durations[0].slice(1); // Skip first element (distance to self)
    const distances = matrixResponse.distances[0].slice(1);

    destinations.forEach((location, index) => {
      location.responseTime = {
        duration: formatTheTime(durations[index]),
        distance: formatDistance(distances[index]),
      };
    });

    // Sort destinations by duration
    return destinations
      .filter(
        ({ responseTime }) => Math.floor(parseInt(responseTime.duration)) <= 30
      )
      .sort((a, b) => a.responseTime.duration - b.responseTime.duration)
      .map((location, index) => ({
        ...location,
      }));
  } catch (error) {
    console.error("Error fetching distance matrix:", error);
    throw error;
  }
};

const formatDistance = (distance: number) => {
  const fixed = Math.floor(distance / 1000);
  return parseFloat(fixed.toFixed(2));
};

const formatTheTime = (time: number) => {
  const fixed = Math.floor(time / 60);
  return parseFloat(fixed.toFixed(2));
};
