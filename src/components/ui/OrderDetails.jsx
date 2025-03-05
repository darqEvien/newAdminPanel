import { useCallback, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { calculatePrice } from "../../utils/priceCalculator";
const OrderDetails = ({
  categories,
  products,
  localOrderData,
  editingItem,
  selectedProduct,
  editingValues,
  setEditingItem,
  setSelectedProduct,
  setEditingValues,
  setLocalOrderData,
  dimensions,
  setDimensions,
  shouldRecalc = false,
}) => {
  const isUpdating = useRef(false);
  const initialCalcDone = useRef(false);
  const isInitialMount = useRef(true);
  const skipInitialCalc = useRef(true);

  useEffect(() => {
    // Ensure dimensions are initialized properly when the component mounts
    if (
      localOrderData?.dimensions &&
      Object.keys(localOrderData.dimensions).length > 0
    ) {
      const orderDimensions = localOrderData.dimensions;

      setDimensions((prev) => ({
        ...prev,
        kontiWidth: Number(orderDimensions.kontiWidth || 0),
        kontiHeight: Number(orderDimensions.kontiHeight || 0),
        anaWidth: Number(orderDimensions.anaWidth || 0),
        anaHeight: Number(orderDimensions.anaHeight || 0),
      }));
    }
  }, [localOrderData, setDimensions]);

  // Fiyat hesaplama useEffect'i - syntax hatası düzeltildi
  useEffect(() => {
    // İlk mount ise, bunu değiştir ve çık
    if (isInitialMount.current) {
      isInitialMount.current = false;
      const hasValidArtisProducts = Object.values(categories)
        .filter((cat) => cat.priceFormat === "artis")
        .every((category) => {
          const categoryName = category.propertyName;
          if (!localOrderData[categoryName]) return true;

          return Object.values(localOrderData[categoryName]).every(
            (product) =>
              product.productCollectionId === "istemiyorum" ||
              (typeof product.price === "number" && product.price > 0)
          );
        });

      if (hasValidArtisProducts) {
        return; // Tüm ürünlerin fiyatı varsa hesaplama yapma
      }
    }

    // Gerekli veriler yoksa veya güncelleme yapılıyorsa çık
    if (
      !categories ||
      !products ||
      !localOrderData ||
      Object.keys(categories).length === 0 ||
      Object.keys(products).length === 0 ||
      isUpdating.current
    ) {
      return;
    }

    // ÖNEMLİ: Modal açıldığında otomatik hesaplamayı engelle
    // if (skipInitialCalc.current && !shouldRecalc) {
    //   skipInitialCalc.current = false;
    //   return;
    // }
    // Sadece shouldRecalc true olduğunda veya artis ürünleri 0 fiyatlı olduğunda çalış
    const needsArtisInitialization = Object.values(categories)
      .filter((cat) => cat.priceFormat === "artis")
      .some((category) => {
        const categoryName = category.propertyName;
        if (!localOrderData[categoryName]) return false;

        return Object.values(localOrderData[categoryName]).some(
          (product) =>
            product.price === 0 && product.productCollectionId !== "istemiyorum"
        );
      });

    // İlk yüklemede hesaplama yapma, sadece shouldRecalc true veya fiyatların hesaplanması gerekiyorsa yap
    if (!shouldRecalc && !needsArtisInitialization) {
      return;
    }

    // Güncelleme yapılıyor olarak işaretle
    isUpdating.current = true;

    try {
      // Derin kopya oluştur (mutasyon sorunlarını önlemek için)
      const updatedOrderData = JSON.parse(JSON.stringify(localOrderData));
      let dimensionsUpdated = false;
      let dimensionsToSet = { ...dimensions };

      // Hesaplamalar...
      // Tüm artis kategorilerini işle ve fiyatları hesapla
      Object.values(categories)
        .filter((cat) => cat.priceFormat === "artis")
        .forEach((category) => {
          const categoryName = category.propertyName;

          // Bu kategori sipariş verisinde yoksa atla
          if (!updatedOrderData[categoryName]) return;

          // Bu kategorideki ürünleri işle
          Object.entries(updatedOrderData[categoryName]).forEach(
            ([productIndex, product]) => {
              // İstemiyorum veya ID'si olmayan ürünleri atla
              if (
                !product.productCollectionId ||
                product.productCollectionId === "istemiyorum"
              )
                return;

              const productData =
                products[categoryName]?.[product.productCollectionId];
              if (!productData) return;

              const basePrice = Number(productData.price || product.price || 0);
              const productWidth = Number(
                product.width || productData.width || 0
              );
              const productHeight = Number(
                product.height || productData.height || 0
              );

              // Ürüne genişlik/yükseklik ekle
              updatedOrderData[categoryName][productIndex] = {
                ...product,
                width: productWidth,
                height: productHeight,
              };

              // Mevcut boyutlara göre hesaplama yap
              const kontiWidth = Number(
                updatedOrderData.dimensions?.anaWidth ||
                  dimensionsToSet.kontiWidth ||
                  0
              );
              const kontiHeight = Number(
                updatedOrderData.dimensions?.anaHeight ||
                  dimensionsToSet.kontiHeight ||
                  0
              );

              // Kategori türüne göre fiyat hesapla
              let calculatedPrice = 0;

              if (categoryName.toLowerCase().includes("en")) {
                calculatedPrice = productWidth * kontiHeight * basePrice;
              } else if (categoryName.toLowerCase().includes("boy")) {
                calculatedPrice = productHeight * kontiWidth * basePrice;
              }

              // Ürün fiyatını güncelle
              if (calculatedPrice > 0) {
                updatedOrderData[categoryName][productIndex].price =
                  calculatedPrice;
              }
            }
          );
        });

      // Sipariş verilerini güncelle
      setLocalOrderData(updatedOrderData);

      // İlk hesaplamayı yaptığımızı belirt
      initialCalcDone.current = true;
    } catch (error) {
      console.error("Ürün fiyatlarını hesaplarken hata:", error);
    } finally {
      // İşlem bitti, güncelleme bayrağını kaldır
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    shouldRecalc, // Bu değişirse hesaplamayı tetikle
    categories,
    products,
    localOrderData,
    // dimensions.kontiWidth ve dimensions.kontiHeight'i kaldırdık
    // böylece boyutlar değiştiğinde otomatik hesaplama olmayacak
    setDimensions,
  ]);
  const parseKontiDimensions = (name) => {
    const dimensions = name.split("x").map((n) => parseInt(n.trim()));
    return dimensions.length === 2 ? dimensions : [0, 0];
  };

  // Kategorileri sırala
  const sortCategories = useCallback(
    (a, b) => {
      const categoryA = Object.values(categories).find(
        (cat) => cat.propertyName?.toLowerCase() === a.toLowerCase()
      );
      const categoryB = Object.values(categories).find(
        (cat) => cat.propertyName?.toLowerCase() === b.toLowerCase()
      );
      return (categoryA?.order || 999) - (categoryB?.order || 999);
    },
    [categories]
  );

  // Ürünleri sırala
  const sortProducts = useCallback((products) => {
    return Object.entries(products).sort((a, b) => {
      const orderA = a[1].order || 999;
      const orderB = b[1].order || 999;
      return orderA - orderB;
    });
  }, []);

  // Update artis dimensions

  // Ürün düzenleme modunu aç
  const handleEdit = useCallback(
    (categoryName, productIndex, product) => {
      setEditingItem(`${categoryName}-${productIndex}`);

      setSelectedProduct({
        id: product.productCollectionId,
        name: product.name,
        price: product.price,
        custom: !product.productCollectionId,
      });

      setEditingValues({
        name: product.name,
        price: product.price?.toString() || "0",
      });
    },
    [setEditingItem, setSelectedProduct, setEditingValues]
  );

  // Handle custom konti name input

  // Ürün seçimi
  const handleProductSelect = useCallback(
    (value, categoryName, productIndex) => {
      try {
        // Input validation
        if (!value || !categoryName || productIndex === undefined) {
          console.error("Geçersiz giriş değerleri:", {
            value,
            categoryName,
            productIndex,
          });
          return;
        }

        const selectedProduct = JSON.parse(value);

        // Handle custom product selection
        if (selectedProduct.custom) {
          setSelectedProduct(selectedProduct);
          setEditingValues({
            name: "",
            price: "0",
          });
          return;
        }

        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category) {
          console.error("Kategori bulunamadı:", categoryName);
          return;
        }

        const productData = products[categoryName]?.[selectedProduct.id];
        const basePrice = Number(selectedProduct.price);

        // Get the current product for comparison
        const currentProduct = localOrderData[categoryName]?.[productIndex];

        // KONTİ KATEGORİSİ İŞLEMLERİ
        if (category?.priceFormat === "konti") {
          // Boyutları hazırla
          const kontiWidth = Number(productData?.width) || 0;
          const kontiHeight = Number(productData?.height) || 0;

          // State güncellemelerini yap
          setDimensions((prev) => ({
            ...prev,
            kontiWidth,
            kontiHeight,
            anaWidth: kontiWidth,
            anaHeight: kontiHeight,
          }));

          setLocalOrderData((prev) => {
            const newData = { ...prev };

            // Update dimensions in localOrderData
            newData.dimensions = {
              ...prev.dimensions,
              kontiWidth,
              kontiHeight,
              anaWidth: kontiWidth,
              anaHeight: kontiHeight,
            };

            // Update konti product
            newData[categoryName] = {
              ...prev[categoryName],
              [productIndex]: {
                name: selectedProduct.name,
                price: basePrice,
                productCollectionId: selectedProduct.id,
                width: kontiWidth,
                height: kontiHeight,
              },
            };

            // Reset artis categories when konti changes
            Object.values(categories).forEach((cat) => {
              if (
                (cat.propertyName?.toLowerCase().includes("en") ||
                  cat.propertyName?.toLowerCase().includes("boy")) &&
                cat.priceFormat === "artis" &&
                newData[cat.propertyName]
              ) {
                newData[cat.propertyName] = {
                  0: {
                    name: "İstemiyorum",
                    price: 0,
                    productCollectionId: "istemiyorum",
                    width: 0,
                    height: 0,
                  },
                };
              }
            });

            return newData;
          });

          setEditingValues({
            name: selectedProduct.name,
            price: basePrice.toString(),
          });
        }
        // ARTİS KATEGORİSİ İŞLEMLERİ
        // ARTİS KATEGORİSİ İŞLEMLERİ bölümünü güncelleyelim
        else if (category?.priceFormat === "artis") {
          // Konti boyutlarını kontrol et
          let currentKontiWidth = Number(dimensions.kontiWidth) || 0;
          let currentKontiHeight = Number(dimensions.kontiHeight) || 0;

          // Eğer konti boyutları yoksa ve konti kategorisinde ürün varsa, oradan al
          if (
            (!currentKontiWidth || !currentKontiHeight) &&
            localOrderData["konti"]
          ) {
            const kontiProduct = Object.values(localOrderData["konti"])[0];
            if (kontiProduct) {
              currentKontiWidth = Number(kontiProduct.width || 0);
              currentKontiHeight = Number(kontiProduct.height || 0);
            }
          }

          // Konti boyutları hala yoksa, istemiyorum seç ve çık
          if (!currentKontiWidth || !currentKontiHeight) {
            toast.error("Önce konti ürünü seçmelisiniz!"); // Toast ekleyin
            const istemiyorumProduct = {
              id: "istemiyorum",
              name: "İstemiyorum",
              price: 0,
            };

            setLocalOrderData((prev) => ({
              ...prev,
              [categoryName]: {
                ...prev[categoryName],
                [productIndex]: {
                  name: "İstemiyorum",
                  price: 0,
                  productCollectionId: "istemiyorum",
                  width: 0,
                  height: 0,
                },
              },
            }));

            setSelectedProduct(istemiyorumProduct);
            setEditingValues({
              name: "İstemiyorum",
              price: "0",
            });

            return;
          }

          // Yeni ürün boyutları
          const newWidth = Number(productData?.width || 0);
          const newHeight = Number(productData?.height || 0);

          // İstemiyorum seçeneği kontrolü
          const isRemoving = selectedProduct.id === "istemiyorum";

          // Mevcut ürün boyutları (değiştirilecek ürün)
          const currentWidth = Number(currentProduct?.width || 0);
          const currentHeight = Number(currentProduct?.height || 0);

          // Güncellenmiş boyutları hesapla
          let updatedWidth = currentKontiWidth;
          let updatedHeight = currentKontiHeight;

          if (categoryName.toLowerCase().includes("en")) {
            // En için fiyat hesaplama
            const calculatedPrice = isRemoving
              ? 0
              : newWidth * currentKontiHeight * basePrice;

            setLocalOrderData((prev) => ({
              ...prev,
              [categoryName]: {
                ...prev[categoryName],
                [productIndex]: {
                  name: selectedProduct.name,
                  price: calculatedPrice,
                  productCollectionId: selectedProduct.id,
                  width: isRemoving ? 0 : newWidth,
                  height: currentKontiHeight, // Konti yüksekliğini kullan
                },
              },
            }));

            setEditingValues({
              name: selectedProduct.name,
              price: calculatedPrice.toString(),
            });
          } else if (categoryName.toLowerCase().includes("boy")) {
            // Boy için fiyat hesaplama
            const calculatedPrice = isRemoving
              ? 0
              : newHeight * currentKontiWidth * basePrice;

            setLocalOrderData((prev) => ({
              ...prev,
              [categoryName]: {
                ...prev[categoryName],
                [productIndex]: {
                  name: selectedProduct.name,
                  price: calculatedPrice,
                  productCollectionId: selectedProduct.id,
                  width: currentKontiWidth, // Konti genişliğini kullan
                  height: isRemoving ? 0 : newHeight,
                },
              },
            }));

            setEditingValues({
              name: selectedProduct.name,
              price: calculatedPrice.toString(),
            });
          }
        }
        // DİĞER KATEGORİLER İŞLEMLERİ
        else {
          // Standard product update without dimension changes
          setLocalOrderData((prev) => ({
            ...prev,
            [categoryName]: {
              ...prev[categoryName],
              [productIndex]: {
                name: selectedProduct.name,
                price: basePrice,
                productCollectionId: selectedProduct.id,
              },
            },
          }));

          setEditingValues({
            name: selectedProduct.name,
            price: basePrice.toString(),
          });
        }
        // Set selected product
        setSelectedProduct(selectedProduct);
      } catch (error) {
        console.error("Ürün seçimi hatası:", error);
      }
    },
    [
      categories,
      products,
      dimensions,
      localOrderData,
      setDimensions,
      setLocalOrderData,
      setEditingValues,
      setSelectedProduct,
    ]
  );

  const handleSave = useCallback(
    (categoryName, productIndex) => {
      if (categoryName.toLowerCase() === "konti" && selectedProduct?.custom) {
        const [width, height] = parseKontiDimensions(editingValues.name);
        setLocalOrderData((prev) => ({
          ...prev,
          kontiWidth: width,
          kontiHeight: height,
          [categoryName]: {
            ...prev[categoryName],
            [productIndex]: {
              name: editingValues.name,
              price: Number(editingValues.price),
              productCollectionId: null,
              width,
              height,
            },
          },
        }));
      } else {
        // Get current product data to preserve width/height
        const currentProduct =
          localOrderData[categoryName]?.[productIndex] || {};
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        setLocalOrderData((prev) => ({
          ...prev,
          [categoryName]: {
            ...prev[categoryName],
            [productIndex]: {
              name: selectedProduct.custom
                ? editingValues.name
                : selectedProduct.name,
              price: Number(editingValues.price),
              productCollectionId: selectedProduct.custom
                ? null
                : selectedProduct.id,
              // Preserve width and height from current product
              width: currentProduct.width || 0,
              height: currentProduct.height || 0,
            },
          },
        }));
      }
      setEditingItem(null);
      setSelectedProduct(null);
    },
    [
      selectedProduct,
      editingValues,
      localOrderData,
      categories,
      parseKontiDimensions,
      setLocalOrderData,
      setEditingItem,
      setSelectedProduct,
    ]
  );

  const handlePriceChange = useCallback(
    (e, categoryName, productIndex) => {
      const newPrice = e.target.value;
      setEditingValues((prev) => ({
        ...prev,
        price: newPrice,
      }));
    },
    [setEditingValues]
  );
  // Add this handler function after the handlePriceChange function
  const handleDelete = useCallback(
    (categoryName, productIndex) => {
      // Show confirmation dialog

      setLocalOrderData((prev) => {
        const newData = { ...prev };
        // Remove this item
        const updatedCategory = { ...newData[categoryName] };
        delete updatedCategory[productIndex];

        // Reindex the remaining items
        const reindexed = {};
        Object.values(updatedCategory).forEach((item, index) => {
          reindexed[index] = item;
        });

        newData[categoryName] = reindexed;
        return newData;
      });
    },
    [setLocalOrderData]
  );

  // Add this function right after handleDelete
  const handlePriceClick = useCallback(
    (categoryName, productIndex, product) => {
      // Enter edit mode focused on price
      handleEdit(categoryName, productIndex, product);
      // Focus on the price input when it renders
      setTimeout(() => {
        const priceInput = document.querySelector(
          `input[type="number"][value="${editingValues.price}"]`
        );
        if (priceInput) {
          priceInput.focus();
          priceInput.select();
        }
      }, 50);
    },
    [handleEdit, editingValues.price]
  );

  // Kategorileri sıralama işlemini useMemo ile optimize edelim
  const sortedCategories = useMemo(() => {
    if (!localOrderData || !categories) return [];

    return Object.entries(localOrderData)
      .filter(
        ([categoryName]) =>
          ![
            "status",
            "verandaWidth",
            "verandaHeight",
            "dimensions",
            "kontiWidth",
            "kontiHeight",
            "anaWidth",
            "anaHeight",
          ].includes(categoryName)
      )
      .sort(([a], [b]) => {
        const categoryA = Object.values(categories).find(
          (cat) => cat.propertyName?.toLowerCase() === a.toLowerCase()
        );
        const categoryB = Object.values(categories).find(
          (cat) => cat.propertyName?.toLowerCase() === b.toLowerCase()
        );
        return (categoryA?.order || 999) - (categoryB?.order || 999);
      });
  }, [localOrderData, categories]);

  // JSX'de doğrudan sortedCategories'i kullan
  return (
    <div className="grid grid-cols-1 divide-y divide-gray-700/50">
      {sortedCategories.map(([categoryName, categoryProducts]) => {
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        return (
          <div key={categoryName}>
            {Object.entries(categoryProducts).map(([productIndex, product]) => (
              <div
                key={`${categoryName}-${productIndex}`}
                className="grid grid-cols-[2fr,2fr,1fr,auto] items-center bg-gray-700/30 px-2 py-1"
              >
                {editingItem === `${categoryName}-${productIndex}` ? (
                  <>
                    <span className="text-gray-400 text-xs truncate">
                      {category?.title || categoryName}
                    </span>
                    <div className="relative">
                      <select
                        value={
                          selectedProduct ? JSON.stringify(selectedProduct) : ""
                        }
                        onChange={(e) =>
                          handleProductSelect(
                            e.target.value,
                            categoryName,
                            productIndex
                          )
                        }
                        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                      >
                        {/* Önce mevcut seçili ürünü göster */}
                        {selectedProduct && !selectedProduct.custom && (
                          <option value={JSON.stringify(selectedProduct)}>
                            {selectedProduct.name} -{" "}
                            {Number(selectedProduct.price)?.toLocaleString(
                              "tr-TR"
                            )}
                            ₺
                          </option>
                        )}
                        {/* Sonra diğer ürünleri göster */}
                        {products[categoryName] &&
                          sortProducts(products[categoryName])
                            .filter(([key]) => key !== selectedProduct?.id) // Seçili ürünü filtrele
                            .map(([key, product]) => (
                              <option
                                key={key}
                                value={JSON.stringify({
                                  id: key,
                                  name: product.title || product.name,
                                  price: product.price,
                                  custom: false,
                                })}
                              >
                                {product.title || product.name} -{" "}
                                {Number(product.price)?.toLocaleString("tr-TR")}
                                ₺
                              </option>
                            ))}
                        <option value='{"custom":true}'>Diğer</option>
                      </select>
                    </div>
                    <input
                      type="number"
                      value={editingValues.price}
                      onChange={(e) =>
                        handlePriceChange(e, categoryName, productIndex)
                      }
                      className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSave(categoryName, productIndex)}
                        className="text-green-400 hover:text-green-300 p-1"
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
                  </>
                ) : (
                  <>
                    <span className="text-gray-400 text-xs truncate">
                      {category?.title || categoryName}
                    </span>
                    <span
                      className="text-gray-300 text-xs truncate cursor-pointer hover:text-gray-200"
                      onClick={() =>
                        handleEdit(categoryName, productIndex, product)
                      }
                    >
                      {product.name}
                    </span>
                    <span
                      className="text-green-400 text-xs cursor-pointer hover:text-green-300"
                      onClick={() =>
                        handlePriceClick(categoryName, productIndex, product)
                      }
                    >
                      {Number(product.price)?.toLocaleString("tr-TR")}₺
                    </span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleDelete(categoryName, productIndex)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Sil"
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
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

OrderDetails.propTypes = {
  categories: PropTypes.object.isRequired,
  products: PropTypes.object.isRequired,
  localOrderData: PropTypes.object.isRequired,
  editingItem: PropTypes.string,
  selectedProduct: PropTypes.object,
  editingValues: PropTypes.object.isRequired,
  setEditingItem: PropTypes.func.isRequired,
  setSelectedProduct: PropTypes.func.isRequired,
  setEditingValues: PropTypes.func.isRequired,
  setLocalOrderData: PropTypes.func.isRequired,
  dimensions: PropTypes.shape({
    kontiWidth: PropTypes.number,
    kontiHeight: PropTypes.number,
    anaWidth: PropTypes.number,
    anaHeight: PropTypes.number,
    verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    length: PropTypes.number,
  }).isRequired,
  setDimensions: PropTypes.func.isRequired,
  shouldRecalc: PropTypes.bool,
};

export default OrderDetails;
