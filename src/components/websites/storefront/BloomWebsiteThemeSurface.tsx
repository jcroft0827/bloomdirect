import type {
  BloomWebsiteBackgroundStyle,
  BloomWebsiteStorefrontTheme,
} from "@/types/bloom-website";
import type { CSSProperties, ReactNode } from "react";

type BloomWebsiteThemeSurfaceProps = {
  theme: BloomWebsiteStorefrontTheme;
  children: ReactNode;
  className?: string;
};

type ThemeStyle = CSSProperties & {
  "--bloom-primary": string;
  "--bloom-primary-foreground": string;
  "--bloom-accent": string;
  "--bloom-accent-foreground": string;
};

function getBackgroundDecoration(backgroundStyle: BloomWebsiteBackgroundStyle) {
  switch (backgroundStyle) {
    case "soft_floral":
      return <SoftFloralDecoration />;

    case "botanical":
      return <BotanicalDecoration />;

    case "romantic":
      return <RomanticDecoration />;

    case "minimal_texture":
      return <MinimalTextureDecoration />;

    case "clean":
    default:
      return null;
  }
}

export default function BloomWebsiteThemeSurface({
  theme,
  children,
  className = "",
}: BloomWebsiteThemeSurfaceProps) {
  const style: ThemeStyle = {
    "--bloom-primary": theme.primaryColor,
    "--bloom-primary-foreground": theme.primaryForeground,
    "--bloom-accent": theme.accentColor,
    "--bloom-accent-foreground": theme.accentForeground,
  };

  return (
    <div
      style={style}
      data-bloom-background={theme.backgroundStyle}
      className={`relative isolate min-h-screen overflow-hidden bg-white text-gray-950 ${className}`}
    >
      {getBackgroundDecoration(theme.backgroundStyle)}

      <div className="relative z-10">{children}</div>
    </div>
  );
}

function SoftFloralDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute -right-28 -top-24 h-[360px] w-[360px] rounded-full opacity-[0.07] blur-3xl sm:h-[480px] sm:w-[480px]"
        style={{
          background:
            "radial-gradient(circle, var(--bloom-primary) 0%, transparent 70%)",
        }}
      />

      <div
        className="absolute -bottom-32 -left-28 h-[380px] w-[380px] rounded-full opacity-[0.06] blur-3xl sm:h-[520px] sm:w-[520px]"
        style={{
          background:
            "radial-gradient(circle, var(--bloom-accent) 0%, transparent 70%)",
        }}
      />

      <FloralCorner
        className="absolute -right-10 top-10 h-56 w-56 opacity-[0.09] sm:h-72 sm:w-72"
        color="var(--bloom-primary)"
      />

      <FloralCorner
        className="absolute -bottom-8 -left-12 h-52 w-52 rotate-180 opacity-[0.07] sm:h-72 sm:w-72"
        color="var(--bloom-accent)"
      />
    </div>
  );
}

function BotanicalDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-x-0 top-0 h-64 opacity-[0.055]"
        style={{
          background:
            "linear-gradient(180deg, var(--bloom-accent) 0%, transparent 100%)",
        }}
      />

      <BotanicalStem
        className="absolute -left-14 top-24 h-80 w-52 -rotate-12 opacity-[0.11] sm:left-2 sm:h-96 sm:w-64"
        color="var(--bloom-accent)"
      />

      <BotanicalStem
        className="absolute -right-16 top-[34rem] h-80 w-52 rotate-[168deg] opacity-[0.08] sm:right-0 sm:h-96 sm:w-64"
        color="var(--bloom-primary)"
      />
    </div>
  );
}

function RomanticDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-[0.08] blur-[90px]"
        style={{
          background: "var(--bloom-primary)",
        }}
      />

      <div
        className="absolute -right-40 top-48 h-[500px] w-[500px] rounded-full opacity-[0.07] blur-[100px]"
        style={{
          background: "var(--bloom-accent)",
        }}
      />

      <div
        className="absolute bottom-[12%] left-[30%] h-[420px] w-[420px] rounded-full opacity-[0.045] blur-[100px]"
        style={{
          background: "var(--bloom-primary)",
        }}
      />

      <RomanticFlourish
        className="absolute -right-10 top-16 h-64 w-64 opacity-[0.08] sm:h-80 sm:w-80"
        color="var(--bloom-primary)"
      />
    </div>
  );
}

function MinimalTextureDecoration() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `
            radial-gradient(
              circle at 1px 1px,
              var(--bloom-primary) 1px,
              transparent 0
            )
          `,
          backgroundSize: "24px 24px",
        }}
      />

      <div
        className="absolute inset-x-0 top-0 h-72 opacity-[0.035]"
        style={{
          background:
            "linear-gradient(180deg, var(--bloom-accent), transparent)",
        }}
      />
    </div>
  );
}

function FloralCorner({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 240 240"
      fill="none"
      className={className}
      style={{ color }}
    >
      <path
        d="M226 18C176 47 137 84 109 129C87 165 72 198 64 226"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M169 64C151 54 136 56 124 72C143 79 159 76 169 64Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M137 103C120 91 103 92 90 107C108 117 124 115 137 103Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M106 145C88 134 71 137 61 153C79 161 95 158 106 145Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M193 42C195 24 186 11 169 7C167 26 175 38 193 42Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <circle cx="198" cy="44" r="13" stroke="currentColor" strokeWidth="2" />

      <path
        d="M198 31C202 37 207 40 214 41C208 45 205 50 205 57C201 51 196 48 189 47C195 43 198 38 198 31Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BotanicalStem({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 180 300"
      fill="none"
      className={className}
      style={{ color }}
    >
      <path
        d="M91 292C90 229 89 166 92 103C94 68 100 38 111 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M92 222C66 210 47 190 35 162C64 164 84 185 92 222Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M91 182C117 169 136 149 147 120C118 123 99 144 91 182Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M92 137C69 125 53 106 45 82C70 85 86 103 92 137Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M96 94C119 82 134 64 142 40C118 43 102 61 96 94Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M105 48C91 36 86 21 90 4C107 14 112 29 105 48Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RomanticFlourish({
  className,
  color,
}: {
  className: string;
  color: string;
}) {
  return (
    <svg
      viewBox="0 0 260 260"
      fill="none"
      className={className}
      style={{ color }}
    >
      <path
        d="M250 34C196 42 161 66 143 105C126 142 103 168 72 184C52 194 31 198 9 196"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M181 74C164 58 145 55 124 65C138 82 157 85 181 74Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M142 111C160 104 176 108 190 124C169 131 153 126 142 111Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M101 158C85 141 66 137 44 146C58 165 77 169 101 158Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M218 49C211 32 215 17 229 5C239 22 235 37 218 49Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
