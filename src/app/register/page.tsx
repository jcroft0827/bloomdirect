"use client";
import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    shopName: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      alert("Shop created! You can now log in.");
      window.location.href = "/login";
    } else {
      alert("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-lg w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Join BloomDirect</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input placeholder="Shop Name" required className="w-full px-4 py-3 border rounded-lg"
            onChange={(e) => setForm({ ...form, shopName: e.target.value })} />
          <input type="email" placeholder="Email" required className="w-full px-4 py-3 border rounded-lg"
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input type="password" placeholder="Password" required className="w-full px-4 py-3 border rounded-lg"
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input placeholder="Phone" className="w-full px-4 py-3 border rounded-lg"
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="Address" className="w-full px-4 py-3 border rounded-lg"
            onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <input placeholder="City" className="px-4 py-3 border rounded-lg"
              onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input placeholder="State" className="px-4 py-3 border rounded-lg"
              onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input placeholder="ZIP" className="px-4 py-3 border rounded-lg"
              onChange={(e) => setForm({ ...form, zip: e.target.value })} />
          </div>
          <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700">
            Create My Shop
          </button>
        </form>
      </div>
    </div>
  );
}