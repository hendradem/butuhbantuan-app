const defaultCoordinates = { lat: -6.7063945, lng: 107.5294926 }

export function getCurrentLocation(
    callback: (location: { lat: number; lng: number; error?: string }) => void
) {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                callback({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                })
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        callback({
                            lat: defaultCoordinates.lat,
                            lng: defaultCoordinates.lng,
                            error: 'permission_denied',
                        })
                        console.log('Location permission denied')
                        break
                    case err.POSITION_UNAVAILABLE:
                        callback({
                            lat: defaultCoordinates.lat,
                            lng: defaultCoordinates.lng,
                            error: 'position_unavailable',
                        })
                        console.log('Location information is unavailable.')
                        break
                    case err.TIMEOUT:
                        callback({
                            lat: defaultCoordinates.lat,
                            lng: defaultCoordinates.lng,
                            error: 'timeout',
                        })
                        console.log('The request location timed out.')
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

export type Location = {
    lat: number
    lng: number
}

export function getLocation(
    callback: (location: Location) => void,
    onError?: (error: GeolocationPositionError) => void
) {
    if (!navigator.geolocation) {
        console.error('Geolocation is not supported by this browser.')
        return
    }

    navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
            console.log('Permission state:', result.state)
        })
        .catch((err) => {
            console.warn('Permission query failed:', err)
        })

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords
            callback({ lat: latitude, lng: longitude })
        },
        (err) => {
            console.error('Geolocation error:', err)
            if (onError) onError(err)
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
        }
    )
}
