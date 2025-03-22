import { useState, useEffect } from "react";
import PropTypes from "prop-types";

const ChangelogButton = ({ onClick, hasChanges = false }) => {
  const [animated, setAnimated] = useState(false);

  // Değişiklik olduğunda animasyon göster
  useEffect(() => {
    if (hasChanges) {
      setAnimated(true);
      const timer = setTimeout(() => setAnimated(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [hasChanges]);

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center p-1.5 rounded-md transition-all duration-200 ${
        hasChanges
          ? "text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30"
          : "text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
      }`}
      title="Değişiklik Özeti"
    >
      {/* Notification dot */}
      {hasChanges && (
        <span className="absolute top-0 right-0 w-2 h-2 bg-blue-500 rounded-full"></span>
      )}

      <svg
        className={`w-4 h-4 transition-all duration-300 ${
          animated ? "transform rotate-y-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    </button>
  );
};

ChangelogButton.propTypes = {
  onClick: PropTypes.func.isRequired,
  hasChanges: PropTypes.bool,
};

export default ChangelogButton;
