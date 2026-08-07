export interface Emergency {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  status: EmergencyStatus;
  category: EmergencyCategory;
  reportedBy: string;
  createdAt: string;
  updatedAt: string;
}

export type EmergencyStatus = "pending" | "in_progress" | "resolved" | "cancelled";

export type EmergencyCategory =
  | "medical"
  | "fire"
  | "crime"
  | "accident"
  | "natural_disaster"
  | "other";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export type UserRole = "admin" | "responder" | "reporter";
