// src/models/BloomWebsite.ts

import mongoose, { Schema } from "mongoose";

const bloomWebsiteBusinessHourSchema = new Schema(
  {
    day: {
      type: String,
      enum: [
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
        "sunday",
      ],
      required: true,
    },

    enabled: {
      type: Boolean,
      default: false,
    },

    opens: {
      type: String,
      trim: true,
      default: "",
    },

    closes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const bloomWebsiteSchema = new Schema(
  {
    // ===============================
    // OWNERSHIP
    // ===============================

    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      unique: true,
      index: true,
    },

    // ===============================
    // WEBSITE IDENTITY
    // ===============================

    previewSlug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    siteName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    // ===============================
    // WEBSITE LIFECYCLE
    // ===============================

    status: {
      type: String,
      enum: ["preview", "live", "paused"],
      default: "preview",
      index: true,
    },

    publishedAt: {
      type: Date,
      default: null,
    },

    /**
     * A paused website can be paused intentionally by the florist or by
     * Bloom because a launch entitlement is no longer valid.
     *
     * Billing recovery never auto-resumes a storefront. Once billing is fixed,
     * the florist explicitly resumes it so all launch requirements are checked
     * again first.
     */
    pauseReason: {
      type: String,
      enum: ["manual", "billing", "system"],
      default: null,
    },

    // ===============================
    // BLOOMWEBSITES SUBSCRIPTION
    // ===============================

    billing: {
      customerId: {
        type: String,
        trim: true,
        default: "",
      },

      subscriptionId: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      status: {
        type: String,
        trim: true,
        default: "",
        index: true,
      },

      priceId: {
        type: String,
        trim: true,
        default: "",
      },

      billingPeriod: {
        type: String,
        enum: ["monthly", "annual"],
        default: null,
      },

      cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
      },

      startedAt: {
        type: Date,
        default: null,
      },

      endedAt: {
        type: Date,
        default: null,
      },

      lastSyncedAt: {
        type: Date,
        default: null,
      },
    },

    // ===============================
    // THEME
    // ===============================

    /**
     * V1 intentionally starts with one structural theme.
     *
     * Florists customize the visual identity through the
     * branding settings below rather than selecting an
     * entirely different component/layout system.
     *
     * Additional full themes can be added later without
     * changing the website ownership architecture.
     */
    theme: {
      type: String,
      enum: ["bloom-classic"],
      default: "bloom-classic",
    },

    // ===============================
    // WEBSITE BRANDING
    // ===============================

    /**
     * These values are seeded from the existing Shop when
     * the florist creates their website.
     *
     * They live on BloomWebsite afterward so the public
     * website can eventually be customized independently
     * from the GetBloomDirect network profile.
     *
     * Bloom controls the surrounding neutral palette,
     * typography, spacing and accessibility behavior.
     * Florists control a deliberately small set of brand
     * inputs so storefronts remain professional.
     */
    branding: {
      logo: {
        type: String,
        default: "",
      },

      primaryColor: {
        type: String,
        trim: true,
        default: "#654783",
      },

      accentColor: {
        type: String,
        trim: true,
        default: "#37a156",
      },

      /**
       * Short brand statement used in places where a full
       * homepage hero subheadline would be too long.
       *
       * Example:
       * "Fresh flowers, thoughtfully designed."
       */
      tagline: {
        type: String,
        trim: true,
        maxlength: 180,
        default: "",
      },

      /**
       * Curated storefront background treatment.
       *
       * This is intentionally NOT an arbitrary CSS value
       * or customer-uploaded repeating background image.
       * Bloom owns the visual treatments so every option
       * remains polished and mobile-safe.
       */
      backgroundStyle: {
        type: String,
        enum: [
          "clean",
          "soft_floral",
          "botanical",
          "romantic",
          "minimal_texture",
        ],
        default: "clean",
      },
    },

    // ===============================
    // HOMEPAGE CONTENT
    // ===============================

    homepage: {
      heroHeadline: {
        type: String,
        trim: true,
        maxlength: 160,
        default: "",
      },

      heroSubheadline: {
        type: String,
        trim: true,
        maxlength: 300,
        default: "",
      },

      heroImage: {
        type: String,
        default: "",
      },

      heroInfoCard: {
        eyebrow: {
          type: String,
          trim: true,
          maxlength: 80,
          default: "",
        },
        heading: {
          type: String,
          trim: true,
          maxlength: 120,
          default: "",
        },
        description: {
          type: String,
          trim: true,
          maxlength: 320,
          default: "",
        },
      },

      trustPoints: {
        type: [
          {
            title: {
              type: String,
              trim: true,
              maxlength: 100,
              default: "",
            },
            description: {
              type: String,
              trim: true,
              maxlength: 260,
              default: "",
            },
          },
        ],
        default: [],
      },

      aboutText: {
        type: String,
        trim: true,
        maxlength: 3000,
        default: "",
      },

      sectionContent: {
        occasions: {
          eyebrow: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "",
          },
          heading: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
          },
          description: {
            type: String,
            trim: true,
            maxlength: 420,
            default: "",
          },
        },

        featured: {
          eyebrow: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "",
          },
          heading: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
          },
          description: {
            type: String,
            trim: true,
            maxlength: 420,
            default: "",
          },
        },

        about: {
          eyebrow: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "",
          },
          heading: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
          },
          description: {
            type: String,
            trim: true,
            maxlength: 420,
            default: "",
          },
        },

        trust: {
          eyebrow: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "",
          },
          heading: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
          },
          description: {
            type: String,
            trim: true,
            maxlength: 420,
            default: "",
          },
        },

        delivery: {
          eyebrow: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "",
          },
          heading: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
          },
          description: {
            type: String,
            trim: true,
            maxlength: 420,
            default: "",
          },
        },

        contact: {
          eyebrow: {
            type: String,
            trim: true,
            maxlength: 80,
            default: "",
          },
          heading: {
            type: String,
            trim: true,
            maxlength: 140,
            default: "",
          },
          description: {
            type: String,
            trim: true,
            maxlength: 420,
            default: "",
          },
        },
      },
    },

    // ===============================
    // ABOUT PAGE
    // ===============================

    aboutPage: {
      enabled: {
        type: Boolean,
        default: true,
      },

      heading: {
        type: String,
        trim: true,
        maxlength: 140,
        default: "About Us",
      },

      contentMode: {
        type: String,
        enum: ["custom", "guided"],
        default: "guided",
      },

      facts: {
        openingYear: {
          type: String,
          trim: true,
          maxlength: 4,
          default: "",
        },

        founderNames: {
          type: String,
          trim: true,
          maxlength: 180,
          default: "",
        },

        originStory: {
          type: String,
          trim: true,
          maxlength: 1200,
          default: "",
        },

        specialties: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },

        community: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },

        servicePhilosophy: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },

        differentiators: {
          type: String,
          trim: true,
          maxlength: 1000,
          default: "",
        },
      },

      sections: {
        type: [
          {
            key: {
              type: String,
              enum: ["story", "specialties", "community"],
              required: true,
            },
            enabled: {
              type: Boolean,
              default: true,
            },
            title: {
              type: String,
              trim: true,
              maxlength: 140,
              default: "",
            },
            body: {
              type: String,
              trim: true,
              maxlength: 6000,
              default: "",
            },
            sortOrder: {
              type: Number,
              min: 0,
              default: 0,
            },
          },
        ],
        default: () => [
          {
            key: "story",
            enabled: true,
            title: "Our Story",
            body: "",
            sortOrder: 0,
          },
          {
            key: "specialties",
            enabled: true,
            title: "What We Do Best",
            body: "",
            sortOrder: 1,
          },
          {
            key: "community",
            enabled: true,
            title: "Rooted in Our Community",
            body: "",
            sortOrder: 2,
          },
        ],
      },
    },

    // ===============================
    // ANNOUNCEMENT BAR
    // ===============================

    announcement: {
      enabled: {
        type: Boolean,
        default: false,
      },

      message: {
        type: String,
        trim: true,
        maxlength: 220,
        default: "",
      },

      scheduleEnabled: {
        type: Boolean,
        default: false,
      },

      /**
       * Announcement scheduling is stored in the florist's
       * local calendar/time representation.
       *
       * This avoids browser/Vercel timezone drift. The
       * storefront evaluates these fields using the shop's
       * configured IANA timezone.
       */
      startsAtDate: {
        type: String,
        trim: true,
        default: "",
      },

      startsAtTime: {
        type: String,
        trim: true,
        default: "",
      },

      endsAtDate: {
        type: String,
        trim: true,
        default: "",
      },

      endsAtTime: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ===============================
    // ORDER POLICY
    // ===============================

    /**
     * BloomWebsites order-acceptance rules.
     *
     * These settings intentionally live on BloomWebsite
     * instead of Shop.delivery because a florist may want
     * different policies for:
     *
     * - GetBloomDirect florist-to-florist orders
     * - BloomWebsites consumer orders
     * - future BloomSuite order channels
     *
     * Physical delivery capability remains shared through
     * Shop.delivery:
     *
     * - ZIP zones
     * - distance zones
     * - max radius
     * - delivery fees
     * - fallback fee
     * - true shop-wide blackout dates
     */
    orderPolicy: {
      /**
       * Whether this BloomWebsite accepts same-day orders.
       */
      allowsSameDay: {
        type: Boolean,
        default: true,
      },

      /**
       * Same-day ordering cutoff in the florist's local
       * timezone using HH:mm 24-hour format.
       *
       * Example:
       * "14:00"
       */
      sameDayCutoff: {
        type: String,
        trim: true,
        default: "14:00",
      },

      /**
       * Minimum product/add-on subtotal required before
       * delivery fees and taxes.
       *
       * Stored in dollars for consistency with the current
       * Shop delivery configuration and BloomWebsite product
       * pricing models.
       *
       * We will convert to integer cents when calculating
       * authoritative checkout totals.
       */
      minProductTotal: {
        type: Number,
        min: 0,
        default: 0,
      },

      /**
       * Controls how much operational tracking the florist wants
       * to do inside BloomWebsites. Simple keeps the portal to a
       * one-click completion flow; detailed exposes production
       * milestones without making them mandatory.
       */
      fulfillmentWorkflow: {
        type: String,
        enum: ["simple", "detailed"],
        default: "simple",
      },

      /**
       * Delivery confirmation is optional because many florists
       * already send one from their POS. When BloomWebsites is the
       * system marking an order delivered, this toggle controls the
       * customer email.
       */
      sendDeliveryConfirmation: {
        type: Boolean,
        default: true,
      },

      /**
       * Temporary operational override for BloomWebsites.
       *
       * Example:
       * The florist becomes overloaded at 1:30 PM and stops
       * accepting additional website orders for today.
       *
       * This does NOT stop GetBloomDirect orders.
       */
      noMoreOrdersTodayUntil: {
        type: Date,
        default: null,
      },

      /**
       * Operational override for one requested delivery date
       * on BloomWebsites.
       *
       * This does NOT stop GetBloomDirect orders for the
       * same date.
       */
      noMoreOrdersForDate: {
        type: Date,
        default: null,
      },
    },

    // ===============================
    // PICKUP POLICY
    // ===============================

    /**
     * BloomWebsite-specific customer pickup rules.
     *
     * Pickup is a first-class fulfillment method.
     * It is intentionally separate from delivery/orderPolicy
     * because pickup has its own availability, cutoff,
     * preparation, and operational controls.
     */
    pickupPolicy: {
      /**
       * Whether customers may choose pickup on this
       * BloomWebsite.
       *
       * Disabled by default so existing storefronts do not
       * suddenly expose a new fulfillment method.
       */
      enabled: {
        type: Boolean,
        default: false,
      },

      /**
       * Whether same-day pickup is allowed.
       */
      allowsSameDay: {
        type: Boolean,
        default: true,
      },

      /**
       * Same-day pickup cutoff in the florist's local
       * timezone using HH:mm 24-hour format.
       *
       * Example:
       * "16:00"
       */
      sameDayCutoff: {
        type: String,
        trim: true,
        default: "16:00",
      },

      /**
       * Approximate time the florist needs to prepare
       * a pickup order.
       *
       * Stored as minutes so checkout can eventually
       * calculate/display pickup readiness consistently.
       */
      preparationMinutes: {
        type: Number,
        min: 0,
        max: 1440,
        default: 60,
      },

      /**
       * Customer-facing instructions shown during
       * pickup checkout and later on confirmation.
       *
       * Example:
       * "Please use the side entrance and ask for
       * online order pickup."
       */
      instructions: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      /**
       * Temporary operational override.
       *
       * Lets the florist stop pickup orders for the
       * rest of their local day without disabling
       * pickup permanently.
       */
      noMorePickupTodayUntil: {
        type: Date,
        default: null,
      },
    },

    // ===============================
    // BLOOMWEBSITES PAYMENTS
    // ===============================

    paymentSettings: {
      enabled: {
        type: Boolean,
        default: false,
      },

      provider: {
        type: String,
        enum: ["stripe", "fiserv"],
        default: "stripe",
      },
    },

    // ===============================
    // BLOOMWEBSITES TAX SETTINGS
    // ===============================

    /**
     * V1 uses florist-managed native tax settings.
     *
     * Bloom calculates exactly what the florist configures rather
     * than charging for a third-party tax engine on every order.
     * Individual products/add-ons can override the default rate.
     */
    taxSettings: {
      enabled: {
        type: Boolean,
        default: true,
      },

      defaultRatePercent: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },

      deliveryTaxable: {
        type: Boolean,
        default: true,
      },

      /**
       * Null means "use the website default rate."
       */
      deliveryRatePercent: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      tipsEnabled: {
        type: Boolean,
        default: true,
      },

      suggestedTipPercentages: {
        type: [Number],
        default: [10, 15, 20],
      },

      tipsTaxable: {
        type: Boolean,
        default: false,
      },

      /**
       * Null means "use the website default rate."
       */
      tipRatePercent: {
        type: Number,
        min: 0,
        max: 100,
        default: null,
      },

      taxExemptCustomersEnabled: {
        type: Boolean,
        default: false,
      },
    },

    // ===============================
    // WEBSITE SEO / LOCAL BUSINESS
    // ===============================

    seo: {
      homepageTitle: {
        type: String,
        trim: true,
        maxlength: 70,
        default: "",
      },

      homepageDescription: {
        type: String,
        trim: true,
        maxlength: 170,
        default: "",
      },

      socialTitle: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      socialDescription: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      socialImageUrl: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
      },

      businessDescription: {
        type: String,
        trim: true,
        maxlength: 1600,
        default: "",
      },

      googleBusinessProfileUrl: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      googleSiteVerification: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      bingSiteVerification: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      businessHours: {
        type: [bloomWebsiteBusinessHourSchema],
        default: () => [
          { day: "monday", enabled: false, opens: "09:00", closes: "17:00" },
          { day: "tuesday", enabled: false, opens: "09:00", closes: "17:00" },
          { day: "wednesday", enabled: false, opens: "09:00", closes: "17:00" },
          { day: "thursday", enabled: false, opens: "09:00", closes: "17:00" },
          { day: "friday", enabled: false, opens: "09:00", closes: "17:00" },
          { day: "saturday", enabled: false, opens: "09:00", closes: "13:00" },
          { day: "sunday", enabled: false, opens: "09:00", closes: "13:00" },
        ],
      },

      localDelivery: {
        localDeliveryNote: {
          type: String,
          trim: true,
          maxlength: 600,
          default: "",
        },
        serviceCities: [{ type: String, trim: true, maxlength: 120 }],
        neighborhoods: [{ type: String, trim: true, maxlength: 120 }],
        hospitals: [{ type: String, trim: true, maxlength: 160 }],
        funeralHomes: [{ type: String, trim: true, maxlength: 160 }],
        seniorLiving: [{ type: String, trim: true, maxlength: 160 }],
        schools: [{ type: String, trim: true, maxlength: 160 }],
        venues: [{ type: String, trim: true, maxlength: 160 }],
        businesses: [{ type: String, trim: true, maxlength: 160 }],
      },
    },

    // ===============================
    // DOMAIN
    // ===============================

    /**
     * Domain setup is intentionally not implemented in
     * the first preview milestone, but these fields give
     * us a clean place for the Go Live workflow later.
     */
    customDomain: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    domainVerified: {
      type: Boolean,
      default: false,
    },

    /**
     * Random ownership token used for Bloom's TXT-based
     * domain verification.
     *
     * This is intentionally separate from hosting-provider
     * routing records. Verifying domain ownership should
     * not depend on where BloomWebsites is hosted.
     */
    domainVerificationToken: {
      type: String,
      trim: true,
      default: "",
    },

    domainVerifiedAt: {
      type: Date,
      default: null,
    },

    /**
     * Hosting/routing readiness is intentionally separate
     * from Bloom's ownership verification above.
     *
     * domainVerified = florist proved ownership to Bloom.
     * domainRoutingReady = hosting provider can actually
     * receive production traffic for the hostname.
     */
    domainRoutingReady: {
      type: Boolean,
      default: false,
    },

    domainRoutingVerifiedAt: {
      type: Date,
      default: null,
    },

    // ===============================
    // WEBSITE SETTINGS
    // ===============================

    settings: {
      showPhone: {
        type: Boolean,
        default: true,
      },

      showAddress: {
        type: Boolean,
        default: true,
      },

      showSocialLinks: {
        type: Boolean,
        default: true,
      },

      /**
       * Optional shop-wide customer-facing note for arrangement/container
       * variability. Individual products may inherit, override, or suppress it.
       */
      arrangementContainerNote: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  },
);

bloomWebsiteSchema.index({
  status: 1,
  updatedAt: -1,
});

/*
 * Only non-empty public hostnames participate in the unique
 * index. BloomWebsite records intentionally use "" when no
 * custom domain is configured, so a normal unique index would
 * incorrectly allow only one website without a domain.
 *
 * The explicit name is also used by the one-time migration
 * script that replaces the legacy non-unique customDomain index.
 */
bloomWebsiteSchema.index(
  {
    customDomain: 1,
  },
  {
    name: "uniq_bloomwebsite_custom_domain_nonempty",
    unique: true,
    partialFilterExpression: {
      customDomain: {
        $type: "string",
        $gt: "",
      },
    },
  },
);

export default mongoose.models.BloomWebsite ||
  mongoose.model("BloomWebsite", bloomWebsiteSchema);
