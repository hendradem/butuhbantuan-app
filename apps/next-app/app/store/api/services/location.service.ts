import config from "@/app/config";
import axios from "axios";

const GEOCODING_URL_API = `${config.BACKEND_HOST}/directions/geocoding`;
const GEOLOCATION_BASE_URL = `${config.BACKEND_HOST}/directions/geolocation`;

export const getAddressLocation = async (
  locationQuery: string
): Promise<any> => {
  if (!locationQuery) {
    return;
  }

  const response = await axios.get(
    `${GEOLOCATION_BASE_URL}?searchQuery=${locationQuery}`
  );

  const geoapifySearchResponse = response?.data?.data;
  return geoapifySearchResponse;
};

export const getAddressInfo = async (
  longitude: number | string,
  latitude: number | string
): Promise<any> => {
  if (!longitude || !latitude) {
    return;
  }

  const response = await axios.get(
    `${GEOCODING_URL_API}?longitude=${longitude}&latitude=${latitude}`
  );

  const geocodingResponse = response.data.data;
  return geocodingResponse?.features;
};
