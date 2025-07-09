'use client'
import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Maps from '@/components/maps/Maps-v2'
import BottomMenu from '@/components/menu/BottomMenu'
import AddToHomeScreenBanner from '@/components/commons/AddToHomeScreenBanner'
import { setRealViewportHeight } from '@/utils/setViewportHeight'

export default function EmergencyPage() {
    const router = useRouter()

    useEffect(() => {
        const checkIsUserVisited = localStorage.getItem('onboarding')
        if (!checkIsUserVisited) {
            router.replace('/')
        }
    }, [])

    useEffect(() => {
        setRealViewportHeight()
        window.addEventListener('resize', setRealViewportHeight)
        return () => window.removeEventListener('resize', setRealViewportHeight)
    }, [])

    return (
        <div
            className="relative h-screen bg-white overflow-hidden"
            style={{ height: 'calc(var(--vh, 1vh) * 100)' }}
        >
            <div className="banner">
                <AddToHomeScreenBanner />
            </div>
            <div className="h-[78%]">
                <Maps />
            </div>
            <div className="h-[22%] mb-[400px] left-0 right-0 z-50 bg-white">
                <BottomMenu />
            </div>
        </div>
    )
}
