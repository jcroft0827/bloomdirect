"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-center mb-8">BloomDirect Login</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await signIn("credentials", { email, password, redirect: true, callbackUrl: "/dashboard" });
          }}
          className="space-y-6"
        >
          <input
            type="email"
            placeholder="shop@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg"
            required
          />
          <input
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg"
            required
          />
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700"
          >
            Log in
          </button>
        </form>
        <p className="text-center mt-4 text-sm">
          Test account: test@shop.com / password123
        </p>
      </div>
    </div>
  );
}