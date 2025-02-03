import React from 'react'
import { Icon as Iconify } from '@iconify/react'

type Props = {
    name: string
    className?: string
}

const Icon: React.FC<Props> = ({ name, className }) => {
    return (
        <div>
            <Iconify icon={name} className={className} />
        </div>
    )
}

export default Icon
