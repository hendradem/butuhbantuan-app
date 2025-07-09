'use client'
import React from 'react'
import CoreSheet from '../core/CoreSheet'
import HeaderSection from './partials/HeaderSection'
import useConfirmationSheet from '@/store/useConfirmationSheet'
import ConfirmationState from '@/components/commons/ConfirmationState'
import Icon from '@/components/ui/Icon'
import { convertPhoneNumber } from '@/utils/covertPhoneNumber'
import toast from 'react-hot-toast'

const ConfirmationSheet = () => {
    const {
        isOpen,
        callNumber,
        callType,
        onClose: closeConfirmationSheet,
    } = useConfirmationSheet()

    const onContactClick = (e: any): void => {
        e.stopPropagation() // Prevent the event from propagating to the parent element

        const convertedPhoneNumber = convertPhoneNumber(callNumber)

        switch (callType) {
            case 'whatsapp':
                toast.success('Akan dihubungkan ke whatsapp testing', {
                    style: {
                        borderRadius: '20px',
                        background: '#333',
                        color: '#fff',
                    },
                })
                window.open(`https://wa.me/${6287808885333}`, '_blank')
                break
            case 'phone':
                window.open(`tel:${+callNumber}`, '_blank')
                break
        }
    }

    return (
        <div>
            <div>
                <CoreSheet
                    isOpen={isOpen}
                    isOverlay
                    header={
                        <HeaderSection handleClose={closeConfirmationSheet} />
                    }
                    snapPoints={[400, 0]}
                >
                    <div className="sheet">
                        <ConfirmationState
                            size="xs"
                            title={`Anda akan diarahkan ke ${callType === 'phone' ? 'telfon seluler' : 'WhatsApp'}`}
                            description="Gunakan hanya untuk keadaan darurat dan dilarang keras untuk menyalahgunakan nomor ini."
                            cta={
                                <div className="flex items-center justify-center gap-1">
                                    {callType === 'whatsapp' && (
                                        <button
                                            className="btn-whatsapp btn-lg"
                                            onClick={(e: any) => {
                                                onContactClick(e)
                                            }}
                                        >
                                            <Icon
                                                name="mingcute:chat-1-fill"
                                                className="w-5 h-5 mr-2"
                                            />
                                            Buka Whatsapp
                                        </button>
                                    )}

                                    {callType === 'phone' && (
                                        <button
                                            className="btn-call btn-lg"
                                            onClick={(e: any) => {
                                                onContactClick(e)
                                            }}
                                        >
                                            <Icon
                                                name="mingcute:chat-1-fill"
                                                className="w-5 h-5 mr-2"
                                            />
                                            Telfon
                                        </button>
                                    )}

                                    <button
                                        onClick={() => closeConfirmationSheet()}
                                        type="button"
                                        className="btn-dark w-full"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            }
                        />
                    </div>
                </CoreSheet>
            </div>
        </div>
    )
}

export default ConfirmationSheet
