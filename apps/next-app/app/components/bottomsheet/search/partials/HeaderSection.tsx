import React from 'react'
import Icon from '@/app/components/ui/Icon'
import useSearchSheet from '@/app/store/useSearchSeet'
import useSearchData from '@/app/store/useSearchData'

const HeaderSection = () => {
    const { onClose, onSnap } = useSearchSheet()
    const { setSearchResults } = useSearchData()

    const handleCloseSheet = () => {
        onClose()
        onSnap(1) // snap to initial position
        setSearchResults([]) // when sheet is closed, clear search results
    }

    return (
        <div>
            <div className="sheet-header text-black p-2 px-3 border border-b border-neutral-100 bg-white flex items-center justify-between rounded-t-2xl">
                <button
                    onClick={() => handleCloseSheet()}
                    type="button"
                    className="bg-neutral-100 flex items-center justify-center w-8 h-8 rounded-full"
                >
                    <Icon
                        name="ion:close"
                        className="text-neutral-600 text-xl"
                    />
                </button>
                <p className="mr-3">Cari lokasimu</p>
                <div className="text-white">.</div>
            </div>
        </div>
    )
}

export default HeaderSection
