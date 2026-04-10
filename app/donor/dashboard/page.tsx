"use client";

import AuthGuard from "@/components/auth-guard";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

type DonorDashboardData = {
  eligibilityStatus: "ELIGIBLE" | "NOT_ELIGIBLE";
  nextEligibleDate: string;
  donationCount: number;
  streakCount: number;
  lastDonationDate: string | null;
  churnStatus: "ACTIVE" | "AT_RISK";
  livesImpacted: number;
  activeRequestCount: number;
  address: string;
};

type BloodRequest = {
  id: string;
  bloodGroup: string;
  hospitalName: string;
  unitsRequired: number;
  urgency: "CRITICAL" | "URGENT" | "PLANNED";
  city: string;
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

export default function DonorDashboard() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "emergency" | "drives" | "community">("dashboard");

  // Auth State
  const [authUid, setAuthUid] = useState<string | null>(null);
  const [authProfile, setAuthProfile] = useState<{name: string, email: string}>({name: "", email: ""});
  
  // Onboarding State
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [onboardError, setOnboardError] = useState("");
  const [onboardForm, setOnboardForm] = useState({
    name: "",
    city: "",
    phoneNumber: "",
    bloodGroup: "A_POS",
    address: ""
  });

  // Profile Modal Settings
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileAddress, setProfileAddress] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);

  // State: Dashboard
  const [dashboardData, setDashboardData] = useState<DonorDashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  // State: Emergency
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [isResponding, setIsResponding] = useState<Record<string, boolean>>({});
  const [successResponse, setSuccessResponse] = useState<string | null>(null);

  // State: Drives
  const [drivesList, setDrivesList] = useState<Drive[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(true);

  // State: Community
  const [leaderboard, setLeaderboard] = useState<{donorId:string;name:string;donationCount:number;streakCount:number;bloodGroup:string;city:string}[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [badges, setBadges] = useState<{id:string;badgeType:string;label:string;emoji:string;description:string;awardedAt:string}[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const [stories, setStories] = useState<{id:string;donorId:string;name:string;story:string;createdAt:string}[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [storyText, setStoryText] = useState("");
  const [submittingStory, setSubmittingStory] = useState(false);
  const [storySuccess, setStorySuccess] = useState(false);

  // --- Auth Initializer ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthUid(user.uid);
        setAuthProfile({
          name: user.displayName || "Generous Donor",
          email: user.email || ""
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Fetch Methods ---
  const fetchDashboard = async () => {
    if (!authUid) return;
    setLoadingDashboard(true);
    setNeedsOnboarding(false);
    try {
      const res = await fetch(`/api/donor/dashboard?donorId=${authUid}`);
      const json = await res.json();
      
      if (json.needsOnboarding) {
         setNeedsOnboarding(true);
      } else if (json.success) {
         setDashboardData(json.data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard", error);
    } finally {
      setLoadingDashboard(false);
    }
  };

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

  const fetchDrives = async () => {
    setLoadingDrives(true);
    try {
      const res = await fetch("/api/drives/all");
      const json = await res.json();
      if (json.success) setDrivesList(json.data);
    } catch (error) {
      console.error("Failed to fetch drives", error);
    } finally {
      setLoadingDrives(false);
    }
  };

  const fetchLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch("/api/donor/leaderboard");
      const json = await res.json();
      if (json.success) setLeaderboard(json.leaderboard);
    } catch (e) { console.error(e); }
    finally { setLoadingLeaderboard(false); }
  };

  const fetchBadges = async (uid: string) => {
    setLoadingBadges(true);
    try {
      const res = await fetch(`/api/donor/badges?donorId=${uid}`);
      const json = await res.json();
      if (json.success) setBadges(json.badges);
    } catch (e) { console.error(e); }
    finally { setLoadingBadges(false); }
  };

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const res = await fetch("/api/stories/all");
      const json = await res.json();
      if (json.success) setStories(json.stories);
    } catch (e) { console.error(e); }
    finally { setLoadingStories(false); }
  };

  const submitStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUid || !storyText.trim()) return;
    setSubmittingStory(true);
    setStorySuccess(false);
    try {
      const res = await fetch("/api/stories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorId: authUid, name: authProfile.name, story: storyText }),
      });
      const json = await res.json();
      if (json.success) {
        setStoryText("");
        setStorySuccess(true);
        fetchStories();
        setTimeout(() => setStorySuccess(false), 3000);
      }
    } catch (e) { console.error(e); }
    finally { setSubmittingStory(false); }
  };

  useEffect(() => {
    if (!authUid) return;
    if (activeTab === "dashboard") {
      fetchDashboard();
    } else if (activeTab === "emergency") {
      fetchRequests();
    } else if (activeTab === "drives") {
      fetchDrives();
    } else if (activeTab === "community") {
      fetchLeaderboard();
      fetchBadges(authUid);
      fetchStories();
    }
  }, [activeTab, authUid]);

  // --- Actions ---
  const submitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUid) return;
    setOnboardLoading(true);
    setOnboardError("");
    
    try {
      const res = await fetch("/api/donor/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify((() => {
          const { name: formName, ...rest } = onboardForm;
          return {
            donorId: authUid,
            name: formName || authProfile.name,
            email: authProfile.email,
            ...rest,
          };
        })()),
      });
      const json = await res.json();
      
      if (json.success) {
        fetchDashboard();
      } else {
        setOnboardError(json.error || "Failed to create profile mapping.");
      }
    } catch (error) {
      setOnboardError("Network issues disrupted saving.");
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleRespond = async (requestId: string) => {
    if (!authUid) return;
    setIsResponding(prev => ({ ...prev, [requestId]: true }));
    setSuccessResponse(null);
    try {
      const res = await fetch("/api/donor/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ donorId: authUid, requestId }),
      });
      const json = await res.json();
      if (json.success) {
        setSuccessResponse(requestId);
      }
    } catch (error) {
      console.error("Failed to respond to request", error);
    } finally {
      setIsResponding(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUid) return;
    setProfileLoading(true);
    try {
       const res = await fetch("/api/donor/update-address", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ donorId: authUid, address: profileAddress }),
       });
       const json = await res.json();
       if (json.success) {
          setShowProfileModal(false);
          fetchDashboard(); 
       }
    } catch (err) {
       console.error(err);
    } finally {
       setProfileLoading(false);
    }
  };

  const openProfileSettings = () => {
    setProfileAddress(dashboardData?.address || "");
    setShowProfileModal(true);
  };

  const calculateDaysUntil = (dateStr: string) => {
    const nextDate = new Date(dateStr);
    const today = new Date();
    const diffTime = nextDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  const formatDonationDate = (isoStr: string) => {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // --- INTERCEPTOR Render ---
  if (needsOnboarding) {
    return (
      <AuthGuard allowedRole="DONOR">
         <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 animate-in fade-in duration-500">
            <div className="bg-white max-w-md w-full rounded-2xl p-8 border border-gray-200 shadow-xl shadow-red-500/5">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" /></svg>
                </div>
                <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Complete Your Profile</h1>
                <p className="text-gray-500 text-center text-sm mb-8">We need just a few details to map you to emergencies locally.</p>

                {onboardError && ( <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-bold border border-red-100">{onboardError}</div> )}
                
                <form onSubmit={submitOnboarding} className="space-y-4">
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
                      <input required type="text" value={onboardForm.name} onChange={(e)=>setOnboardForm({...onboardForm, name: e.target.value})} placeholder="e.g. Ravi Kumar" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 transition-colors"/>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">City</label>
                        <input required type="text" value={onboardForm.city} onChange={(e)=>setOnboardForm({...onboardForm, city: e.target.value})} placeholder="e.g. Bangalore" className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 transition-colors"/>
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Blood Group</label>
                        <select required value={onboardForm.bloodGroup} onChange={(e)=>setOnboardForm({...onboardForm, bloodGroup: e.target.value})} className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 font-semibold">
                           <option value="A_POS">A+</option><option value="A_NEG">A-</option><option value="B_POS">B+</option><option value="B_NEG">B-</option>
                           <option value="O_POS">O+</option><option value="O_NEG">O-</option><option value="AB_POS">AB+</option><option value="AB_NEG">AB-</option>
                        </select>
                     </div>
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
                      <input required type="tel" value={onboardForm.phoneNumber} onChange={(e)=>setOnboardForm({...onboardForm, phoneNumber: e.target.value})} placeholder="+91..." className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 transition-colors"/>
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Complete Address</label>
                      <textarea required value={onboardForm.address} onChange={(e)=>setOnboardForm({...onboardForm, address: e.target.value})} placeholder="Full street address for GPS mapping routing..." className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 transition-colors resize-none h-24" />
                   </div>

                   <button type="submit" disabled={onboardLoading} className="w-full pt-2 mt-4 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50">
                      {onboardLoading ? "Mapping Database..." : "Unlock Dashboard"}
                   </button>
                </form>
            </div>
         </div>
      </AuthGuard>
    )
  }

  // --- STANDARD RENDER ---
  return (
    <AuthGuard allowedRole="DONOR">
      <div className="min-h-screen bg-gray-50 flex flex-col relative w-full h-full">
        {/* Profile Details Modal Overlay */}
        {showProfileModal && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
             <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Profile Settings</h3>
                  <button onClick={() => setShowProfileModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Complete Address</label>
                      <textarea required value={profileAddress} onChange={(e)=>setProfileAddress(e.target.value)} placeholder="Full street address for GPS mapping routing..." className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 outline-none focus:border-red-400 focus:ring-1 transition-colors resize-none h-24" />
                  </div>
                  <button type="submit" disabled={profileLoading} className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50">
                     {profileLoading ? "Synchronizing..." : "Update Location Profile"}
                  </button>
                </form>
             </div>
          </div>
        )}

        {/* Header */}
        <header className="bg-white px-8 pt-4 sticky top-0 z-10 flex flex-col justify-between shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Donor Portal</h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Manage Appointments & Find Donation Events</p>
            </div>
            <div className="flex items-center gap-4">
               <button onClick={openProfileSettings} className="h-10 w-10 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold border border-gray-200 shrink-0 transition-colors" title="Settings">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               </button>
               <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold border border-red-200 shrink-0">
                 {authProfile.name.charAt(0).toUpperCase() || "D"}
               </div>
            </div>
          </div>
          
          <div className="flex gap-8 overflow-x-auto">
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "dashboard" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === "emergency" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("emergency")}
            >
              Emergency
            </button>
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "drives" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("drives")}
            >
              Drives
            </button>
            <button
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "community" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("community")}
            >
              Community
            </button>
          </div>
        </header>

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 animate-in fade-in duration-300">
            {loadingDashboard || !dashboardData ? (
               <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                 <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" />
                 <p className="font-medium animate-pulse">Loading dashboard...</p>
               </div>
            ) : (
               <div className="space-y-6 lg:space-y-8">
                 {/* Churn Alert Row */}
                 {dashboardData.churnStatus === "AT_RISK" && (
                   <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
                      <div>
                         <div className="flex items-center gap-2 text-orange-800 font-bold">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                           We Miss You!
                         </div>
                         <p className="text-orange-700/80 text-sm mt-1">You haven’t donated in a while. Someone might need your help right now.</p>
                      </div>
                      <button onClick={() => setActiveTab("emergency")} className="shrink-0 bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-sm">
                         I'm ready to donate
                      </button>
                   </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* Missing Journey Map OR History Block */}
                   <div className={`col-span-1 md:col-span-3 rounded-2xl p-8 border shadow-sm flex flex-col md:flex-row items-center justify-between text-center md:text-left ${dashboardData.lastDonationDate === null ? "bg-red-50 border-red-200" : "bg-white border-gray-200"}`}>
                      {dashboardData.lastDonationDate === null ? (
                         <>
                            <div>
                               <h2 className="text-2xl font-bold text-gray-900 mb-1">Start your donation journey!</h2>
                               <p className="text-gray-500 font-medium max-w-lg mb-4 md:mb-0">You're fully verified and ready but haven't donated yet. Check the emergency networks closely mapped to your region.</p>
                            </div>
                            <button onClick={() => setActiveTab("emergency")} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-colors shrink-0">
                               View Emergencies
                            </button>
                         </>
                      ) : (
                         <>
                            <div>
                               <p className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-1">Historical Status</p>
                               <h2 className={`text-2xl font-black ${dashboardData.eligibilityStatus === "ELIGIBLE" ? "text-green-600" : "text-gray-900"}`}>
                                 {dashboardData.eligibilityStatus === "ELIGIBLE" ? "Eligible to donate" : `Eligible in ${calculateDaysUntil(dashboardData.nextEligibleDate)} days`}
                               </h2>
                            </div>
                            <div className="mt-4 md:mt-0 text-center">
                               <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 shadow-gray-200">Last Visited</p>
                               <div className="bg-gray-100/50 text-gray-800 font-bold tracking-tight px-4 py-2 rounded-lg border border-gray-200">{formatDonationDate(dashboardData.lastDonationDate)}</div>
                            </div>
                         </>
                      )}
                   </div>

                   {/* Stats Grid */}
                   <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center">
                     <p className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Total Donations</p>
                     <p className="text-4xl font-black text-gray-900">{dashboardData.donationCount}</p>
                   </div>
                   <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center">
                     <p className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Current Streak</p>
                     <p className={`text-4xl font-black ${dashboardData.streakCount > 0 ? "text-red-600" : "text-gray-400"}`}>{dashboardData.streakCount} 🔥</p>
                   </div>
                   <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-center bg-gradient-to-br from-blue-50 to-white">
                     <p className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Lives Impacted</p>
                     <p className="text-4xl font-black text-blue-600">{dashboardData.livesImpacted}</p>
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}

        {/* TAB 2: EMERGENCY */}
        {activeTab === "emergency" && (
          <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 animate-in fade-in duration-300">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Active Requests in Your Region</h2>
              <p className="text-sm text-gray-500 mt-1">Hospitals nearby are urgently looking for donors matching your requirements.</p>
            </div>

            {loadingRequests ? (
               <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                 <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" />
                 <p className="font-medium animate-pulse">Scanning live emergency networks...</p>
               </div>
            ) : requests.length === 0 ? (
               <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Requests</h3>
                  <p className="text-gray-500 font-medium">There are currently no active emergencies requiring your response.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {requests.map((req) => (
                   <div key={req.id} className={`bg-white border hover:shadow-md rounded-2xl p-6 shadow-sm transition-all flex flex-col ${successResponse === req.id ? 'border-green-300 bg-green-50/30' : 'border-gray-200'}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                           <span className="inline-flex items-center justify-center px-2.5 py-1 rounded bg-red-100 text-red-700 font-bold text-sm mb-2">{req.bloodGroup.replace("_POS", "+").replace("_NEG", "-")}</span>
                           <h3 className="text-lg font-bold text-gray-900">{req.hospitalName}</h3>
                           <p className="text-sm text-gray-500">{req.city}</p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${req.urgency === "CRITICAL" ? "bg-red-600 text-white" : req.urgency === "URGENT" ? "bg-yellow-100 text-yellow-800" : "bg-blue-50 text-blue-600"}`}>
                           {req.urgency}
                        </span>
                      </div>
                      
                      <div className="mt-auto pt-4 flex items-center justify-between border-t border-gray-100">
                         {successResponse === req.id ? (
                            <div className="flex items-center gap-2 text-green-700 font-bold w-full justify-center bg-green-100 py-3 rounded-xl border border-green-200">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                              You Volunteered!
                            </div>
                         ) : (
                            <button 
                              onClick={() => handleRespond(req.id)}
                              disabled={isResponding[req.id]}
                              className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
                            >
                               {isResponding[req.id] ? "Connecting..." : "I'll Donate"}
                            </button>
                         )}
                      </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* TAB 3: DRIVES */}
        {activeTab === "drives" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 animate-in fade-in duration-300">
            <div className="mb-6">
               <h2 className="text-xl font-bold text-gray-900">Upcoming Donation Events</h2>
               <p className="text-sm text-gray-500 mt-1">Discover regional events hosted by partner Blood Banks and join the cause.</p>
            </div>

            {loadingDrives ? (
               <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mb-4" />
                  <p className="font-medium animate-pulse">Loading global networks...</p>
               </div>
            ) : drivesList.length === 0 ? (
               <div className="bg-white border border-gray-200 rounded-2xl p-16 text-center shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">No Upcoming Events</h3>
                  <p className="text-gray-500 font-medium">There are currently no donation drives scheduled in the network. Check back soon.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {drivesList.map((drive) => (
                   <div key={drive.id} className="bg-white border border-gray-200 hover:border-red-300 hover:shadow-md rounded-2xl p-6 shadow-sm transition-all group flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                         <div className="pr-4">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-red-700 transition-colors">{drive.title}</h3>
                            {drive.purpose && <p className="text-sm text-red-600 font-medium my-1">{drive.purpose}</p>}
                         </div>
                      </div>

                      <div className="space-y-3 mb-6 flex-1">
                        <div className="flex items-start gap-2 text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">
                          <svg className="w-5 h-5 shrink-0 mt-0.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          <div className="text-sm font-semibold">
                            {drive.date} <span className="text-gray-400 mx-1">•</span> {drive.time}
                          </div>
                        </div>

                        <div className="flex items-start gap-2 text-gray-600">
                          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                          <span className="text-sm leading-relaxed">{drive.location}</span>
                        </div>

                        {drive.targetAudience && (
                          <div className="flex items-start gap-2 text-gray-600">
                            <svg className="w-5 h-5 shrink-0 mt-0.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                            <span className="text-sm">{drive.targetAudience}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-sm">
                         <div>
                            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Coordinator</p>
                            <p className="font-medium text-gray-800">{drive.contactName || "Staff"}</p>
                         </div>
                         <div className="text-right">
                             <p className="font-semibold text-red-600">{drive.contactNumber}</p>
                         </div>
                      </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        )}

        {/* TAB 4: COMMUNITY */}
        {activeTab === "community" && (
          <div className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8 space-y-8">

            {/* LEADERBOARD */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">🏆 Top Donors</h2>
                <p className="text-sm text-gray-500 mt-0.5">Ranked by lifetime donation count</p>
              </div>
              {loadingLeaderboard ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading leaderboard...</div>
              ) : leaderboard.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No donations recorded yet. Be the first!</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {leaderboard.map((donor, idx) => (
                    <div key={donor.donorId} className="flex items-center gap-4 px-6 py-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${
                        idx === 0 ? "bg-yellow-100 text-yellow-700" :
                        idx === 1 ? "bg-gray-100 text-gray-600" :
                        idx === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-gray-50 text-gray-500"
                      }`}>{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{donor.name} {donor.donorId === authUid ? <span className="text-xs font-normal text-red-500 ml-1">(You)</span> : null}</p>
                        <p className="text-xs text-gray-500">{donor.city} · {donor.bloodGroup.replace("_POS","+").replace("_NEG","-")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900">{donor.donationCount}</p>
                        <p className="text-xs text-gray-500">donations</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* BADGES */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">🎖️ Your Badges</h2>
                <p className="text-sm text-gray-500 mt-0.5">Earned through your donation milestones</p>
              </div>
              {loadingBadges ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading badges...</div>
              ) : badges.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-500 text-sm font-medium">No badges yet — make your first donation to get started!</p>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className="border border-gray-100 rounded-xl p-4 text-center bg-gray-50">
                      <div className="text-3xl mb-2">{badge.emoji}</div>
                      <p className="font-bold text-gray-900 text-sm">{badge.label}</p>
                      <p className="text-xs text-gray-500 mt-1">{badge.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* STORIES */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">💬 Donor Stories</h2>
                <p className="text-sm text-gray-500 mt-0.5">Share what drives you to donate</p>
              </div>

              {/* Submit Story */}
              <div className="p-6 border-b border-gray-100">
                {storySuccess && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm font-semibold rounded-lg">Your story has been shared!</div>
                )}
                <form onSubmit={submitStory} className="space-y-3">
                  <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    placeholder="Tell the community why you donate blood..."
                    rows={3}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-1 resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingStory || storyText.trim().length < 10}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {submittingStory ? "Sharing..." : "Share Story"}
                    </button>
                  </div>
                </form>
              </div>

              {/* Stories List */}
              {loadingStories ? (
                <div className="p-8 text-center text-gray-400 text-sm">Loading stories...</div>
              ) : stories.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">No stories yet. Be the first to share!</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stories.map((s) => (
                    <div key={s.id} className="px-6 py-5">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                      </div>
                      <p className="text-gray-600 text-sm leading-relaxed">{s.story}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </AuthGuard>
  );
}
