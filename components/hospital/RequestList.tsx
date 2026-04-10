"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ChevronDown, ChevronUp, MapPin, Phone, Droplet, User, Activity, Clock } from "lucide-react";

type RequestStatus = "PENDING" | "IN_PROGRESS" | "FULFILLED";
type Urgency = "CRITICAL" | "URGENT" | "PLANNED";

type RequestItem = {
  id: string;
  bloodGroup: string;
  unitsRequired: number;
  urgency: Urgency;
  city: string;
  status: RequestStatus;
  createdAt: string;
};

// Mock donors data
const MOCK_DONORS = [
  { id: "1", name: "Ramesh Kumar", bloodGroup: "O_POS", phoneNumber: "+91 9876543210", readinessScore: 95, tier: "HIGH", distance: 2.5, daysSinceLastDonation: 120 },
  { id: "2", name: "Priya Sharma", bloodGroup: "A_POS", phoneNumber: "+91 8765432109", readinessScore: 88, tier: "HIGH", distance: 5.1, daysSinceLastDonation: 95 },
  { id: "3", name: "Anil Desai", bloodGroup: "O_NEG", phoneNumber: "+91 7654321098", readinessScore: 65, tier: "MEDIUM", distance: 8.3, daysSinceLastDonation: 150 },
].sort((a, b) => b.readinessScore - a.readinessScore);

export default function RequestList() {
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    // Listen to requests collection where hospitalId == 'hospital1'
    const q = query(
      collection(db, "requests"),
      where("hospitalId", "==", "hospital1")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RequestItem[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as RequestItem);
      });
      
      // Sort in memory since we didn't add a composite index for where + orderBy
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(data);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getUrgencyColor = (urgency: Urgency) => {
    switch (urgency) {
      case "CRITICAL": return "bg-red-100 text-red-800 border-red-200";
      case "URGENT": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "PLANNED": return "bg-blue-100 text-blue-800 border-blue-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: RequestStatus) => {
    switch (status) {
      case "PENDING": return "bg-gray-100 text-gray-700 border-gray-200";
      case "IN_PROGRESS": return "bg-orange-100 text-orange-800 border-orange-200";
      case "FULFILLED": return "bg-green-100 text-green-800 border-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatBloodGroup = (bg: string) => bg.replace("_POS", "+").replace("_NEG", "-");

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Syncing with Blood Network...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Droplet className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">No Active Requests</h3>
        <p className="text-gray-500 text-sm mt-2 max-w-sm">
          Any blood requests you create will appear here and sync in real-time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:border-gray-200">
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              
              {/* Request Info */}
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <span className="text-xl font-black text-red-600 tracking-tighter">
                    {formatBloodGroup(req.bloodGroup)}
                  </span>
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getUrgencyColor(req.urgency)}`}>
                      {req.urgency}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${getStatusColor(req.status)}`}>
                      {req.status.replace("_", " ")}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    {req.unitsRequired} Units Required
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1 font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{req.city}</span>
                  </div>
                </div>
              </div>

              {/* Status Outcome */}
              <div className="sm:text-right shrink-0">
                {req.status === "FULFILLED" ? (
                  <div className="bg-green-50 text-green-700 border border-green-200 rounded-lg px-4 py-2 font-bold flex items-center gap-2">
                    Blood Available ✅
                  </div>
                ) : (
                  <div className="bg-gray-50 text-gray-600 border border-gray-200 rounded-lg px-4 py-2 font-bold flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                    Searching donors... ❌
                  </div>
                )}
              </div>
            </div>
            
            {/* Donor List Expansion (Mock logic) */}
            {req.status !== "FULFILLED" && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => toggleExpand(req.id)}
                  className="w-full flex items-center justify-between text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-indigo-500" />
                    View Priority Donor Leads (AI Matched)
                  </span>
                  {expandedId === req.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {expandedId === req.id && (
                  <div className="mt-4 grid grid-cols-1 gap-3 animate-in slide-in-from-top-2 fade-in duration-300">
                    {MOCK_DONORS.map((donor, idx) => (
                      <div key={donor.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center border border-slate-200 font-bold text-red-600 shrink-0">
                            {formatBloodGroup(donor.bloodGroup)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-gray-900">{donor.name}</h4>
                              <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm border ${
                                donor.tier === "HIGH" ? "bg-green-100 text-green-800 border-green-200" :
                                donor.tier === "MEDIUM" ? "bg-yellow-100 text-yellow-800 border-yellow-200" :
                                "bg-gray-100 text-gray-800 border-gray-200"
                              }`}>
                                {donor.tier} Priority
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 mt-1">
                              <span className="flex items-center gap-1 font-medium"><Phone className="w-3 h-3" /> {donor.phoneNumber}</span>
                              <span className="flex items-center gap-1 font-medium"><MapPin className="w-3 h-3" /> {donor.distance} km</span>
                              <span className="flex items-center gap-1 font-medium"><Clock className="w-3 h-3" /> {donor.daysSinceLastDonation} days ago</span>
                            </div>
                          </div>
                        </div>
                        <div className="sm:text-right shrink-0">
                          <div className="text-xl font-black text-indigo-600">{donor.readinessScore}%</div>
                          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Readiness Match</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
