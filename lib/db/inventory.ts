import {
  collection,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type InventoryRecord = {
  id: string;
  bloodBankId: string;
  bloodGroup: string;
  unitsAvailable: number;
  updatedAt: string;
};

const inventoryCollection = collection(db, "inventory");

export async function getInventory(
  bloodBankId: string
): Promise<InventoryRecord[]> {
  const inventoryQuery = query(
    inventoryCollection,
    where("bloodBankId", "==", bloodBankId)
  );
  const querySnapshot = await getDocs(inventoryQuery);

  return querySnapshot.docs.map((inventoryDoc) => {
    const inventoryData = inventoryDoc.data() as Omit<InventoryRecord, "id">;
    return {
      id: inventoryDoc.id,
      ...inventoryData,
    };
  });
}

export async function updateInventory(
  bloodBankId: string,
  bloodGroup: string,
  unitsAvailable: number
): Promise<InventoryRecord | null> {
  const inventoryQuery = query(
    inventoryCollection,
    where("bloodBankId", "==", bloodBankId),
    where("bloodGroup", "==", bloodGroup),
    limit(1)
  );
  const querySnapshot = await getDocs(inventoryQuery);

  if (querySnapshot.empty) {
    return null;
  }

  const inventoryDoc = querySnapshot.docs[0];
  const updatedAt = new Date().toISOString();

  await updateDoc(inventoryDoc.ref, {
    unitsAvailable,
    updatedAt,
  });

  const inventoryData = inventoryDoc.data() as Omit<InventoryRecord, "id">;
  return {
    ...inventoryData,
    id: inventoryDoc.id,
    unitsAvailable,
    updatedAt,
  };
}
