import { addDoc, collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ResponseStatus = "RESPONDED" | "DECLINED";

export type DonorResponse = {
  id: string;
  donorId: string;
  requestId: string;
  responseStatus: ResponseStatus;
  createdAt: string;
};

const responsesCollection = collection(db, "responses");

export async function createDonorResponse(
  donorId: string,
  requestId: string,
  responseStatus: ResponseStatus
): Promise<string> {
  const responseRef = await addDoc(responsesCollection, {
    donorId,
    requestId,
    responseStatus,
    createdAt: new Date().toISOString(),
  });

  return responseRef.id;
}

export async function getResponsesForRequest(
  requestId: string
): Promise<DonorResponse[]> {
  const responsesQuery = query(
    responsesCollection,
    where("requestId", "==", requestId)
  );
  const querySnapshot = await getDocs(responsesQuery);

  return querySnapshot.docs.map((responseDoc) => {
    const responseData = responseDoc.data() as Omit<DonorResponse, "id">;
    return {
      id: responseDoc.id,
      ...responseData,
    };
  });
}

export async function countDonorResponses(donorId: string): Promise<number> {
  const donorResponsesQuery = query(
    responsesCollection,
    where("donorId", "==", donorId),
    where("responseStatus", "==", "RESPONDED")
  );
  const querySnapshot = await getDocs(donorResponsesQuery);

  return querySnapshot.size;
}
