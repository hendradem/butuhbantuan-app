import React from 'react'
import Image from 'next/image'

type Props = {
    title: string
    size: 'xxs' | 'xs' | 'sm' | 'md'
    description?: string
    cta?: React.ReactNode
}

const imageSizeClasses = {
    xxs: 100,
    xs: 130,
    sm: 180,
    md: 300,
}

const ConfirmationState: React.FC<Props> = ({
    title,
    description,
    cta,
    size,
}) => {
    return (
        <div
            data-testid="confirmation-sheet-content"
            className=" bg-white flex items-center justify-center px-8 py-3"
        >
            <div className="text-center max-w-md">
                {/* File Folder Illustration */}
                <div className="mb-3 relative flex items-center justify-center">
                    <Image
                        src="/assets/illustration/core/confirmation.svg"
                        alt="File Folder Illustration"
                        width={imageSizeClasses[size]}
                        height={imageSizeClasses[size]}
                    />
                </div>

                {/* Heading */}
                <h2 className={`text-lg font-semibold text-gray-900 mb-1`}>
                    {title}
                </h2>

                {/* Description */}
                <p className="text-gray-600 text-[15px] mb-3">{description}</p>

                {/* Action Button */}
                <div>{cta}</div>
            </div>
        </div>
    )
}

export default ConfirmationState
