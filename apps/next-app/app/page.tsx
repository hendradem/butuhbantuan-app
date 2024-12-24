'use client'
import React from 'react'
import BottomMenu from './components/bottommenu/BottomMenu'
import Maps from './components/maps/Maps'
import useUserLocationData from './store/useUserLocationData'

export default function Home() {
    return (
        <main className="w-full flex flex-col justify-between h-screen relative bg-white">
            <div className="w-full h-[90%] bottom-0">
                <Maps mapComponentType="home" mapHeight="80vh" />
            </div>
            <div className="absolute w-full h-auto shadow-[0px_-6px_39px_-30px_#cbd5e0] rounded-t-[15px] bg-white bottom-0">
                <div className="sheet-body p-4">
                    <div className="sheet-header border-gray-100">
                        <h2 className="text-center font-medium text-[22px] text-gray-700">
                            Butuh bantuan apa?
                        </h2>
                    </div>
                    <BottomMenu />
                </div>
            </div>
        </main>
    )
}
