import CustomerSuccessClient from "./CustomerSuccessClient";

export default function CustomerSuccessPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-purple-700">
          Admin
        </p>

        <h1 className="mt-2 text-3xl font-black text-slate-900">
          Customer Success
        </h1>

        <p className="mt-2 max-w-3xl text-slate-600">
          Keep florist relationships moving forward. See who needs
          follow-up, track invitations, help registered florists
          finish onboarding, and keep an eye on the shops that are
          ready to use the network.
        </p>
      </div>

      <CustomerSuccessClient />
    </div>
  );
}