import axios from "axios";
import config from "@/app/config";

const BASE_URL = `${config.BACKEND_HOST}/master/available-city-service`;

const axiosConfig = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
  },
};

export const availableCityService = {
  getAll: async () => {
    const res = await axios.get(BASE_URL, axiosConfig);
    return res.data;
  },
};
