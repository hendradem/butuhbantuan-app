import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { services } from "@/constants/services";
import { getDirectionsRoute } from "@/lib/direction/getDirectionsRoute";
import { EmergencyMapProps } from "@/types/maps";
import { zoomMapIntoSpecificArea } from "@/lib/maps/zoomMap";
import { drawCurrentLocationMarker } from "@/lib/maps/markers/current-location-marker";
import { useDirectionStore } from "@/store/useDirectionStore";
import { useMapsStore } from "@/store/useMapsStore";
import { useLocationStore } from "@/store/useLocationStore";
import { useEmergencyStore } from "@/store/useEmergencyStore";

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!;

export const MapsV2 = ({ emergencies }: EmergencyMapProps) => {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { directionRoute, updateDirectionRoute } = useDirectionStore();
  const { setMapContainer } = useMapsStore();
  const { longitudeState, latitudeState } = useLocationStore();
  const {
    selectedEmergencyCoordinates,
    filteredLocations,
    updateSelectedEmergencyData,
    setSelectedEmergencyCoordinates,
  } = useEmergencyStore();

  const userLocation = [longitudeState || 0, latitudeState || 0];

  const initializeMap = () => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: userLocation,
      zoom: 13,
    });

    setMapContainer(mapRef.current);

    mapRef.current.on("load", () => {
      drawCurrentLocationMarker(mapRef.current!, userLocation);
      renderEmergencyMarkers();
    });
  };

  const createMarkerElement = () => {
    const el = document.createElement("div");
    el.className = "ambulance-marker";

    const label = document.createElement("div");
    label.className = "marker-label";
    Object.assign(label.style, {
      position: "absolute",
      background: "white",
      width: "100px",
      padding: "5px",
      borderRadius: "8px",
      fontSize: "11px",
      marginTop: "-15px",
      marginLeft: "30px",
      boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      display: "none",
    });

    el.appendChild(label);
    return el;
  };

  const getEmergencyPopupHTML = (
    name: string,
    address: string,
    time: string
  ) => {
    return `
      <div class="rounded-lg p-3 bg-white shadow-sm text-neutral-900 emergency-popup">
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 2a6 6 0 00-6 6c0 4.418 6 10 6 10s6-5.582 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" clip-rule="evenodd" />
          </svg>
          <h3 class="font-semibold">${name}</h3>
        </div>
        <p class="text-sm">${address}</p>
        <p class="text-xs mt-1">${time}</p>
      </div>
    `;
  };

  const handleMarkerClick = async (marker: any) => {
    setSelectedEmergencyCoordinates(marker.coordinates);

    updateSelectedEmergencyData({
      selectedEmergencyData: marker,
      selectedEmergencyType: services[0],
      selectedEmergencySource: "map",
    });

    const directions = await getDirectionsRoute(
      marker.coordinates,
      userLocation
    );

    updateDirectionRoute(directions);

    zoomMapIntoSpecificArea(marker.coordinates, userLocation);
  };

  const renderEmergencyMarkers = () => {
    if (!mapRef.current) return;

    document.querySelectorAll(".ambulance-marker").forEach((el) => el.remove());

    filteredLocations.forEach((marker) => {
      const el = createMarkerElement();
      const popupHTML = getEmergencyPopupHTML(
        marker.name || "Emergency",
        marker.address || "Unknown address",
        marker.time || "Unknown time"
      );

      new mapboxgl.Marker(el)
        .setLngLat(marker.coordinates)
        .setPopup(new mapboxgl.Popup({ offset: 25 }).setHTML(popupHTML))
        .addTo(mapRef.current!);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        handleMarkerClick(marker);
      });
    });
  };

  useEffect(() => {
    initializeMap();
  }, []);

  useEffect(() => {
    if (mapRef.current && directionRoute) {
      mapRef.current.on("load", () => {
        mapRef.current!.addSource("route", {
          type: "geojson",
          data: directionRoute,
        });

        mapRef.current!.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#3b82f6",
            "line-width": 4,
          },
        });
      });
    }
  }, [directionRoute]);

  useEffect(() => {
    renderEmergencyMarkers();
  }, [filteredLocations]);

  return <div ref={containerRef} className="w-full h-full rounded-xl" />;
};

// utisl
// utils/map/markerUtils.ts
import mapboxgl from "mapbox-gl";

export const removeExistingMarkers = (className: string) => {
  document
    .querySelectorAll(`.${className}`)
    .forEach((marker) => marker.remove());
};

export const createMarkerElement = (className: string): HTMLDivElement => {
  const el = document.createElement("div");
  el.className = className;
  return el;
};

export const addMapboxMarker = (
  element: HTMLElement,
  coordinates: [number, number],
  popup: mapboxgl.Popup,
  map: mapboxgl.Map
): mapboxgl.Marker => {
  return new mapboxgl.Marker(element)
    .setLngLat(coordinates)
    .setPopup(popup)
    .addTo(map);
};

// utils/map/popupUtils.ts
export const createPopupHTML = (
  title: string,
  address: string,
  time: string
): string => {
  return `
    <div class="rounded-lg p-3 bg-white shadow-sm text-neutral-900 emergency-popup">
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 2a6 6 0 00-6 6c0 4.418 6 10 6 10s6-5.582 6-10a6 6 0 00-6-6zm0 8a2 2 0 110-4 2 2 0 010 4z" clip-rule="evenodd" />
        </svg>
        <h3 class="font-semibold">${title}</h3>
      </div>
      <p class="text-sm">${address}</p>
      <p class="text-xs mt-1">${time}</p>
    </div>
  `;
};

// utils/map/mapHelpers.ts
import mapboxgl from "mapbox-gl";

export const drawGeoJSONLine = (
  map: mapboxgl.Map,
  id: string,
  coordinates: [number, number][]
) => {
  if (map.getLayer(id)) map.removeLayer(id);
  if (map.getSource(id)) map.removeSource(id);

  const geojson = {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates,
    },
  };

  map.addLayer({
    id,
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
    },
  });
};

export const clearGeoJSONLayer = (map: mapboxgl.Map, id: string) => {
  if (map.getSource(id)) {
    map.getSource(id).setData({
      type: "FeatureCollection",
      features: [],
    });
  }
};
