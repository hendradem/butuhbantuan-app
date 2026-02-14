'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import HeaderSection from './partials/HeaderSection'
import useErrorSheet from '@/store/useErrorSheet'
import Image from 'next/image'
import { Button } from '@/components/ui/Button'

const imageSizeClasses = {
    xxs: 100,
    xs: 130,
    sm: 180,
    md: 300,
}

const ErrorSheet = () => {
    const { isOpen, onClose, errorMessage } = useErrorSheet()

    const handleRefresh = (): void => {
        window.location.href = '/'
    }

    const renderErrorMessage = (errorStatus: string) => {
        if (errorStatus === 'permission_denied') {
            return (
                <div>
                    <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
                        Aktifkan GPS
                    </h2>
                    <p className="text-center text-black text-sm font-normal leading-snug pb-4">
                        Aktifkan GPS kamu untuk mendapatkan layanan.
                    </p>
                </div>
            )
        } else if (errorStatus === 'position_unavailable') {
            return (
                <div>
                    <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
                        Lokasi tidak terdeteksi
                    </h2>
                    <p className="text-center text-black text-sm font-normal leading-snug pb-4">
                        Aktifkan GPS, Ganti Jaringan dan coba lagi.
                    </p>
                </div>
            )
        }
    }

    return (
        <div data-testid="error-sheet" className="bg-red-200">
            <CoreSheet
                isOpen={isOpen}
                isOverlay
                header={<HeaderSection />}
                snapPoints={[400, 0]}
            >
                <div className="sheet">
                    <div className=" bg-white flex items-center justify-center px-8 py-3">
                        <div className="text-center max-w-md">
                            <div className="mb-3 relative flex items-center justify-center">
                                <Image
                                    src="/assets/illustration/not-found-2.svg"
                                    alt="File Folder Illustration"
                                    width={imageSizeClasses['sm']}
                                    height={imageSizeClasses['sm']}
                                />
                            </div>
                            <div className="px-4">
                                <div>{renderErrorMessage(errorMessage)}</div>
                                <div className="flex flex-col gap-2">
                                    <Button
                                        size="md"
                                        variant="black"
                                        className="rounded-full py-2.5"
                                        onClick={() => handleRefresh()}
                                    >
                                        Reload Page
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </CoreSheet>
        </div>
    )
}

export default ErrorSheet
