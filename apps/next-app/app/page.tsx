'use client'
import React from 'react'
import Maps from './components/maps/Maps-v2'

export default function Home() {
    return (
        <main className="w-full flex flex-col justify-between h-screen relative bg-white">
            <div className="w-full h-100vh bottom-0">
                <Maps mapHeight="100vh" />
            </div>
        </main>
    )
}
