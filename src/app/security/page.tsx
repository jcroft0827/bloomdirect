import { LegalList, LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";
import type { Metadata } from "next";
import { LockKeyhole } from "lucide-react";

const LAST_UPDATED = "July 24, 2026";

export const metadata: Metadata = {
  title: "Security",
  description:
    "Learn about the security practices and shared responsibilities that help protect GetBloomDirect accounts and florist information.",

  alternates: {
    canonical: "/security",
  },

  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/security",
    siteName: "GetBloomDirect",
    title: "Security | GetBloomDirect",
    description:
      "An overview of the safeguards and shared responsibilities used to protect the GetBloomDirect platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect security and account protection",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Security | GetBloomDirect",
    description:
      "Learn how GetBloomDirect works to protect florist accounts, order information, and platform access.",
    images: ["/og-image.png"],
  },
};

export default function SecurityPage() {
  return (
    <LegalPageLayout
      eyebrow="Trust & Safety"
      title="Security"
      description="GetBloomDirect is built with safeguards designed to protect florist accounts, order information, and the reliability of the network."
      lastUpdated={LAST_UPDATED}
      icon={LockKeyhole}
    >
      <LegalSection title="Security is an ongoing responsibility">
        <p>
          Security is not a one-time feature. It is an ongoing process of
          reducing risk, limiting access, monitoring the platform, improving
          safeguards, and responding responsibly when issues are discovered.
        </p>
        <p>
          This page provides a practical overview of current security practices.
          It is not a guarantee that the Services are immune from every threat,
          and it does not disclose sensitive internal security details.
        </p>
      </LegalSection>

      <LegalSection title="Secure connections and hosting">
        <LegalList>
          <li>GetBloomDirect is delivered over encrypted HTTPS connections.</li>
          <li>The application is hosted using established cloud infrastructure.</li>
          <li>Production data and services are separated from local development workflows.</li>
          <li>Infrastructure providers maintain their own physical and platform safeguards.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Account and authentication safeguards">
        <LegalList>
          <li>Passwords are stored using one-way password hashing rather than plain text.</li>
          <li>Session-based authentication is used to control access to protected areas.</li>
          <li>Email verification helps confirm ownership of newly registered email addresses.</li>
          <li>Authorization checks are applied to sensitive account, order, admin, and API actions.</li>
          <li>Suspended or ineligible accounts may be blocked from protected features.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Data access and storage">
        <LegalList>
          <li>Access is limited according to the needs of the platform and the user’s role.</li>
          <li>Shop-uploaded files are stored using cloud storage controls and private access where appropriate.</li>
          <li>Sensitive credentials and secrets are kept outside the public source code and client application.</li>
          <li>Order and account actions use server-side validation and authorization.</li>
          <li>We work to collect and retain only information reasonably needed to operate the Services.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Subscription payment security">
        <p>
          Bloom Pro subscription payments are processed by Stripe. GetBloomDirect
          does not store full payment-card numbers in its application database.
          Stripe maintains its own security and compliance program for payment
          information processed through its services.
        </p>
        <p>
          Florist-to-florist order payments are arranged directly between the
          participating shops using the payment methods they select. Users
          should independently protect those accounts and verify payment details.
        </p>
      </LegalSection>

      <LegalSection title="Email, files, and integrations">
        <LegalList>
          <li>Transactional emails are delivered through a specialized email provider.</li>
          <li>Verification codes and similar credentials are time-limited where supported.</li>
          <li>POS API access requires a valid API key and eligible account.</li>
          <li>Webhook payloads may be signed so receiving systems can verify authenticity.</li>
          <li>API keys, webhook secrets, and connected-system credentials must be treated as confidential.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Operational safeguards">
        <p>Our security work may include:</p>
        <LegalList>
          <li>Reviewing dependencies and platform changes</li>
          <li>Applying validation and least-privilege access patterns</li>
          <li>Investigating suspicious activity and reported vulnerabilities</li>
          <li>Restricting, suspending, or rotating access when risk is identified</li>
          <li>Improving logging, recovery, monitoring, and incident-response procedures as the platform grows</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Your role in security">
        <p>Every user helps protect the network. You should:</p>
        <LegalList>
          <li>Use a strong, unique password for GetBloomDirect</li>
          <li>Protect access to the email account connected to your shop</li>
          <li>Never share passwords, API keys, verification codes, or webhook secrets</li>
          <li>Remove access promptly when a staff member no longer needs it</li>
          <li>Verify unusual payment or order requests through a trusted channel</li>
          <li>Keep browsers, devices, POS systems, and connected software updated</li>
          <li>Report suspected unauthorized access or security concerns promptly</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Responsible disclosure">
        <p>
          We welcome good-faith reports that help us protect florists and the
          platform. Send suspected security vulnerabilities to{" "}
          <a
            href="mailto:getbloomdirect@gmail.com?subject=Security%20Report"
            className="font-bold text-purple-700 underline decoration-purple-300 underline-offset-4 hover:text-purple-900"
          >
            getbloomdirect@gmail.com
          </a>{" "}
          with the subject “Security Report.”
        </p>
        <p>When researching or reporting an issue, please:</p>
        <LegalList>
          <li>Avoid accessing, modifying, downloading, or deleting data that is not yours</li>
          <li>Avoid disrupting the Services or degrading availability</li>
          <li>Do not use social engineering, phishing, physical attacks, or denial-of-service testing</li>
          <li>Provide enough detail for us to understand and reproduce the issue</li>
          <li>Give us a reasonable opportunity to investigate and address the issue before public disclosure</li>
        </LegalList>
        <p>
          GetBloomDirect does not currently operate a paid bug-bounty program.
          A report does not create a right to payment or other compensation.
        </p>
      </LegalSection>

      <LegalSection title="Security incidents">
        <p>
          If we confirm a security incident affecting information, we will
          investigate, take reasonable steps to contain and remediate it, and
          provide notices when required by applicable law.
        </p>
      </LegalSection>

      <LegalSection title="Questions or concerns">
        <p>
          For general questions, use the{" "}
          <a
            href="/contact"
            className="font-bold text-purple-700 underline decoration-purple-300 underline-offset-4 hover:text-purple-900"
          >
            GetBloomDirect contact page
          </a>
          . For a suspected vulnerability or unauthorized account access, email{" "}
          <a
            href="mailto:getbloomdirect@gmail.com?subject=Security%20Report"
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
