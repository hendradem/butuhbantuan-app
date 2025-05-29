"use client";
import React, { useEffect, useState } from "react";
import Maps from "./components/maps/Maps-v2";
import { useAvailableCityApi } from "@/app/store/api/availablecity.api";
import { getCurrentLocation } from "./utils/getCurrentLocation";
import { getAddressInfo } from "./store/api/services/location.service";
import GettingService from "./components/onboarding/GettingService";

export default function Home() {
  const [currentUserRegency, setCurrentUserRegency] = useState("");
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { currentCityData, isServiceIsAvailable, refetchAvailableCity } =
    useAvailableCityApi(currentUserRegency);

  useEffect(() => {
    setIsLoading(true);
    getCurrentLocation((location: { lat: number; lng: number }) => {
      getAddressInfo(location.lng, location.lat).then((res) => {
        const regency = res[3]?.text;
        setCurrentUserRegency(regency);
      });
    });
  }, []);

  useEffect(() => {
    refetchAvailableCity();

    if (currentCityData && isServiceIsAvailable) {
      setIsAvailable(true);
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    } else {
      setTimeout(() => {
        setIsLoading(false);
      }, 5000);
    }
  }, [currentUserRegency]);

  return (
    <main className="w-full flex flex-col justify-between h-screen relative bg-white">
      <div className="w-full h-100vh bottom-0">
        {isAvailable ? (
          <Maps mapHeight="100vh" />
        ) : (
          <div className="w-full h-screen px-10 text-center bg-white flex items-center justify-center">
            <div>
              <GettingService
                currentUserRegency={currentUserRegency}
                isServiceIsAvailable={isAvailable}
                isLoading={isLoading}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
