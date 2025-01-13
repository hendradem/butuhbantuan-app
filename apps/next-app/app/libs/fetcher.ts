import axios from 'axios'
import config from '@/app/config'

const instance = axios.create({
    baseURL: config.API_HOST,
    timeout: 40000,
    headers: {
        Accept: 'application/json, text/plain, */*',
        'Content-Type': 'application/json; charset=utf-8',
    },
})

export const fetcher = async (url: string, data?: any) => {
    return await instance.get(url).then((res) => {
        if (!res.data) {
            throw Error(res.data.message)
        }

        return res.data
    })
}
