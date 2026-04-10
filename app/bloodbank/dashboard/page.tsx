"use client";

import AuthGuard from "@/components/auth-guard";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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

type Drive = {
  id: string;
  bloodBankId: string;
  title: string;
  purpose: string;
  date: string;
  time: string;
  location: string;
  contactName: string;
  contactNumber: string;
  targetAudience: string;
};

type InventoryStatus = "AVAILABLE" | "NOT_AVAILABLE" | null;
type InventoryItem = { bloodGroup: string; unitsAvailable: number };

export default function BloodBankDashboard() {
  const [activeTab, setActiveTab] = useState<"home" | "requests" | "inventory" | "drives">("home");

  // Auth Identity State
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [bloodBankId, setBloodBankId] = useState<string | null>(null);

  // Onboarding Interceptor State
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [bloodBanksList, setBloodBanksList] = useState<{id: string, name: string}[]>([]);
  const [selectedBloodBank, setSelectedBloodBank] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Requests State
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus>(null);
  const [unitsAvailable, setUnitsAvailable] = useState<number>(0);
  const [donorList, setDonorList] = useState<PriorityDonor[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Inventory State
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  // Manage Inventory State
  const [manageBg, setManageBg] = useState("A_POS");
  const [manageUnits, setManageUnits] = useState(1);
  const [inventoryActionLoading, setInventoryActionLoading] = useState(false);
  const [inventoryError, setInventoryError] = useState("");

  // Drives State
  const [drivesList, setDrivesList] = useState<Drive[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);
  const [driveActionLoading, setDriveActionLoading] = useState(false);
  const [driveForm, setDriveForm] = useState({
    title: "", purpose: "", date: "", time: "", location: "", contactName: "", contactNumber: "", targetAudience: ""
  });

  // 1) Initialize Auth & Check DB Mapping
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUid(user.uid);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
             const data = userDoc.data();
             if (data.bloodBankId) {
                setBloodBankId(data.bloodBankId);
             } else {
                setNeedsOnboarding(true);
                const bbSnap = await getDocs(collection(db, "bloodBanks"));
                const bbList = bbSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
                setBloodBanksList(bbList);
                if (bbList.length > 0) setSelectedBloodBank(bbList[0].id);
             }
          }
        } catch (error) {
          console.error("Failed fetching user settings", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const submitOnboarding = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!authUid || !selectedBloodBank || !addressInput) return;
     setOnboardLoading(true);
     try {
       await updateDoc(doc(db, "users", authUid), { bloodBankId: selectedBloodBank });
       await fetch("/api/bloodbank/update-address", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ bloodBankId: selectedBloodBank, address: addressInput })
       });
       setBloodBankId(selectedBloodBank);
       setNeedsOnboarding(false);
     } catch (err) {
       console.error(err);
     } finally {
       setOnboardLoading(false);
     }
  };


  const fetchRequests = async () => {
    setLoadingRequests(true);
    try {
      const res = await fetch("/api/requests/active");
      const json = await res.json();
      if (json.success) setRequests(json.data);
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchInventoryItems = async () => {
    if (!bloodBankId) return;
    setLoadingInventory(true);
    try {
      const res = await fetch(`/api/bloodbank/inventory?bloodBankId=${bloodBankId}`);
      const json = await res.json();
      if (json.inventory) setInventoryList(json.inventory);
    } catch (error) {
      console.error("Failed to fetch inventory", error);
    } finally {
      setLoadingInventory(false);
    }
  };

  const fetchDrives = async () => {
    if (!bloodBankId) return;
    setLoadingDrives(true);
    try {
      const res = await fetch(`/api/drives/all?bloodBankId=${bloodBankId}`);
      const json = await res.json();
      if (json.success) setDrivesList(json.data);
    } catch (error) {
      console.error("Failed to fetch drives", error);
    } finally {
      setLoadingDrives(false);
    }
  };

  useEffect(() => {
    if (!bloodBankId) return;
    
    if (activeTab === "requests") {
      fetchRequests();
    } else if (activeTab === "inventory") {
      fetchInventoryItems();
    } else if (activeTab === "drives") {
      fetchDrives();
    } else if (activeTab === "home") {
      fetchRequests();
      fetchInventoryItems();
    }
  }, [activeTab, bloodBankId]);

  /* ================= ACTION HANDLERS ================= */

  const handleSelectRequest = (req: Request) => {
    setSelectedRequest(req);
    setInventoryStatus(null);
    setDonorList([]);
  };

  const navigateToRequest = (req: Request) => {
    setActiveTab("requests");
    handleSelectRequest(req);
  };

  const handleCheckInventory = async () => {
    if (!selectedRequest || !bloodBankId) return;
    setActionLoading(true);
    try {
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
        fetchRequests(); 
        if (activeTab === "home") fetchInventoryItems();
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

  const handleModifyInventory = async (action: "add-stock" | "withdraw-stock") => {
    if (!bloodBankId) return;
    if (manageUnits < 1) {
      setInventoryError("Units must be at least 1.");
      return;
    }
    setInventoryActionLoading(true);
    setInventoryError("");
    try {
      const res = await fetch(`/api/bloodbank/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloodBankId, bloodGroup: manageBg, units: manageUnits }),
      });
      const json = await res.json();
      if (json.success) {
        fetchInventoryItems(); 
      } else {
        setInventoryError(json.error || "Failed to update inventory.");
      }
    } catch (error) {
      setInventoryError("Network error occurred.");
    } finally {
      setInventoryActionLoading(false);
    }
  };

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bloodBankId) return;
    setDriveActionLoading(true);
    try {
      const res = await fetch("/api/bloodbank/create-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloodBankId, ...driveForm }),
      });
      const json = await res.json();
      if (json.success) {
        setDriveForm({
          title: "", purpose: "", date: "", time: "", location: "", contactName: "", contactNumber: "", targetAudience: ""
        });
        fetchDrives();
      } else {
        console.error("Failed", json.error);
      }
    } catch (error) {
      console.error("Failed to create drive", error);
    } finally {
      setDriveActionLoading(false);
    }
  };

  const formatBloodGroup = (bg: string) => bg.replace("_POS", "+").replace("_NEG", "-");

  // --- INTERCEPTOR RENDER ---
  if (needsOnboarding) {
    return (
      <AuthGuard allowedRole="BLOOD_BANK">
         <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white max-w-md w-full rounded-2xl p-8 border border-gray-200 shadow-xl shadow-red-500/5 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Blood Bank Affiliation</h1>
                <p className="text-gray-500 text-sm mb-8">Please map your administrative account to a registered Blood Bank entity.</p>

                <form onSubmit={submitOnboarding} className="space-y-4">
                   <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Your Registry</label>
                      <select required value={selectedBloodBank} onChange={(e)=>setSelectedBloodBank(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 font-semibold">
                         {bloodBanksList.length === 0 ? <option value="">Loading registries...</option> : null}
                         {bloodBanksList.map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                         ))}
                      </select>
                   </div>
                   <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4">Precise Location Address</label>
                      <input required type="text" value={addressInput} onChange={(e)=>setAddressInput(e.target.value)} placeholder="e.g. 1st Main Rd, Bangalore" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 font-semibold"/>
                   </div>
                   <button type="submit" disabled={onboardLoading || bloodBanksList.length === 0} className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50">
                      {onboardLoading ? "Locking..." : "Initialize Portals"}
                   </button>
                </form>
            </div>
         </div>
      </AuthGuard>
    )
  }

  // --- STANDARD RENDER ---
  return (
    <AuthGuard allowedRole="BLOOD_BANK">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        
        {/* Navigation / Header */}
        <header className="bg-white px-8 pt-4 sticky top-0 z-10 flex flex-col justify-between shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Blood Bank Portal</h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Operational Dashboard & Inventory Management</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="h-10 px-4 bg-red-100 text-red-700 rounded-lg flex items-center justify-center font-bold border border-red-200 text-sm truncate max-w-xs shadow-sm">
                 {bloodBanksList.find(b => b.id === bloodBankId)?.name || "Connected Entity"}
               </div>
            </div>
          </div>
          
          <div className="flex gap-8 overflow-x-auto">
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "home" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("home")}
            >
              Home
            </button>
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "requests" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("requests")}
            >
              Requests Workspace
            </button>
            <button 
               className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "inventory" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("inventory")}
            >
              Inventory Ledgers
            </button>
            <button 
               className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "drives" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("drives")}
            >
              Donation Drives
            </button>
          </div>
        </header>

        {/* HOME TAB VIEW */}
        {activeTab === "home" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            {/* HOME LEFT: Request Glimpse */}
            <div className="md:col-span-5 flex flex-col gap-4">
               <div className="flex items-center justify-between border-b pb-2">
                 <h2 className="text-lg font-semibold text-gray-800">Priority Requests</h2>
                 <button onClick={() => setActiveTab("requests")} className="text-sm font-semibold text-red-600 hover:text-red-700 transition">View All →</button>
               </div>
               {loadingRequests ? (
                  <div className="p-8 text-center text-sm text-gray-500 animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm">Loading active requests...</div>
                ) : requests.length === 0 ? (
                  <div className="p-8 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">All caught up! No active requests.</div>
                ) : (
                  <div className="space-y-3">
                    {requests.slice(0, 5).map((req) => (
                      <button key={req.id} onClick={() => navigateToRequest(req)} className="w-full text-left p-4 rounded-xl border transition-all bg-white border-gray-200 hover:border-red-300 hover:shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-red-100 text-red-700 font-bold text-sm">
                            {req.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}
                          </span>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${req.urgency === "CRITICAL" ? "bg-red-600 text-white" : req.urgency === "URGENT" ? "bg-yellow-100 text-yellow-800" : "bg-blue-50 text-blue-600"}`}>
                            {req.urgency}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-900 truncate">{req.hospitalName}</h3>
                        <p className="text-sm text-gray-600 mt-1">Needs <span className="font-semibold text-gray-800">{req.unitsRequired}</span> Units</p>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {/* HOME RIGHT: Inventory Glimpse */}
            <div className="md:col-span-7 flex flex-col gap-4">
               <div className="flex items-center justify-between border-b pb-2">
                 <h2 className="text-lg font-semibold text-gray-800">Inventory Snapshot</h2>
                 <button onClick={() => setActiveTab("inventory")} className="text-sm font-semibold text-red-600 hover:text-red-700 transition">Manage Stock →</button>
               </div>
               {loadingInventory ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-100 shadow-sm">
                   <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" />
                   <p className="font-medium animate-pulse">Scanning ledger...</p>
                </div>
               ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {inventoryList.map((item) => (
                    <div key={item.bloodGroup} className={`p-4 rounded-xl border bg-white shadow-sm flex items-center justify-between transition-opacity ${item.unitsAvailable === 0 ? "border-gray-200 opacity-60" : "border-red-100"}`}>
                      <div><h3 className={`text-xl font-black ${item.unitsAvailable === 0 ? "text-gray-400" : "text-red-600"}`}>{formatBloodGroup(item.bloodGroup)}</h3></div>
                      <div className="text-right flex flex-col items-end">
                         {item.unitsAvailable > 0 ? (
                           <div className="flex items-baseline gap-1">
                             <p className="text-2xl font-bold text-gray-900 leading-none">{item.unitsAvailable}</p>
                             <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Units</p>
                           </div>
                         ) : ( <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full inline-block">Out of stock</p> )}
                      </div>
                    </div>
                  ))}
                </div>
               )}
            </div>
          </div>
        )}

        {/* REQUESTS TAB VIEW */}
        {activeTab === "requests" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start animate-in fade-in duration-300">
            {/* LEFT COLUMN: Request List */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <h2 className="text-lg font-semibold text-gray-800 border-b pb-2">Active Queue</h2>
              {loadingRequests ? (
                <div className="p-8 text-center text-sm text-gray-500 animate-pulse bg-white rounded-xl border border-gray-100 shadow-sm">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">No active requests found.</div>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <button key={req.id} onClick={() => handleSelectRequest(req)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedRequest?.id === req.id ? "bg-red-50 border-red-200 shadow-md ring-1 ring-red-200" : "bg-white border-gray-200 hover:border-red-300 hover:shadow-sm"}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-red-100 text-red-700 font-bold text-sm">{req.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}</span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${req.urgency === "CRITICAL" ? "bg-red-600 text-white" : req.urgency === "URGENT" ? "bg-yellow-100 text-yellow-800" : "bg-blue-50 text-blue-600"}`}>{req.urgency}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 truncate">{req.hospitalName}</h3>
                      <p className="text-sm text-gray-600 mt-1">Needs <span className="font-semibold text-gray-800">{req.unitsRequired}</span> Units</p>
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
                    <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-5"><span className="text-9xl font-black">{selectedRequest.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}</span></div>
                    <div className="flex justify-between items-start mb-6">
                      <div><h2 className="text-2xl font-bold text-gray-900">{selectedRequest.hospitalName}</h2><p className="text-gray-500 mt-1">{selectedRequest.city} • Request {selectedRequest.id.substring(0,6)}</p></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <div><p className="text-xs text-gray-500 uppercase font-semibold mb-1">Blood Group</p><p className="font-bold text-red-600 text-lg">{selectedRequest.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-semibold mb-1">Units Req.</p><p className="font-semibold text-gray-900 text-lg">{selectedRequest.unitsRequired}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-semibold mb-1">Contact</p><p className="font-medium text-gray-900">{selectedRequest.contactName}</p><p className="text-sm text-gray-500">{selectedRequest.contactNumber}</p></div>
                      <div><p className="text-xs text-gray-500 uppercase font-semibold mb-1">Urgency</p><p className="font-medium text-gray-900">{selectedRequest.urgency}</p></div>
                    </div>
                    {/* ACTION SECTION */}
                    <div className="mt-8 border-t border-gray-100 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">Decision Context</h3>
                      {inventoryStatus === null ? (
                        <button onClick={handleCheckInventory} disabled={actionLoading} className="bg-gray-900 text-white font-medium py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50 shadow-md">
                          {actionLoading ? "Checking ledger..." : "Check Local Inventory"}
                        </button>
                      ) : inventoryStatus === "AVAILABLE" ? (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2 text-green-800 font-bold"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Blood Available in Inventory</div>
                            <p className="text-green-700/80 text-sm mt-1">We currently stock {unitsAvailable} units of {selectedRequest.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}.</p>
                          </div>
                          <button onClick={handleFulfillRequest} disabled={actionLoading} className="shrink-0 bg-green-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-green-700 shadow-md transition-colors">{actionLoading ? "Fulfilling..." : "Fulfill Request"}</button>
                        </div>
                      ) : (
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                          <div>
                            <div className="flex items-center gap-2 text-orange-800 font-bold"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>Insufficient Stock</div>
                            <p className="text-orange-700/80 text-sm mt-1">Only {unitsAvailable} units of {selectedRequest.bloodGroup.replace("_POS", "+").replace("_NEG", "-")} available.</p>
                          </div>
                          <button onClick={handleGenerateDonors} disabled={actionLoading} className="shrink-0 bg-orange-600 text-white font-medium py-2.5 px-6 rounded-lg shadow-md hover:bg-orange-700 transition-colors">{actionLoading ? "Computing ML Priority..." : "Generate Priority Donor List"}</button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* ML DONORS */}
                  {donorList.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 animate-in slide-in-from-top-4 fade-in duration-500">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>Algorithm Priority Donors</h3>
                      <div className="grid grid-cols-1 gap-4">
                        {donorList.map((donor, idx) => (
                          <div key={donor.donorId} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="text-xl font-bold text-gray-300 w-6 text-right">#{idx + 1}</div>
                              <div className="h-10 w-10 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center font-bold text-red-600">{donor.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}</div>
                              <div><p className="font-semibold text-gray-900">{donor.name}</p><p className="text-sm text-gray-500">{donor.phoneNumber}</p></div>
                            </div>
                            <div className="flex items-center gap-6">
                              <div className="hidden sm:block text-right text-sm"><p className="text-gray-900 font-medium">{donor.distance.toFixed(1)} km away</p><p className="text-gray-500">Last donated {donor.daysSinceLastDonation} days ago</p></div>
                              <div className={`px-3 py-1.5 rounded-md font-bold text-xs uppercase tracking-wide border ${donor.tier === "HIGH" ? "bg-green-100 text-green-800 border-green-200" : donor.tier === "MEDIUM" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-gray-200 text-gray-700 border-gray-300"}`}>Tier: {donor.tier}</div>
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
        )}

        {/* INVENTORY TAB VIEW */}
        {activeTab === "inventory" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 animate-in fade-in duration-300">
            {/* CONTROL PANEL */}
            <div className="mb-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 max-w-3xl">
               <h3 className="text-lg font-bold text-gray-900 mb-4">Manage Blood Stock</h3>
               {inventoryError && (<div className="mb-4 bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200 animate-in fade-in">{inventoryError}</div>)}
               <div className="flex flex-col sm:flex-row gap-4 items-end">
                  <div className="flex-1 w-full">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Blood Group</label>
                     <select value={manageBg} onChange={(e) => setManageBg(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 font-semibold">
                       <option value="A_POS">A+</option><option value="A_NEG">A-</option><option value="B_POS">B+</option><option value="B_NEG">B-</option>
                       <option value="O_POS">O+</option><option value="O_NEG">O-</option><option value="AB_POS">AB+</option><option value="AB_NEG">AB-</option>
                     </select>
                  </div>
                  <div className="w-full sm:w-32">
                     <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Units</label>
                     <input type="number" min="1" value={manageUnits} onChange={(e) => setManageUnits(parseInt(e.target.value) || 1)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 font-semibold" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button disabled={inventoryActionLoading} onClick={() => handleModifyInventory("add-stock")} className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50">+ Add</button>
                    <button disabled={inventoryActionLoading} onClick={() => handleModifyInventory("withdraw-stock")} className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50">- Withdraw</button>
                  </div>
               </div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-6">Current Local Stock</h2>
            {loadingInventory ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" /><p className="font-medium animate-pulse">Loading ledgers...</p></div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {inventoryList.map((item) => (
                  <div key={item.bloodGroup} className={`p-6 rounded-2xl border bg-white shadow-sm flex items-center justify-between transition-opacity ${item.unitsAvailable === 0 ? "border-gray-200 opacity-60" : "border-red-100 ring-1 ring-red-50"}`}>
                    <div><p className={`text-xs font-bold mb-1 uppercase tracking-wider ${item.unitsAvailable === 0 ? "text-gray-400" : "text-gray-500"}`}>Blood Group</p><h3 className={`text-2xl font-black ${item.unitsAvailable === 0 ? "text-gray-400" : "text-red-600"}`}>{formatBloodGroup(item.bloodGroup)}</h3></div>
                    <div className="text-right flex flex-col items-end">
                       {item.unitsAvailable > 0 ? ( <><p className="text-3xl font-bold text-gray-900">{item.unitsAvailable}</p><p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Units</p></> ) : ( <><p className="text-2xl font-bold text-gray-300">0</p><p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5 bg-gray-100 px-2 py-0.5 rounded-full inline-block">Out of stock</p></> )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* DONATION DRIVES TAB VIEW */}
        {activeTab === "drives" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 animate-in fade-in duration-300">
            
            {/* DRIVES CONTROL PANEL */}
            <div className="mb-8 bg-white border border-gray-200 rounded-2xl shadow-sm p-6 lg:p-8">
               <div className="mb-6">
                 <h2 className="text-xl font-bold text-gray-900">Host a Donation Drive</h2>
                 <p className="text-sm text-gray-500 mt-1">Broadcast an event mapping directly to the global Donor Dashboard network.</p>
               </div>

               <form onSubmit={handleCreateDrive} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Col */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Event Title</label>
                      <input required type="text" value={driveForm.title} onChange={(e)=>setDriveForm({...driveForm, title: e.target.value})} placeholder="e.g. Summer Blood Drive" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Primary Purpose</label>
                      <input type="text" value={driveForm.purpose} onChange={(e)=>setDriveForm({...driveForm, purpose: e.target.value})} placeholder="e.g. Replenishing O- Shortage" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Target Audience</label>
                      <input type="text" value={driveForm.targetAudience} onChange={(e)=>setDriveForm({...driveForm, targetAudience: e.target.value})} placeholder="e.g. University Students" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                    </div>
                  </div>

                  {/* Right Col */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Date</label>
                        <input required type="date" value={driveForm.date} onChange={(e)=>setDriveForm({...driveForm, date: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Time</label>
                        <input required type="time" value={driveForm.time} onChange={(e)=>setDriveForm({...driveForm, time: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Complete Location</label>
                      <input required type="text" value={driveForm.location} onChange={(e)=>setDriveForm({...driveForm, location: e.target.value})} placeholder="e.g. Main Hall, Bangalore Comm Center" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Coordinator</label>
                        <input type="text" value={driveForm.contactName} onChange={(e)=>setDriveForm({...driveForm, contactName: e.target.value})} placeholder="Contact Name" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone</label>
                        <input type="tel" value={driveForm.contactNumber} onChange={(e)=>setDriveForm({...driveForm, contactNumber: e.target.value})} placeholder="+91..." className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1"/>
                      </div>
                    </div>
                  </div>

                  {/* Submission Row */}
                  <div className="md:col-span-2 pt-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={driveActionLoading || !bloodBankId} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2">
                       {driveActionLoading ? "Broadcasting..." : "Create Drive Event"}
                    </button>
                  </div>
               </form>
            </div>

            {/* UPCOMING DRIVES GRID */}
            <h2 className="text-xl font-bold text-gray-800 mb-6">Your Scheduled Drives</h2>
            {loadingDrives ? (
               <div className="py-12 flex flex-col items-center justify-center text-gray-400"><div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" /><p className="font-medium animate-pulse">Loading drive network...</p></div>
            ) : drivesList.length === 0 ? (
               <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                  <p className="text-gray-500 font-medium">You haven't scheduled any donation campaigns yet.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {drivesList.map((drive) => (
                   <div key={drive.id} className="bg-white border border-gray-200 hover:border-red-200 rounded-2xl p-6 shadow-sm transition-colors">
                      <div className="flex justify-between items-start mb-4">
                         <div>
                            <h3 className="text-xl font-bold text-gray-900">{drive.title}</h3>
                            {drive.purpose && <p className="text-sm text-red-600 font-medium my-1">{drive.purpose}</p>}
                         </div>
                         <div className="text-right shrink-0">
                           <span className="inline-block bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 rounded-md text-xs font-bold tracking-wider">
                             {drive.date}
                           </span>
                           <p className="text-sm font-semibold text-gray-500 mt-1">{drive.time}</p>
                         </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-start gap-2 text-gray-600">
                          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          <span className="text-sm">{drive.location}</span>
                        </div>
                        {drive.targetAudience && (
                          <div className="flex items-start gap-2 text-gray-600">
                            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <span className="text-sm">{drive.targetAudience}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                         <div className="font-medium text-gray-800">{drive.contactName || "Coordinator"}</div>
                         <div className="font-semibold text-gray-500">{drive.contactNumber}</div>
                      </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

      </div>
    </AuthGuard>
  );
}
