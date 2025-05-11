import useSwr from "swr";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import config from "@/app/config";

export const getEmergencyType = async (): Promise<any> => {
  const response = await axios.get(`${config.BACKEND_HOST}/emergency/type`, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Credentials": "true",
    },
  });

  return response?.data;
};

export const useEmergencyType = () => {
  return useQuery(["emergencyType"], () => getEmergencyType() as Promise<any>, {
    enabled: true,
  });
};
