import React, { useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import Icon from '@/components/ui/Icon'

interface PropsType {
    emergency: any
    handleSelect: (location: any) => void
}

const NearestService: React.FC<PropsType> = ({ emergency, handleSelect }) => {
    return (
        <>
            <div>
                {emergency.length > 0 && (
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-800 text-[15px] font-medium">
                            Emergency di dekatmu
                        </span>
                        <span className="text-gray-400 text-sm">
                            {emergency.length} hasil pencarian
                        </span>
                    </div>
                )}
            </div>
            {emergency.map((item: any) => {
                return (
                    <div
                        key={item.name}
                        className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                            handleSelect(item)
                        }}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-red-50 text-red-400 rounded-full flex items-center justify-center">
                                <Icon
                                    name={item.EmergencyType.icon}
                                    className="text-2xl"
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                    <h3 className="font-semibold text-gray-900 text-base">
                                        {item.name}
                                    </h3>
                                </div>
                                <p className="text-sm text-gray-600 leading-none">
                                    Emergency untuk {item.organizationType}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                    <span className="text-sm font-medium text-blue-600">
                                        {item.responseTime.duration} menit
                                    </span>
                                    <span className="text-gray-400">•</span>
                                    <span className="text-sm text-gray-600">
                                        {item.typeOfService}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                    </div>
                )
            })}
        </>
    )
}

export default NearestService
