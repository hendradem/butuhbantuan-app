import React from 'react'
import Icon from '@/components/ui/Icon'
import useExploreSheet from '@/store/useExploreSheet'
import useSearchSheet from '@/store/useSearchSeet'
import useLeaflet from '@/store/useLeaflet'

const HeaderSection = () => {
    const exploreSheet = useExploreSheet()
    const { resetLeafletRouting } = useLeaflet()
    const handleCloseSheet = exploreSheet.onClose
    const exploreSheetData = exploreSheet.sheetData
    const { onOpen } = useSearchSheet()

    const handleOpenSearchSheet = () => {
        exploreSheet.onClose()
        resetLeafletRouting()
        onOpen()
    }

    const handleCloseExploreSheet = () => {
        handleCloseSheet()
        resetLeafletRouting()
    }

    return (
        <div>
            <div className="sheet-header border-b py-3 px-3 bg-white border-neutral-100 flex items-center justify-between rounded-t-3xl pt-[12px]">
                <div className="flex gap-2 items-center">
                    <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-red-50`}
                    >
                        <Icon
                            name={exploreSheetData?.emergencyType?.icon}
                            className={`text-red-500 text-xl`}
                        />
                    </div>
                    <div className="flex flex-col justify-center">
                        <h1 className="text-lg leading-none m-0 text-neutral-800 font-semibold">
                            {exploreSheetData?.emergencyType?.name}
                        </h1>
                        <p className="mt-[2px] leading-none text-[14px] text-neutral-500">
                            {exploreSheetData?.emergency?.length} hasil
                            ditemukan.
                            <span
                                className="text-blue-500 ml-1 font-medium cursor-pointer"
                                onClick={() => {
                                    handleOpenSearchSheet()
                                }}
                            >
                                Ganti lokasi
                            </span>
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => handleCloseExploreSheet()}
                    type="button"
                    className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                >
                    <Icon
                        name="ion:close"
                        className="text-neutral-600 text-xl"
                    />
                </button>
            </div>
        </div>
    )
}

export default HeaderSection
