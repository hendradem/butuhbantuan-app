import axios from "axios";
import config from "@/app/config";

interface Coordinates {
  long: number;
  lat: number;
}

const useCalculateDistance = async (from: Coordinates, to: Coordinates) => {
  const data = await axios.get(
    `${config.MAPBOX_URL}/directions/v5/mapbox/driving/${from.long},${from.lat};${to.long},${to.lat}?geometries=geojson&access_token=${config.MAPBOX_API_KEY}`
  );

  //   calculate the distance and convert into kilometers
  const distance =
    parseInt(data.data.routes[0].distance.toString().substring(0, 4)) / 1000;

  // get the duration data and convert into minutes
  const duration = Math.floor(data.data.routes[0].duration / 60) % 60;

  return { distance, duration };
};

export default useCalculateDistance;
