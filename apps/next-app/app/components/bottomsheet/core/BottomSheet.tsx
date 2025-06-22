import React, { useEffect } from 'react'
import { motion, useAnimation } from 'framer-motion'
import './style.css'

interface BottomSheetProps {
    isOpen: boolean
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>
    topSnapPoint: number
    snapPoint: number
    isSnapLocked?: boolean
    setSnapPoint?: (value: number) => void
    children?: React.ReactNode
    type?: 'header' | 'headless'
    header?: React.ReactNode
}

const BottomSheetCore: React.FC<BottomSheetProps> = ({
    isOpen,
    setIsOpen,
    snapPoint,
    isSnapLocked,
    setSnapPoint,
    topSnapPoint,
    children,
    type = 'headless',
    header,
}) => {
    const controls = useAnimation()

    const onDragEnd = (_: any, info: any) => {
        if (isSnapLocked) return

        const dragY = info.point.y
        const distanceToTop = Math.abs(dragY - topSnapPoint)
        const distanceToBottom = Math.abs(dragY - snapPoint)

        const finalSnapPoint =
            distanceToTop < distanceToBottom ? topSnapPoint : snapPoint

        if (setSnapPoint) setSnapPoint(finalSnapPoint)

        controls.start({
            y: finalSnapPoint,
            transition: { type: 'spring', damping: 30, stiffness: 300 },
        })

        setIsOpen(finalSnapPoint !== snapPoint)
    }

    useEffect(() => {
        if (isOpen) {
            controls.start('visible')
        } else {
            controls.start('hidden')
        }
    }, [isOpen, controls])

    useEffect(() => {
        if (typeof snapPoint === 'number') {
            controls.start({
                y: snapPoint,
                transition: { type: 'spring', damping: 25, stiffness: 300 },
            })
        }
    }, [snapPoint])

    return (
        <div className="z-50 h-full bg-white">
            <motion.div
                drag={isSnapLocked ? false : 'y'}
                onDragEnd={onDragEnd}
                initial="hidden"
                animate={controls}
                transition={{
                    type: 'spring',
                    damping: 40,
                    stiffness: 400,
                }}
                variants={{
                    visible: { y: 104 },
                    hidden: { y: '70%' },
                }}
                dragConstraints={{ top: 0 }}
                dragElastic={0.2}
                className="inline-block bg-white overflow-y-auto shadow-[0_-20px_70px_rgba(0,0,0,0.1)]  rounded-t-[15px] overflow-hidden z-[1000]"
            >
                <div
                    className="DragHandleEdge"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="w-[40px] h-[4px] bg-neutral-200 rounded-[25px]" />
                </div>
                {header && (
                    <div className="flex items-center justify-between h-auto border-b py-2 px-[15px]">
                        {header}
                    </div>
                )}
                <div className="sheet-content h-full bg-white text-black p-3">
                    {children}
                </div>
            </motion.div>
        </div>
    )
}

export default BottomSheetCore
