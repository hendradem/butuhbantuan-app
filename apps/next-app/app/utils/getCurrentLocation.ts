import useAddressInformation from '@/app/store/useUserLocationData'
import { toastService } from '@/app/libs/toast'

export function getCurrentLocation(
    callback: (location: { lat: number; lng: number }) => void
) {
    if (navigator.geolocation) {
        toastService.showLoading('Mencari lokasi...')
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                callback({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                })
                toastService.dismiss()
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        console.log('Location permission denied')
                        break
                    case err.POSITION_UNAVAILABLE:
                        console.log('Location information is unavailable.')
                        break
                    case err.TIMEOUT:
                        console.log(
                            'The request to get user location timed out.'
                        )
                        break
                    default:
                        console.log('error')
                        console.log(err)
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
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
