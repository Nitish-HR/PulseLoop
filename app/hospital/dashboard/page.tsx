"use client";

import AuthGuard from "@/components/auth-guard";
import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot, addDoc, getDoc, doc, updateDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

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
  hospitalName: string;
  component: string;
  contactName: string;
  contactNumber: string;
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

export default function HospitalDashboard() {
  const [activeTab, setActiveTab] = useState<"create" | "status">("status");
  
  // Auth Identity State
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  
  // Onboarding Interceptor State
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [hospitalsList, setHospitalsList] = useState<{id: string, name: string}[]>([]);
  const [selectedHospital, setSelectedHospital] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Real-time Requests State
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  
  // Create Form State
  const [formLoading, setFormLoading] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    bloodGroup: "A_POS",
    unitsRequired: 1,
    component: "WHOLE",
    urgency: "URGENT",
    hospitalName: "",
    city: "",
    contactName: "",
    contactNumber: "",
  });

  // UI State
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [donorLists, setDonorLists] = useState<Record<string, PriorityDonor[]>>({});
  const [loadingDonors, setLoadingDonors] = useState<Record<string, boolean>>({});
  const [donorErrors, setDonorErrors] = useState<Record<string, string>>({});

  // 1) Initialize Auth & Check DB Mapping
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setAuthUid(user.uid);
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
             const data = userDoc.data();
             if (data.hospitalId) {
                setHospitalId(data.hospitalId);
             } else {
                // Missing relationship identity -> trigger UI Interceptor
                setNeedsOnboarding(true);
                const hSnap = await getDocs(collection(db, "hospitals"));
                const hList = hSnap.docs.map(d => ({ id: d.id, name: d.data().name || d.id }));
                setHospitalsList(hList);
                if (hList.length > 0) setSelectedHospital(hList[0].id);
             }
          }
        } catch (error) {
          console.error("Failed fetching user settings", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // 2) Connect to specific dynamic hospital data endpoint
  useEffect(() => {
    if (!hospitalId) return;
    
    setLoadingRequests(true);
    const q = query(collection(db, "requests"), where("hospitalId", "==", hospitalId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: RequestItem[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as RequestItem);
      });
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setRequests(data);
      setLoadingRequests(false);
    });
    return () => unsubscribe();
  }, [hospitalId]);

  const submitOnboarding = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!authUid || !selectedHospital || !addressInput) return;
     setOnboardLoading(true);
     try {
       await updateDoc(doc(db, "users", authUid), { hospitalId: selectedHospital });
       await fetch("/api/hospital/update-address", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ hospitalId: selectedHospital, address: addressInput })
       });
       setHospitalId(selectedHospital);
       setNeedsOnboarding(false);
     } catch (err) {
       console.error(err);
     } finally {
       setOnboardLoading(false);
     }
  };

  const handleToggleDonors = async (reqId: string) => {
    if (expandedRequestId === reqId) {
      setExpandedRequestId(null);
      return;
    }
    setExpandedRequestId(reqId);

    if (donorLists[reqId]) return;

    setLoadingDonors(prev => ({ ...prev, [reqId]: true }));
    setDonorErrors(prev => ({ ...prev, [reqId]: "" }));

    try {
      const res = await fetch(`/api/donors/priority?requestId=${reqId}`);
      const json = await res.json();
      
      if (json.success) {
        setDonorLists(prev => ({ ...prev, [reqId]: json.donors }));
      } else {
        setDonorErrors(prev => ({ ...prev, [reqId]: json.error || "Unable to fetch donor list" }));
      }
    } catch (error) {
      setDonorErrors(prev => ({ ...prev, [reqId]: "Unable to fetch donor list" }));
    } finally {
      setLoadingDonors(prev => ({ ...prev, [reqId]: false }));
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId) return;
    
    setFormLoading(true);
    setFormError("");
    setFormSuccess(false);

    try {
      const now = new Date().toISOString();

      // Fetch dynamic location maps associated natively
      let lat = 0;
      let lng = 0;
      const hospitalDoc = await getDoc(doc(db, "hospitals", hospitalId));
      if (hospitalDoc.exists() && hospitalDoc.data().lat !== undefined) {
         lat = hospitalDoc.data().lat;
         lng = hospitalDoc.data().lng;
      }

      const newRequest = {
        ...formData,
        hospitalId: hospitalId, // Dynamic insertion explicitly mapping
        lat,
        lng,
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, "requests"), newRequest);
      setFormSuccess(true);
      setFormData({
        bloodGroup: "A_POS", unitsRequired: 1, component: "WHOLE", urgency: "URGENT", hospitalName: "", city: "", contactName: "", contactNumber: ""
      });
      
      setTimeout(() => {
        setFormSuccess(false);
        setActiveTab("status");
      }, 1500);
      
    } catch (err) {
      console.error(err);
      setFormError("Failed to create request. Try again later.");
    } finally {
      setFormLoading(false);
    }
  };

  const formatBloodGroup = (bg: string) => bg.replace("_POS", "+").replace("_NEG", "-");

  // --- INTERCEPTOR RENDER ---
  if (needsOnboarding) {
    return (
      <AuthGuard allowedRole="HOSPITAL">
         <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white max-w-md w-full rounded-2xl p-8 border border-gray-200 shadow-xl shadow-indigo-500/5 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Hospital Affiliation Setup</h1>
                <p className="text-gray-500 text-sm mb-8">Please select which registered Hospital network mapping you originate from below to lock API pathways.</p>

                <form onSubmit={submitOnboarding} className="space-y-4">
                   <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Select Your Hospital</label>
                      <select required value={selectedHospital} onChange={(e)=>setSelectedHospital(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1 font-semibold">
                         {hospitalsList.length === 0 ? <option value="">Loading registries...</option> : null}
                         {hospitalsList.map(h => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                         ))}
                      </select>
                   </div>
                   <div className="text-left">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 mt-4">Precise Location Address</label>
                      <input required type="text" value={addressInput} onChange={(e)=>setAddressInput(e.target.value)} placeholder="e.g. 1st Main Rd, Bangalore" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1 font-semibold"/>
                   </div>
                   <button type="submit" disabled={onboardLoading || hospitalsList.length === 0} className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50">
                      {onboardLoading ? "Locking..." : "Connect Data Dashboard"}
                   </button>
                </form>
            </div>
         </div>
      </AuthGuard>
    )
  }

  // --- STANDARD RENDER ---
  return (
    <AuthGuard allowedRole="HOSPITAL">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Navigation / Header */}
        <header className="bg-white px-8 pt-4 sticky top-0 z-10 flex flex-col justify-between shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hospital Dashboard</h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Live Blood Request System</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="h-10 px-4 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold border border-indigo-200 text-sm truncate max-w-xs shadow-sm">
                 {hospitalsList.find(h => h.id === hospitalId)?.name || "Connected"}
               </div>
            </div>
          </div>
          
          <div className="flex gap-8 overflow-x-auto">
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "status" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("status")}
            >
              Request Status
            </button>
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "create" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("create")}
            >
              Create Blood Request
            </button>
          </div>
        </header>

        {/* CREATE REQUEST TAB */}
        {activeTab === "create" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex justify-center animate-in fade-in duration-300">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 lg:p-8 w-full max-w-4xl">
               <div className="mb-6">
                 <h2 className="text-xl font-bold text-gray-900">Broadcast Blood Requirement</h2>
                 <p className="text-sm text-gray-500 mt-1">Push an emergency or planned blood request directly to the unified network.</p>
               </div>

               {formSuccess && (<div className="mb-6 bg-green-50 text-green-700 p-4 rounded-lg text-sm font-bold border border-green-200">Request broadcasted successfully! Taking you to live tracking...</div>)}
               {formError && (<div className="mb-6 bg-red-50 text-red-700 p-4 rounded-lg text-sm font-bold border border-red-200">{formError}</div>)}

               <form onSubmit={handleCreateRequest} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Col */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Blood Group</label>
                        <select value={formData.bloodGroup} onChange={e => setFormData({...formData, bloodGroup: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1">
                          <option value="A_POS">A+</option><option value="A_NEG">A-</option><option value="B_POS">B+</option><option value="B_NEG">B-</option>
                          <option value="O_POS">O+</option><option value="O_NEG">O-</option><option value="AB_POS">AB+</option><option value="AB_NEG">AB-</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Units Required</label>
                        <input type="number" min="1" required value={formData.unitsRequired} onChange={e=>setFormData({...formData, unitsRequired: parseInt(e.target.value)||1})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Component</label>
                      <select value={formData.component} onChange={e=>setFormData({...formData, component: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1">
                        <option value="WHOLE">Whole Blood</option><option value="PLATELETS">Platelets</option><option value="PLASMA">Plasma</option><option value="PRBC">PRBC</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Urgency</label>
                      <select value={formData.urgency} onChange={e=>setFormData({...formData, urgency: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1">
                        <option value="CRITICAL">Critical</option><option value="URGENT">Urgent</option><option value="PLANNED">Planned</option>
                      </select>
                    </div>
                  </div>

                  {/* Right Col */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hospital Name</label>
                      <input required type="text" value={formData.hospitalName} onChange={e=>setFormData({...formData, hospitalName: e.target.value})} placeholder="e.g. City General" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">City</label>
                      <input required type="text" value={formData.city} onChange={e=>setFormData({...formData, city: e.target.value})} placeholder="e.g. Bangalore" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Officer</label>
                        <input required type="text" value={formData.contactName} onChange={e=>setFormData({...formData, contactName: e.target.value})} placeholder="Dr. XYZ" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Contact Phone</label>
                        <input required type="tel" value={formData.contactNumber} onChange={e=>setFormData({...formData, contactNumber: e.target.value})} placeholder="+91..." className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 focus:ring-1" />
                      </div>
                    </div>
                  </div>

                  {/* Submit Row */}
                  <div className="md:col-span-2 pt-4 border-t border-gray-100 flex justify-end">
                    <button type="submit" disabled={formLoading || !hospitalId} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                       {formLoading ? "Saving Request..." : "Broadcast Request"}
                    </button>
                  </div>
               </form>
            </div>
          </div>
        )}

        {/* STATUS TAB */}
        {activeTab === "status" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 animate-in fade-in duration-300">
            {loadingRequests ? (
              <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mb-4" />
                <p className="font-medium animate-pulse">Syncing network state...</p>
              </div>
            ) : requests.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
                 <p className="text-gray-500 font-medium">You have no active or historical blood requests.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white border border-gray-200 hover:border-indigo-200 rounded-2xl p-5 shadow-sm transition-colors flex flex-col">
                     <div className="flex justify-between items-start mb-3">
                       <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-red-100 text-red-700 font-bold text-sm">
                         {formatBloodGroup(req.bloodGroup)}
                       </span>
                       <span className={`text-xs font-semibold px-2 py-1 rounded ${req.urgency === "CRITICAL" ? "bg-red-600 text-white" : req.urgency === "URGENT" ? "bg-yellow-100 text-yellow-800" : "bg-blue-50 text-blue-600"}`}>
                         {req.urgency}
                       </span>
                     </div>
                     <h3 className="font-bold text-gray-900 truncate">{req.hospitalName}</h3>
                     <p className="text-sm text-gray-600 mt-1">{req.city} • Demanding <span className="font-semibold text-gray-800">{req.unitsRequired}</span> Units</p>

                     <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                       {req.status === "FULFILLED" ? (
                         <div className="bg-green-50 border border-green-200 text-green-700 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm">✅ Blood Available</div>
                       ) : (
                         <div className="bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold px-3 py-1.5 rounded-md flex items-center gap-1.5 shadow-sm">
                           <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"/>
                           Not Available
                         </div>
                       )}

                       <span className={`text-xs font-bold px-2 py-1 rounded ${req.status === "FULFILLED" ? "bg-green-100 text-green-800" : req.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"}`}>
                         {req.status === "IN_PROGRESS" ? "IN PROGRESS" : req.status}
                       </span>
                     </div>

                     {req.status === "IN_PROGRESS" && (
                       <div className="mt-4">
                         <button 
                           onClick={() => handleToggleDonors(req.id)}
                           disabled={loadingDonors[req.id]}
                           className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-800 rounded-lg text-sm font-semibold transition-colors border border-gray-200 disabled:opacity-50"
                         >
                           {expandedRequestId === req.id ? "Hide Donor List" : loadingDonors[req.id] ? "Fetching eligible donors..." : "View Priority Donor List"}
                         </button>

                         {expandedRequestId === req.id && (
                           <div className="mt-3 space-y-2 animate-in slide-in-from-top-1 fade-in duration-200">
                             {loadingDonors[req.id] ? (
                               <div className="text-center py-4 text-sm font-medium text-gray-500 flex items-center justify-center gap-2">
                                 <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                 Fetching eligible donors...
                               </div>
                             ) : donorErrors[req.id] ? (
                               <div className="text-center py-4 text-sm font-bold text-red-600 bg-red-50 rounded-lg border border-red-100">
                                 {donorErrors[req.id]}
                               </div>
                             ) : donorLists[req.id]?.length === 0 ? (
                               <div className="text-center py-4 text-sm font-bold text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                                 No eligible donors found
                               </div>
                             ) : (
                               donorLists[req.id]?.map((donor) => (
                                 <div key={donor.donorId} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                   <div className="flex items-center gap-3">
                                     <div className="h-8 w-8 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center font-bold text-red-600 text-xs shrink-0">{formatBloodGroup(donor.bloodGroup)}</div>
                                     <div>
                                       <p className="font-semibold text-gray-900 text-sm">{donor.name}</p>
                                       <p className="text-[11px] text-gray-500 font-medium">{donor.distance.toFixed(1)}km | {donor.daysSinceLastDonation} days ago</p>
                                     </div>
                                   </div>
                                   <div className="text-right">
                                     <div className="text-sm font-black text-indigo-600">{donor.readinessScore}%</div>
                                     <div className={`px-1.5 py-0.5 mt-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${donor.tier === "HIGH" ? "bg-green-100 text-green-800 border-green-200" : donor.tier === "MEDIUM" ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-gray-200 text-gray-700 border-gray-300"}`}>
                                       {donor.tier}
                                     </div>
                                   </div>
                                 </div>
                               ))
                             )}
                           </div>
                         )}
                       </div>
                     )}
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
