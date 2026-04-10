"use client";

import AuthGuard from "@/components/auth-guard";
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

type Request = {
  id: string;
  bloodGroup: string;
  hospitalName: string;
  unitsRequired: number;
  urgency: "CRITICAL" | "URGENT" | "PLANNED";
  contactName: string;
  contactNumber: string;
  city: string;
};

type PriorityDonor = {
  donorId: string;
  name: string;
  phoneNumber: string;
  bloodGroup: string;
  daysSinceLastDonation: number;
  distance: number;
  readinessScore: number;
  tier: "HIGH" | "MEDIUM" | "LOW";
};

type InventoryStatus = "AVAILABLE" | "NOT_AVAILABLE" | null;

export default function BloodBankDashboard() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>(null);
  const [unitsAvailable, setUnitsAvailable] = useState<number>(0);
  
  const [donorList, setDonorList] = useState<PriorityDonor[]>([]);
  
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // For scope of demo, mapping to Bangalore as per your existing test-DB payloads
  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/requests/active?city=Bangalore");
      const json = await res.json();
      if (json.success) setRequests(json.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSelectRequest = (req: Request) => {
    setSelectedRequest(req);
    setInventoryStatus(null);
    setDonorList([]);
  };

  const handleCheckInventory = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      // For scope of demo, mapping to 'bloodbank1' to match your seeded test Database
      const bloodBankId = "bloodbank1";
      const res = await fetch("/api/bloodbank/check-inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloodGroup: selectedRequest.bloodGroup,
          unitsRequired: selectedRequest.unitsRequired,
          bloodBankId,
        }),
      });
      const json = await res.json();
      if (json.status) {
        setInventoryStatus(json.status);
        setUnitsAvailable(json.unitsAvailable);
      }
    } catch (error) {
      console.error("Failed to check inventory", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfillRequest = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/bloodbank/fulfill-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedRequest(null);
        setInventoryStatus(null);
        fetchRequests(); // Map will omit FULFILLED status records
      }
    } catch (error) {
      console.error("Failed to fulfill request", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateDonors = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/bloodbank/generate-donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: selectedRequest.id }),
      });
      const json = await res.json();
      if (json.success) {
        setDonorList(json.donors);
      }
    } catch (error) {
      console.error("Failed to generate donors", error);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AuthGuard allowedRole="BLOOD_BANK">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        
        {/* Navigation / Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Blood Bank Portal</h1>
            <p className="text-sm text-gray-500 font-medium mt-1">Operational Dashboard & Inventory Management</p>
          </div>
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold border border-red-200">
               BB
             </div>
          </div>
        </header>

        <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Request List */}
          <div className="md:col-span-4 flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Active Requests</h2>
            
            {loadingRequests ? (
              <div className="p-8 text-center text-sm text-gray-500 animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">No active requests found.</div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <button
                    key={req.id}
                    onClick={() => handleSelectRequest(req)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedRequest?.id === req.id
                        ? "bg-red-50 border-red-200 shadow-md ring-1 ring-red-200"
                        : "bg-white border-gray-200 hover:border-red-300 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-red-100 text-red-700 font-bold text-sm">
                        {req.bloodGroup}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          req.urgency === "CRITICAL"
                            ? "bg-red-600 text-white"
                            : req.urgency === "URGENT"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {req.urgency}
                      </span>
                    </div>
                    <h3 className="font-semibold text-gray-900 truncate">{req.hospitalName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Needs <span className="font-semibold text-gray-800">{req.unitsRequired}</span> Units
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Action & Donor Workspace */}
          <div className="md:col-span-8 flex flex-col gap-6">
            {!selectedRequest ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center h-full flex flex-col items-center justify-center">
                <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.773 2.879M7.188 2.239l1.414 1.414M7.188 2.239l-1.414 1.414M16.812 2.239l-.773 2.879M16.812 2.239l-1.414 1.414M16.812 2.239l1.414 1.414M4 21.761l.773-2.879M4 21.761l1.414-1.414M4 21.761l-1.414-1.414M20 21.761l-.773-2.879M20 21.761l-1.414-1.414M20 21.761l1.414-1.414" /></svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Decision Workspace</h3>
                <p className="text-gray-500 max-w-sm">Select a request from the queue to process inventory matches and donor routing.</p>
              </div>
            ) : (
              <>
                {/* DETAILS PANEL */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-5">
                     <span className="text-9xl font-black">{selectedRequest.bloodGroup}</span>
                  </div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900">{selectedRequest.hospitalName}</h2>
                      <p className="text-gray-500 mt-1">{selectedRequest.city} • Request {selectedRequest.id.substring(0,6)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Blood Group</p>
                      <p className="font-bold text-red-600 text-lg">{selectedRequest.bloodGroup}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Units Req.</p>
                      <p className="font-semibold text-gray-900 text-lg">{selectedRequest.unitsRequired}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Contact</p>
                      <p className="font-medium text-gray-900">{selectedRequest.contactName}</p>
                      <p className="text-sm text-gray-500">{selectedRequest.contactNumber}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Urgency</p>
                      <p className="font-medium text-gray-900">{selectedRequest.urgency}</p>
                    </div>
                  </div>

                  {/* ACTION SECTION */}
                  <div className="mt-8 border-t border-gray-100 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Decision Context</h3>

                    {inventoryStatus === null ? (
                      <button
                        onClick={handleCheckInventory}
                        disabled={actionLoading}
                        className="bg-gray-900 text-white font-medium py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center w-fit shadow-md shadow-gray-200"
                      >
                        {actionLoading ? "Checking ledger..." : "Check Local Inventory"}
                      </button>
                    ) : inventoryStatus === "AVAILABLE" ? (
                      <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                          <div className="flex items-center gap-2 text-green-800 font-bold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            Blood Available in Inventory
                          </div>
                          <p className="text-green-700/80 text-sm mt-1">We currently stock {unitsAvailable} units of {selectedRequest.bloodGroup}.</p>
                        </div>
                        <button
                          onClick={handleFulfillRequest}
                          disabled={actionLoading}
                          className="shrink-0 bg-green-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md shadow-green-200"
                        >
                          {actionLoading ? "Fulfilling..." : "Fulfill Request"}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                        <div>
                           <div className="flex items-center gap-2 text-orange-800 font-bold">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Insufficient Stock
                          </div>
                          <p className="text-orange-700/80 text-sm mt-1">Only {unitsAvailable} units of {selectedRequest.bloodGroup} available.</p>
                        </div>
                        <button
                          onClick={handleGenerateDonors}
                          disabled={actionLoading}
                          className="shrink-0 bg-orange-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-orange-700 transition-colors shadow-md shadow-orange-200"
                        >
                           {actionLoading ? "Computing ML Priority..." : "Generate Priority Donor List"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* DONOR LIST HERO SECTION (Rendered only when generated) */}
                {donorList.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-in slide-in-from-top-4 fade-in duration-500">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                       <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                       Algorithm Priority Donors
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      {donorList.map((donor, idx) => (
                        <div key={donor.donorId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="text-xl font-bold text-gray-300 w-6 text-right">
                              #{idx + 1}
                            </div>
                            <div className="h-10 w-10 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center font-bold text-red-600">
                              {donor.bloodGroup}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{donor.name}</p>
                              <p className="text-sm text-gray-500">{donor.phoneNumber}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-6">
                            <div className="hidden sm:block text-right text-sm">
                               <p className="text-gray-900 font-medium">{donor.distance.toFixed(1)} km away</p>
                               <p className="text-gray-500">Last donated {donor.daysSinceLastDonation} days ago</p>
                            </div>
                            
                            <div className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wide border ${
                              donor.tier === "HIGH" 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : donor.tier === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-gray-200 text-gray-700 border-gray-300"
                            }`}>
                              Tier: {donor.tier}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </AuthGuard>
  );
}
