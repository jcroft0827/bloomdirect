import React from "react";

type AppButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "outline"
  | "ghost"
  | "pro";

type AppButtonSize = "sm" | "md" | "lg";

type AppButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  fullWidth?: boolean;
};

export default function AppButton({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  className = "",
  disabled,
  ...props
}: AppButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-bold transition disabled:cursor-not-allowed disabled:opacity-60";

  const variants: Record<AppButtonVariant, string> = {
    primary: "bg-purple-600 text-white hover:bg-purple-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    danger: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    pro: "bg-white text-purple-700 shadow-lg hover:scale-[1.02]",
  };

  const sizes: Record<AppButtonSize, string> = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <button
      disabled={disabled}
      className={[
        base,
        variants[variant],
        sizes[size],
        fullWidth ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}