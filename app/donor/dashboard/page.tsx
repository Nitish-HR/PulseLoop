"use client";

import AuthGuard from "@/components/auth-guard";
import { useEffect, useState } from "react";

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
  const [activeTab, setActiveTab] = useState<"overview" | "drives">("overview");

  // Drives State
  const [drivesList, setDrivesList] = useState<Drive[]>([]);
  const [loadingDrives, setLoadingDrives] = useState(false);

  // Fetch Global Drives Network
  const fetchDrives = async () => {
    setLoadingDrives(true);
    try {
      // Intentionally omitting bloodBankId query parameter to fetch ALL drives network-wide
      const res = await fetch("/api/drives/all");
      const json = await res.json();
      if (json.success) setDrivesList(json.data);
    } catch (error) {
      console.error("Failed to fetch drives", error);
    } finally {
      setLoadingDrives(false);
    }
  };

  useEffect(() => {
    if (activeTab === "drives") {
      fetchDrives();
    }
  }, [activeTab]);

  return (
    <AuthGuard allowedRole="DONOR">
      <div className="min-h-screen bg-gray-50 flex flex-col">
        
        {/* Navigation / Header */}
        <header className="bg-white px-8 pt-4 sticky top-0 z-10 flex flex-col justify-between shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between pb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Donor Portal</h1>
              <p className="text-sm text-gray-500 font-medium mt-1">Manage Appointments & Find Donation Events</p>
            </div>
            <div className="flex items-center gap-4">
               <div className="h-10 w-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center font-bold border border-red-200 shrink-0">
                 D
               </div>
            </div>
          </div>
          
          <div className="flex gap-8 overflow-x-auto">
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "overview" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button 
              className={`py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === "drives" ? "border-red-600 text-red-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"}`}
              onClick={() => setActiveTab("drives")}
            >
              Discover Drives
            </button>
          </div>
        </header>

        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="flex-1 max-w-4xl mx-auto w-full p-8 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-sm p-12 border border-gray-100 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
                 <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
              <p className="text-gray-500 max-w-md">Your personalized donation statistics and scheduling tools will appear here. Navigate to the Drives tab to find events near you.</p>
            </div>
          </div>
        )}

        {/* DRIVES TAB VIEW */}
        {activeTab === "drives" && (
          <div className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 animate-in fade-in duration-300">
            <div className="mb-8">
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
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                     <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                  </div>
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

      </div>
    </AuthGuard>
  );
}
