import useEmergency from '@/store/useEmergency'

export const filterEmergencyByService = (serviceName: string) => {
    const emergency = useEmergency.getState().filteredEmergency
    const filtered = emergency.filter(
        (item) => item.emergencyData.emergency_type.name === serviceName
    )

    if (filtered.length > 0) {
        return filtered
    } else {
        return []
    }
}
