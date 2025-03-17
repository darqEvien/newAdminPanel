import PropTypes from "prop-types";

const CustomerInfo = ({ customer }) => {
  const { fullName, email, phone, message } = customer;

  // Info item component for consistent styling
  const InfoItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-2 mb-1.5 last:mb-0">
      <div className="mt-0.5 w-3.5 h-3.5 flex-shrink-0 rounded-md bg-indigo-500/20 flex items-center justify-center text-indigo-400">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs text-gray-500 leading-none">{label}</div>
        <div className="text-sm text-gray-200 font-medium break-words">
          {value || "---"}
        </div>
      </div>
    </div>
  );

  // InfoItem için PropTypes tanımlayalım
  InfoItem.propTypes = {
    icon: PropTypes.node.isRequired,
    label: PropTypes.string.isRequired,
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  };

  return (
    <div className="space-y-2">
      {/* Main customer info - daha kompakt grid */}
      <div className="grid gap-2" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <InfoItem
          icon={
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          }
          label="Müşteri Adı"
          value={fullName}
        />

        <InfoItem
          icon={
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          }
          label="E-posta"
          value={email}
        />

        <InfoItem
          icon={
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
          }
          label="Telefon"
          value={phone}
        />

        {/* Rozetleri grid içine taşıyalım */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            Aktif
          </span>
          {customer.isVIP && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              VIP
            </span>
          )}
        </div>
      </div>

      {/* Sipariş notunu ayrı bırakalım ama daha kompakt hale getirelim */}
      {message && (
        <InfoItem
          icon={
            <svg
              className="w-2.5 h-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
          }
          label="Sipariş Notu"
          value={message}
        />
      )}
    </div>
  );
};

CustomerInfo.propTypes = {
  customer: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string,
    message: PropTypes.string,
    isVIP: PropTypes.bool,
  }).isRequired,
};

export default CustomerInfo;
