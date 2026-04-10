import { NextRequest, NextResponse } from "next/server";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { donorId, name, story } = body;

    if (!donorId || !name || !story || story.trim().length < 10) {
      return NextResponse.json(
        { error: "Missing required fields or story too short" },
        { status: 400 }
      );
    }

    await addDoc(collection(db, "stories"), {
      donorId,
      name,
      story: story.trim(),
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
