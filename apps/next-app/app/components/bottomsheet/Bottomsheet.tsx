import { useState, useCallback } from 'react'
import { BottomSheet } from 'react-spring-bottom-sheet'

interface SheetProps {
    isOpen: boolean
    children: JSX.Element
    sheetTitle: string
    footerContent: JSX.Element
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
}) => {
    const [sheetHeight, setSheetHeight] = useState(0.9)

    const handleClose = useCallback(() => {
        onClose()
    }, [onClose])
    if (!isOpen) return null

    return (
        <BottomSheet
            open={isOpen}
            onDismiss={handleClose}
            snapPoints={({ maxHeight }) => [
                maxHeight - maxHeight / 5,
                maxHeight * sheetHeight,
            ]}
            header={
                <div className="flex justify-center items-center">
                    <h2 className="text-center font-medium text-lg text-gray-700">
                        {sheetTitle}
                    </h2>
                </div>
            }
        >
            <div className=" text-gray-500 h-[100%] pb-20 m-4">{children}</div>
            <div className="bottom-0 px-2 py-3 absolute w-full border-t border-gray-100 bg-white">
                {footerContent}
            </div>
        </BottomSheet>
    )
}

export default BottomSheetMain
