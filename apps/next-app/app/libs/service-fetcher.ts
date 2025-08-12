import axios, { AxiosRequestConfig, Method } from "axios";
import config from "../config";

const api = axios.create({
  baseURL: config.BACKEND_HOST,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Unified fetcher
type RequestOptions = {
  method?: Method; // "GET", "POST", etc.
  data?: any; // Payload for POST/PUT
  params?: Record<string, any>; // Query params
  headers?: Record<string, string>; // Optional custom headers
};

export const request = async <T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> => {
  const { method = "GET", data, params, headers } = options;

  const config: AxiosRequestConfig = {
    url,
    method,
    data,
    params,
    headers,
  };

  const response = await api.request<T>(config);
  return response.data;
};

export const fetcher = axios.create({
  baseURL: config.BACKEND_HOST,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Credentials": "true",
  },
  withCredentials: false, // true kalau kamu kirim cookie/auth
});
