import React from 'react'
import Icon from '@/components/ui/Icon'

interface PropTypes {
    handleClose: () => void
}

const HeaderSection: React.FC<PropTypes> = ({ handleClose }) => {
    return (
        <div>
            <div className="sheet-header py-2 px-3 bg-white rounded-t-[40px] flex items-center justify-end">
                <button
                    onClick={() => handleClose()}
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
