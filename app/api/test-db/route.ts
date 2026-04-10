import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

export async function GET() {
  await addDoc(collection(db, "test"), {
    message: "Firebase connected",
    createdAt: new Date().toISOString()
  });

  return Response.json({ success: true });
}
