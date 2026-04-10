import AuthGuard from "@/components/auth-guard";

export default function DonorDashboard() {
  return (
    <AuthGuard allowedRole="DONOR">
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Donor Dashboard</h1>
            <p className="text-gray-600">Welcome to your donor portal. Here you can track your donations and schedule appointments.</p>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
