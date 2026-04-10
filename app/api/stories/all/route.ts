import { NextResponse } from "next/server";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const storiesQuery = query(
      collection(db, "stories"),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const snap = await getDocs(storiesQuery);

    const stories = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return NextResponse.json({ success: true, stories });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch stories" },
      { status: 500 }
    );
  }
}
