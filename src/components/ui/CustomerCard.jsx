import PropTypes from "prop-types";
import { ref, remove } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import CustomerDetailModal from "./CustomerDetailModal";

const CustomerCard = ({ customer }) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleDelete = async () => {
    try {
      const customerRef = ref(database, `customers/${customer.id}`);
      await remove(customerRef);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting customer:", error);
    }
  };

  const getConditionStyles = (condition) => {
    switch (condition) {
      case "verified":
        return {
          bg: "bg-green-500/10",
          text: "text-green-400",
          border: "border-green-500/20",
          icon: "text-green-400",
        };
      case "beklemede":
        return {
          bg: "bg-amber-500/10",
          text: "text-amber-400",
          border: "border-amber-500/20",
          icon: "text-amber-400",
        };
      case "iptal":
        return {
          bg: "bg-red-500/10",
          text: "text-red-400",
          border: "border-red-500/20",
          icon: "text-red-400",
        };
      default:
        return {
          bg: "bg-gray-500/10",
          text: "text-gray-400",
          border: "border-gray-500/20",
          icon: "text-gray-400",
        };
    }
  };

  const getConditionIcon = (condition) => {
    switch (condition) {
      case "verified":
        return (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
        );
      case "beklemede":
        return (
          <svg
            className="w-3.5 h-3.5"
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
        );
      case "iptal":
        return (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getConditionText = (condition) => {
    switch (condition) {
      case "verified":
        return "Onaylandı";
      case "beklemede":
        return "Beklemede";
      case "iptal":
        return "İptal";
      default:
        return condition || "Belirsiz";
    }
  };

  // Avatar için ilk harfi al
  const avatarText = customer.fullName?.charAt(0).toUpperCase() || "?";
  const conditionStyle = getConditionStyles(customer.condition);

  return (
    <>
      <div
        className="bg-gradient-to-br from-gray-800 to-gray-800/90 rounded-xl overflow-hidden border border-gray-700/70 shadow-lg hover:shadow-xl transition-shadow duration-300 hover:border-gray-600/70"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Card top line decoration */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-indigo-600 opacity-70"></div>

        {/* Card header with avatar */}
        <div className="p-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-medium shadow-md">
                {avatarText}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-100 break-words line-clamp-1 max-w-[160px]">
                  {customer.fullName}
                </h3>
                <div
                  className={`flex items-center gap-1.5 mt-1 ${conditionStyle.text} ${conditionStyle.bg} px-2 py-0.5 rounded text-xs border ${conditionStyle.border} w-fit`}
                >
                  {getConditionIcon(customer.condition)}
                  <span>{getConditionText(customer.condition)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact info section */}
        <div className="px-5 pt-1 pb-4">
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
              <span className="text-sm text-gray-300 break-all line-clamp-1">
                {customer.phone}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <svg
                className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm text-gray-300 break-all line-clamp-1">
                {customer.email}
              </span>
            </div>
          </div>
        </div>

        {/* Actions footer */}

        {/* Actions footer - With Improved Delete Button */}
        <div className="p-3 border-t border-gray-700/50 bg-gray-800/70 flex items-center justify-between">
          <div className="flex items-center space-x-1">
            {/* Check/Approve Icon */}
            <button
              className="p-1.5 text-gray-400 hover:text-green-400 rounded-md hover:bg-green-400/10 transition-colors"
              title="Onayla"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>

            {/* View Details Icon */}
            <button
              className="p-1.5 text-gray-400 hover:text-blue-400 rounded-md hover:bg-blue-400/10 transition-colors"
              onClick={() => setIsDetailModalOpen(true)}
              title="Detaylar"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>

            {/* Edit Icon */}
            <button
              className="p-1.5 text-gray-400 hover:text-amber-400 rounded-md hover:bg-amber-400/10 transition-colors"
              title="Düzenle"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>

            {/* Delete Icon - Enhanced */}
            <button
              className="p-1.5 text-red-400 hover:text-red-300 rounded-md hover:bg-red-400/10 transition-colors relative group"
              onClick={() => setIsDeleteDialogOpen(true)}
              title="Sil"
            >
              <svg
                className="w-4.5 h-4.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
            </button>
          </div>

          {/* Right side buttons */}
          <div className="flex items-center space-x-2">
            {/* New Delete Button */}
            <button
              onClick={() => setIsDeleteDialogOpen(true)}
              className="px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 transition-colors text-red-400 rounded border border-red-600/20 flex items-center gap-1"
            >
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Sil</span>
            </button>

            {/* Details Button */}
            <button
              onClick={() => setIsDetailModalOpen(true)}
              className="px-2.5 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 transition-colors text-blue-400 rounded border border-blue-600/20 flex items-center gap-1"
            >
              <span>Detaylar</span>
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Silme dialog'u */}
      {/* Silme dialog'u */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-600 to-red-500"></div>
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-100 flex items-center gap-2">
              <div className="bg-red-500/10 p-1.5 rounded-full">
                <svg
                  className="w-5 h-5 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              Müşteriyi Sil
            </DialogTitle>
            <DialogDescription className="text-gray-400 mt-2">
              <p className="mb-2">{`${customer.fullName} isimli müşteriyi silmek istediğinizden emin misiniz?`}</p>
              <div className="mt-4 bg-red-900/10 border border-red-900/20 p-3 rounded-md">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Bu işlem geri alınamaz ve tüm müşteri verilerini kalıcı olarak
                  silecektir.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end border-t border-gray-700/50 pt-4 mt-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-gray-300 border border-gray-600 rounded-md hover:bg-gray-700/50 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-md hover:from-red-700 hover:to-red-600 transition-colors shadow-md flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Sil
              </button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Müşteri detay modal'ı */}
      <CustomerDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        customer={customer}
      />
    </>
  );
};

CustomerCard.propTypes = {
  customer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    phone: PropTypes.string.isRequired,
    condition: PropTypes.string.isRequired,
  }).isRequired,
};

export default CustomerCard;
