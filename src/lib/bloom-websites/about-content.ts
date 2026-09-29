import type {
  BloomWebsiteAboutFacts,
  BloomWebsiteAboutSection,
} from "@/types/bloom-website";

type GenerateAboutCopyInput = {
  businessName: string;
  city?: string;
  state?: string;
  facts: BloomWebsiteAboutFacts;
};

function clean(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function finishSentence(value: string) {
  const text = clean(value);

  if (!text) return "";

  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function joinSentences(values: string[]) {
  return values.map(finishSentence).filter(Boolean).join(" ");
}

export function getDefaultBloomWebsiteAboutSections(
  fallbackStory = "",
): BloomWebsiteAboutSection[] {
  return [
    {
      key: "story",
      enabled: true,
      title: "Our Story",
      body: clean(fallbackStory),
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
  ];
}

export function generateBloomWebsiteAboutSections({
  businessName,
  city,
  state,
  facts,
}: GenerateAboutCopyInput): BloomWebsiteAboutSection[] {
  const location = [clean(city), clean(state)].filter(Boolean).join(", ");
  const name = clean(businessName) || "Our flower shop";

  const openingYear = clean(facts.openingYear);
  const founderNames = clean(facts.founderNames);
  const originStory = clean(facts.originStory);
  const specialties = clean(facts.specialties);
  const community = clean(facts.community);
  const servicePhilosophy = clean(facts.servicePhilosophy);
  const differentiators = clean(facts.differentiators);

  const firstParagraph = joinSentences([
    openingYear && location
      ? `${name} has been serving ${location} since ${openingYear}`
      : openingYear
        ? `${name} has been creating meaningful floral designs since ${openingYear}`
        : location
          ? `${name} is a local florist serving ${location}`
          : `${name} is an independent local flower shop`,
    founderNames ? `${name} is led by ${founderNames}` : "",
    originStory,
  ]);

  const secondParagraph = joinSentences([
    specialties
      ? `Our floral work includes ${specialties}`
      : "We design flowers for everyday moments, celebrations, sympathy, and the occasions that matter most",
    servicePhilosophy,
    differentiators,
  ]);

  const thirdParagraph = joinSentences([
    community,
    location
      ? `We are proud to help customers send thoughtful flowers throughout ${location} and the surrounding communities`
      : "We are proud to serve our local community with personal care and dependable floral service",
  ]);

  const storyBody = [firstParagraph, secondParagraph, thirdParagraph]
    .filter(Boolean)
    .join("\n\n");

  return [
    {
      key: "story",
      enabled: true,
      title: "Our Story",
      body: storyBody,
      sortOrder: 0,
    },
    {
      key: "specialties",
      enabled: Boolean(specialties || servicePhilosophy || differentiators),
      title: "What We Do Best",
      body: joinSentences([
        specialties ? `Our specialties include ${specialties}` : "",
        servicePhilosophy,
        differentiators,
      ]),
      sortOrder: 1,
    },
    {
      key: "community",
      enabled: Boolean(community || location),
      title: "Rooted in Our Community",
      body: joinSentences([
        community,
        location
          ? `As a local florist, we are proud to serve ${location} and nearby communities`
          : "",
      ]),
      sortOrder: 2,
    },
  ];
}
