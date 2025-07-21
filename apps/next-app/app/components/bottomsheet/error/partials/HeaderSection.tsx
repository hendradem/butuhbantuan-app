import React from 'react'
import Icon from '@/components/ui/Icon'

interface PropTypes {
    handleClose: () => void
}

const HeaderSection: React.FC<PropTypes> = ({ handleClose }) => {
    return (
        <div>
            <div className="sheet-header py-2 px-3 bg-white rounded-t-[50px] flex items-center justify-end"></div>
        </div>
    )
}

export default HeaderSection
