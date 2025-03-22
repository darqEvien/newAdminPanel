import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
const ChangelogHistory = ({ customerId, orderKey, isMainOrder }) => {
  const [changelog, setChangelog] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  // Öğeyi genişletme/daraltma fonksiyonu
  const toggleItem = (index) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  useEffect(() => {
    const fetchChangelog = async () => {
      setIsLoading(true);
      try {
        const path = isMainOrder
          ? `customers/${customerId}/changelog`
          : `customers/${customerId}/otherOrders/${orderKey}/changelog`;

        const snapshot = await get(ref(database, path));

        if (snapshot.exists()) {
          let data = snapshot.val();
          if (!Array.isArray(data)) data = [data];

          // Kronolojik sıralama - en son değişiklikler üstte
          data.sort((a, b) => b.timestamp - a.timestamp);
          setChangelog(data);
        } else {
          setChangelog([]);
        }
      } catch (error) {
        console.error("Changelog yüklenirken hata:", error);
        toast.error("Değişiklik geçmişi yüklenemedi");
      } finally {
        setIsLoading(false);
      }
    };

    if (customerId) {
      fetchChangelog();
    }
  }, [customerId, orderKey, isMainOrder]);

  // Değişiklik yoksa mesaj göster
  if (!isLoading && changelog.length === 0) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="mb-3">
          <svg
            className="w-10 h-10 mx-auto text-gray-500 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <p>Değişiklik geçmişi bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      {isLoading ? (
        <div className="flex justify-center items-center h-40">
          <div className="loader"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {changelog.map((entry, index) => (
            <div
              key={index}
              className="relative pl-6 border-l-2 border-gray-700"
            >
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-indigo-500"></div>
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">
                    {entry.formattedDate}
                  </span>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-400">
                    {entry.formattedTime}
                  </span>
                </div>

                {/* Genişlet/Daralt butonu ekleyelim */}
                <button
                  onClick={() => toggleItem(index)}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${
                      expandedItems[index] ? "rotate-180" : ""
                    }`}
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

              {/* İçeriğin gösterilmesi veya gizlenmesi */}
              <div
                className={expandedItems[index] !== false ? "block" : "hidden"}
              >
                {/* Müşteri Değişiklikleri */}

                {entry.hasCustomerChanges &&
                  entry.customerChanges &&
                  entry.customerChanges.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-blue-400 mb-2">
                        Müşteri Bilgisi Değişiklikleri
                      </h4>
                      <div className="bg-gray-800/50 rounded p-3 space-y-2">
                        {entry.customerChanges.map((change, idx) => (
                          <div
                            key={idx}
                            className={`grid ${
                              change.field === "email" ||
                              change.field === "address"
                                ? "grid-cols-1 gap-2"
                                : "grid-cols-3 gap-2"
                            } text-xs`}
                          >
                            <div className="text-gray-400">
                              {formatFieldName(change.field)}
                            </div>

                            {/* E-posta veya adres için özel düzen */}
                            {change.field === "email" ||
                            change.field === "address" ? (
                              <div className="mt-1 grid grid-cols-2 gap-2">
                                <div className="text-red-400 line-through break-all">
                                  {change.oldValue || "—"}
                                </div>
                                <div className="text-green-400 break-all">
                                  {change.newValue || "—"}
                                </div>
                              </div>
                            ) : (
                              // Diğer alanlar için standart düzen
                              <>
                                <div className="text-red-400 line-through">
                                  {change.oldValue || "—"}
                                </div>
                                <div className="text-green-400">
                                  {change.newValue || "—"}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Ürün Ekleme */}
                {entry.addedProducts && entry.addedProducts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-green-400 mb-2">
                      Eklenen Ürünler
                    </h4>
                    <div className="bg-gray-800/50 rounded p-3 space-y-2">
                      {entry.addedProducts.map((product, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-300">{product.name}</span>
                          <span className="text-gray-400">
                            {formatPrice(product.price)} TL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ürün Silme */}
                {entry.removedProducts && entry.removedProducts.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-red-400 mb-2">
                      Kaldırılan Ürünler
                    </h4>
                    <div className="bg-gray-800/50 rounded p-3 space-y-2">
                      {entry.removedProducts.map((product, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-gray-300">{product.name}</span>
                          <span className="text-gray-400">
                            {formatPrice(product.price)} TL
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fiyat Değişiklikleri */}
                {entry.priceChanges && entry.priceChanges.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-amber-400 mb-2">
                      Fiyat Değişiklikleri
                    </h4>
                    <div className="bg-gray-800/50 rounded p-3 space-y-2">
                      {entry.priceChanges.map((change, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-3 gap-2 text-xs"
                        >
                          <div className="text-gray-300">{change.name}</div>
                          <div className="text-red-400 line-through">
                            {formatPrice(change.oldPrice)} TL
                          </div>
                          <div className="text-green-400">
                            {formatPrice(change.newPrice)} TL
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Boyut değişikliği */}
                {entry.dimensionsChange && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-purple-400 mb-2">
                      Boyut Değişiklikleri
                    </h4>
                    <div className="bg-gray-800/50 rounded p-3 grid grid-cols-3 gap-2 text-xs">
                      <div className="text-gray-400">Ölçüler</div>
                      <div className="text-red-400 line-through">
                        {entry.oldDimensions?.kontiWidth || "?"} x{" "}
                        {entry.oldDimensions?.kontiHeight || "?"} cm
                      </div>
                      <div className="text-green-400">
                        {entry.newDimensions?.kontiWidth || "?"} x{" "}
                        {entry.newDimensions?.kontiHeight || "?"} cm
                      </div>
                    </div>
                  </div>
                )}

                {/* Genel Fiyat Değişimi */}
                {entry.priceChange && (
                  <div className="mt-4 bg-indigo-900/20 rounded p-3 border border-indigo-800/30">
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-medium text-indigo-400">
                        Toplam Fiyat Değişimi:
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-red-400 line-through">
                          {formatPrice(entry.oldTotalPrice)} TL
                        </span>
                        <span className="text-xs text-green-400">
                          {formatPrice(entry.newTotalPrice)} TL
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Alan adlarını daha okunabilir hale getiren yardımcı fonksiyon
const formatFieldName = (fieldName) => {
  const fieldMap = {
    fullName: "Müşteri Adı",
    phone: "Telefon",
    email: "E-posta",
    address: "Adres",
    message: "Mesaj",
    // Diğer alanlar buraya eklenebilir
  };

  return fieldMap[fieldName] || fieldName;
};

const formatPrice = (price) => {
  if (!price) return "0";
  return Number(price).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

ChangelogHistory.propTypes = {
  customerId: PropTypes.string.isRequired,
  orderKey: PropTypes.string.isRequired,
  isMainOrder: PropTypes.bool.isRequired,
};

export default ChangelogHistory;
