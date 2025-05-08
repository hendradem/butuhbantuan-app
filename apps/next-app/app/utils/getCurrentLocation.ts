import useAddressInformation from '@/app/store/useUserLocationData'

export function getCurrentLocation(
    callback: (location: { lat: number; lng: number }) => void
) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) =>
                callback({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }),
            (err) => console.error('Error getting location:', err.message)
        )
    } else {
        console.error('Geolocation is not supported by this browser.')
    }
}

export function watchCurrentLocation(
    callback: (location: { lat: number; lng: number }) => void
) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) =>
                callback({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                }),
            (err) => console.error('Error getting location:', err.message)
        )
    } else {
        console.error('Geolocation is not supported by this browser.')
    }
}
