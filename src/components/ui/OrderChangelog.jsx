import { useState, useEffect } from "react";
import PropTypes from "prop-types";

const OrderChangelog = ({ changes, isActive, onClose, onSave }) => {
  // Grup açılma durumunu izleyen state
  const [openGroups, setOpenGroups] = useState({
    priceChange: true,
    dimensionsChange: true,
    addedProducts: true,
    removedProducts: true,
    priceChanges: true,
  });

  // Grup durumunu değiştirme fonksiyonu
  const toggleGroup = (groupName) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  // Değişiklikleri izleyen useEffect
  useEffect(() => {
    if (isActive) {
      // Değişiklikler her güncellendiğinde grupları güncelle
      setOpenGroups({
        priceChange: true,
        dimensionsChange: true,
        addedProducts: true,
        removedProducts: true,
        priceChanges: true,
        today: true,
      });
    }
  }, [isActive, changes]);

  // Tarihe göre düzenleme için yapılacak değişiklikler
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Bugünün tarihi
  const today = new Date();
  const formattedToday = formatDate(today);

  // Değişiklik var mı kontrolü
  const hasAnyChanges =
    (changes.addedProducts && changes.addedProducts.length > 0) ||
    (changes.removedProducts && changes.removedProducts.length > 0) ||
    (changes.priceChanges && changes.priceChanges.length > 0) ||
    changes.dimensionsChange ||
    changes.priceChange;

  return (
    <div className={`flex-1 h-full ${isActive ? "block" : "hidden"}`}>
      <div className="h-full flex flex-col">
        {/* Başlık */}
        <div className="flex items-center p-4 border-b border-gray-800/30">
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h2 className="text-md font-medium text-gray-200">
              Güncel Değişiklikler
            </h2>
          </div>
        </div>

        {/* İçerik */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-6">
            {/* Tarih gruplandırma - Bugün */}
            <div className="space-y-3">
              <div
                className="flex items-center justify-between gap-2 cursor-pointer"
                onClick={() => toggleGroup("today")}
              >
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">T</span>
                  </div>
                  <h3 className="text-sm font-medium text-blue-400">
                    Bugün - {formattedToday}
                  </h3>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    openGroups.today ? "transform rotate-180" : ""
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

              {openGroups.today && (
                <div className="space-y-4 ml-8 mt-2">
                  {/* Toplam Fiyat Değişimi */}
                  {changes.priceChange && (
                    <div className="border-l-2 border-indigo-500/50 pl-3 py-1 cursor-pointer">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5"></div>
                        <div className="flex-1">
                          <h4 className="text-indigo-300 text-sm font-medium">
                            Toplam Fiyat Değişimi
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            <span className="line-through">
                              {Number(
                                changes.priceChange.oldPrice
                              ).toLocaleString("tr-TR")}
                              ₺
                            </span>
                            <span className="mx-2">→</span>
                            <span className="text-indigo-300">
                              {Number(
                                changes.priceChange.newPrice
                              ).toLocaleString("tr-TR")}
                              ₺
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Konti Boyut Değişimi */}
                  {changes.dimensionsChange && (
                    <div className="border-l-2 border-blue-500/50 pl-3 py-1 cursor-pointer">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5"></div>
                        <div className="flex-1">
                          <h4 className="text-blue-300 text-sm font-medium">
                            Konti Boyutları Değişimi
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5">
                            <span className="line-through">
                              {changes.dimensionsChange.oldWidth}x
                              {changes.dimensionsChange.oldHeight}
                            </span>
                            <span className="mx-2">→</span>
                            <span className="text-blue-300">
                              {changes.dimensionsChange.newWidth}x
                              {changes.dimensionsChange.newHeight}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Eklenen Ürünler - Açılıp Kapanabilir */}
                  {changes.addedProducts &&
                    changes.addedProducts.length > 0 && (
                      <div className="space-y-2">
                        <div
                          className="flex items-center justify-between text-green-400 font-medium cursor-pointer"
                          onClick={() => toggleGroup("addedProducts")}
                        >
                          <div className="flex items-center gap-2">
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
                                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                              />
                            </svg>
                            <span>
                              Eklenen Ürünler ({changes.addedProducts.length})
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              openGroups.addedProducts
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

                        {openGroups.addedProducts && (
                          <div className="space-y-1.5 pl-6">
                            {changes.addedProducts.map((product, index) => (
                              <div
                                key={`added-${index}`}
                                className="border-l-2 border-green-500/50 pl-3 py-1"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                                  <div className="flex-1">
                                    <h4 className="text-green-300 text-sm font-medium">
                                      {product.category} - {product.name}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Ürün eklendi. Fiyat:{" "}
                                      {Number(product.price).toLocaleString(
                                        "tr-TR"
                                      )}
                                      ₺
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Kaldırılan Ürünler - Açılıp Kapanabilir */}
                  {changes.removedProducts &&
                    changes.removedProducts.length > 0 && (
                      <div className="space-y-2">
                        <div
                          className="flex items-center justify-between text-red-400 font-medium cursor-pointer"
                          onClick={() => toggleGroup("removedProducts")}
                        >
                          <div className="flex items-center gap-2">
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
                                d="M18 12H6"
                              />
                            </svg>
                            <span>
                              Kaldırılan Ürünler (
                              {changes.removedProducts.length})
                            </span>
                          </div>
                          <svg
                            className={`w-4 h-4 transition-transform ${
                              openGroups.removedProducts
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

                        {openGroups.removedProducts && (
                          <div className="space-y-1.5 pl-6">
                            {changes.removedProducts.map((product, index) => (
                              <div
                                key={`removed-${index}`}
                                className="border-l-2 border-red-500/50 pl-3 py-1"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                                  <div className="flex-1">
                                    <h4 className="text-red-300 text-sm font-medium">
                                      {product.category} - {product.name}
                                    </h4>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Ürün kaldırıldı. Fiyat:{" "}
                                      {Number(product.price).toLocaleString(
                                        "tr-TR"
                                      )}
                                      ₺
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  {/* Fiyat Değişimleri - Açılıp Kapanabilir */}
                  {changes.priceChanges && changes.priceChanges.length > 0 && (
                    <div className="space-y-2">
                      <div
                        className="flex items-center justify-between text-amber-400 font-medium cursor-pointer"
                        onClick={() => toggleGroup("priceChanges")}
                      >
                        <div className="flex items-center gap-2">
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
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>
                          <span>
                            Fiyat Değişimleri ({changes.priceChanges.length})
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 transition-transform ${
                            openGroups.priceChanges
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

                      {openGroups.priceChanges && (
                        <div className="space-y-1.5 pl-6">
                          {changes.priceChanges.map((change, index) => (
                            <div
                              key={`price-${index}`}
                              className="border-l-2 border-amber-500/50 pl-3 py-1"
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5"></div>
                                <div className="flex-1">
                                  <h4 className="text-amber-300 text-sm font-medium">
                                    {change.category} - {change.name}
                                  </h4>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    Fiyat değişikliği:{" "}
                                    <span className="line-through">
                                      {Number(change.oldPrice).toLocaleString(
                                        "tr-TR"
                                      )}
                                      ₺
                                    </span>
                                    <span className="mx-2">→</span>
                                    <span className="text-amber-300">
                                      {Number(change.newPrice).toLocaleString(
                                        "tr-TR"
                                      )}
                                      ₺
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Değişiklik yoksa */}
                  {!hasAnyChanges && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-400">
                        Henüz bir değişiklik bulunmuyor.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kaydet Butonu */}
        <div className="p-4 border-t border-gray-800/30 bg-gray-900/40">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-gray-200 text-sm font-medium transition-colors"
            >
              İptal
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
              disabled={!hasAnyChanges}
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

OrderChangelog.propTypes = {
  changes: PropTypes.shape({
    priceChange: PropTypes.shape({
      oldPrice: PropTypes.number,
      newPrice: PropTypes.number,
    }),
    dimensionsChange: PropTypes.shape({
      oldWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      oldHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      newWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      newHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    }),
    addedProducts: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        name: PropTypes.string,
        price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      })
    ),
    removedProducts: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        name: PropTypes.string,
        price: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      })
    ),
    priceChanges: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        name: PropTypes.string,
        oldPrice: PropTypes.number,
        newPrice: PropTypes.number,
      })
    ),
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default OrderChangelog;
