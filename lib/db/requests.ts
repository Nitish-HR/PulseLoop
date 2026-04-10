import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type RequestUrgency = "CRITICAL" | "URGENT" | "PLANNED";
export type RequestStatus = "PENDING" | "IN_PROGRESS" | "FULFILLED";

export type Request = {
  id: string;
  bloodGroup: string;
  unitsRequired: number;
  component: string;
  urgency: RequestUrgency;
  hospitalId: string;
  hospitalName: string;
  city: string;
  contactName: string;
  contactNumber: string;
  status: RequestStatus;
  lat?: number;
  lng?: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateRequestInput = {
  bloodGroup: string;
  unitsRequired: number;
  component: string;
  urgency: RequestUrgency;
  hospitalId: string;
  hospitalName: string;
  city: string;
  contactName: string;
  contactNumber: string;
};

const requestsCollection = collection(db, "requests");

export async function createRequest(data: CreateRequestInput): Promise<string> {
  const now = new Date().toISOString();

  const requestRef = await addDoc(requestsCollection, {
    ...data,
    status: "PENDING" as RequestStatus,
    createdAt: now,
    updatedAt: now,
  });

  return requestRef.id;
}

export async function getActiveRequests(city?: string): Promise<Request[]> {
  const constraints = [where("status", "==", "PENDING")];
  if (city) {
    constraints.push(where("city", "==", city));
  }
  const activeRequestsQuery = query(requestsCollection, ...constraints);
  const querySnapshot = await getDocs(activeRequestsQuery);

  return querySnapshot.docs.map((requestDoc) => {
    const requestData = requestDoc.data() as Omit<Request, "id">;
    return {
      id: requestDoc.id,
      ...requestData,
    };
  });
}

export async function getRequestById(requestId: string): Promise<Request | null> {
  const requestRef = doc(db, "requests", requestId);
  const requestSnap = await getDoc(requestRef);

  if (!requestSnap.exists()) {
    return null;
  }

  const requestData = requestSnap.data() as Omit<Request, "id">;
  return {
    id: requestSnap.id,
    ...requestData,
  };
}

export async function updateRequestStatus(
  requestId: string,
  status: RequestStatus
): Promise<void> {
  const requestRef = doc(db, "requests", requestId);

  await updateDoc(requestRef, {
    status,
    updatedAt: new Date().toISOString(),
  });
}
