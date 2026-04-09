import { ReactNode, useState } from "react";

interface ToolTipProps {
  text: string | ReactNode; // Supports plain text or JSX
  children: ReactNode; // The element being hovered
}

const ToolTip: React.FC<ToolTipProps> = ({ text, children }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);

  return (
    <div
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      className="relative inline-block"
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded opacity-90 whitespace-nowrap z-10"
          role="tooltip"
        >
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gray-800 rotate-45 mt-1" />
        </div>
      )}
    </div>
  );
};

export default ToolTip;
