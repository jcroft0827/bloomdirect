"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, PlugZap, Save, Server, ShieldCheck, TriangleAlert } from "lucide-react";

type Protocol = "ftp" | "ftps" | "sftp";

type IntegrationState = {
  enabled: boolean;
  automaticExport: boolean;
  protocol: Protocol;
  host: string;
  port: number;
  folder: string;
  username: string;
  hasPassword: boolean;
  sourceVendor: string;
  payloadEncryptionMode: "none" | "xor" | "3des";
  lastConnectionTest: {
    status: "" | "succeeded" | "failed";
    testedAt: string | null;
    message: string;
  };
};

const defaults: IntegrationState = {
  enabled: false,
  automaticExport: true,
  protocol: "sftp",
  host: "",
  port: 22,
  folder: "/",
  username: "",
  hasPassword: false,
  sourceVendor: "BloomWebsites",
  payloadEncryptionMode: "none",
  lastConnectionTest: { status: "", testedAt: null, message: "" },
};

function defaultPort(protocol: Protocol) {
  return protocol === "sftp" ? 22 : 21;
}

export default function TfposIntegrationSettings() {
  const [form, setForm] = useState<IntegrationState>(defaults);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/websites/integrations/tfpos", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load integration.");
      setForm({ ...defaults, ...data.integration });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load integration.");
    } finally {
      setLoading(false);
    }
  }

  const connectionReady = useMemo(
    () => Boolean(form.host.trim() && form.username.trim() && (form.hasPassword || password)),
    [form.host, form.username, form.hasPassword, password],
  );

  function update<K extends keyof IntegrationState>(key: K, value: IntegrationState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event?: FormEvent) {
    event?.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/websites/integrations/tfpos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          automaticExport: form.automaticExport,
          protocol: form.protocol,
          host: form.host,
          port: Number(form.port),
          folder: form.folder,
          username: form.username,
          password,
          sourceVendor: form.sourceVendor,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save integration.");

      setForm((current) => ({ ...current, ...data.integration }));
      setPassword("");
      setMessage("The Floral POS settings were saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save integration.");
    } finally {
      setSaving(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setMessage("");
    setError("");

    try {
      // Save first so the server tests the same settings shown on screen.
      const saveResponse = await fetch("/api/websites/integrations/tfpos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: form.enabled,
          automaticExport: form.automaticExport,
          protocol: form.protocol,
          host: form.host,
          port: Number(form.port),
          folder: form.folder,
          username: form.username,
          password,
          sourceVendor: form.sourceVendor,
        }),
      });

      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || "Unable to save before testing.");

      setForm((current) => ({ ...current, ...saved.integration }));
      setPassword("");

      const response = await fetch("/api/websites/integrations/tfpos/test", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Connection test failed.");

      setMessage(data.message || "Connection succeeded.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Connection test failed.");
      await load();
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-gray-200 bg-white">
        <Loader2 className="animate-spin text-purple-700" />
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6">
      {(message || error) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          {error || message}
        </div>
      )}

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <PlugZap size={20} className="text-purple-700" />
              <h2 className="text-xl font-black text-gray-950">The Floral POS</h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Send paid BloomWebsite orders into TFPOS as IncomingOrder XML files. Bloom never sends card numbers, expiration dates, or CVV.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => update("enabled", event.target.checked)}
              className="h-4 w-4 accent-purple-700"
            />
            Integration enabled
          </label>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-bold text-gray-700">
            Protocol
            <select
              value={form.protocol}
              onChange={(event) => {
                const protocol = event.target.value as Protocol;
                setForm((current) => ({
                  ...current,
                  protocol,
                  port: defaultPort(protocol),
                }));
              }}
              className="mt-2 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-sm"
            >
              <option value="sftp">SFTP</option>
              <option value="ftps">FTPS</option>
              <option value="ftp">FTP</option>
            </select>
          </label>

          <label className="text-sm font-bold text-gray-700 sm:col-span-1 lg:col-span-2">
            Server
            <input
              value={form.host}
              onChange={(event) => update("host", event.target.value)}
              placeholder="orders.example.com"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
            />
          </label>

          <label className="text-sm font-bold text-gray-700">
            Port
            <input
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(event) => update("port", Number(event.target.value))}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
            />
          </label>

          <label className="text-sm font-bold text-gray-700 sm:col-span-2">
            Remote folder
            <input
              value={form.folder}
              onChange={(event) => update("folder", event.target.value)}
              placeholder="/orders"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
            />
          </label>

          <label className="text-sm font-bold text-gray-700">
            Username
            <input
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              autoComplete="off"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
            />
          </label>

          <label className="text-sm font-bold text-gray-700 sm:col-span-2">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder={form.hasPassword ? "Saved - leave blank to keep it" : "Enter TFPOS transfer password"}
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm"
            />
          </label>
        </div>

        {form.protocol === "ftp" && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <TriangleAlert size={19} className="mt-0.5 shrink-0" />
            <p>
              Plain FTP does not encrypt the login or transfer. Use SFTP or FTPS whenever the TFPOS installation supports it.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <Server size={20} className="text-purple-700" />
          <h2 className="text-xl font-black text-gray-950">Order delivery</h2>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl bg-gray-50 p-4">
          <input
            type="checkbox"
            checked={form.automaticExport}
            onChange={(event) => update("automaticExport", event.target.checked)}
            className="mt-1 h-4 w-4 accent-purple-700"
          />
          <span>
            <span className="block text-sm font-black text-gray-950">Automatically send paid website orders</span>
            <span className="mt-1 block text-sm leading-6 text-gray-600">
              Bloom will attempt the transfer after the paid order is committed. Failed transfers stay visible on the order and can be resent manually.
            </span>
          </span>
        </label>

        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
          <div className="flex items-center gap-2 font-black">
            <ShieldCheck size={18} /> Safe payment handoff
          </div>
          <p className="mt-1">
            Bloom exports safe processor approval/reference information only. PAN, expiration, and CVV XML fields remain empty.
          </p>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">
          <p className="font-black text-gray-950">TFPOS payload encryption</p>
          <p className="mt-1 leading-6">
            V1 uses <strong>NONE</strong> for the TFPOS payload encryption setting. Configure the matching Website Config connection in TFPOS as NONE. SFTP/FTPS still encrypt the network transport itself.
          </p>
        </div>

        {form.lastConnectionTest?.status && (
          <div className="mt-5 flex gap-3 rounded-2xl border border-gray-200 p-4 text-sm">
            {form.lastConnectionTest.status === "succeeded" ? (
              <CheckCircle2 size={18} className="shrink-0 text-green-600" />
            ) : (
              <TriangleAlert size={18} className="shrink-0 text-red-600" />
            )}
            <div>
              <p className="font-black text-gray-950">
                Last connection test: {form.lastConnectionTest.status === "succeeded" ? "Passed" : "Failed"}
              </p>
              <p className="mt-1 text-gray-600">{form.lastConnectionTest.message}</p>
              {form.lastConnectionTest.testedAt && (
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(form.lastConnectionTest.testedAt).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={testConnection}
          disabled={testing || saving || !connectionReady}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-black text-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing ? <Loader2 size={17} className="animate-spin" /> : <PlugZap size={17} />}
          Test Connection
        </button>

        <button
          type="submit"
          disabled={saving || testing}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
          Save TFPOS Settings
        </button>
      </div>
    </form>
  );
}
