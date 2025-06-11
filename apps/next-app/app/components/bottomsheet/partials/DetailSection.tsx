import React from 'react'
import Icon from '../../ui/Icon'
import EmergencyDataList from './EmergencyDataList'

interface PropsType {
    selectedEmergencyData: any
    emergencyData: any
    selectedEmergencyName: any
    handleChangeLocationOnClick: () => void
    handleCloseDetailSheet: () => void
    handleSelectedEmergency: (emergency: any) => void
}

const DetailSection: React.FC<PropsType> = ({
    selectedEmergencyData,
    emergencyData,
    selectedEmergencyName,
    handleChangeLocationOnClick,
    handleCloseDetailSheet,
    handleSelectedEmergency,
}) => {
    return (
        <div>
            <div className="detail-sheet">
                <div className="sheet-header border-b p-2 px-3 bg-white border-neutral-100 flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                        <div
                            className={`flex items-center justify-center w-10 h-10 rounded-xl bg-red-50`}
                        >
                            <Icon
                                name={selectedEmergencyData?.icon}
                                className={`text-red-500 text-xl`}
                            />
                        </div>
                        <div>
                            <h1 className="text-lg leading-none m-0 text-neutral-800 font-semibold">
                                {selectedEmergencyData?.name}
                            </h1>
                            <p className="m-0 text-[14px] text-neutral-500">
                                {emergencyData?.length} hasil ditemukan.
                                <span
                                    className="text-blue-500 ml-1 font-medium cursor-pointer"
                                    onClick={() =>
                                        handleChangeLocationOnClick()
                                    }
                                >
                                    Ganti lokasi
                                </span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleCloseDetailSheet()}
                        type="button"
                        className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                    >
                        <Icon
                            name="ion:close"
                            className="text-neutral-600 text-xl"
                        />
                    </button>
                </div>
                <div className="sheet-body search-result-wrapper bg-neutral-50 overflow-y-scroll max-h-[250px]">
                    <div className="mt-5">
                        {emergencyData?.length == 0 && (
                            <div className="mx-3 mb-3 text-center text-slate-900">
                                Data emergency tidak ditemukan
                                <div>
                                    <button
                                        onClick={() =>
                                            handleChangeLocationOnClick()
                                        }
                                        type="button"
                                        className="border focus:outline-none  focus:ring-4 font-medium rounded-lg text-sm mt-2 px-4 py-2 me-2 mb-2 bg-gray-800 text-white border-gray-600 hover:bg-gray-700 hover:border-gray-600 focus:ring-gray-700"
                                    >
                                        Ubah Lokasi Pencarian
                                    </button>
                                </div>
                            </div>
                        )}

                        <EmergencyDataList
                            emergencyData={emergencyData}
                            handleSelectedEmergency={async (emergency: any) => {
                                handleSelectedEmergency(emergency)
                            }}
                            selectedEmergencyName={selectedEmergencyName}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default DetailSection
