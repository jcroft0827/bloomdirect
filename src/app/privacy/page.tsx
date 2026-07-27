import { LegalList, LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";
import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

const LAST_UPDATED = "July 24, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",

  description:
    "Learn what information GetBloomDirect collects, how it is used, and the choices available to florists and other users.",

  alternates: {
    canonical: "/privacy",
  },

  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/privacy",
    siteName: "GetBloomDirect",
    title: "Privacy Policy | GetBloomDirect",
    description:
      "Learn how GetBloomDirect collects, uses, shares, and protects information.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect Privacy Policy",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Privacy Policy | GetBloomDirect",
    description:
      "Learn how GetBloomDirect collects, uses, shares, and protects information.",
    images: ["/og-image.png"],
  },
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      description="Trust matters. This policy explains what information GetBloomDirect collects, why we use it, and the choices available to you."
      lastUpdated={LAST_UPDATED}
      icon={ShieldCheck}
    >
      <LegalSection title="1. Our commitment">
        <p>
          GetBloomDirect is built to help independent florists work directly
          with one another. We collect information needed to operate, secure,
          support, and improve the platform. We do not sell personal
          information for money, and we do not use personal information for
          third-party targeted advertising.
        </p>
        <p>
          This Privacy Policy applies to the GetBloomDirect website,
          applications, accounts, and related services (collectively, the
          “Services”).
        </p>
      </LegalSection>

      <LegalSection title="2. Information we collect">
        <p className="font-bold text-gray-900">Account and business information</p>
        <p>When a shop creates or manages an account, we may collect:</p>
        <LegalList>
          <li>Business name, contact name, email address, and phone number</li>
          <li>Business address, website, hours, and delivery information</li>
          <li>Login credentials and account-verification information</li>
          <li>Subscription status and limited billing-related information</li>
        </LegalList>

        <p className="font-bold text-gray-900">Profile and network information</p>
        <p>Shops may provide information displayed to other users, including:</p>
        <LegalList>
          <li>Logos, banners, photos, descriptions, and public profile details</li>
          <li>Fulfillment offerings, prices, delivery areas, and availability</li>
          <li>Accepted payment methods, reviews, and network activity</li>
        </LegalList>

        <p className="font-bold text-gray-900">Order and communication information</p>
        <p>
          When florists use the Services to send or fulfill orders, we may
          process order-related information such as:
        </p>
        <LegalList>
          <li>Sending and fulfilling florist information</li>
          <li>Recipient name, delivery address, phone number, and delivery notes</li>
          <li>Arrangement details, card messages, prices, taxes, and fees</li>
          <li>Order status, activity history, messages, reviews, and support records</li>
        </LegalList>
        <p>
          Florists who submit information about customers, recipients, or other
          people are responsible for having the authority to provide that
          information and for using it lawfully.
        </p>

        <p className="font-bold text-gray-900">Technical information</p>
        <p>
          We may automatically collect device, browser, IP address, session,
          diagnostic, security, and usage information when the Services are
          accessed.
        </p>
      </LegalSection>

      <LegalSection title="3. How we use information">
        <p>We may use information to:</p>
        <LegalList>
          <li>Create, authenticate, and manage accounts</li>
          <li>Operate florist profiles, search, ordering, messaging, and reviews</li>
          <li>Deliver account, order, verification, billing, and security notices</li>
          <li>Provide support and respond to questions or disputes</li>
          <li>Process Bloom Pro subscriptions through our payment provider</li>
          <li>Detect, prevent, investigate, and address fraud, abuse, or security issues</li>
          <li>Analyze reliability and improve the Services</li>
          <li>Enforce our Terms of Service and comply with legal obligations</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="4. How information is shared">
        <p>We may share information in the following circumstances:</p>
        <LegalList>
          <li>
            <strong className="text-gray-900">With other florists:</strong>{" "}
            Public profile information and information needed to send, accept,
            fulfill, communicate about, and review orders may be shared with
            the relevant shops.
          </li>
          <li>
            <strong className="text-gray-900">With service providers:</strong>{" "}
            Vendors may process information for hosting, database services,
            file storage, email delivery, geocoding, maps, analytics, security,
            and subscription billing.
          </li>
          <li>
            <strong className="text-gray-900">For legal and safety reasons:</strong>{" "}
            We may disclose information when reasonably necessary to comply
            with law, legal process, protect rights or safety, investigate
            misuse, or enforce agreements.
          </li>
          <li>
            <strong className="text-gray-900">During a business transaction:</strong>{" "}
            Information may be transferred as part of a merger, financing,
            acquisition, reorganization, or sale of all or part of the business,
            subject to appropriate protections.
          </li>
          <li>
            <strong className="text-gray-900">With your direction:</strong>{" "}
            We may share information when you ask or authorize us to do so.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="5. Service providers">
        <p>
          GetBloomDirect currently relies on service providers that may include
          Stripe for subscription billing, Resend for transactional email,
          MongoDB Atlas for database hosting, Amazon Web Services for file
          storage, Vercel for application hosting, and mapping or geocoding
          providers used to support address and delivery features.
        </p>
        <p>
          These providers process information under their own terms and privacy
          notices. Their services and our provider list may change as the
          platform develops.
        </p>
      </LegalSection>

      <LegalSection title="6. Cookies and similar technologies">
        <p>
          We use cookies and similar technologies that are necessary for login,
          session management, security, preferences, and core platform
          functionality. We may also use limited performance or analytics tools
          to understand how the Services operate and improve reliability.
        </p>
        <p>
          Browser settings may allow you to block or delete cookies. Disabling
          required cookies may prevent parts of the Services from working.
        </p>
      </LegalSection>

      <LegalSection title="7. Data retention">
        <p>
          We retain information for as long as reasonably necessary to provide
          the Services, maintain business and order records, resolve disputes,
          enforce agreements, protect the platform, and satisfy legal,
          accounting, or reporting obligations.
        </p>
        <p>
          Retention periods vary by the type of information and the reason it
          was collected. Some information may remain in backups or be retained
          when deletion is not legally or operationally appropriate.
        </p>
      </LegalSection>

      <LegalSection title="8. Your choices and privacy rights">
        <p>Depending on your location and applicable law, you may be able to:</p>
        <LegalList>
          <li>Access or correct certain account information</li>
          <li>Update or remove information from your public profile</li>
          <li>Request a copy of certain personal information</li>
          <li>Request deletion of certain personal information</li>
          <li>Object to or request limits on certain processing</li>
          <li>Appeal a decision concerning a privacy request, where required</li>
        </LegalList>
        <p>
          We may need to verify your identity and authority before completing a
          request. Some requests may be limited by legal exceptions or our need
          to preserve order, security, fraud-prevention, or financial records.
          Authorized agents may submit requests where permitted by law, subject
          to verification.
        </p>
        <p>
          GetBloomDirect does not discriminate against users for exercising
          privacy rights provided by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="9. Security">
        <p>
          We use reasonable administrative and technical safeguards designed
          to protect information, including encrypted connections, access
          controls, password hashing, private file storage where appropriate,
          and trusted infrastructure providers.
        </p>
        <p>
          No online service can guarantee absolute security. Users are also
          responsible for protecting passwords, devices, email accounts, API
          keys, and other credentials used to access the Services.
        </p>
      </LegalSection>

      <LegalSection title="10. Children’s privacy">
        <p>
          The Services are intended for businesses and adults acting on behalf
          of those businesses. They are not directed to children under 13, and
          we do not knowingly collect personal information directly from
          children under 13. Contact us if you believe a child has provided
          personal information directly to GetBloomDirect.
        </p>
      </LegalSection>

      <LegalSection title="11. United States operation">
        <p>
          GetBloomDirect is operated from the United States. Information may be
          processed and stored in the United States and other locations where
          our service providers operate. Those locations may have privacy laws
          that differ from the laws where you live.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to this policy">
        <p>
          We may update this Privacy Policy as the Services, laws, and business
          practices change. The updated date at the top of this page shows when
          the policy was most recently revised. We may provide additional notice
          when a change is material.
        </p>
      </LegalSection>

      <LegalSection title="13. Contact us">
        <p>
          Questions or privacy requests may be submitted through the{" "}
          <a
            href="/contact"
            className="font-bold text-purple-700 underline decoration-purple-300 underline-offset-4 hover:text-purple-900"
          >
            GetBloomDirect contact page
          </a>{" "}
          or by email at{" "}
          <a
            href="mailto:getbloomdirect@gmail.com"
            className="font-bold text-purple-700 underline decoration-purple-300 underline-offset-4 hover:text-purple-900"
          >
            getbloomdirect@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
