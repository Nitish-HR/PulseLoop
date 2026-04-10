import AuthGuard from "@/components/auth-guard";

export default function HospitalDashboard() {
  return (
    <AuthGuard allowedRole="HOSPITAL">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Hospital Dashboard</h1>
            <p className="text-gray-600">Welcome to your hospital portal. Here you can manage your blood requests and inventory.</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
