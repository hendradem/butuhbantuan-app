"use client";
import React, { useState, useMemo, useEffect } from "react";
import { debounce } from "@/utils/debounce";
import useUserLocationData from "@/store/useUserLocationData";
import { useAddressLocation } from "@/store/api/location.api";
import useSearchData from "@/store/useSearchData";
import useSearchSheet from "@/store/useSearchSeet";
import Icon from "@/components/ui/Icon";

interface SearchBoxProps {
  onFocus?: () => void;
  onAddressSelect?: (address: any) => void;
  placeholder?: string;
  className?: string;
  showLocationButton?: boolean;
}

const SearchBox = ({
  onFocus,
  placeholder = "Search places, addresses...",
  className = "",
  showLocationButton = true,
}: SearchBoxProps) => {
  const {
    searchQuery,
    setSearchQuery,
    setSearchResults,
    setIsLoading,
    setIsActive,
  } = useSearchData();
  const { fullAddress, updateIsGetCurrentLocation } = useUserLocationData();
  const { onClose } = useSearchSheet();
  const [currentUserAddress, setCurrentUserAddress] = useState<string>("");

  const {
    data: searchAddressResult,
    refetch: refetchSearchAddress,
    isLoading: searchAddressLoading,
  } = useAddressLocation(searchQuery);

  const handleSearchInputChange = (e: any): void => {
    onFocus && onFocus();
    setCurrentUserAddress(e.target.value);
    debouncedResult(e);
    if (e.target.value) {
      setIsLoading(true);
      setIsActive(true);
    }
  };

  const debouncedResult = useMemo(() => {
    return debounce((e: any) => searchUserLocation(e), 1000);
  }, []);

  const searchUserLocation = (e: any) => {
    setSearchQuery(e.target.value);
  };

  const handleRemoveSearchValue = (e: any): void => {
    e.preventDefault();
    setCurrentUserAddress("");
    setSearchResults([]);
    setIsLoading(false);
  };

  const handleGetCurrentLocation = (e: any): void => {
    e.preventDefault();
    updateIsGetCurrentLocation(true);
    onClose(); // close search sheet
  };

  useEffect(() => {
    if (searchQuery) refetchSearchAddress();
  }, [searchQuery]);

  useEffect(() => {
    if (!searchAddressLoading) {
      let temp: any = [];
      searchAddressResult?.features?.map((item: any) => {
        const district = item.properties?.district
          ? item.properties?.district
          : item.properties?.city;

        const city = item.properties?.state ? item.properties?.state : "";

        const formattedArea = `${district}, ${city}`;

        const data = {
          name: item?.properties?.name
            ? item?.properties?.name
            : "name not found",
          address: item?.properties?.formatted,
          lat: item?.properties?.lat,
          long: item?.properties?.lon,
          district: item?.properties?.district,
          place_name: item?.properties?.name,
          urban_village: item?.properties?.suburb,
          county: item?.properties?.county,
          formatted_city: formattedArea,
        };
        temp.push(data);
      });

      setSearchResults(temp);
      setIsLoading(false);
    }
  }, [searchAddressResult]);

  useEffect(() => {
    if (currentUserAddress === "") {
      setSearchResults([]);
      setIsLoading(false);
    }
  }, [currentUserAddress]);

  useEffect(() => {
    setCurrentUserAddress(fullAddress);
  }, [fullAddress, setCurrentUserAddress]);

  useEffect(() => {
    setCurrentUserAddress(fullAddress);
  }, []);

  return (
    <div className={`search-box relative w-full ${className}`}>
      <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
        <Icon name="ph:magnifying-glass" className="text-xl text-gray-400" />
      </div>
      <input
        type="text"
        value={currentUserAddress}
        onChange={handleSearchInputChange}
        className={`bg-gray-100 border-0 text-gray-900 text-sm 
                    rounded-xl focus:ring-none focus:border-0
                    focus:outline-none block w-full px-10 pr-[80px] py-3
                    placeholder-gray-400`}
        placeholder={placeholder}
      />
      <div className="absolute inset-y-0 end-0 flex items-center mr-2">
        {currentUserAddress && (
          <button
            onClick={handleRemoveSearchValue}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200"
          >
            <Icon name="material-symbols:close" className="text-gray-600" />
          </button>
        )}
        {showLocationButton && (
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-200"
          >
            <Icon
              name="line-md:my-location-loop"
              className="text-neutral-500 text-xl"
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBox;
