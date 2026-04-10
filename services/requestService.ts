import { createRequest, getActiveRequests } from "@/lib/db/requests";

type CreateHospitalRequestInput = {
  bloodGroup: string;
  unitsRequired: number;
  component: string;
  urgency: "CRITICAL" | "URGENT" | "PLANNED";
  hospitalId: string;
  hospitalName: string;
  city: string;
  contactName: string;
  contactNumber: string;
};

export async function createHospitalRequest(
  data: CreateHospitalRequestInput
): Promise<string> {
  return createRequest(data);
}

export async function getActiveRequestsByCity(city: string) {
  return getActiveRequests(city);
}
