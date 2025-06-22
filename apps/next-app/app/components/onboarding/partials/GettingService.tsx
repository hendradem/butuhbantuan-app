import React from 'react'
import ServiceNotFound from '../partials/ServiceNotFound'
import ServiceFound from '../partials/ServiceFound'

interface ServiceLoadingProps {
    currentUserRegency: string
    isServiceIsAvailable: boolean
}

function GettingService({
    currentUserRegency,
    isServiceIsAvailable,
}: ServiceLoadingProps) {
    return (
        <div>
            <div>
                {!isServiceIsAvailable && (
                    <ServiceNotFound currentUserRegency={currentUserRegency} />
                )}
            </div>
            <div>
                {isServiceIsAvailable && (
                    <ServiceFound currentUserRegency={currentUserRegency} />
                )}
            </div>
        </div>
    )
}

export default GettingService
