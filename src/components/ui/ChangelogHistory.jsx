import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import PropTypes from "prop-types";

const ChangelogHistory = ({ customerId, orderKey, isMainOrder }) => {
  const [changelogHistory, setChangelogHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    const fetchChangelogHistory = async () => {
      try {
        // Ana sipariş veya alt sipariş için doğru yolun belirlenmesi
        const changelogPath = isMainOrder
          ? `customers/${customerId}/changelog`
          : `customers/${customerId}/otherOrders/${orderKey}/changelog`;

        const changelogRef = ref(database, changelogPath);
        const snapshot = await get(changelogRef);

        if (snapshot.exists()) {
          let history = snapshot.val();

          // Eğer dizi değilse, diziye çevir
          if (!Array.isArray(history)) {
            history = [history];
          }

          // Tarih sırasına göre sırala (en yeni en üstte)
          history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

          setChangelogHistory(history);
        } else {
          setChangelogHistory([]);
        }
      } catch (error) {
        console.error("Değişiklik geçmişi yüklenirken hata:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchChangelogHistory();
  }, [customerId, orderKey, isMainOrder]);

  // Tarih gruplandırması için yardımcı fonksiyon
  const groupByDate = (history) => {
    const groups = {};

    history.forEach((entry) => {
      const key = entry.formattedDate || "Bilinmeyen Tarih";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(entry);
    });

    return groups;
  };

  // Bir öğeyi genişlet/daralt
  const toggleExpanded = (id) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const hasChanges = (entry) => {
    return (
      (entry.addedProducts && entry.addedProducts.length > 0) ||
      (entry.removedProducts && entry.removedProducts.length > 0) ||
      (entry.priceChanges && entry.priceChanges.length > 0) ||
      entry.dimensionsChange ||
      entry.priceChange
    );
  };

  // Eklenen/kaldırılan ürünlerin daha detaylı gösterimi için
  const formatProductName = (product) => {
    // Bonus mu kontrol et
    const isBonus =
      product.isBonus ||
      (product.category && product.category.toLowerCase().includes("bonus"));

    // Kategori adını ve alt kategoriyi ayıkla
    let categoryDisplay = product.category || "";
    let subCategory = "";

    // Alt kategori bilgisini çıkar
    if (categoryDisplay.includes("[")) {
      const parts = categoryDisplay.split("[");
      categoryDisplay = parts[0].trim();
      subCategory = parts.length > 1 ? parts[1].replace("]", "") : "";
    }

    // İsim ve fiyat bilgileri
    const name = product.name || "Ürün Adı Belirtilmemiş";
    const price =
      typeof product.price !== "undefined"
        ? Number(product.price).toLocaleString("tr-TR") + "₺"
        : "Fiyat Belirtilmemiş";

    return (
      <div className="text-xs text-gray-400 pl-2">
        •
        {isBonus ? (
          <>
            <span className="text-purple-300">Bonus</span>
            {subCategory && (
              <span className="text-purple-200"> [{subCategory}]</span>
            )}
          </>
        ) : (
          <>
            <span className="text-green-300">{categoryDisplay}</span>
            {subCategory && (
              <span className="text-green-200"> [{subCategory}]</span>
            )}
          </>
        )}
        <span> - {name}</span>
        <span className="font-medium text-indigo-300"> ({price})</span>
      </div>
    );
  };

  // Tarihe göre gruplandırılmış değişiklik geçmişi
  const groupedHistory = groupByDate(changelogHistory);

  return (
    <div className="flex flex-col h-full">
      {/* Başlık */}
      <div className="flex items-center p-4 border-b border-gray-800/30 bg-gray-800/20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-500/20 p-1.5 rounded-md">
            <svg
              className="w-4 h-4 text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </div>
          <h2 className="text-md font-medium text-gray-200">
            Değişiklik Geçmişi
          </h2>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-400">
              Değişiklik geçmişi yükleniyor...
            </p>
          </div>
        ) : changelogHistory.length === 0 ? (
          <div className="text-center py-6">
            <svg
              className="w-12 h-12 mx-auto text-gray-500 mb-3"
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
            <p className="text-gray-400">
              Kaydedilmiş değişiklik geçmişi bulunmamaktadır
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([date, entries]) => (
              <div key={date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {date.substring(0, 2)}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-gray-400">{date}</h3>
                </div>

                <div className="space-y-4 ml-8">
                  {entries.map((entry, index) => (
                    <div
                      key={index}
                      className="border-l-2 border-gray-700 pl-4 py-1 space-y-2"
                    >
                      {/* Değişiklik başlığı ve saat */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleExpanded(`${date}-${index}`)}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <div className="text-sm text-gray-300">
                            {entry.formattedTime || "Bilinmeyen Saat"} -
                            Değişiklikler
                          </div>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${
                            expandedItems[`${date}-${index}`]
                              ? "transform rotate-180"
                              : ""
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
                      </div>

                      {/* Genişletilmiş değişiklik detayları */}
                      {expandedItems[`${date}-${index}`] && (
                        <div className="mt-2 pl-4 space-y-3">
                          {/* Toplam Fiyat Değişimi */}
                          {entry.priceChange && (
                            <div className="text-xs">
                              <span className="text-indigo-400 font-medium">
                                Toplam Fiyat:{" "}
                              </span>
                              <span className="text-gray-400">
                                <span className="line-through">
                                  {Number(
                                    entry.priceChange.oldPrice
                                  ).toLocaleString("tr-TR")}
                                  ₺
                                </span>
                                <span className="mx-1">→</span>
                                <span className="text-indigo-300">
                                  {Number(
                                    entry.priceChange.newPrice
                                  ).toLocaleString("tr-TR")}
                                  ₺
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Boyut Değişimi */}
                          {entry.dimensionsChange && (
                            <div className="text-xs">
                              <span className="text-blue-400 font-medium">
                                Boyutlar:{" "}
                              </span>
                              <span className="text-gray-400">
                                <span className="line-through">
                                  {entry.dimensionsChange.oldWidth}x
                                  {entry.dimensionsChange.oldHeight}
                                </span>
                                <span className="mx-1">→</span>
                                <span className="text-blue-300">
                                  {entry.dimensionsChange.newWidth}x
                                  {entry.dimensionsChange.newHeight}
                                </span>
                              </span>
                            </div>
                          )}

                          {/* Eklenen Ürünler */}
                          {entry.addedProducts &&
                            entry.addedProducts.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-green-400 text-xs font-medium">
                                  Eklenen Ürünler ({entry.addedProducts.length}
                                  ):
                                </div>
                                {entry.addedProducts.map((product, i) => (
                                  <div key={i} className="pl-2">
                                    {formatProductName(product)}
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Kaldırılan Ürünler */}
                          {entry.removedProducts &&
                            entry.removedProducts.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-red-400 text-xs font-medium">
                                  Kaldırılan Ürünler (
                                  {entry.removedProducts.length}):
                                </div>
                                {entry.removedProducts.map((product, i) => (
                                  <div key={i} className="pl-2">
                                    {formatProductName(product)}
                                  </div>
                                ))}
                              </div>
                            )}

                          {/* Fiyat Değişimleri */}
                          {entry.priceChanges &&
                            entry.priceChanges.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-amber-400 text-xs font-medium">
                                  Fiyat Değişiklikleri:
                                </div>
                                {entry.priceChanges.map((change, i) => (
                                  <div
                                    key={i}
                                    className="text-xs text-gray-400 pl-2"
                                  >
                                    •{" "}
                                    <span className="text-amber-300">
                                      {change.category}
                                    </span>{" "}
                                    - {change.name}:{" "}
                                    <span className="line-through">
                                      {Number(change.oldPrice).toLocaleString(
                                        "tr-TR"
                                      )}
                                      ₺
                                    </span>
                                    <span className="mx-1">→</span>
                                    <span className="text-amber-300">
                                      {Number(change.newPrice).toLocaleString(
                                        "tr-TR"
                                      )}
                                      ₺
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

ChangelogHistory.propTypes = {
  customerId: PropTypes.string.isRequired,
  orderKey: PropTypes.string.isRequired,
  isMainOrder: PropTypes.bool.isRequired,
};

export default ChangelogHistory;
