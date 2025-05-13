"use client";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import { getCurrentLocation } from "@/app/utils/getCurrentLocation";
import {
  getAddressInfo,
  useAddressInformation,
} from "@/app/store/api/location.api";
import useMapBox from "@/app/store/useMapBox";
import useUserLocationData from "@/app/store/useUserLocationData";
import MainBottomMenu from "../bottomsheet/MainBottomSheet";
import { getDirectionsRoute } from "@/app/utils/mapboxMatrix";
import useEmergencyData from "@/app/store/useEmergencyData";
import services from "@/app/store/data/services.json";
import {
  drawCurrentMarkerLocation,
  removeExistingDirectionLine,
  zoomMapIntoSpecificArea,
  getMatrixOfLocations,
} from "@/app/utils/mapHelpers";
import { mapTheMarker, updateMarkerInformation } from "@/app/utils/markerUtils";
import { buildPopupContent } from "@/app/utils/popupUtils";

type MapsProps = {
  mapHeight: string;
  updateLatestLocation?: () => void;
};

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
  const mapWrapper = useRef<any>();
  const emergencyData = useEmergencyData((state) => state.emergencyData);
  const updateEmergencyData = useEmergencyData(
    (action) => action.updateEmergencyData
  );
  const updateSelectedEmergencyData = useEmergencyData(
    (action) => action.updateSelectedEmergencyData
  );
  const selectedEmergencyDataState = useEmergencyData(
    (state) => state.selectedEmergencyData
  );

  const directionRoute = useMapBox((state) => state.directionRoute);
  const updateDirectionRoute = useMapBox(
    (action) => action.updateDirectionRoute
  );

  const [mapContainerState, setMapContainerState] = useState<any>(null);
  const [userLatitudeAfterGeolocated, setUserLatitudeAfterGeolocated] =
    useState<number>(0);
  const [userLongitudeAfterGeolocated, setUserLongitudeAfterGeolocated] =
    useState<number>(0);
  const isRefetchMatrix = useUserLocationData((state) => state.isRefetchMatrix);
  const longitudeState = useUserLocationData((state) => state.long);
  const latitudeState = useUserLocationData((state) => state.lat);
  const [isGeolocating, setIsGeolocating] = useState<boolean>(false);
  const [currentMarker, setCurrentMarker] = useState<any>(null);
  const [selectedEmergencyCoordinates, setSelectedEmergencyCoordinates] =
    useState<[number, number]>([0, 0]);
  const [filteredLocations, setFilteredLocations] = useState<[]>([]);

  const updateCoordinate = useUserLocationData(
    (state) => state.updateCoordinate
  );
  const updateFullAddress = useUserLocationData(
    (state) => state.updateFullAddress
  );

  const { data: addressInfo, refetch: refetchAddressInfo } =
    useAddressInformation(
      userLongitudeAfterGeolocated ? userLongitudeAfterGeolocated : 0,
      userLatitudeAfterGeolocated ? userLatitudeAfterGeolocated : 0
    );

  const handleMarkerClick = async (marker: any) => {
    setSelectedEmergencyCoordinates([
      marker.coordinates[0],
      marker.coordinates[1],
    ]);
    updateSelectedEmergencyData({
      selectedEmergencyData: marker,
      selectedEmergencyType: services[0],
      selectedEmergencySource: "map",
    });

    const directions = await getDirectionsRoute(
      [marker.coordinates[0], marker.coordinates[1]],
      [
        longitudeState || userLongitudeAfterGeolocated,
        latitudeState || userLatitudeAfterGeolocated,
      ]
    );
    updateDirectionRoute(directions);

    zoomMapIntoSpecificArea(
      [marker.coordinates[0], marker.coordinates[1]],
      [longitudeState, latitudeState]
    );
  };

  const buildTheMap = (
    buildMapType?: string,
    coordinates?: { lat: number; long: number }
  ) => {
    const mapContainer = new mapboxgl.Map({
      container: mapWrapper.current,
      style: "mapbox://styles/mapbox/streets-v10",
      center: coordinates
        ? [coordinates.long, coordinates.lat]
        : [110.3450278, -7.7063721],
      zoom: 12,
      accessToken: config.MAPBOX_API_KEY,
    });

    setMapContainerState(mapContainer);

    mapContainer.on("load", () => {
      if (buildMapType === "rebuild") {
        drawCurrentMarkerLocation(
          mapContainer,
          coordinates?.long ?? 0,
          coordinates?.lat ?? 0,
          updateCoordinate,
          setIsGeolocating,
          refetchAddressInfo,
          getMatrixOfLocations,
          updateEmergencyData,
          setFilteredLocations
        );
      } else {
        getCurrentLocation((location: any) => {
          const { lat, lng } = location;
          if (lat && lng) {
            setUserLatitudeAfterGeolocated(lat);
            setUserLongitudeAfterGeolocated(lng);
            drawCurrentMarkerLocation(
              mapContainer,
              lng,
              lat,
              updateCoordinate,
              setIsGeolocating,
              refetchAddressInfo,
              getMatrixOfLocations,
              updateEmergencyData,
              setFilteredLocations
            );
          }
        });
      }
    });

    mapContainer.on("click", (e: any) => {
      const { lng, lat } = e.lngLat;
      drawCurrentMarkerLocation(
        mapContainer,
        lng,
        lat,
        updateCoordinate,
        setIsGeolocating,
        refetchAddressInfo,
        getMatrixOfLocations,
        updateEmergencyData,
        setFilteredLocations
      );
      getAddressInfo(lng, lat).then((res) => {
        const regency = res[3]?.text;
        const address = res[0]?.place_name;
        updateFullAddress(address);
      });

      removeExistingDirectionLine(mapContainer);
      getDirectionsRoute(
        [selectedEmergencyCoordinates[0], selectedEmergencyCoordinates[1]],
        [longitudeState, latitudeState]
      );
    });
  };

  useEffect(() => {
    if (addressInfo) {
      updateFullAddress(addressInfo[0]?.place_name);
    }
  }, [addressInfo]);

  useEffect(() => {
    mapTheMarker(filteredLocations, mapContainerState, handleMarkerClick);
  }, [filteredLocations]);

  useEffect(() => {
    buildTheMap();
  }, []);

  useEffect(() => {
    if (mapContainerState && longitudeState && latitudeState) {
      removeExistingDirectionLine(mapContainerState);
      drawCurrentMarkerLocation(
        mapContainerState,
        longitudeState,
        latitudeState,
        updateCoordinate,
        setIsGeolocating,
        refetchAddressInfo,
        getMatrixOfLocations,
        updateEmergencyData,
        setFilteredLocations
      );
    }
  }, [isRefetchMatrix]);

  useEffect(() => {
    refetchAddressInfo();
  }, [userLatitudeAfterGeolocated, userLongitudeAfterGeolocated]);

  useEffect(() => {
    if (directionRoute.length > 0) {
      drawDirectionLine(directionRoute, mapContainerState);
    }
  }, [directionRoute]);

  useEffect(() => {
    if (
      selectedEmergencyDataState &&
      selectedEmergencyDataState.selectedEmergencySource === "detail"
    ) {
      zoomMapIntoSpecificArea(
        [
          selectedEmergencyDataState?.selectedEmergencyData.coordinates[0],
          selectedEmergencyDataState?.selectedEmergencyData.coordinates[1],
        ],
        [longitudeState, latitudeState]
      );
    }
  }, [selectedEmergencyDataState]);

  useEffect(() => {
    if (isGeolocating) {
      toast.loading("Getting your location", {
        style: { borderRadius: "20px", background: "#333", color: "#fff" },
      });
    }

    if (
      !isGeolocating &&
      userLatitudeAfterGeolocated &&
      userLongitudeAfterGeolocated
    ) {
      toast.dismiss();
      toast.success("Your location found!", {
        style: { borderRadius: "20px", background: "#333", color: "#fff" },
        duration: 500,
      });
    }
  }, [isGeolocating]);

  return (
    <>
      <div
        className="w-full"
        style={{ height: "100vh" }}
        ref={mapWrapper}
      ></div>
      <div>
        <MainBottomMenu rebuildMap={buildTheMap} />
      </div>
    </>
  );
};

export default MapsV2;
