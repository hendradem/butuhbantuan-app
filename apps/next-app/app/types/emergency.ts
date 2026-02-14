export type EmergencyDataType = {
  id: string;
  name: string;
  organization: string;
  organizationType: string;
  logo: string;
  description: string;
  coordinates: [number, number];
  typeOfService: string;
  address: {
    district: string;
    regency: string;
    province: string;
    fullAddress: string;
  };
  contact: {
    whatsapp: string;
    phone: string;
  };
};

export type SelectedEmergencyDataType = {
  selectedEmergencyData: EmergencyDataType | null;
  selectedEmergencyType?: string;
  selectedEmergencySource: "map" | "detail";
};
