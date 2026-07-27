type AdminSectionPageProps = {
  title: string;
  description: string;
};

function AdminSectionPage({
  title,
  description,
}: AdminSectionPageProps) {
  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
        GetBloomDirect Admin
      </p>

      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
        {title}
      </h1>

      <p className="mt-3 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export default function OutreachPage() {
  return (
    <AdminSectionPage
      title="Florist Outreach"
      description="Manage prospective florists, invitations, follow-ups, and registrations."
    />
  );
}