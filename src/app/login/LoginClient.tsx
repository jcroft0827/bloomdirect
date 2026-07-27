"use client";

import BloomSpinner from "@/components/BloomSpinner";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginClient() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setResetMessage("");
    setIsLoggingIn(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("Login error:", error);
      setError("Unable to log in right now. Please try again.");
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function handleForgotPassword(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setResetMessage("");

    if (!email.trim()) {
      setError("Please enter your account email address.");
      return;
    }

    setIsSendingReset(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error ||
            "Unable to send the password reset email. Please try again.",
        );
        return;
      }

      setResetMessage(
        data.message ||
          "If an account exists for that email address, a password reset link has been sent.",
      );
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSendingReset(false);
    }
  }

  function returnToLogin() {
    setIsForgotPassword(false);
    setError("");
    setResetMessage("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
        <h1 className="text-center text-4xl font-black tracking-tight text-gray-950">
          {isForgotPassword ? "Reset Your Password" : "Welcome Back"}
        </h1>

        <p className="mt-3 text-center text-gray-600">
          {isForgotPassword
            ? "Enter your email and we’ll send you a secure reset link."
            : "Log in to your GetBloomDirect account."}
        </p>

        {error && (
          <p
            role="alert"
            className="mt-6 rounded-xl bg-red-100 p-4 text-center text-red-700"
          >
            {error}
          </p>
        )}

        {resetMessage && (
          <div className="mt-6 rounded-xl bg-emerald-100 p-4 text-center text-emerald-800">
            <p className="font-bold">Check your email</p>
            <p className="mt-1 text-sm">{resetMessage}</p>
          </div>
        )}

        {isForgotPassword ? (
          <form
            onSubmit={handleForgotPassword}
            className="mt-8 space-y-6"
          >
            <div>
              <label
                htmlFor="reset-email"
                className="mb-2 block font-bold text-gray-800"
              >
                Account Email
              </label>

              <input
                id="reset-email"
                type="email"
                placeholder="Shop Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-2xl border-4 px-6 py-4 text-xl focus:border-purple-600 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSendingReset || Boolean(resetMessage)}
              className="flex w-full items-center justify-center gap-3 rounded-3xl bg-purple-600 py-5 text-xl font-black text-white shadow-xl transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSendingReset ? (
                <>
                  Sending Reset Link
                  <BloomSpinner size={26} />
                </>
              ) : resetMessage ? (
                "Reset Link Sent"
              ) : (
                "Send Reset Link"
              )}
            </button>

            <button
              type="button"
              onClick={returnToLogin}
              className="w-full text-lg font-semibold text-purple-700 hover:text-purple-900"
            >
              Back to Login
            </button>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <input
                type="email"
                placeholder="Shop Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-2xl border-4 px-6 py-4 text-xl focus:border-purple-600 focus:outline-none"
              />

              <div className="space-y-2">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-2xl border-4 px-6 py-4 text-xl focus:border-purple-600 focus:outline-none"
                />

                <label className="ml-2 flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={() =>
                      setShowPassword((current) => !current)
                    }
                  />
                  Show Password
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="flex w-full items-center justify-center gap-3 rounded-3xl bg-purple-600 py-5 text-xl font-black text-white shadow-xl transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isLoggingIn ? (
                  <>
                    Logging In
                    <BloomSpinner size={28} />
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between px-2">
              <Link
                href="/register"
                className="text-lg text-purple-600 hover:text-purple-800"
              >
                Create Account
              </Link>

              <button
                type="button"
                className="text-lg text-red-500 hover:text-red-700"
                onClick={() => {
                  setError("");
                  setResetMessage("");
                  setIsForgotPassword(true);
                }}
              >
                Forgot Password
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}