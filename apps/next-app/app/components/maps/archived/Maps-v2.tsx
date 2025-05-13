"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import config from "@/app/config";
import toast from "react-hot-toast";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import { getCurrentLocation } from "@/app/utils/getCurrentLocation";
import {
  getAddressInfo,
  useAddressInformation,
} from "@/app/store/api/location.api";
import useMapBox from "@/app/store/useMapBox";
import useUserLocationData from "@/app/store/useUserLocationData";
import MainBottomMenu from "../bottomsheet/MainBottomSheet";
import {
  getDistanceMatrix,
  getDirectionsRoute,
} from "@/app/utils/mapboxMatrix";
import useEmergencyData from "@/app/store/useEmergencyData";
import services from "@/app/store/data/services.json";
import { useEmergencyApi } from "@/app/store/api/emergency.api";

type MapsProps = {
  mapHeight: string;
  updateLatestLocation?: () => void;
};

const MapsV2: React.FC<MapsProps> = ({ mapHeight }) => {
  let mapContainer: any;
  const mapWrapper = useRef<any>();
  const { emergencyData, refetchEmergencyData } = useEmergencyApi();

  // const emergencyData = useEmergencyData((state) => state.emergencyData);

  if (emergencyData) {
    console.log(emergencyData);
  }

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
  const [currentRegency, setCurrentRegency] = useState<any>("");

  const [selectedEmergencyCoordinates, setSelectedEmergencyCoordinates] =
    useState<[number, number]>([0, 0]);

  const [locations, setLocations] = useState(emergencyData?.data);
  const [filteredLocations, setFilteredLocations] = useState<[]>([]);

  // const [convertedLocations, setConvertedLocations] = useState<any>([])

  // global state
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

  const mapTheMarker = (): void => {
    if (filteredLocations.length > 0) {
      // Clear existing markers if needed
      document
        .querySelectorAll(".ambulance-marker")
        .forEach((marker) => marker.remove());

      filteredLocations.map((marker: any, markerIndex: number) => {
        const el = document.createElement("div");
        el.className = "ambulance-marker";

        // label
        const label = document.createElement("div");
        label.className = "marker-label";
        label.style.position = "absolute";
        label.style.background = "white";
        label.style.width = "100px";
        label.style.padding = "5px";
        label.style.borderRadius = "8px";
        label.style.fontSize = "11px";
        label.style.marginTop = "-15px";
        label.style.marginLeft = "30px";
        label.style.boxShadow = "0 1px 2px 0 rgb(0 0 0 / 0.05)";
        label.style.display = "none";
        el.appendChild(label);

        const popupContent = `
                    <div class="rounded-lg p-3 bg-white shadow-sm text-neutral-900 emergency-popup">
                        <div class="flex items-center space-x-2">
                            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M10 2a6 6 0 00-6 6c0 4.418 6 10 6 10s6-5.582 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" clip-rule="evenodd" />
                            </svg>
                            <h3 class="font-semibold">MSW Warehouse</h3>
                        </div>
                        <p class="text-sm">741 Nicolette Freeway, Utah</p>
                        <p class="text-xs mt-1">15:32 · GMT +7</p>
                    </div>
                    `;
        // Add markers to the map.
        new mapboxgl.Marker(el)
          .setLngLat([marker.coordinates[0], marker.coordinates[1]])
          .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
          .addTo(mapContainer ? mapContainer : mapContainerState);

        el.addEventListener("click", async (e: any) => {
          e.stopPropagation();

          setSelectedEmergencyCoordinates([
            marker.coordinates[0],
            marker.coordinates[1],
          ]);

          // update global emergency state to trigger action in another component
          updateSelectedEmergencyData({
            selectedEmergencyData: marker,
            selectedEmergencyType: services[0],
            selectedEmergencySource: "map",
          });

          // get directions from marker location to user location
          const directions = await getDirectionsRoute(
            [marker.coordinates[0], marker.coordinates[1]], // origin coordinate (emergency location)
            [
              longitudeState ? longitudeState : userLongitudeAfterGeolocated,
              latitudeState ? latitudeState : userLatitudeAfterGeolocated,
            ] // user location coordinate
          );

          updateDirectionRoute(directions);

          zoomMapIntoSpecificArea(
            [marker.coordinates[0], marker.coordinates[1]],
            [longitudeState, latitudeState]
          );
        });
      });
    } else {
      document
        .querySelectorAll(".ambulance-marker")
        .forEach((marker) => marker.remove());
    }
  };

  const updateMarkerInformation = (data: any) => {
    const currentAmbulanceMarkerLabel =
      document.querySelectorAll(".marker-label");

    if (data) {
      if (currentAmbulanceMarkerLabel.length > locations?.length) {
        currentAmbulanceMarkerLabel.forEach((el) => el.remove());
      } else {
        for (let i = 0; i < currentAmbulanceMarkerLabel.length; i++) {
          currentAmbulanceMarkerLabel[i].innerHTML =
            `<h3 className='text-orange-200'>${data[i]?.name}</h3><p> <p> ${data[i]?.duration} min</p>`;
        }
      }
    }
  };

  const drawCurrentMarkerLocation = (longitude: number, latitude: number) => {
    updateCoordinate(latitude, longitude);
    mapContainer = mapContainer ? mapContainer : mapContainerState;

    const userLocationMarker = document.getElementsByClassName("marker");
    const el = document.createElement("div");
    el.className = "marker";

    if (userLocationMarker.length > 0) {
      userLocationMarker[0].remove();
    }

    const popupContent = `
            <div class="p-3">
                <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-gray-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 2a6 6 0 00-6 6c0 4.418 6 10 6 10s6-5.582 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" clip-rule="evenodd" />
                    </svg>
                    <h3 class="text-white font-semibold">MSW Warehouse</h3>
                </div>
                <p class="text-gray-300 text-sm">741 Nicolette Freeway, Utah</p>
                <p class="text-gray-400 text-xs mt-1">15:32 · GMT +7</p>
            </div>
    `;

    let current = new mapboxgl.Marker(el)
      .setLngLat([longitude, latitude])
      .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent))
      .addTo(mapContainer);

    setCurrentMarker(current);
    getMatrixOfLocations(longitude, latitude);

    mapContainer.flyTo({
      center: [longitude, latitude],
      essential: true, // this animation is considered essential with respect to prefers-reduced-motion
    });
  };

  const getMatrixOfLocations = (longitude: number, latitude: number) => {
    getDistanceMatrix([longitude ?? 0, latitude ?? 0], locations).then(
      (res) => {
        const transformedLocations = res.map((location: any) => {
          return {
            id: location?.id,
            name: location?.name,
            coordinates: location?.coordinates,
            distance: location.responseTime.distance,
            duration: location.responseTime.duration,
          };
        });

        updateMarkerInformation(transformedLocations);
        updateEmergencyData(res); // update global emergency state
        setFilteredLocations(res); // update emergency state
      }
    );
  };

  const drawDirectionLine = (route: any): void => {
    if (mapContainerState.getLayer("route")) {
      mapContainerState.removeLayer("route"); // Remove the line layer
    }
    if (mapContainerState.getSource("route")) {
      mapContainerState.removeSource("route"); // Remove the data source
    }

    const geojson = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: route,
      },
    };

    mapContainerState.addLayer({
      id: "route",
      type: "line",
      source: {
        type: "geojson",
        data: geojson,
      },
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#3b82f6",
        "line-width": 5,
        "circle-radius": 10,
        "circle-color": "#f30",
      },
    });
  };

  const removeExistingDirectionLine = () => {
    let map = mapContainer ? mapContainer : mapContainerState;
    const routeSource = map.getSource("route");

    if (routeSource) {
      routeSource.setData({
        type: "FeatureCollection",
        features: [],
      });
    }
  };

  const zoomMapIntoSpecificArea = (
    origin: [number, number],
    destination: [number, number]
  ) => {
    mapContainerState.fitBounds(
      [
        [origin[0], origin[1]],
        [destination[0], destination[1]],
      ],
      {
        padding: { top: 50, bottom: 400, left: 50, right: 50 },
        maxZoom: 13, // Prevents excessive zoom
        duration: 1000, // Smooth animation (1s)
      }
    );
  };

  const buildTheMap = (
    buildMapType?: string,
    coordinates?: { lat: number; long: number }
  ) => {
    mapContainer = new mapboxgl.Map({
      container: mapWrapper.current,
      style: "mapbox://styles/mapbox/streets-v10",
      center: coordinates
        ? [coordinates.long, coordinates.lat]
        : [110.3450278, -7.7063721],
      zoom: 12,
      accessToken: config.MAPBOX_API_KEY,
    });

    setMapContainerState(mapContainer); // set mapContainer state to gobal state

    mapContainer.on("load", () => {
      if (buildMapType === "rebuild") {
        console.log("rebuild");
        drawCurrentMarkerLocation(
          coordinates?.long ?? 0,
          coordinates?.lat ?? 0
        );
        refetchAddressInfo();
        setIsGeolocating(false);

        getMatrixOfLocations(coordinates?.long ?? 0, coordinates?.lat ?? 0);
      } else {
        console.log("init");
        setIsGeolocating(true);

        getCurrentLocation((location: any) => {
          const userLatitude = location?.lat;
          const userLongitude = location?.lng;

          if (userLatitude && userLongitude) {
            setIsGeolocating(false);
            refetchAddressInfo();
            setUserLatitudeAfterGeolocated(userLatitude);
            setUserLongitudeAfterGeolocated(userLongitude);
            drawCurrentMarkerLocation(userLongitude, userLatitude);
            getMatrixOfLocations(userLongitude, userLatitude);
          }
        });
      }
    });

    mapContainer.on("click", (e: any) => {
      const { lng, lat } = e.lngLat;
      drawCurrentMarkerLocation(lng, lat);

      // get address info to update address and filter emergency data
      getAddressInfo(lng, lat).then((res) => {
        const regency = res[3]?.text;
        const address = res[0]?.place_name;
        setCurrentRegency(regency);
        updateFullAddress(address);
      });

      // remove existing route layer
      removeExistingDirectionLine();

      // get directions from marker location to user location
      const directions = getDirectionsRoute(
        [selectedEmergencyCoordinates[0], selectedEmergencyCoordinates[1]], // origin coordinate (emergency location)
        [longitudeState, latitudeState] // user location coordinate
      );

      updateDirectionRoute(directions);
      refetchAddressInfo();
    });
  };

  useEffect(() => {
    if (addressInfo) {
      const regency = addressInfo[3]?.text;
      const address = addressInfo[0]?.place_name;
      setCurrentRegency(regency);
      updateFullAddress(address);
    }
  }, [addressInfo]);

  useEffect(() => {
    mapTheMarker();
  }, [filteredLocations]);

  useEffect(() => {
    buildTheMap();
  }, []);

  useEffect(() => {
    if (mapContainerState && longitudeState && latitudeState) {
      removeExistingDirectionLine();
      drawCurrentMarkerLocation(longitudeState, latitudeState);
    }
  }, [isRefetchMatrix]);

  useEffect(() => {
    refetchAddressInfo();
  }, [userLatitudeAfterGeolocated, userLongitudeAfterGeolocated]);

  useEffect(() => {
    if (directionRoute.length > 0) {
      drawDirectionLine(directionRoute);
    }
  }, [directionRoute]);

  // useEffect(() => {
  //   if (
  //     selectedEmergencyDataState &&
  //     selectedEmergencyDataState.selectedEmergencySource == "detail"
  //   ) {
  //     zoomMapIntoSpecificArea(
  //       [
  //         selectedEmergencyDataState?.selectedEmergencyData.coordinates[0],
  //         selectedEmergencyDataState?.selectedEmergencyData.coordinates[1],
  //       ],
  //       [longitudeState, latitudeState]
  //     );
  //   }
  // }, [selectedEmergencyDataState]);

  useEffect(() => {
    if (isGeolocating) {
      toast.loading("Getting your location", {
        style: {
          borderRadius: "20px",
          background: "#333",
          color: "#fff",
        },
      });
    }

    if (
      !isGeolocating &&
      userLatitudeAfterGeolocated &&
      userLongitudeAfterGeolocated
    ) {
      toast.dismiss();
      toast.success("Your location found!", {
        style: {
          borderRadius: "20px",
          background: "#333",
          color: "#fff",
        },
        duration: 500,
      });
    }
  }, [isGeolocating]);

  return (
    <>
      <div
        className="w-full"
        style={{ height: "100vh" }}
        ref={(el) => (mapWrapper.current = el)}
      ></div>
      <div>
        <MainBottomMenu rebuildMap={buildTheMap} />
      </div>
    </>
  );
};

export default MapsV2;
