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

export type PartnerTier = "psc" | "verified" | "community";

export interface PartnerReadiness {
  trained_driver: boolean;
  has_oxygen: boolean;
  has_stretcher: boolean;
  equipment_notes?: string;
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
  partner_tier?: PartnerTier;
  readiness?: PartnerReadiness;
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

export interface OrderTicket {
  id: string;
  ticket_number: string;
  emergency_uuid: string;
  unit_name: string;
  requester_name: string;
  requester_phone: string;
  location: string;
  condition: string;
  photo_url?: string;
  requester_lat: number;
  requester_lng: number;
  status: "pending" | "accepted" | "in_progress" | "completed" | "cancelled";
  source: "call" | "sos";
  handler_name?: string;
  handling_notes?: string;
  type_id?: number;
  regency_id?: string;
  province_id?: string;
  dispatch_round?: number;
  sla_deadline?: string | null;
  dispatch_status?: "searching" | "assigned" | "exhausted" | "";
  unit_phone?: string;
  unit_whatsapp?: string;
  unit_lat?: number;
  unit_lng?: number;
  eta_minutes?: number;
  completed_at?: string | null;
  created_at: string;
  history?: Array<{
    id?: string;
    type?: string;
    message: string;
    actor?: string;
    from_unit?: string;
    to_unit?: string;
    dispatch_tier?: string;
    created_at: string;
  }>;
  citizen_phase?: string;
  escalation_hotline?: string;
  escalation_label?: string;
  accepted_at?: string | null;
  arrived_at?: string | null;
  track_token?: string;
  track_enabled_at?: string | null;
  track_expires_at?: string | null;
  responder_lat?: number;
  responder_lng?: number;
  responder_updated_at?: string | null;
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
