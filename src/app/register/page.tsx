"use client";

import BloomSpinner from "@/components/BloomSpinner";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

export default function Register() {
  const router = useRouter();

  const [form, setForm] = useState({
    businessName: "",
    email: "",
    password: "",
  });

  const [floristConfirmed, setFloristConfirmed] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [registering, setRegistering] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const [showVerificationModal, setShowVerificationModal] =
    useState(false);

  const [verificationCode, setVerificationCode] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!floristConfirmed) {
      toast.error("Please confirm that you are a retail florist.");
      return;
    }

    setRegistering(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to create your account.",
        );
      }

      setRegisteredEmail(data.email || form.email);
      setVerificationCode("");
      setShowVerificationModal(true);

      toast.success("Verification code sent to your email.");
    } catch (error) {
      console.error("REGISTRATION ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Something went wrong while creating your account.",
      );
    } finally {
      setRegistering(false);
    }
  };

  const handleVerifyEmail = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    const cleanedCode = verificationCode
      .replace(/\D/g, "")
      .slice(0, 6);

    if (cleanedCode.length !== 6) {
      toast.error("Enter the six-digit verification code.");
      return;
    }

    setVerifying(true);

    try {
      const res = await fetch(
        "/api/register/confirm-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: registeredEmail,
            code: cleanedCode,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Unable to verify your email.",
        );
      }

      const login = await signIn("credentials", {
        email: registeredEmail,
        password: form.password,
        redirect: false,
      });

      if (login?.error) {
        toast.error(
          "Your email was verified, but automatic login failed. Please log in.",
        );

        router.push("/login");
        return;
      }

      toast.success("Email verified. Welcome to GetBloomDirect!");

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error("EMAIL VERIFICATION ERROR:", error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to verify your email.",
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-purple-600">
        <div className="w-full max-w-lg p-8">
          <h1 className="mb-2 text-center text-4xl font-black tracking-wider text-white">
            Join GetBloomDirect
          </h1>

          <p className="mb-6 text-center text-white/95">
            Send florist-to-florist orders with ZERO wire
            service fees.
            <br />
            Built for independent florists.
          </p>

          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <form
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="shop"
                  className="ml-1 text-xs uppercase text-gray-500"
                >
                  Shop Name
                </label>

                <input
                  type="text"
                  id="shop"
                  placeholder="Shop Name"
                  required
                  value={form.businessName}
                  disabled={registering}
                  className="w-full rounded-lg border px-4 py-3 capitalize ring-purple-600 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      businessName: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="ml-1 text-xs uppercase text-gray-500"
                >
                  Email Address
                </label>

                <input
                  type="email"
                  id="email"
                  placeholder="Email"
                  required
                  value={form.email}
                  disabled={registering}
                  className="w-full rounded-lg border px-4 py-3 ring-purple-600 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      email: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label
                  htmlFor="pass"
                  className="ml-1 text-xs uppercase text-gray-500"
                >
                  Password
                </label>

                <input
                  type={showPass ? "text" : "password"}
                  id="pass"
                  placeholder="Password"
                  required
                  value={form.password}
                  disabled={registering}
                  className="w-full rounded-lg border px-4 py-3 ring-purple-600 focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:bg-gray-100"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  disabled={registering}
                  onClick={() => setShowPass((current) => !current)}
                  className="ml-2 text-sm text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed"
                >
                  {showPass ? "Hide Password" : "Show Password"}
                </button>
              </div>

              <label className="ml-2 flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={floristConfirmed}
                  required
                  disabled={registering}
                  onChange={(e) =>
                    setFloristConfirmed(e.target.checked)
                  }
                  className="h-6 w-6 cursor-pointer accent-purple-600 disabled:cursor-not-allowed"
                />

                <span>
                  I confirm I am a real retail florist
                </span>
              </label>

              <button
                type="submit"
                disabled={registering}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-400"
              >
                {registering
                  ? "Creating Your Shop..."
                  : "Create My Shop"}

                {registering && <BloomSpinner size={40} />}
              </button>

              <p className="mt-4 text-center text-sm text-gray-500">
                Already have a GetBloomDirect account?
                <a
                  href="/"
                  className="ml-1 transition hover:text-purple-600"
                >
                  <b>Log In</b>
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {showVerificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="verification-modal-title"
            className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
          >
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-2xl">
                ✉️
              </div>

              <h2
                id="verification-modal-title"
                className="text-2xl font-black text-gray-900"
              >
                Check Your Email
              </h2>

              <p className="mt-2 text-gray-600">
                We sent a six-digit verification code to:
              </p>

              <p className="mt-1 break-all font-bold text-purple-700">
                {registeredEmail}
              </p>
            </div>

            <form
              onSubmit={handleVerifyEmail}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="verification-code"
                  className="mb-2 block text-center text-xs font-bold uppercase tracking-wide text-gray-500"
                >
                  Verification Code
                </label>

                <input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  maxLength={6}
                  value={verificationCode}
                  disabled={verifying}
                  onChange={(e) =>
                    setVerificationCode(
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6),
                    )
                  }
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-4 text-center text-3xl font-black tracking-[0.5em] text-purple-700 outline-none transition focus:border-purple-600 disabled:cursor-not-allowed disabled:bg-gray-100"
                  placeholder="000000"
                />
              </div>

              <button
                type="submit"
                disabled={
                  verifying || verificationCode.length !== 6
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 py-4 font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-purple-300"
              >
                {verifying
                  ? "Verifying Email..."
                  : "Verify Email & Continue"}

                {verifying && <BloomSpinner size={40} />}
              </button>

              <p className="text-center text-sm text-gray-500">
                The verification code expires in 10 minutes.
              </p>
            </form>
          </div>
        </div>
      )}
    </>
  );
}