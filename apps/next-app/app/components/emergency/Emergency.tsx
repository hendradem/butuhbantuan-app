'use client'
import React, { useEffect } from 'react'
import BottomMenu from '@/components/menu/BottomMenu'
import AddToHomeScreenBanner from '@/components/commons/AddToHomeScreenBanner'
import { setRealViewportHeight } from '@/utils/setViewportHeight'

import dynamic from 'next/dynamic'

const Maps = dynamic(() => import('@/components/maps/leaflet/Leaflet'), {
    ssr: false,
})

export default function EmergencyPage() {
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setRealViewportHeight()
            window.addEventListener('resize', setRealViewportHeight)
            return () =>
                window.removeEventListener('resize', setRealViewportHeight)
        }
    }, [])

    return (
        <div
            className="relative h-screen bg-white overflow-hidden"
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
        >
            <div className="banner">
                <AddToHomeScreenBanner />
            </div>
            <div className="h-[78%] bg-neutral-100">
                <Maps />
            </div>
            <div
                className="h-[22%] left-0 right-0 z-50 bg-transparent absolute bottom-0"
                style={{ zIndex: 100 }}
            >
                <BottomMenu />
            </div>
        </div>
    )
}
