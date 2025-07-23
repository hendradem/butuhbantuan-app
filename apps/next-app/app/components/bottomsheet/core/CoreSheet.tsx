'use client'
import React, { useEffect, useRef } from 'react'
import { Sheet, SheetRef } from 'react-modal-sheet'
import useCoreSheet from '@/store/useCoreSheet'

interface Props {
    isOpen: boolean
    sheetId?: string // Optional sheet identifier
    children?: React.ReactNode
    header?: JSX.Element
    snapPoints?: number[]
    initialSnap?: number
    onSnap?: (snapIndex: number) => void
    disableOverlayClick?: boolean
    isOverlay?: boolean
    onCloseSheet?: () => void // Custom close handler
    scrollable?: boolean
    draggable?: boolean
}

const CoreSheet: React.FC<Props> = ({
    isOpen,
    children,
    header,
    snapPoints = [0.5, 1],
    initialSnap = 0,
    onSnap,
    isOverlay = false,
    scrollable = false,
    draggable = false,
    disableOverlayClick = false,
}) => {
    const { onClose } = useCoreSheet()
    const ref = useRef<SheetRef>(null)

    useEffect(() => {
        if (isOpen && ref.current) {
            ref.current?.snapTo(initialSnap)
        }
    }, [isOpen, initialSnap])

    const handleOverlayClick = () => {
        onClose()
    }

    const handleSnap = (snapIndex: number) => {
        const isBottomSnap = snapIndex === snapPoints.length - 1

        if (isBottomSnap) {
            onClose()
            return
        }
        onSnap?.(snapIndex)
    }

    return (
        <>
            <div>
                {isOverlay && isOpen && (
                    <div
                        className="fixed inset-0 z-[9998] backdrop-blur-sm bg-black/50 transition-all duration-200 ease-in-out"
                        onClick={
                            disableOverlayClick ? undefined : handleOverlayClick
                        }
                    ></div>
                )}
                <Sheet
                    ref={ref}
                    isOpen={isOpen}
                    onClose={onClose}
                    initialSnap={initialSnap}
                    snapPoints={snapPoints}
                    onSnap={handleSnap}
                    disableDrag={!draggable}
                    className={`mx-auto flex flex-col max-w-md`}
                    style={{
                        zIndex: 9999,
                        transition: 'transform 0.3s ease-out',
                        willChange: 'transform',
                    }}
                >
                    <Sheet.Container
                        style={{
                            boxShadow:
                                '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                            borderTopLeftRadius: 20,
                            borderTopRightRadius: 20,
                        }}
                    >
                        {header && <Sheet.Header>{header}</Sheet.Header>}
                        <Sheet.Content
                        // style={{
                        //     paddingBottom: ref.current?.y,
                        //     ...(scrollable
                        //         ? {
                        //               overflowY: 'scroll',
                        //               maxHeight: 'calc(100vh - 100px)',
                        //           }
                        //         : {
                        //               overflow: 'hidden',
                        //               height: '100%',
                        //           }),
                        // }}
                        >
                            {children}
                        </Sheet.Content>
                    </Sheet.Container>
                </Sheet>
            </div>
        </>
    )
}

export default CoreSheet
