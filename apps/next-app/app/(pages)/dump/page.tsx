// 'use client'
// import React from 'react'
// import { useState } from 'react'
// import BottomSheet from '@/components/bottomsheet/core/BottomSheet'

// export default function GeoToggle() {
//     const [isOpen, setIsOpen] = useState(false)
//     const [snapPoint, setSnapPoint] = useState(500) // default top
//     const [isSnapLocked, setSnapLocked] = useState(false)

//     const topSnap = 100
//     const bottomSnap = 500

//     return (
//         <div>
//             <BottomSheet
//                 isOpen={true}
//                 setIsOpen={setIsOpen}
//                 snapPoint={500}
//                 topSnapPoint={100}
//                 isSnapLocked={isSnapLocked}
//                 setSnapPoint={setSnapPoint}
//                 header={
//                     <div className="w-full flex justify-between">
//                         <h1>Header</h1>
//                         <button
//                             className="btn btn-primary"
//                             onClick={() => setIsOpen(false)}
//                         >
//                             Close
//                         </button>
//                     </div>
//                 }
//             >
//                 <button
//                     className="btn btn-primary bg-orange-200 mr-3"
//                     onClick={() => {
//                         setSnapPoint(topSnap)
//                         setSnapLocked(true)
//                     }}
//                 >
//                     Snap to Top (Locked)
//                 </button>

//                 <button
//                     className="btn btn-primary bg-blue-200"
//                     onClick={() => {
//                         setSnapPoint(bottomSnap)
//                         setSnapLocked(false)
//                     }}
//                 >
//                     Snap to Bottom (Unlocked)
//                 </button>
//                 <p>
//                     Lorem, ipsum dolor sit amet consectetur adipisicing elit.
//                     Iure, quod quasi sapiente voluptatibus maiores iusto! Dolore
//                     animi, qui, earum libero reprehenderit consectetur possimus,
//                     sed ea voluptates aut et modi corporis.
//                 </p>
//             </BottomSheet>
//         </div>
//     )
// }

'use client'

import React from 'react'
import { useState } from 'react'
import { Drawer } from 'vaul'
import Loader from './Loader'
import { clsx } from 'clsx'

const snapPoints = ['50%', '80%', 1]

export default function Test() {
    const [snap, setSnap] = useState<number | string | null>(snapPoints[0])

    return (
        <Drawer.Root
            snapPoints={snapPoints}
            activeSnapPoint={snap}
            setActiveSnapPoint={setSnap}
        >
            <Drawer.Trigger className="relative flex h-10 flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 text-sm font-medium shadow-sm transition-all hover:bg-[#FAFAFA] dark:bg-[#161615] dark:hover:bg-[#1A1A19] dark:text-white">
                Open Drawer
            </Drawer.Trigger>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40" />
                <Drawer.Content className="bg-gray-100 border border-neutral-300 flex flex-col rounded-t-[10px] mt-24 h-fit fixed bottom-0 left-0 right-0 outline-none">
                    <div className="p-4 bg-white rounded-t-[10px] flex-1">
                        <div
                            aria-hidden
                            className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300 mb-8"
                        />
                        <div className="max-w-md mx-auto">
                            <Drawer.Title className="font-medium mb-4 text-gray-900">
                                Drawer for React.
                            </Drawer.Title>
                            <p className="text-gray-600 mb-2">
                                This component can be used as a Dialog
                                replacement on mobile and tablet devices. You
                                can read about why and how it was built{' '}
                                <a
                                    target="_blank"
                                    className="underline"
                                    href="https://emilkowal.ski/ui/building-a-drawer-component"
                                >
                                    here
                                </a>
                                .
                            </p>
                            <p className="text-gray-600 mb-2">
                                This one specifically is the most simplest setup
                                you can have, just a simple drawer with a
                                trigger.
                            </p>
                        </div>
                    </div>
                    <div className="p-4 bg-gray-100 border-t border-gray-200 mt-auto">
                        <div className="flex gap-6 justify-end max-w-md mx-auto">
                            <a
                                className="text-xs text-gray-600 flex items-center gap-0.25"
                                href="https://github.com/emilkowalski/vaul"
                                target="_blank"
                            >
                                GitHub
                                <svg
                                    fill="none"
                                    height="16"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    width="16"
                                    aria-hidden="true"
                                    className="w-3 h-3 ml-1"
                                >
                                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                                    <path d="M15 3h6v6"></path>
                                    <path d="M10 14L21 3"></path>
                                </svg>
                            </a>
                            <a
                                className="text-xs text-gray-600 flex items-center gap-0.25"
                                href="https://twitter.com/emilkowalski_"
                                target="_blank"
                            >
                                Twitter
                                <svg
                                    fill="none"
                                    height="16"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    viewBox="0 0 24 24"
                                    width="16"
                                    aria-hidden="true"
                                    className="w-3 h-3 ml-1"
                                >
                                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                                    <path d="M15 3h6v6"></path>
                                    <path d="M10 14L21 3"></path>
                                </svg>
                            </a>
                        </div>
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>

        // <div className="h-screen bg-white flex items-center justify-center">
        //     <Drawer.Root snapPoints={['148px', '355px', 1]}>
        //         <Drawer.Trigger className="relative flex h-10 items-center justify-center gap-2 rounded-full bg-blue-200 px-4 text-sm font-medium shadow-sm transition hover:bg-blue-300">
        //             Open Drawer
        //         </Drawer.Trigger>

        //         <Drawer.Portal>
        //             <Drawer.Overlay className="fixed inset-0 bg-black/40" />

        //             {/* Drawer Content - 300px wide & centered */}
        //             <Drawer.Content className="fixed bottom-0 mx-auto flex flex-col border-x border-neutral-100 max-w-md bg-gray-100 outline-none shadow-lg">
        //                 {/* Header */}
        //                 <div className="p-4 bg-white rounded-t-[10px]">
        //                     <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300" />
        //                     <Drawer.Title className="mb-2 font-medium text-gray-900">
        //                         Drawer for React
        //                     </Drawer.Title>
        //                     <p className="text-sm text-gray-600">
        //                         This component can be used as a Dialog
        //                         replacement on mobile and tablet.
        //                     </p>
        //                 </div>

        //                 {/* Footer */}
        //                 <div className="mt-auto border-t border-gray-200 bg-gray-100 p-4">
        //                     <div className="flex justify-end gap-4 text-xs text-gray-600">
        //                         <a
        //                             href="https://github.com/emilkowalski/vaul"
        //                             target="_blank"
        //                             rel="noopener noreferrer"
        //                             className="flex items-center gap-1 underline"
        //                         >
        //                             GitHub
        //                         </a>
        //                         <a
        //                             href="https://twitter.com/emilkowalski_"
        //                             target="_blank"
        //                             rel="noopener noreferrer"
        //                             className="flex items-center gap-1 underline"
        //                         >
        //                             Twitter
        //                         </a>
        //                     </div>
        //                 </div>
        //             </Drawer.Content>
        //         </Drawer.Portal>
        //     </Drawer.Root>
        // </div>
    )
}
