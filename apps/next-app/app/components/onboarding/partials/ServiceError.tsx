import React from 'react'
import EmptyImage from '../../ui/EmptyImage'
import { Button } from '../../ui/Button'
import useConfirmationSheet from '@/store/useConfirmationSheet'

interface Props {
    error: string
}

const ServiceError: React.FC<Props> = ({ error }) => {
    const handleRefresh = (): void => {
        window.location.href = '/'
    }

    return (
        <div>
            <div className="grid gap-4 w-80">
                <EmptyImage />
                <div className="px-4">
                    <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
                        Aktifkan GPS
                    </h2>
                    <p className="text-center text-black text-sm font-normal leading-snug pb-4">
                        Aktifkan GPS kamu untuk mendapatkan layanan.
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button
                            size="md"
                            variant="black"
                            className="rounded-full"
                            onClick={() => handleRefresh()}
                        >
                            Reload Page
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ServiceError
