"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRole?: "DONOR" | "HOSPITAL" | "BLOOD_BANK";
}

export default function AuthGuard({ children, allowedRole }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      if (allowedRole) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.role !== allowedRole) {
              // Redirect cross-role accesses to their valid dashboards
              if (userData.role === "DONOR") router.replace("/donor/dashboard");
              else if (userData.role === "HOSPITAL") router.replace("/hospital/dashboard");
              else if (userData.role === "BLOOD_BANK") router.replace("/bloodbank/dashboard");
              else router.replace("/login");
            } else {
              setLoading(false); // Valid role
            }
          } else {
            router.replace("/login");
          }
        } catch (error) {
          console.error("Error fetching user role", error);
          router.replace("/login");
        }
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, allowedRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500 animate-pulse">Loading dashboard...</div>
      </div>
    );
  }

  return <>{children}</>;
}
