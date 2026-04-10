"use client";

import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function CreateRequestForm() {
  const [loading, setLoading] = useState(false);
  const [successStatus, setSuccessStatus] = useState(false);
  const [errorStatus, setErrorStatus] = useState("");

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "unitsRequired" ? parseInt(value) || 1 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorStatus("");
    setSuccessStatus(false);

    try {
      const now = new Date().toISOString();
      const newRequest = {
        ...formData,
        hospitalId: "hospital1", // Static value as requested
        status: "PENDING",
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, "requests"), newRequest);
      setSuccessStatus(true);
      setFormData({
        bloodGroup: "A_POS",
        unitsRequired: 1,
        component: "WHOLE",
        urgency: "URGENT",
        hospitalName: "",
        city: "",
        contactName: "",
        contactNumber: "",
      });

      // Hide success after 3s
      setTimeout(() => setSuccessStatus(false), 3000);
    } catch (err) {
      console.error("Error adding document: ", err);
      setErrorStatus("Failed to create request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          Create Blood Request
        </h2>
        <p className="text-red-100 text-sm opacity-90">
          Submit an emergency or planned blood request to the donor network.
        </p>
      </div>

      <div className="p-6">
        {successStatus && (
          <div className="mb-6 bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3 border border-green-200 animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold text-sm">Request Submitted successfully!</p>
              <p className="text-xs text-green-700 mt-1">
                Your request is now visible in the Blood Bank dashboard.
              </p>
            </div>
          </div>
        )}

        {errorStatus && (
          <div className="mb-6 bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3 border border-red-200 animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <p className="font-bold text-sm">{errorStatus}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Blood Group
              </label>
              <select
                name="bloodGroup"
                value={formData.bloodGroup}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              >
                <option value="A_POS">A+</option>
                <option value="A_NEG">A-</option>
                <option value="B_POS">B+</option>
                <option value="B_NEG">B-</option>
                <option value="AB_POS">AB+</option>
                <option value="AB_NEG">AB-</option>
                <option value="O_POS">O+</option>
                <option value="O_NEG">O-</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Units Required
              </label>
              <input
                type="number"
                name="unitsRequired"
                min="1"
                value={formData.unitsRequired}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Component
              </label>
              <select
                name="component"
                value={formData.component}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              >
                <option value="WHOLE">Whole Blood</option>
                <option value="PLATELETS">Platelets</option>
                <option value="PLASMA">Plasma</option>
                <option value="PRBC">Packed Red Blood Cells (PRBC)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Urgency
              </label>
              <select
                name="urgency"
                value={formData.urgency}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              >
                <option value="CRITICAL">Critical</option>
                <option value="URGENT">Urgent</option>
                <option value="PLANNED">Planned</option>
              </select>
            </div>
            
            <div className="md:col-span-2 border-t border-gray-100 pt-5 mt-2">
              <h3 className="text-sm font-bold text-gray-800 mb-4">Location & Contact</h3>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Hospital Name
              </label>
              <input
                type="text"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
                placeholder="e.g. City General Hospital"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="e.g. Bangalore"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Contact Name
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                placeholder="Dr. John Doe"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">
                Contact Phone
              </label>
              <input
                type="tel"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                placeholder="+91..."
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-lg px-4 py-2.5 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 font-medium transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-all disabled:opacity-60 flex justify-center items-center gap-2 shadow-md hover:shadow-lg"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <span>Submit Request</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
