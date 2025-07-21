import axios from 'axios'
import config from '@/config'
import useUserLocationData from '@/store/useUserLocationData'
import toast from 'react-hot-toast'
import { getAllTripEstimations } from '@/utils/turf'
import useEmergency from '@/store/useEmergency'

const BASE_URL = `${config.BACKEND_HOST}/emergency`

const axiosConfig = {
    headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Allow-Credentials': 'true',
    },
}

export const emergencyService = {
    getAll: async () => {
        const res = await axios.get(BASE_URL, axiosConfig)
        return res.data
    },
    getAllbyRegional: async (regencyID: string) => {
        const res = await axios.get(
            `${BASE_URL}/by-region/${regencyID}`,
            axiosConfig
        )
        return res.data
    },
    getByProvince: async (provinceID: string) => {
        const res = await axios.get(
            `${BASE_URL}/province/${provinceID}`,
            axiosConfig
        )
        return res.data
    },
    getByEmergencyType: async (emergencyTypeID: string) => {
        const res = await axios.get(
            `${BASE_URL}/by-type/${emergencyTypeID}`,
            axiosConfig
        )
        return res.data
    },
    getById: async (id: string) => {
        const res = await axios.get(`${BASE_URL}/${id}`, axiosConfig)
        return res.data
    },
    create: async (data: any) => {
        const res = await axios.post(BASE_URL, data, axiosConfig)
        return res.data
    },
    update: async (id: string, data: any) => {
        const res = await axios.put(`${BASE_URL}/${id}`, data, axiosConfig)
        return res.data
    },
    delete: async (id: string) => {
        const res = await axios.delete(`${BASE_URL}/${id}`, axiosConfig)
        return res.data
    },
    getDispatcher: async (regencyID: string, provinceID: string) => {
        const res = await axios.get(
            `${BASE_URL}/dispatcher/${regencyID}/${provinceID}`,
            axiosConfig
        )
        return res.data
    },
}
