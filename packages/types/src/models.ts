export interface OperationalStatus {
  is_active: boolean;
  is_24_hours: boolean;
  open_time: string;
  close_time: string;
}

export interface FleetStatus {
  total: number;
  available: number;
}

export interface EmergencyDataType {
  id: string;
  name: string;
  organization: string;
  organizationType: string;
  logo: string;
  description: string;
  coordinates: [number, number];
  typeOfService: string;
  address: { district: string; regency: string; province: string; fullAddress: string };
  contact: { whatsapp: string; phone: string };
  operational: OperationalStatus;
  fleet: FleetStatus;
}

export interface SOSAlert {
  id: string;
  name: string;
  phone: string;
  lat: number;
  lng: number;
  address: string;
  description: string;
  type_id: number;
  regency_id: string;
  province_id: string;
  ticket_number: string;
  created_at: string;
}

export interface SOSSubmitPayload {
  name: string;
  phone: string;
  lat: number;
  lng: number;
  address: string;
  description: string;
  type_id?: number;
  regency_id?: string;
  province_id?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "responder" | "reporter";
  createdAt: string;
}
