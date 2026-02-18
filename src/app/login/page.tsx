// app/login/page.tsx
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BloomSpinner from "@/components/BloomSpinner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [securityCode, setSecurityCode] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoggingIn(true);

    try {
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
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Grab Code From Account Using Email
  const handleForgotPassword = async () => {
    setError("");
    setIsResetting(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          securityCode,
        }),
      });

      const data = await res.json();

      console.log("Response:", data);

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setTempPassword(data.tempPassword);
      setResetSuccess(true);
    } catch (err) {
      console.error("Reset error:", err);
      setError("Server error");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md">
        <h1 className="text-4xl font-black text-purple-600 text-center mb-8">
          BloomDirect Login
        </h1>

        {error && (
          <p className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 text-center">
            {error}
          </p>
        )}

        {isForgotPassword && (
          <div className="space-y-6">
            {!resetSuccess ? (
              <div className="flex flex-col justify-center items-center">
                <p>Enter Account Email</p>
                <input
                  type="email"
                  placeholder="Shop Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-6 py-4 text-xl border-4 rounded-2xl mb-5 focus:border-purple-600"
                />

                <p>Enter Verification Code</p>
                <input
                  type="text"
                  placeholder="Enter Code"
                  value={securityCode}
                  onChange={(e) => setSecurityCode(e.target.value)}
                  required
                  className="w-full px-6 py-4 text-xl border-4 rounded-2xl mb-5 focus:border-purple-600"
                />

                <button
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-2xl py-6 rounded-3xl shadow-xl transition"
                >
                  {isResetting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            ) : (
              <div className="bg-green-100 text-green-800 p-6 rounded-2xl text-center">
                <h3 className="text-2xl font-bold mb-4">
                  Password Reset Successful
                </h3>
                <p className="mb-2">Your temporary password is:</p>
                <p className="text-2xl font-black text-purple-700 mb-4">
                  {tempPassword}
                </p>
                <p>Please log in and change it immediately.</p>
              </div>
            )}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className={isForgotPassword ? "hidden" : "space-y-6"}
        >
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
            disabled={isLoggingIn}
            className={`w-full bg-purple-600 hover:bg-purple-700 text-white font-black text-2xl py-6 rounded-3xl shadow-xl transition
              ${isLoggingIn ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            <span className="flex items-center justify-center gap-3">
              {isLoggingIn ? "Logging In..." : "Log In"}
              {isLoggingIn && <BloomSpinner size={28} />}
            </span>
          </button>
        </form>

        <div
          className="flex w-full justify-between items-center mt-5 px-2"
        >
          <Link
            href="/register"
            className="text-purple-600 text-lg hover:text-purple-800"
          >
            Create Account
          </Link>

          <button
            className={
              isForgotPassword
                ? "hidden"
                : "text-red-500 text-lg hover:text-red-700"
            }
            onClick={() => setIsForgotPassword(true)}
          >
            Forgot Password
          </button>
        </div>

        <button
          className={
            isForgotPassword
              ? "text-purple-600 text-lg w-full mt-5 hover:text-purple-800"
              : "hidden"
          }
          onClick={() => setIsForgotPassword(false)}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}
