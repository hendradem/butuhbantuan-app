import axios from "axios";
import config from "@/config";

const APIURL = `${config.BACKEND_HOST}/service/available-region`;

const axiosConfig = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
  },
};

export const availableCityService = {
  getAll: async () => {
    const res = await axios.get(APIURL, axiosConfig);
    return res.data;
  },
  getByName: async (regionName: string) => {
    const res = await axios.get(`${APIURL}/${regionName}`, axiosConfig);
    return res.data;
  },
};
