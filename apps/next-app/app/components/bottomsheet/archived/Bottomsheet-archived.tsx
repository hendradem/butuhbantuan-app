import { useState, useCallback, useEffect, useRef } from 'react'
import { BottomSheet, BottomSheetRef } from 'react-spring-bottom-sheet'

interface SheetProps {
    isOpen: boolean
    children: JSX.Element
    sheetTitle?: string
    footerContent?: JSX.Element
    blocking?: boolean
    clossable?: boolean
    height?: number
    onClose: () => void
    onOpen: () => void
}

const BottomSheetMain: React.FC<SheetProps> = ({
    isOpen,
    onClose,
    onOpen,
    children,
    sheetTitle,
    footerContent,
    blocking,
    clossable,
    height,
}) => {
    const [sheetHeight, setSheetHeight] = useState(height ? height : 0.2)
    const sheetRef = useRef<BottomSheetRef>(null)

    const handleClose = useCallback(() => {
        onClose()
    }, [onClose])

    const handleOpen = useCallback(() => {
        onOpen()
    }, [onOpen])

    if (!isOpen) return null

    useEffect(() => {
        sheetRef?.current?.snapTo(({ snapPoints }) => Math.max(...snapPoints))
    }, [height])

    return (
        <BottomSheet
            // onDismiss={clossable ? handleClose : handleOpen}
            open={isOpen}
            ref={sheetRef}
            defaultSnap={({ maxHeight }) => 0.1}
            snapPoints={({ maxHeight }) => [
                maxHeight - maxHeight / 10,
                maxHeight / 4,
                maxHeight * 0.6,
            ]}
            blocking={blocking}
            header={
                sheetTitle ? (
                    <div className="flex justify-center items-center">
                        <h2 className="text-center font-medium text-lg text-gray-700">
                            {sheetTitle}
                        </h2>
                    </div>
                ) : (
                    ''
                )
            }
        >
            <div className=" text-gray-500 h-[100%] bg-white">{children}</div>
            {footerContent ? (
                <div className="bottom-0 px-2 py-3 absolute w-full border-t border-gray-100 bg-white">
                    {footerContent}
                </div>
            ) : (
                ''
            )}
        </BottomSheet>
    )
}

export default BottomSheetMain
