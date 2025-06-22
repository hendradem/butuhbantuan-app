import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion'
import { useEffect, useRef } from 'react'

type BottomSheetProps = {
    isOpen: boolean
    onClose: () => void
    children: React.ReactNode
    snapPoints?: number[] // e.g. [100, 300, 500]
    allowSwipeToClose?: boolean
    allowResize?: boolean
}

export default function BottomSheet({
    isOpen,
    onClose,
    children,
    snapPoints = [100, 300, 500],
    allowSwipeToClose = true,
    allowResize = false,
}: BottomSheetProps) {
    const y = useMotionValue(snapPoints[snapPoints.length - 1])
    const sheetRef = useRef<HTMLDivElement>(null)

    const sortedSnapPoints = [...snapPoints].sort((a, b) => a - b)

    useEffect(() => {
        if (isOpen) {
            animate(y, sortedSnapPoints[0], {
                type: 'spring',
                stiffness: 300,
                damping: 30,
            })
        }
    }, [isOpen, y, sortedSnapPoints])

    const findClosestSnap = (currentY: number) => {
        return sortedSnapPoints.reduce((prev, curr) =>
            Math.abs(curr - currentY) < Math.abs(prev - currentY) ? curr : prev
        )
    }

    const handleDragEnd = (_: any, info: any) => {
        const offset = info.offset.y
        const velocity = info.velocity.y
        const currentY = y.get()

        // If resizing is allowed, do not snap
        if (allowResize) return

        const isSwipeClose =
            allowSwipeToClose &&
            (offset > 100 || velocity > 800) &&
            currentY >= sortedSnapPoints[sortedSnapPoints.length - 1] - 50

        if (isSwipeClose) {
            onClose()
            return
        }

        const nearestSnap = findClosestSnap(currentY)
        animate(y, nearestSnap, {
            type: 'spring',
            stiffness: 300,
            damping: 30,
        })
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/40 z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    {/* Sheet */}
                    <motion.div
                        className="absolute bottom-0 mb-[80px] left-0 right-0 z-50 bg-white rounded-t-2xl shadow-lg w-full max-w-screen-md mx-auto"
                        style={{ y }}
                        ref={sheetRef}
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        onDragEnd={handleDragEnd}
                        initial={{
                            y: sortedSnapPoints[sortedSnapPoints.length - 1],
                        }}
                        animate={{ y: sortedSnapPoints[0] }}
                        exit={{
                            y: sortedSnapPoints[sortedSnapPoints.length - 1],
                        }}
                        transition={{
                            type: 'spring',
                            damping: 30,
                            stiffness: 300,
                        }}
                    >
                        <div className="w-full h-2 mt-2 mb-4 mx-auto bg-gray-300 rounded-full max-w-[40px] cursor-grab" />
                        <div className="p-4 overflow-y-auto">{children}</div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
