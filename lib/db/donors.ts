import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { checkAndAwardBadges } from "@/lib/utils/badgeUtils";

export type BloodGroup =
  | "A_POS"
  | "A_NEG"
  | "B_POS"
  | "B_NEG"
  | "O_POS"
  | "O_NEG"
  | "AB_POS"
  | "AB_NEG";

export type ChurnStatus = "ACTIVE" | "AT_RISK";

export type Donor = {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  bloodGroup: BloodGroup;
  city: string;
  address?: string;
  lat?: number;
  lng?: number;
  lastDonationDate: string | null;
  donationCount: number;
  streakCount: number;
  churnStatus: ChurnStatus;
  createdAt: string;
  updatedAt: string;
};

const donorsCollection = collection(db, "donors");

export async function getDonorById(donorId: string): Promise<Donor | null> {
  const donorRef = doc(db, "donors", donorId);
  const donorSnap = await getDoc(donorRef);

  if (!donorSnap.exists()) {
    return null;
  }

  const donorData = donorSnap.data() as Omit<Donor, "id">;
  return {
    id: donorSnap.id,
    ...donorData,
  };
}

export async function updateDonorDonation(
  donorId: string,
  lastDonationDate: string
): Promise<void> {
  const donorRef = doc(db, "donors", donorId);

  await updateDoc(donorRef, {
    lastDonationDate,
    donationCount: increment(1),
    updatedAt: new Date().toISOString(),
  });

  // Fetch fresh counts and award any new badges
  const freshSnap = await getDoc(donorRef);
  if (freshSnap.exists()) {
    const data = freshSnap.data();
    checkAndAwardBadges(
      donorId,
      data.donationCount || 0,
      data.streakCount || 0
    ).catch(console.error);
  }
}

export async function getEligibleDonors(
  bloodGroup: string,
  city: string
): Promise<Donor[]> {
  const eligibleDonorsQuery = query(
    donorsCollection,
    where("bloodGroup", "==", bloodGroup),
    where("city", "==", city)
  );
  const querySnapshot = await getDocs(eligibleDonorsQuery);

  return querySnapshot.docs.map((donorDoc) => {
    const donorData = donorDoc.data() as Omit<Donor, "id">;
    return {
      id: donorDoc.id,
      ...donorData,
    };
  });
}

export async function updateDonorChurnStatus(
  donorId: string,
  churnStatus: ChurnStatus
): Promise<void> {
  const donorRef = doc(db, "donors", donorId);

  await updateDoc(donorRef, {
    churnStatus,
    updatedAt: new Date().toISOString(),
  });
}
