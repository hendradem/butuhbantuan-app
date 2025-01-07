import React, { useState, useMemo } from 'react'
import { FaFire, FaMagnifyingGlass } from 'react-icons/fa6'
import debounce from 'lodash.debounce'

type LocationState = {
    name: String
    address: String
}

const SearchBox = () => {
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [locationValue, setLocationValue] = useState<string>('')
    const [locationResult, setLocationResult] = useState<LocationState[]>([])
    const [isOpen, setIsOpen] = useState<boolean>(true)

    const debouncedResult = useMemo(() => {
        // add search debounce effect
        return debounce((e: any) => searchUserLocation(e), 1000)
    }, [])
    const searchUserLocation = (e: any) => {
        // handle value changes from debounce func
        setLocationValue(e.target.value)
    }

    const searchData = () => {
        setIsLoading(true)

        var requestOptions = {
            method: 'GET',
        }

        fetch(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${locationValue}&apiKey=8039083723464cb389ed3d1f4bd86d35`,
            requestOptions
        )
            .then((response) => response.json())
            .then((result) => {
                let temp: any = []
                result?.features.map((item: any) => {
                    const data = {
                        name: item?.properties?.name,
                        address: item?.properties?.formatted,
                        lat: item?.properties?.lat,
                        long: item?.properties?.lon,
                    }
                    temp.push(data)
                })
                setLocationResult(temp)
                setIsLoading(false)
            })
            .catch((error) => console.log('error', error))
    }

    return (
        <div>
            <div className="w-full bg-white text-neutral-800 shadow border border-gray-100 rounded-xl rounded-t-none p-4">
                <div className="default  flex items-center justify-center">
                    <div className="p-2 border rounded-lg border-gray-200">
                        <FaFire />
                    </div>
                </div>
                <h3 className="text-center text-[14.5px] mt-2 font-medium">
                    Cari lokasi terdekatmu
                </h3>
                <h3 className="text-center mx-3 text-[14px] text-neutral-500 mt-1 font-normal">
                    Cari lokasimu dengan nama jalan, kelurahan, atau nama tempat
                    terdekatmu
                </h3>
                <div className="result">
                    <p className="text-sm my-1 font-medium">Hasil Pencarian</p>
                    {[1, 2].map((item, index) => {
                        return (
                            <div
                                key={index}
                                className="w-full flex items-center gap-2 text-neutral-800 text-sm hover:bg-gray-50 rounded p-2 cursor-pointer"
                            >
                                <FaMagnifyingGlass />
                                Ambulance dekat Masjid Pogung Raya
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default SearchBox
