"use client";

import BloomSpinner from "@/components/BloomSpinner";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ResetPasswordClient() {
  const searchParams = useSearchParams();

  const token = searchParams.get("token") ?? "";
  const email = searchParams.get("email") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const linkIsIncomplete = !token || !email;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");

    if (linkIsIncomplete) {
      setError(
        "This password reset link is incomplete. Please request a new one.",
      );
      return;
    }

    if (newPassword.length < 8) {
      setError("Your new password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          token,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to reset your password. Please request a new link.",
        );
        return;
      }

      setNewPassword("");
      setConfirmPassword("");
      setResetComplete(true);
    } catch (error) {
      console.error("Password reset error:", error);
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        {resetComplete ? (
          <div className="text-center">
            <div className="mb-5 rounded-2xl bg-emerald-100 p-5 text-emerald-800">
              <h1 className="text-3xl font-black">
                Password Reset Successful
              </h1>

              <p className="mt-3">
                Your password has been updated. You can now log in using your
                new password.
              </p>
            </div>

            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-purple-600 px-6 py-4 text-xl font-black text-white transition hover:bg-purple-700"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <>
            <h1 className="text-center text-4xl font-black tracking-tight text-gray-950">
              Reset Password
            </h1>

            <p className="mt-3 text-center text-gray-600">
              Enter a new password for your GetBloomDirect account.
            </p>

            {email && (
              <p className="mt-2 break-all text-center text-sm text-gray-500">
                {email}
              </p>
            )}

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl bg-red-100 p-4 text-center text-red-700"
              >
                {error}
              </div>
            )}

            {linkIsIncomplete ? (
              <div className="mt-8 text-center">
                <p className="text-gray-700">
                  This password reset link is incomplete or invalid.
                </p>

                <Link
                  href="/login"
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-purple-600 px-6 py-4 text-lg font-bold text-white transition hover:bg-purple-700"
                >
                  Request a New Link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div>
                  <label
                    htmlFor="new-password"
                    className="mb-2 block font-bold text-gray-800"
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) =>
                        setNewPassword(event.target.value)
                      }
                      minLength={8}
                      required
                      autoComplete="new-password"
                      className="w-full rounded-2xl border-4 px-5 py-4 pr-20 text-lg focus:border-purple-600 focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword((current) => !current)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-700 hover:text-purple-900"
                    >
                      {showNewPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="confirm-password"
                    className="mb-2 block font-bold text-gray-800"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      minLength={8}
                      required
                      autoComplete="new-password"
                      className="w-full rounded-2xl border-4 px-5 py-4 pr-20 text-lg focus:border-purple-600 focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((current) => !current)
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-700 hover:text-purple-900"
                    >
                      {showConfirmPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Your password must be at least 8 characters long.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-3 rounded-3xl bg-purple-600 py-5 text-xl font-black text-white shadow-xl transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? (
                    <>
                      Resetting Password
                      <BloomSpinner size={26} />
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </main>
  );
}