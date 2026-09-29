import Link from "next/link";

const linkClass =
  "text-sm text-slate-400 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400";

export default function HomeFooter() {
  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="h-10 w-10" />
              <p className="text-xl font-black text-white">
                GetBloomDirect
              </p>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              Florist-first technology for running local ecommerce and building
              direct florist-to-florist relationships.
            </p>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-wider text-white">
              BloomWebsites
            </p>
            <ul className="mt-4 space-y-3">
              <li><Link href="/#websites" className={linkClass}>Website Features</Link></li>
              <li><Link href="/#pricing" className={linkClass}>Pricing</Link></li>
              <li><Link href="/register" className={linkClass}>Build Free</Link></li>
              <li><Link href="/login" className={linkClass}>Log In</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-wider text-white">
              GetBloomDirect
            </p>
            <ul className="mt-4 space-y-3">
              <li><Link href="/#network" className={linkClass}>Florist Network</Link></li>
              <li><Link href="/api-docs/external/v1" className={linkClass}>POS API</Link></li>
              <li><Link href="/vision" className={linkClass}>Vision</Link></li>
              <li><Link href="/support" className={linkClass}>Support</Link></li>
              <li><Link href="/contact" className={linkClass}>Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-sm font-black uppercase tracking-wider text-white">
              Legal & Trust
            </p>
            <ul className="mt-4 space-y-3">
              <li><Link href="/privacy" className={linkClass}>Privacy Policy</Link></li>
              <li><Link href="/terms" className={linkClass}>Terms of Service</Link></li>
              <li><Link href="/security" className={linkClass}>Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-slate-800 pt-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} GetBloomDirect.</p>
          <p>Built for independent florists.</p>
        </div>
      </div>
    </footer>
  );
}
