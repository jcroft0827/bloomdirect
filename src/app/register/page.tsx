"use client";
import BloomSpinner from "@/components/BloomSpinner";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Register() {
  const [form, setForm] = useState({
    businessName: "",
    email: "",
    password: "",
  });
  const [verification, setVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      alert("Something went wrong");
      setLoading(false);
      return;
    }

    // Automatically sign the user in
    const login = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    if (login?.error) {
      alert("Account created, but login failed. Please log in.");
      router.push("/login");
      return;
    }

    // Redirect to onboarding setup
    router.push("/dashboard/setup");
    setLoading(false);
  };

  // Verification
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setVerification(isChecked);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-purple-600">
      <div className="max-w-lg w-full p-8">
        {/* Header */}
        <h1 className="text-4xl tracking-wider font-black text-center mb-2 text-white">
          Join GetBloomDirect
        </h1>
        <p className="text-center text-white/95 mb-6">
          Send florist-to-florist orders with ZERO wire service fees. <br />{" "}
          Built for independent florists.
        </p>

        <div className="max-w-lg w-full bg-white rounded-3xl shadow-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="shop"
                className="text-xs uppercase text-gray-500 ml-1"
              >
                Shop Name
              </label>
              <input
                type="text"
                id="shop"
                placeholder="Shop Name"
                required
                className="w-full px-4 py-3 border rounded-lg capitalize focus:ring-2 ring-purple-600 focus:outline-none"
                onChange={(e) =>
                  setForm({ ...form, businessName: e.target.value })
                }
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="text-xs uppercase text-gray-500 ml-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                placeholder="Email"
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label
                htmlFor="pass"
                className="text-xs uppercase text-gray-500 ml-1"
              >
                Password
              </label>
              <input
                type={showPass ? "text" : "password"}
                id="pass"
                placeholder="Password"
                required
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 ring-purple-600 focus:outline-none"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => {
                  if(showPass) {
                    setShowPass(false)
                  } else {
                    setShowPass(true)
                  }
                }}
                className="text-gray-500 text-sm ml-2 transition-all hover:text-gray-700"
              >
                {showPass ? <span>Hide Password</span> : <span>Show Password</span>}
              </button>
            </div>

            <label className="flex gap-2 items-center ml-2 cursor-pointer">
              <input
                type="checkbox"
                checked={verification}
                required
                onChange={handleCheckboxChange}
                className="w-6 h-6 cursor-pointer bg-purple-600"
              />
              I confirm I am a real retail florist
            </label>

            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:bg-emerald-700 transition flex justify-center gap-2 items-center"
            >
              Create My Shop
              <span className={loading ? "block" : "hidden"}>
                <BloomSpinner size={40}/>
              </span>
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Already have a GetBloomDirect account?
              <a href="/" className="ml-1 hover:text-purple-600 transition">
                <b>Log In</b>
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
