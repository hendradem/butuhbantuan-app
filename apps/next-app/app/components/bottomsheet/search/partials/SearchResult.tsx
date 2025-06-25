import Icon from '@/app/components/ui/Icon'
import Image from 'next/image'
import React from 'react'

interface SearchResultProps {
    locationResult: LocationResultType[]
    isLoading: boolean
    handleSelectedAddress: (address: any, e: any) => void
}

type LocationResultType = {
    name: String
    address: String
    lat: number
    long: number
    urban_village: String
    subdistrict: String
    regency: String
    province: String
    district: String
    county: String
    city: string
    state: string
    formatted_city: string
}

const SearchResult: React.FC<SearchResultProps> = ({
    locationResult,
    isLoading,
    handleSelectedAddress,
}) => {
    const addressOnClick = (address: any, e: any): void => {
        e.preventDefault()
        handleSelectedAddress(address, e)
    }

    return (
        <>
            <div className="w-full bg-white text-neutral-800 overflow-y-scroll max-h-[400px] border border-neutral-200 rounded-b-xl">
                {isLoading && (
                    <div className="w-full mt-2 px-3 text-neutral-800 py-2">
                        <div className="flex flex-col gap-2">
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                            <div className="bg-gray-100 w-full h-[30px] p-2 rounded-md animate-pulse flex items-center"></div>
                        </div>
                    </div>
                )}

                {!isLoading && locationResult.length !== 0 && (
                    <div>
                        {locationResult?.map(
                            (item: LocationResultType, index) => {
                                return (
                                    <div
                                        key={index}
                                        className="w-full flex items-center gap-3 text-neutral-800 text-sm hover:bg-gray-100 rounded p-2 cursor-pointer"
                                        onClick={(e) => {
                                            addressOnClick(item, e)
                                        }}
                                    >
                                        <div className="p-2 rounded-xl bg-neutral-100">
                                            <Icon
                                                name="mingcute:location-fill"
                                                className="text-lg text-neutral-600"
                                            />
                                        </div>
                                        <div className="w-full truncate">
                                            <p className="font-normal text-neutral-900 text-[15px] leading-none m-0 p-0 w-full truncate">
                                                {item?.name}
                                            </p>
                                            <p className="m-0 p-0 leading-none text-[13px] mt-1 w-full truncate text-neutral-500">
                                                {item?.formatted_city}
                                            </p>
                                        </div>
                                    </div>
                                )
                            }
                        )}
                    </div>
                )}

                {!isLoading && locationResult.length === 0 && (
                    <div className="w-full flex flex-col items-center justify-center my-5">
                        <Image
                            src="/assets/illustration/location.svg"
                            alt="search"
                            width={100}
                            height={100}
                        />

                        <p className="text-center text-sm mt-5 mx-8">
                            Cari lokasi terdekatmu dengan nama jalan, nama desa,
                            atau nama lokasi lain.
                        </p>
                    </div>
                )}
            </div>
        </>
    )
}

export default SearchResult
