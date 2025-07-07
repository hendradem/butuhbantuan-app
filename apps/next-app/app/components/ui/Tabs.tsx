import React, { useEffect } from 'react'

type TabsProps = {
    tabs: any[]
    activeTab: number
    children?: React.ReactNode
    setActiveTab: (tabValue: number) => void
}

const Tabs: React.FC<TabsProps> = ({
    tabs,
    activeTab,
    children,
    setActiveTab,
}) => {
    useEffect(() => {
        console.log(tabs)
    }, [])

    return (
        <div>
            <div className="mt-2 px-4 border-b border-neutral-200">
                <div className="flex space-x-4">
                    {tabs?.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`font-medium text-[14px] py-2.5 ${
                                activeTab === tab.value
                                    ? 'text-black border-b-2 border-black'
                                    : 'text-gray-400'
                            }`}
                        >
                            {tab.title}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default Tabs
