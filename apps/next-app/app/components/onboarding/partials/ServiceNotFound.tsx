import React from 'react'
import EmptyImage from '../../ui/EmptyImage'
import { Button } from '../../ui/Button'
import useConfirmationSheet from '@/store/useConfirmationSheet'

interface ServiceNotFoundProps {
    currentUserRegency: string
}

const ServiceNotFound = ({ currentUserRegency }: ServiceNotFoundProps) => {
    const {
        onOpen: openConfirmationSheet,
        setCallNumber,
        setCallType,
    } = useConfirmationSheet()

    const handleContactClick = (): void => {
        setCallNumber('119')
        setCallType('phone')
        openConfirmationSheet()
    }

    return (
        <div>
            <div className="grid gap-4 w-80">
                <EmptyImage />
                <div>
                    <h2 className="text-center text-black text-base font-semibold leading-relaxed pb-1">
                        Layanan belum tersedia
                    </h2>
                    <p className="text-center text-black text-sm font-normal leading-snug pb-4">
                        Layanan kami belum tersedia <br /> untuk daerah{' '}
                        {currentUserRegency}
                    </p>
                    <div className="flex flex-col gap-2">
                        <Button
                            size="md"
                            variant="black"
                            className="rounded-full"
                            onClick={() => handleContactClick()}
                        >
                            Hubungi PSC 119 ( Ambulans Nasional )
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ServiceNotFound
