'use client'
import React from 'react'
import { useState } from 'react'
import BottomSheet from '@/app/components/bottomsheet/core/BottomSheet'

export default function GeoToggle() {
    const [isOpen, setIsOpen] = useState(false)
    const [snapPoint, setSnapPoint] = useState(500) // default top
    const [isSnapLocked, setSnapLocked] = useState(false)

    const topSnap = 100
    const bottomSnap = 500

    return (
        <div>
            <BottomSheet
                isOpen={true}
                setIsOpen={setIsOpen}
                snapPoint={500}
                topSnapPoint={100}
                isSnapLocked={isSnapLocked}
                setSnapPoint={setSnapPoint}
                header={
                    <div className="w-full flex justify-between">
                        <h1>Header</h1>
                        <button
                            className="btn btn-primary"
                            onClick={() => setIsOpen(false)}
                        >
                            Close
                        </button>
                    </div>
                }
            >
                <button
                    className="btn btn-primary bg-orange-200 mr-3"
                    onClick={() => {
                        setSnapPoint(topSnap)
                        setSnapLocked(true)
                    }}
                >
                    Snap to Top (Locked)
                </button>

                <button
                    className="btn btn-primary bg-blue-200"
                    onClick={() => {
                        setSnapPoint(bottomSnap)
                        setSnapLocked(false)
                    }}
                >
                    Snap to Bottom (Unlocked)
                </button>
                <p>
                    Lorem, ipsum dolor sit amet consectetur adipisicing elit.
                    Iure, quod quasi sapiente voluptatibus maiores iusto! Dolore
                    animi, qui, earum libero reprehenderit consectetur possimus,
                    sed ea voluptates aut et modi corporis.
                </p>
            </BottomSheet>
        </div>
    )
}
