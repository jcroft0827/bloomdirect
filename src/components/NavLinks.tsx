import { signOut } from "next-auth/react";
import Link from "next/link";

// 1. Define an interface for the props
interface NavLinksProps {
  slug: string;
  pro: boolean;
  pathname: string;
  onClose?: () => void; // Optional: used to close mobile menu on click
}

// 2. Create the standalone component
export const NavLinks = ({ slug, pro, pathname, onClose }: NavLinksProps) => {
  const isActive = (path: string) =>
    pathname === path
      ? "bg-emerald-100 text-emerald-700"
      : "hover:bg-gray-100 text-gray-600";

  return (
    <>
      <nav className="space-y-2">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard")}`}
        >
          Home
        </Link>
        <Link
          href="/dashboard/new-order"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard/new-order")}`}
        >
          New Order
        </Link>
        <Link
          href="/dashboard/incoming"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard/incoming")}`}
        >
          Orders
        </Link>
        <Link
          href={`/dashboard/shops/${slug}`}
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard/shops")}`}
        >
          Profile
        </Link>
        {pro && (
          <Link
            href="/dashboard/pos-integration"
            onClick={onClose}
            className={`block p-3 rounded-lg ${isActive("/dashboard/pos-integration")}`}
          >
            API Integration
          </Link>
        )}
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard/settings")}`}
        >
          Settings
        </Link>
      </nav>

      <div className="mt-auto pt-6 border-t space-y-2">
        {!pro && (
          <Link
            href="/upgrade"
            className="block p-3 text-orange-600 font-medium hover:underline"
          >
            Upgrade Plan
          </Link>
        )}
        <button 
          type="button"
          onClick={() => signOut()}
          className="w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg"
        >
          Logout
        </button>
      </div>
    </>
  );
};
