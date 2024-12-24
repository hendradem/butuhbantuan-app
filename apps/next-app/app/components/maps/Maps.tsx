'use client'
import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import ReactMapGL, { Marker, GeolocateControl } from 'react-map-gl'
import { fetcher } from '@/app/libs/fetcher'
import useUserLocation from '@/app/hooks/useUserLocation'
import config from '@/app/config'
import Image from 'next/image'
import useUserLocationData from '@/app/store/useUserLocationData'

import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

import { HiMapPin } from 'react-icons/hi2'
import {
    FaAddressBook,
    FaApplePay,
    FaArrowLeft,
    FaLocationCrosshairs,
    FaLocationDot,
    FaMagnifyingGlass,
    FaXmark,
} from 'react-icons/fa6'
import { FaMapPin } from 'react-icons/fa'

const mapsData = [
    {
        id: 0,
        type: 'ambulance',
        name: 'Sleman Emergency Service',
        ambulanceType: 'emergency',
        hospitalType: null,
        subdistrict: 'Mlati',
        regency: 'Sleman',
        province: 'Yogyakarta',
        coordinates: {
            lat: -7.718614734065132,
            long: 110.35646491069991,
        },
        contact: {
            phone: '09210000',
            whatsapp: '6287800001111',
        },
        standby: 24,
    },
    {
        id: 1,
        type: 'ambulance',
        name: 'PMI Sleman',
        ambulanceType: 'emergency',
        hospitalType: null,
        subdistrict: 'Mlati',
        regency: 'Sleman',
        province: 'Yogyakarta',
        coordinates: {
            lat: -7.705786690926277,
            long: 110.34769304563838,
        },
        contact: {
            phone: '09210000',
            whatsapp: '6287800001111',
        },
        standby: 24,
    },
    {
        id: 3,
        type: 'hospital',
        name: 'RSUP Dr. Sardjito',
        ambulanceType: 'emergency',
        hospitalType: 'A',
        subdistrict: 'Mlati',
        regency: 'Sleman',
        province: 'Yogyakarta',
        coordinates: {
            lat: -7.76834241532119,
            long: 110.37372731398645,
        },
        contact: {
            phone: '09210000',
            whatsapp: '6287800001111',
        },
        standby: 24,
    },
]

type AllowedComponentType = 'home' | 'detail'

type MapsProps = {
    mapHeight: string
    mapComponentType: AllowedComponentType
}

