import { useEffect } from "react";
import PropTypes from "prop-types";

const CustomerInfo = ({
  customer,
  isEditing,
  setIsEditing,
  editedData,
  setEditedData,
  onSave,
}) => {
  // Düzenleme moduna geçildiğinde müşteri verilerini editedData'ya kopyala
  useEffect(() => {
    if (isEditing) {
      setEditedData({ ...customer });
    }
  }, [isEditing, customer, setEditedData]);

  // Input değişikliklerini yönet
  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditedData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="space-y-4">
      {!isEditing ? (
        // Görüntüleme Modu
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-400 mb-1">Müşteri Adı</p>
              <p className="text-sm text-gray-200">{customer.fullName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Telefon</p>
              <p className="text-sm text-gray-200">{customer.phone}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Email</p>
              <p className="text-sm text-gray-200">{customer.email || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Adres</p>
              <p className="text-sm text-gray-200">{customer.address || "—"}</p>
            </div>
          </div>
          <div>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors mt-2"
            >
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
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Düzenle
            </button>
          </div>
        </>
      ) : (
        // Düzenleme Modu
        <>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Müşteri Adı
              </label>
              <input
                name="fullName"
                value={editedData.fullName || ""}
                onChange={handleChange}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Telefon
              </label>
              <input
                name="phone"
                value={editedData.phone || ""}
                onChange={handleChange}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input
                name="email"
                value={editedData.email || ""}
                onChange={handleChange}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Adres</label>
              <input
                name="address"
                value={editedData.address || ""}
                onChange={handleChange}
                className="w-full bg-gray-800/50 border border-gray-700/50 rounded-md px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <button
              onClick={onSave}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md transition-colors"
            >
              Kaydet
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs font-medium rounded-md transition-colors"
            >
              İptal
            </button>
          </div>
        </>
      )}
    </div>
  );
};

CustomerInfo.propTypes = {
  customer: PropTypes.shape({
    fullName: PropTypes.string,
    phone: PropTypes.string,
    email: PropTypes.string,
    address: PropTypes.string,
    id: PropTypes.string,
  }).isRequired,
  isEditing: PropTypes.bool,
  setIsEditing: PropTypes.func,
  editedData: PropTypes.object,
  setEditedData: PropTypes.func,
  onSave: PropTypes.func,
};

export default CustomerInfo;
