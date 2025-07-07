'use client'
import React, { useEffect } from 'react'
import Maps from '@/components/maps/Maps-v2'
import BottomMenu from '@/components/menu/BottomMenu'
import AddToHomeScreenBanner from '@/components/commons/AddToHomeScreenBanner'
import { useRouter } from 'next/navigation'

export default function EmergencyPage() {
    const router = useRouter()

    useEffect(() => {
        const checkIsUserVisited = localStorage.getItem('onboarding')
        if (!checkIsUserVisited) {
            router.replace('/')
        }

        console.log(checkIsUserVisited)
    }, [])

    return (
        <>
            <div className="h-screen bg-white overflow-hidden">
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
        </>
    )
}
