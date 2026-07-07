import React from "react";

type AppModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
};

export default function AppModal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidth = "lg",
}: AppModalProps) {
  if (!open) return null;

  const widths = {
    sm: "max-w-md",
    md: "max-w-xl",
    lg: "max-w-3xl",
    xl: "max-w-5xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div
        className={`w-full ${widths[maxWidth]} max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            {title && (
              <h2 className="text-2xl font-black text-purple-700">{title}</h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-1 font-bold text-gray-600 hover:bg-gray-200"
          >
            X
          </button>
        </div>

        <div className="mt-6">{children}</div>

        {footer && <div className="mt-6">{footer}</div>}
      </div>
    </div>
  );
}