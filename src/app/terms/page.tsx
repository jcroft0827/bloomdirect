
import { LegalList, LegalPageLayout, LegalSection } from "@/components/LegalPageLayout";
import type { Metadata } from "next";
import { FileText } from "lucide-react";

const LAST_UPDATED = "July 24, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",

  description:
    "Review the terms that govern access to and use of the GetBloomDirect florist-to-florist order network.",

  alternates: {
    canonical: "/terms",
  },

  openGraph: {
    type: "website",
    url: "https://www.getbloomdirect.com/terms",
    siteName: "GetBloomDirect",
    title: "Terms of Service | GetBloomDirect",
    description:
      "The terms governing access to and use of the GetBloomDirect platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "GetBloomDirect Terms of Service",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Terms of Service | GetBloomDirect",
    description:
      "Review the terms governing access to and use of the GetBloomDirect platform.",
    images: ["/og-image.png"],
  },
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms explain the responsibilities shared by GetBloomDirect and the florists and businesses that use the platform."
      lastUpdated={LAST_UPDATED}
      icon={FileText}
    >
      <LegalSection title="1. Agreement to these terms">
        <p>
          These Terms of Service (“Terms”) govern access to and use of the
          GetBloomDirect website, applications, accounts, and related services
          (collectively, the “Services”). By creating an account, accessing the
          Services, or using any GetBloomDirect feature, you agree to these
          Terms and our Privacy Policy.
        </p>
        <p>
          If you use the Services for a company or other organization, you
          represent that you have authority to bind that organization. In that
          case, “you” includes both you and the organization.
        </p>
        <p>
          Do not use the Services if you do not agree to these Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. The GetBloomDirect platform">
        <p>
          GetBloomDirect provides technology that helps florists discover one
          another, maintain profiles, communicate, and send or fulfill
          florist-to-florist orders directly.
        </p>
        <p>
          GetBloomDirect is not a traditional wire service, is not the seller
          or fulfiller of floral products ordered between shops, and is not a
          party to the separate commercial arrangement between sending and
          fulfilling florists. Unless expressly stated otherwise, GetBloomDirect
          does not collect or transfer the florist-to-florist order payment.
        </p>
        <p>
          Florists remain independently responsible for deciding whether to
          accept an order, agreeing on payment, fulfilling orders, communicating
          with customers and recipients, resolving disputes, and complying with
          applicable laws.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility and business use">
        <p>
          You must be at least 18 years old and legally able to enter into a
          binding agreement. The Services are intended for legitimate florist
          businesses and authorized representatives of those businesses.
        </p>
        <p>
          You must provide accurate information and keep account, contact,
          profile, delivery, pricing, payment-method, and tax information
          current.
        </p>
      </LegalSection>

      <LegalSection title="4. Accounts and security">
        <p>You are responsible for:</p>
        <LegalList>
          <li>Maintaining the confidentiality of passwords, API keys, and credentials</li>
          <li>All activity conducted through your account</li>
          <li>Using accurate contact information so important notices reach you</li>
          <li>Promptly notifying us of suspected unauthorized access or misuse</li>
          <li>Ensuring each person using the account is authorized to act for the shop</li>
        </LegalList>
        <p>
          We may require email verification, florist verification, profile
          completion, payment-method setup, or other readiness steps before
          allowing access to particular features.
        </p>
      </LegalSection>

      <LegalSection title="5. Bloom Free and Bloom Pro">
        <p>
          Bloom Free currently permits up to 15 sent orders per calendar month
          and unlimited received orders, together with the features described
          on the GetBloomDirect website. Usage limits reset according to the
          platform’s current monthly usage rules.
        </p>
        <p>
          Bloom Pro is a paid subscription that currently includes unlimited
          sending and receiving and additional features described on the
          pricing page. Features, limits, and plan availability may evolve as
          the Services improve. We will not retroactively charge you for a free
          feature without your agreement.
        </p>
      </LegalSection>

      <LegalSection title="6. Subscriptions, billing, and cancellation">
        <p>
          Bloom Pro subscriptions are billed in advance on a monthly or annual
          basis through Stripe or another payment provider identified at
          checkout. By purchasing a subscription, you authorize recurring
          charges to the selected payment method until cancellation.
        </p>
        <p>
          You may cancel Bloom Pro through the available account or billing
          tools. Unless otherwise stated, cancellation takes effect at the end
          of the current paid billing period, and access to paid features may
          continue until then.
        </p>
        <p>
          Subscription payments are generally non-refundable except where
          required by law or where GetBloomDirect expressly approves a refund.
          We may change subscription pricing prospectively by providing notice
          before the change applies to a future renewal.
        </p>
        <p>
          Failed, reversed, disputed, or overdue payments may result in
          suspension or loss of Bloom Pro features. Taxes imposed on the
          subscription may be added where required.
        </p>
      </LegalSection>

      <LegalSection title="7. Florist-to-florist orders">
        <p>
          Sending and fulfilling florists are responsible for reviewing and
          agreeing to all order details, including products, substitutions,
          delivery requirements, pricing, taxes, fees, payment timing, and
          refund or cancellation terms.
        </p>
        <p>Each shop is responsible for:</p>
        <LegalList>
          <li>Providing complete and accurate order information</li>
          <li>Using customer and recipient information only for lawful order purposes</li>
          <li>Having authority to share personal information entered into an order</li>
          <li>Delivering safe, lawful, and professionally appropriate products</li>
          <li>Complying with tax, consumer-protection, licensing, and business laws</li>
          <li>Maintaining its own records and handling florist-to-florist payment</li>
          <li>Resolving chargebacks, refunds, complaints, substitutions, and delivery disputes</li>
        </LegalList>
        <p>
          GetBloomDirect may provide records, messaging, status tools, and
          support, but does not guarantee payment, acceptance, fulfillment,
          delivery, product quality, or the conduct of another user.
        </p>
      </LegalSection>

      <LegalSection title="8. Profiles, offerings, reviews, and user content">
        <p>
          You retain ownership of logos, photos, descriptions, messages,
          reviews, offerings, and other content you submit (“User Content”). You
          grant GetBloomDirect a worldwide, non-exclusive, royalty-free license
          to host, store, reproduce, format, display, and use User Content as
          reasonably necessary to operate, secure, promote, and improve the
          Services.
        </p>
        <p>
          You represent that you have the rights needed to submit User Content
          and that it is accurate, lawful, and does not infringe another
          person’s rights. Reviews must reflect genuine experiences and may not
          be manipulated, purchased, fabricated, or used to harass another
          user.
        </p>
        <p>
          We may remove or restrict User Content that violates these Terms,
          creates risk, infringes rights, is misleading, or is otherwise
          inappropriate for the platform.
        </p>
      </LegalSection>

      <LegalSection title="9. Acceptable use">
        <p>You may not use the Services to:</p>
        <LegalList>
          <li>Break the law or facilitate unlawful, fraudulent, or deceptive activity</li>
          <li>Impersonate another person or business or submit false verification information</li>
          <li>Harass, threaten, discriminate against, or abuse another person</li>
          <li>Send spam, malware, malicious code, or unauthorized solicitations</li>
          <li>Attempt to access another account, system, database, or private information</li>
          <li>Probe, scan, disrupt, overload, reverse engineer, or circumvent platform safeguards</li>
          <li>Scrape, harvest, copy, or resell platform data without written permission</li>
          <li>Misuse customer, recipient, florist, API, or order information</li>
          <li>Use the Services in a manner that could harm GetBloomDirect, users, or third parties</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="10. POS API and integrations">
        <p>
          Access to the GetBloomDirect POS API or other integrations may require
          Bloom Pro, valid credentials, and compliance with published technical
          documentation. You are responsible for securing API keys and for the
          acts and omissions of systems connected through your credentials.
        </p>
        <p>
          Integrations must not exceed published limits, interfere with the
          Services, expose data improperly, or perform unauthorized actions. We
          may modify, limit, rotate credentials for, or discontinue an API or
          integration when reasonably necessary for security, reliability,
          legal compliance, or platform development.
        </p>
      </LegalSection>

      <LegalSection title="11. Verification and platform moderation">
        <p>
          Verification badges, profile information, reviews, statistics, and
          other trust signals are informational tools, not guarantees or
          endorsements. Users must independently evaluate another florist
          before entering a transaction.
        </p>
        <p>
          We may investigate reports, request information, limit visibility,
          decline verification, suspend features, or take other reasonable
          action to protect the platform. We are not obligated to mediate every
          dispute between users.
        </p>
      </LegalSection>

      <LegalSection title="12. Intellectual property">
        <p>
          The Services, including GetBloomDirect branding, software, design,
          text, graphics, interfaces, and platform-created content, are owned by
          GetBloomDirect or its licensors and are protected by applicable
          intellectual-property laws.
        </p>
        <p>
          Subject to these Terms, GetBloomDirect grants you a limited,
          revocable, non-exclusive, non-transferable right to use the Services
          for their intended business purpose. No other rights are granted.
        </p>
      </LegalSection>

      <LegalSection title="13. Third-party services and links">
        <p>
          The Services may interact with third-party providers, websites,
          payment methods, mapping tools, email providers, POS systems, or other
          products. GetBloomDirect does not control those services and is not
          responsible for their availability, content, security, or practices.
          Your use of third-party services is governed by their own terms.
        </p>
      </LegalSection>

      <LegalSection title="14. Availability and changes">
        <p>
          We work to keep GetBloomDirect reliable, but the Services are provided
          on an “as available” basis. Maintenance, outages, internet failures,
          provider issues, security events, or other circumstances may
          interrupt access.
        </p>
        <p>
          We may add, modify, limit, or discontinue features. When a change
          materially affects a paid subscription, we will provide notice when
          reasonably practicable.
        </p>
      </LegalSection>

      <LegalSection title="15. Suspension and termination">
        <p>
          You may stop using the Services at any time. We may suspend, restrict,
          or terminate access when we reasonably believe you violated these
          Terms, created security or legal risk, failed to pay applicable fees,
          harmed another user, or misused the platform.
        </p>
        <p>
          Following termination, provisions that by their nature should survive
          will remain in effect, including provisions concerning payments,
          ownership, disclaimers, liability, indemnification, disputes, and
          record retention.
        </p>
      </LegalSection>

      <LegalSection title="16. Disclaimers">
        <p>
          To the fullest extent permitted by law, the Services are provided “as
          is” and “as available,” without warranties of any kind, whether
          express, implied, or statutory. GetBloomDirect disclaims implied
          warranties of merchantability, fitness for a particular purpose,
          non-infringement, and any warranties arising from course of dealing or
          usage of trade.
        </p>
        <p>
          GetBloomDirect does not warrant that the Services will be
          uninterrupted, error-free, completely secure, or that any florist,
          customer, recipient, order, payment, review, integration, or result
          will meet your expectations.
        </p>
      </LegalSection>

      <LegalSection title="17. Limitation of liability">
        <p>
          To the fullest extent permitted by law, GetBloomDirect and its owners,
          personnel, affiliates, and service providers will not be liable for
          indirect, incidental, special, consequential, exemplary, or punitive
          damages, or for lost profits, lost revenue, lost data, loss of
          goodwill, business interruption, or the conduct of another user.
        </p>
        <p>
          To the fullest extent permitted by law, GetBloomDirect’s total
          liability arising out of or relating to the Services or these Terms
          will not exceed the greater of (a) the amount you paid to
          GetBloomDirect during the 12 months before the event giving rise to
          the claim or (b) one hundred U.S. dollars ($100).
        </p>
        <p>
          Some jurisdictions do not allow certain exclusions or limitations, so
          some of the above may not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="18. Indemnification">
        <p>
          To the fullest extent permitted by law, you agree to defend,
          indemnify, and hold harmless GetBloomDirect and its owners, personnel,
          affiliates, and service providers from claims, losses, liabilities,
          damages, judgments, costs, and reasonable attorneys’ fees arising from
          your use of the Services, User Content, florist-to-florist orders,
          violation of these Terms, violation of law, or infringement of another
          person’s rights.
        </p>
      </LegalSection>

      <LegalSection title="19. Governing law and disputes">
        <p>
          These Terms are governed by the laws of the State of New York, without
          regard to conflict-of-law principles. Before filing a formal claim,
          you and GetBloomDirect agree to make a good-faith effort to resolve
          the dispute by contacting the other party and describing the issue.
        </p>
        <p>
          Unless applicable law requires otherwise, claims arising from these
          Terms or the Services will be brought in a state or federal court with
          jurisdiction in New York, and each party consents to personal
          jurisdiction and venue there.
        </p>
      </LegalSection>

      <LegalSection title="20. Changes to these terms">
        <p>
          We may update these Terms as the Services and laws change. The updated
          date at the top shows when the Terms were most recently revised. If a
          change is material, we may provide additional notice. Continued use
          of the Services after revised Terms take effect means you accept the
          revised Terms.
        </p>
      </LegalSection>

      <LegalSection title="21. General terms">
        <p>
          These Terms and incorporated policies are the entire agreement
          between you and GetBloomDirect concerning the Services. If any
          provision is unenforceable, the remaining provisions remain in effect.
          A failure to enforce a provision is not a waiver. You may not assign
          these Terms without our written consent; we may assign them in
          connection with a reorganization, financing, merger, acquisition, or
          sale of assets.
        </p>
      </LegalSection>

      <LegalSection title="22. Contact us">
        <p>
          Questions about these Terms may be submitted through the{" "}
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