const Maps: React.FC<MapsProps> = ({ mapHeight, mapComponentType }) => {
    const { setUserLocation } = useUserLocation()
    const updateRegionalData = useUserLocationData(
        (state) => state.updateRegionalData
    )
    const updateCoordinate = useUserLocationData(
        (state) => state.updateUserCoordinate
    )
    const [userLatitudeFromGeolocation, setUserLatitudeFromGeolocation] =
        useState()
    const [userLongitudeFromGeolocation, setUserLongitudeFromGeolocation] =
        useState()
    const geolocateControlRef = useRef(null)
    const [shouldFetch, setShouldFetch] = useState<boolean>(false)
    const { currentUserLocation } = useUserLocation()
    const [isSearchBoxActive, setIsSearchBoxActive] = useState<boolean>(false)
    const [currentUserAddress, setCurrentUserAddress] = useState(
        currentUserLocation?.address || ''
    )

    const [searchAddressValue, setSearchAddressValue] = useState('')

    // get coordinates state manager (if any updates)
    const latitudeState = useUserLocationData((state) => state.lat)
    const longitudeState = useUserLocationData((state) => state.long)

    const handleOnGeolocate = (e: any) => {
        e.preventDefault()
        geolocateControlRef?.current?.trigger()
        const userAddressFromLocalStorage = localStorage.getItem('address')
        setCurrentUserAddress(userAddressFromLocalStorage || 'Not found')
    }

    const handleGeolocate = (e: any) => {
        const { coords } = e
        setUserLatitudeFromGeolocation(coords.latitude)
        setUserLongitudeFromGeolocation(coords.longitude)
        setShouldFetch(true)
    }

    const handleSearchBoxOnFocus = (e: any): void => {
        e.preventDefault()
        setIsSearchBoxActive(true)
    }

    const handleRemoveSelectedAddress = (): void => {
        setIsSearchBoxActive(false)
        setCurrentUserAddress('')
    }

    const handleSearchInputChange = (e: any): void => {
        setCurrentUserAddress(e.target.value)
    }

    const handleMapOnClick = (): void => {
        setIsSearchBoxActive(false)
    }

    // to get address info based on user coordinates
    const { data, mutate } = useSWR(
        shouldFetch
            ? `${config.MAPBOX_URL}/geocoding/v5/mapbox.places/${userLongitudeFromGeolocation},${userLatitudeFromGeolocation}.json?access_token=${config.MAPBOX_API_KEY}`
            : null,
        fetcher,
        {}
    )

    // update state manager based on geolocation
    if (data) {
        const resLatitude = data?.features[0]?.center[1]
        const resLongitude = data?.features[0]?.center[0]
        const address = data?.features[0]?.place_name
        const urbanVillage = data?.features[0]?.context[0].text

        updateRegionalData({
            subdistrict: data?.features[0]?.context[2]?.text,
            regency: data?.features[0]?.context[3]?.text,
            province: data?.features[0]?.context[4]?.text,
        })
        updateCoordinate({
            long: data?.features[0]?.center[0],
            lat: data?.features[0]?.center[1],
        })

        setUserLocation(resLatitude, resLongitude, address, urbanVillage)
    }

    useEffect(() => {}, [])

    return (
        <div className="w-full">
            <form>
                <div className="px-2 mt-4 absolute w-full z-[3] items-center mx-auto">
                    <div
                        className={`${isSearchBoxActive ? 'rounded-xl rounded-b-none border border-gray-100' : 'rounded-full'} shadow-sm border border-gray-100 rounded-full relative gap-1 items-center bg-white  text-gray-900 text-sm focus:ring-none focus:border-1 focus:border-gray-100 focus:outline-none flex w-full p-0`}
                    >
                        {mapComponentType === 'home' && (
                            <button
                                type="button"
                                className="flex items-center justify-center w-12 h-9 ml-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                            >
                                <FaMagnifyingGlass className="text-gray-600 text-[17px]" />
                            </button>
                        )}

                        {mapComponentType === 'detail' && (
                            <Link href={'/'}>
                                <button
                                    type="button"
                                    className="flex items-center justify-center w-9 h-9 ml-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                                    onClick={(e) => {
                                        e.preventDefault()
                                    }}
                                >
                                    <FaArrowLeft className="text-gray-600 text-lg" />
                                </button>
                            </Link>
                        )}
                        <input
                            type="text"
                            value={currentUserAddress}
                            onChange={(e) => {
                                handleSearchInputChange(e)
                            }}
                            onFocus={(e) => {
                                handleSearchBoxOnFocus(e)
                            }}
                            className={` bg-white  text-gray-900 text-sm border-none focus:ring-none focus:border-none focus:outline-none block w-full p-3 px-0`}
                            placeholder="Cari lokasi terdekatmu.."
                        />

                        {isSearchBoxActive && currentUserAddress && (
                            <button
                                type="button"
                                onClick={() => {
                                    handleRemoveSelectedAddress()
                                }}
                                className="flex items-center justify-center w-12 h-9 me-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                            >
                                <FaXmark className="text-gray-600 text-[17px]" />
                            </button>
                        )}

                        {!isSearchBoxActive && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    handleOnGeolocate(e)
                                }}
                                className="flex items-center justify-center w-12 h-9 me-1.5 rounded-full cursor-pointer hover:bg-gray-100"
                            >
                                <FaLocationCrosshairs className="text-gray-600 text-[17px]" />
                            </button>
                        )}
                    </div>

                    {/* {isSearchBoxActive && (
                    )} */}
                    <div className="w-full bg-white shadow border border-gray-100 rounded-xl rounded-t-none p-2">
                        <div className="result">
                            <p className="text-sm my-1 font-medium">
                                Hasil Pencarian
                            </p>
                            <div className="w-full flex items-center gap-2 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer">
                                <FaLocationDot />
                                Masjid Pogung Raya, Sinduadi, Mlati
                            </div>
                            {[1, 2].map((item, index) => {
                                return (
                                    <div className="w-full flex items-center gap-2 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer">
                                        <FaMagnifyingGlass />
                                        Ambulance dekat Masjid Pogung Raya
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </form>
            <ReactMapGL
                onClick={() => {
                    handleMapOnClick()
                }}
                mapboxAccessToken={config.MAPBOX_API_KEY}
                initialViewState={{
                    latitude: -7.3204821,
                    longitude: 107.2656296,
                    zoom: 5,
                }}
                onLoad={() => {
                    geolocateControlRef.current?.trigger()
                }}
                style={{
                    width: '100%',
                    height: mapHeight,
                }}
                mapStyle="mapbox://styles/mapbox/streets-v9"
            >
                <GeolocateControl
                    ref={geolocateControlRef}
                    trackUserLocation={true}
                    onGeolocate={handleGeolocate}
                />
                {latitudeState && longitudeState && (
                    <Marker
                        latitude={-7.7604113}
                        longitude={110.37332386299255}
                        color="red"
                        anchor="bottom"
                    >
                        <HiMapPin className="text-red-500 text-[40px]" />
                    </Marker>
                )}
                {mapsData?.map((data) => {
                    return (
                        <div key={data.id}>
                            <Marker
                                latitude={data.coordinates.lat}
                                longitude={data.coordinates.long}
                                color="red"
                            >
                                <Image
                                    src={`${
                                        data.type == 'ambulance'
                                            ? '/assets/icons/ambulance.svg'
                                            : '/assets/icons/hospital.svg'
                                    }`}
                                    alt="marker"
                                    width="35"
                                    height="35"
                                />
                            </Marker>
                        </div>
                    )
                })}
            </ReactMapGL>
        </div>
    )
}

export default Maps
