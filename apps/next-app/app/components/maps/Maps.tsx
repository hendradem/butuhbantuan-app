'use client'
import React, { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import useUserLocation from '@/app/hooks/useUserLocation'
import config from '@/app/config'
import useUserLocationData from '@/app/store/useUserLocationData'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import debounce from 'lodash.debounce'
import { useSearchParams } from 'next/navigation'
import mapboxgl from 'mapbox-gl'
import {
    FaArrowLeft,
    FaFire,
    FaLocationCrosshairs,
    FaMagnifyingGlass,
    FaXmark,
} from 'react-icons/fa6'
import useLocationApi from '@/app/store/api/useLocationApi'
import useAddressInfoApi from '@/app/store/api/useAddressInfoApi'

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

type LocationState = {
    name: String
    address: String
}

const Maps: React.FC<MapsProps> = ({ mapComponentType }) => {
    const serchParams = useSearchParams()
    const emergencyType = serchParams.get('type')
    const { setUserLocation } = useUserLocation()
    const updateRegionalData = useUserLocationData(
        (state) => state.updateRegionalData
    )
    const updateCoordinate = useUserLocationData(
        (state) => state.updateUserCoordinate
    )
    const [userLatitudeFromGeolocation, setUserLatitudeFromGeolocation] =
        useState<number>(0)
    const [userLongitudeFromGeolocation, setUserLongitudeFromGeolocation] =
        useState<number>(0)
    const [shouldFetch, setShouldFetch] = useState<boolean>(false)
    const { currentUserLocation } = useUserLocation()
    const [isSearchBoxActive, setIsSearchBoxActive] = useState<boolean>(false)
    const [currentUserAddress, setCurrentUserAddress] = useState(
        currentUserLocation?.address || ''
    )
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [locationValue, setLocationValue] = useState<string>('')
    const [locationResult, setLocationResult] = useState<LocationState[]>([])
    const [startLatitude, setStartLatitude] = useState(-7.7063721)
    const [startLongitude, setStartLongitude] = useState(110.3450278)

    // ==== DATA FETCHING =====

    const { addressData, addressError } = useAddressInfoApi(
        userLongitudeFromGeolocation,
        userLatitudeFromGeolocation
    )

    if (addressData) {
        const data = addressData

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

    // ==== END DATA FETCHING ====

    // ==== SEARCBOX =====
    const debouncedResult = useMemo(() => {
        // add search debounce effect
        return debounce((e: any) => searchUserLocation(e), 1000)
    }, [])
    const searchUserLocation = (e: any) => {
        // handle value changes from debounce func
        setLocationValue(e.target.value)
    }
    const { locationData, locationError } = useLocationApi(
        locationValue,
        isLoading
    )

    if (locationData) {
        let temp: any = []
        locationData?.features.map((item: any) => {
            const data = {
                name: item?.properties?.name,
                address: item?.properties?.formatted,
                lat: item?.properties?.lat,
                long: item?.properties?.lon,
                district: item?.properties?.district,
                place_name: item?.properties?.name,
                urban_village: item?.properties?.suburb,
            }
            temp.push(data)
        })
        setLocationResult(temp)
        setIsLoading(false)
    }
    if (locationError) console.log(locationError)

    const searchData = () => {
        setIsLoading(true)
    }

    const handleSelectedAddress = (address: any): void => {
        setUserLatitudeFromGeolocation(address.lat)
        setUserLongitudeFromGeolocation(address.long)

        setUserLocation(
            address.lat,
            address.long,
            address.address,
            address.urban_village
        )

        setIsSearchBoxActive(false)
        setLocationResult([])

        // to move the map to the selected address
        setStartLatitude(address.lat)
        setStartLongitude(address.long)
    }
    // ===== END SEARCHBOX =====

    // ==== MAPS =====
    const mapWrapper = useRef<any>()
    let mapContainer: any
    const [geolocationControl, setGeolocationControl] = useState<any>(null)

    const buildTheMap = async () => {
        mapContainer = new mapboxgl.Map({
            container: mapWrapper.current,
            style: 'mapbox://styles/mapbox/streets-v10',
            center: [startLongitude, startLatitude],
            zoom: 12,
            accessToken: config.MAPBOX_API_KEY,
        })

        const geolocateContainer = new mapboxgl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true,
            },
            trackUserLocation: true,
        })

        mapContainer.addControl(geolocateContainer)
        mapContainer.on('load', () => {
            geolocateContainer.trigger()
            setGeolocationControl(geolocateContainer)
        })
        mapContainer.on('click', () => {
            setIsSearchBoxActive(false)
        })
        geolocateContainer.on('geolocate', (e: any) => {
            const latitude = e.coords.latitude
            const longitude = e.coords.longitude

            setUserLatitudeFromGeolocation(latitude)
            setUserLongitudeFromGeolocation(longitude)
            setShouldFetch(true)
        })

        // Add marker functions
        const el = document.createElement('div')
        el.className = 'marker'
        new mapboxgl.Marker(el)
            .setLngLat([
                userLongitudeFromGeolocation ?? 0,
                userLatitudeFromGeolocation ?? 0,
            ])
            .setPopup(
                new mapboxgl.Popup({ offset: 25 }).setHTML(
                    `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
                )
            )
            .addTo(mapContainer)
    }
    // ==== END MAPS =====

    useEffect(() => {
        buildTheMap()
    }, [])

    useEffect(() => {
        buildTheMap()
    }, [userLatitudeFromGeolocation, userLongitudeFromGeolocation])

    // ==== END MAPS =====

    const handleSearchBoxOnFocus = (e: any): void => {
        e.preventDefault()
        setIsSearchBoxActive(true)
    }

    const handleRemoveSelectedAddress = (): void => {
        setIsSearchBoxActive(false)
        setCurrentUserAddress('')
        setLocationResult([])
    }

    const handleSearchInputChange = (e: any): void => {
        setCurrentUserAddress(e.target.value)
        const debouncingSearchLocation = debouncedResult(e)
        if (debouncingSearchLocation && locationValue) {
            setIsLoading(true)
        }
    }

    const handleOnGeolocate = (e: any): void => {
        console.log('clicked')
        geolocationControl.trigger()
    }

    useEffect(() => {
        if (locationValue) {
            searchData()
        }
    }, [locationValue])

    useEffect(() => {
        if (!locationValue) {
            setLocationResult([])
        }
    }, [locationValue])

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
                            onClick={(e) => {
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

                    {isSearchBoxActive && (
                        <div className="w-full bg-white text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
                            {!isLoading && locationResult.length === 0 && (
                                <div>
                                    <div className="default  flex items-center justify-center">
                                        <div className="p-2 border rounded-lg border-gray-200">
                                            <FaFire />
                                        </div>
                                    </div>
                                    <h3 className="text-center text-[14.5px] mt-2 font-medium">
                                        Cari lokasi terdekatmu
                                    </h3>
                                    <h3 className="text-center mx-3 text-[14px] text-neutral-500 mt-1 font-normal">
                                        Cari lokasimu dengan nama jalan,
                                        kelurahan, atau nama tempat terdekatmu
                                    </h3>
                                </div>
                            )}

                            {isLoading ? (
                                <div className="flex flex-col gap-2">
                                    <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                    <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                    <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                    <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                                </div>
                            ) : (
                                locationResult?.length > 0 && (
                                    <div className="result">
                                        <p className="text-sm mb-1 font-normal text-neutral-600">
                                            Cari {emergencyType} di sekitar
                                        </p>
                                        {locationResult?.map((item, index) => {
                                            return (
                                                <div
                                                    key={index}
                                                    className="w-full flex items-center gap-2 text-neutral-800 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer"
                                                    onClick={() => {
                                                        handleSelectedAddress(
                                                            item
                                                        )
                                                    }}
                                                >
                                                    <p className="text-md">
                                                        <FaMagnifyingGlass />
                                                    </p>
                                                    <p className="font-normal w-full truncate">
                                                        {item.address}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>
            </form>

            {/* MAPS */}
            <div
                className="w-full h-[450px] bg-orange-100"
                ref={(el) => (mapWrapper.current = el)}
            />

            {/* <ReactMapGL
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
                    console.log('loaded')
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
                <Marker
                    latitude={-7.7604113}
                    longitude={110.37332386299255}
                    color="red"
                    anchor="bottom"
                >
                    <HiMapPin className="text-red-500 text-[40px]" />
                </Marker>
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
            </ReactMapGL> */}

            {/* END MAPS */}
        </div>
    )
}

export default Maps

// mapContainer.flyTo({
//     center: [userLongitudeFromGlobalStore, userLatitudeFromGlobalStore],
//     essential: true, // this animation is considered essential with respect to prefers-reduced-motion
// })

// const buildTheMap = async () => {
//     mapContainer = new mapboxgl.Map({
//         container: mapWrapper.current,
//         style: 'mapbox://styles/mapbox/streets-v10',
//         center: [110.3450278, -7.7063721],
//         zoom: 12,
//         accessToken: config.MAPBOX_API_KEY,
//     })

//     const geolocateContainer = new mapboxgl.GeolocateControl({
//         positionOptions: {
//             enableHighAccuracy: true,
//         },
//         trackUserLocation: true,
//     })

//     mapContainer.addControl(geolocateContainer)
//     mapContainer.on('load', () => {
//         geolocateContainer.trigger()
//         setGeolocationControl(geolocateContainer)
//         setIsGeolocating(true)
//         setInterval(function () {
//             if (
//                 isGeolocating &&
//                 !userLatitudeAfterGeolocated &&
//                 !userLongitudeAfterGeolocated
//             ) {
//                 toast.dismiss()
//                 toast.error('Failed to get your location')
//             }
//         }, 3000)
//     })
//     mapContainer.on('click', () => {
//         console.log('map container clicked')
//     })
//     geolocateContainer.on('geolocate', (e: any) => {
//         const latitude = e.coords.latitude
//         const longitude = e.coords.longitude

//         if (latitude && longitude) {
//             refetchAddressInfo()
//             setIsGeolocating(false)
//             setUserLatitudeAfterGeolocated(latitude)
//             setUserLongitudeAfterGeolocated(longitude)
//         }
//     })

//     // Add marker to maps
//     const el = document.createElement('div')
//     el.className = 'marker'
//     new mapboxgl.Marker(el)
//         .setLngLat([
//             userLongitudeAfterGeolocated ?? 0,
//             userLatitudeAfterGeolocated ?? 0,
//         ])
//         .setPopup(
//             new mapboxgl.Popup({ offset: 25 }).setHTML(
//                 `<h3>Pop Up Title</h3><p>Pop Up Content</p>`
//             )
//         )
//         .addTo(mapContainer)
// }
