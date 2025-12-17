// app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false, // ← important: we handle redirect ourselves
    });

    if (res?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  };
  

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-black text-purple-600 text-center mb-8">
          BloomDirect Login
        </h1>

        <Link href='/manualpasswordreset' className="hidden">test</Link>

        {error && (
          <p className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 text-center">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <input
            type="email"
            placeholder="Shop Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-6 py-4 text-xl border-4 rounded-2xl focus:border-purple-600"
          />

          <div className="flex flex-col gap-2">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-6 py-4 text-xl border-4 rounded-2xl focus:border-purple-600"
            />
            <div>
              <label className="ml-2 flex gap-1 items-center text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="ml-2"
                />
                Show Password
              </label>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-2xl py-6 rounded-3xl shadow-xl transition"
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  );
}
