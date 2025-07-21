'use client'
import { useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { motion } from 'framer-motion'
import useOnboardingStore from '@/store/useOnboarding'
import Image from 'next/image'

const steps = [
    {
        title: 'Cari Bantuan Darurat',
        description:
            'Cari bantuan untuk keadaan darurat dengan cepat dan mudah dengan Butuhbantuan',
        image: '/assets/illustration/help.svg',
    },
    {
        title: 'Temukan berbagai jenis bantuan',
        description:
            'Temukan Ambulans, Pemadam Kebakaran, Tim SAR dan yang lainnya dengan cepat dan mudah',
        image: '/assets/illustration/chat.svg',
    },
    {
        title: 'Lokasi Otomatis Terdeteksi',
        description:
            'Cukup mudah, Aplikasi akan mendeteksi lokasimu dan mencarikan bantuan untuk kamu.',
        image: '/assets/illustration/location.svg',
    },
]

export default function OnboardingPage() {
    const [stepIndex, setStepIndex] = useState(0)
    const [shouldAnimate, setShouldAnimate] = useState(true)
    const isLast = stepIndex === steps.length - 1
    const setIsOnboarding = useOnboardingStore((state) => state.setIsOnboarding)

    const goToStep = (index: number) => {
        if (index !== stepIndex) {
            setShouldAnimate(true)
            setStepIndex(index)
        }
    }

    const nextStep = () => {
        if (!isLast) {
            setStepIndex((prev) => prev + 1)
            setShouldAnimate(true)
        } else {
            setOnboardingStatus()
        }
    }

    const prevStep = () => {
        if (stepIndex > 0) {
            setStepIndex((prev) => prev - 1)
            setShouldAnimate(true)
        }
    }

    const skip = () => {
        setOnboardingStatus()
    }

    const setOnboardingStatus = () => {
        localStorage.setItem('onboarding', 'false')
        setIsOnboarding(false)
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: nextStep,
        onSwipedRight: prevStep,
        preventScrollOnSwipe: true,
        trackMouse: true,
    })

    const { title, description, image } = steps[stepIndex]

    return (
        <div
            {...swipeHandlers}
            className="min-h-screen flex flex-col p-6 text-center justify-end"
        >
            <div className="flex h-[400px] items-center justify-center select-none cursor-move">
                <div className="flex flex-col items-center">
                    <motion.div
                        key={stepIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={shouldAnimate ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="w-full h-[200px] mb-6">
                            <Image
                                src={image}
                                alt={title}
                                width={100}
                                height={100}
                                className="h-full w-full rounded-lg"
                            />
                        </div>
                    </motion.div>

                    <h2 className="text-lg font-semibold mb-2">{title}</h2>
                    <p className="text-gray-500 text-sm max-w-sm">
                        {description}
                    </p>
                </div>
            </div>

            <div className="w-full flex flex-col items-center space-y-4">
                <div className="flex gap-2 mb-8">
                    {steps.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goToStep(i)}
                            className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${
                                i === stepIndex
                                    ? 'bg-black scale-110'
                                    : 'bg-gray-300'
                            }`}
                            aria-label={`Go to step ${i + 1}`}
                        />
                    ))}
                </div>

                <button
                    onClick={nextStep}
                    className="w-full bg-black text-white py-3 rounded-xl text-sm font-medium"
                >
                    {isLast ? 'Finish' : 'Next'}
                </button>

                <button onClick={skip} className="text-gray-400 text-sm">
                    Skip
                </button>
            </div>
        </div>
    )
}
