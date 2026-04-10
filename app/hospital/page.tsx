import CreateRequestForm from "@/components/hospital/CreateRequestForm";
import RequestList from "@/components/hospital/RequestList";
import { Activity } from "lucide-react";

export default function HospitalDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Hospital Dashboard
              </h1>
              <p className="text-sm font-medium text-gray-500">
                Blood Request Network Portal
              </p>
            </div>
          </div>
          <div className="hidden sm:block">
            <span className="inline-flex items-center bg-gray-100 text-gray-800 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest border border-gray-200">
              City General Hospital (Hospital-1)
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 lg:px-8 py-8 animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Create Request Form */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <CreateRequestForm />
          </div>

          {/* Right Column: Request Status View */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-white border-b border-gray-200 pb-3 flex items-center justify-between shadow-sm p-5 rounded-xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Request Tracking</h2>
                <p className="text-sm text-gray-500 font-medium">Real-time status updates from the blood bank</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Live Sync
              </div>
            </div>
            
            <RequestList />
          </div>

        </div>
      </main>
    </div>
  );
}
