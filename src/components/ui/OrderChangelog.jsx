import { useState, useEffect } from "react";
import PropTypes from "prop-types";

const OrderChangelog = ({ changelog, isLoading }) => {
  const [expandedDates, setExpandedDates] = useState({});

  // Group log entries by date
  const groupByDate = (logs) => {
    if (!logs || logs.length === 0) return {};

    return logs.reduce((groups, log) => {
      const date = new Date(log.timestamp);
      const dateKey = date.toLocaleDateString("tr-TR");

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }

      groups[dateKey].push({
        ...log,
        time: date.toLocaleTimeString("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      });

      return groups;
    }, {});
  };

  const groupedLogs = groupByDate(changelog);

  // Toggle expanded state for dates
  const toggleDate = (dateKey) => {
    setExpandedDates((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Sort dates newest first
  const sortedDates = Object.keys(groupedLogs).sort(
    (a, b) =>
      new Date(b.split(".").reverse().join("-")) -
      new Date(a.split(".").reverse().join("-"))
  );

  // Automatically expand the most recent date
  useEffect(() => {
    if (sortedDates.length > 0 && Object.keys(expandedDates).length === 0) {
      setExpandedDates({ [sortedDates[0]]: true });
    }
  }, [sortedDates.length]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500/20 p-1.5 rounded-md">
            <svg
              className="w-4 h-4 text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-200">Değişiklikler</h2>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-4">
          <svg
            className="animate-spin h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
      ) : sortedDates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="bg-gray-700/40 p-3 rounded-lg">
            <svg
              className="w-5 h-5 text-gray-500 mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="text-gray-500">Değişiklik kaydı bulunmamaktadır.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedDates.map((dateKey) => (
            <div
              key={dateKey}
              className="bg-gray-800/50 rounded-lg overflow-hidden"
            >
              {/* Date Header */}
              <div
                className="flex justify-between items-center px-4 py-2 bg-gray-700/40 cursor-pointer"
                onClick={() => toggleDate(dateKey)}
              >
                <span className="text-sm font-medium text-gray-300">
                  {dateKey}
                </span>
                <button className="text-gray-400 hover:text-gray-300 transition-colors">
                  <svg
                    className="w-4 h-4 transform transition-transform duration-200"
                    style={{
                      transform: expandedDates[dateKey]
                        ? "rotate(180deg)"
                        : "rotate(0deg)",
                    }}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* Changelog Entries */}
              {expandedDates[dateKey] && (
                <div className="divide-y divide-gray-700/20">
                  {groupedLogs[dateKey].map((log, idx) => (
                    <div key={idx} className="p-3 relative bg-gray-800/50">
                      <div className="flex items-center mb-1">
                        {log.type === "add" && (
                          <span className="bg-green-500/10 text-green-400 text-xs px-2 py-0.5 rounded-full">
                            Eklendi
                          </span>
                        )}
                        {log.type === "remove" && (
                          <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full">
                            Kaldırıldı
                          </span>
                        )}
                        {log.type === "update" && (
                          <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full">
                            Güncellendi
                          </span>
                        )}
                        {log.type === "total" && (
                          <span className="bg-purple-500/10 text-purple-400 text-xs px-2 py-0.5 rounded-full">
                            Toplam
                          </span>
                        )}
                      </div>
                      <p className="text-gray-300 text-sm">{log.message}</p>
                      <span className="text-gray-500 text-xs mt-1 block">
                        {log.time}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

OrderChangelog.propTypes = {
  changelog: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.oneOf(["add", "remove", "update", "total"]).isRequired,
      message: PropTypes.string.isRequired,
      timestamp: PropTypes.number.isRequired,
    })
  ),
  isLoading: PropTypes.bool,
};

OrderChangelog.defaultProps = {
  changelog: [],
  isLoading: false,
};

export default OrderChangelog;
