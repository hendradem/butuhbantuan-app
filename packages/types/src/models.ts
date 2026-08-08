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
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "responder" | "reporter";
  createdAt: string;
}
