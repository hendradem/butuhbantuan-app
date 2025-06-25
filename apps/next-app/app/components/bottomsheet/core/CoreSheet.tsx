import React, { useEffect, useRef } from 'react'
import { Sheet, SheetRef } from 'react-modal-sheet'
import useCoreSheet from '@/app/store/useCoreSheet'

interface Props {
    isOpen: boolean
    sheetId?: string // Optional sheet identifier
    children?: React.ReactNode
    header?: JSX.Element
    snapPoints?: number[]
    initialSnap?: number
    onSnap?: (snapIndex: number) => void
    disableOverlayClick?: boolean
    // onCloseSheet?: () => void // Custom close handler
}

const CoreSheet: React.FC<Props> = ({
    isOpen,
    children,
    header,
    snapPoints = [1, 0.5, 0],
    initialSnap = 1,
    onSnap,
    disableOverlayClick = false,
    // onCloseSheet,
}) => {
    const { onClose } = useCoreSheet()
    const ref = useRef<SheetRef>(null)

    useEffect(() => {
        if (isOpen && ref.current) {
            ref.current?.snapTo(initialSnap)
        }
    }, [isOpen, initialSnap])

    const handleClose = () => {
        onClose() // Use custom close handler if provided
    }

    const handleOverlayClick = () => {
        handleClose()
    }

    const handleSnap = (snapIndex: number) => {
        console.log('> Current snap point index:', snapIndex)
        onSnap?.(snapIndex)
    }

    return (
        <>
            {/* {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                    onClick={handleOverlayClick}
                />
            )} */}

            <Sheet
                ref={ref}
                isOpen={isOpen}
                onClose={handleClose}
                initialSnap={initialSnap}
                snapPoints={snapPoints}
                onSnap={handleSnap}
                style={{
                    zIndex: 50,
                    width: '100%',
                }}
            >
                <Sheet.Container
                    style={{
                        boxShadow:
                            '2px -10px 21px -17px rgba(128,128,128,0.91)',
                    }}
                >
                    {header && <Sheet.Header>{header}</Sheet.Header>}
                    <Sheet.Content>{children}</Sheet.Content>
                </Sheet.Container>
            </Sheet>
        </>
    )
}

export default CoreSheet
