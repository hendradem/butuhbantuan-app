import axios from "axios";
import config from "@/app/config";

const BASE_URL = `${config.BACKEND_HOST}/emergency/type`;

const axiosConfig = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
  },
};

export const emergencyTypeService = {
  getAll: async () => {
    const res = await axios.get(BASE_URL, axiosConfig);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await axios.get(`${BASE_URL}/${id}`, axiosConfig);
    return res.data;
  },
  create: async (data: any) => {
    const res = await axios.post(BASE_URL, data, axiosConfig);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await axios.put(`${BASE_URL}/${id}`, data, axiosConfig);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await axios.delete(`${BASE_URL}/${id}`, axiosConfig);
    return res.data;
  },
};
