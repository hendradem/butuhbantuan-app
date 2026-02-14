import React from 'react'
import Icon from '@/components/ui/Icon'
import useSearchSheet from '@/store/useSearchSeet'
import useSearchData from '@/store/useSearchData'

const HeaderSection = () => {
    const { onClose, onSnap } = useSearchSheet()
    const { setSearchResults, setIsActive: setSearchIsActive } = useSearchData()

    const handleCloseSheet = () => {
        onClose()
        setSearchIsActive(false)
        onSnap(1) // snap to initial position
        setSearchResults([]) // when sheet is closed, clear search results
    }

    return (
        <div>
            <div className="sheet-header relative text-black p-2 px-3 border-neutral-100 bg-white flex items-center justify-between rounded-t-2xl">
                <button
                    onClick={() => handleCloseSheet()}
                    type="button"
                    className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full z-10"
                >
                    <Icon
                        name="ion:close"
                        className="text-neutral-600 text-xl"
                    />
                </button>

                <p className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-medium text-md">
                    Cari Bantuan
                </p>
            </div>
        </div>
    )
}

export default HeaderSection
