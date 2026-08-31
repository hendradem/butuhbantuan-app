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
  /** false = unit tanpa login dashboard; citizen kirim WA + /dispatch */
  dashboard_access?: boolean;
  wa_dispatch?: boolean;
  organization_type?: string;
  readiness?: PartnerReadiness;
  compliance?: {
    declared_category: string;
    category_label: string;
    completeness_pct: number;
    required_total: number;
    required_met: number;
    groups: Array<{
      code: string;
      label: string;
      items: Array<{ code: string; label: string; required: boolean; status: string; photo_url?: string }>;
    }>;
    disclaimer: string;
    reference?: { org: string; title: string; year: number };
    verification?: {
      status: string;
      is_verified: boolean;
      verified_category?: string;
      verified_category_label?: string;
      verified_at?: string;
      expires_at?: string;
    };
  };
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
  jenis_pelayanan?: string;
  location: string;
  condition: string;
  /** Structured initial assessment from citizen checklist (optional). */
  assessment?: {
    template_code: string;
    template_version: number;
    answers: Array<{ code: string; label: string; value: "yes" | "no" | "unknown" }>;
    acuity: "green" | "yellow" | "red" | "unknown";
    notes?: string;
  };
  assessment_acuity?: "green" | "yellow" | "red" | "unknown";
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
  wa_dispatch?: boolean;
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
  public_token?: string;
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
