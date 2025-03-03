import { useCallback, useEffect, useState } from "react";
import PropTypes from "prop-types";
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
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  // Parse konti dimensions from product name
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
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category) {
          console.error("Kategori bulunamadı:", categoryName);
          return;
        }

        const productData = products[categoryName]?.[selectedProduct.id];
        const basePrice = selectedProduct.price;

        // KONTİ KATEGORİSİ İŞLEMLERİ
        if (category?.priceFormat === "konti") {
          // Boyutları hazırla
          const kontiWidth = Number(productData?.width) || 0;
          const kontiHeight = Number(productData?.height) || 0;
          const anaWidth = Number(productData?.width) || 0;
          const anaHeight = Number(productData?.height) || 0;
          // State güncellemelerini toplu yap
          const updates = async () => {
            // 1. LocalOrderData güncelleme
            await setLocalOrderData((prev) => {
              const newData = { ...prev };

              // Artis kategorilerini temizle
              Object.entries(prev).forEach(([key, _]) => {
                if (
                  key.toLowerCase().includes("en") ||
                  key.toLowerCase().includes("boy")
                ) {
                  newData[key] = {
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

              return {
                ...newData,
                dimensions: {
                  ...prev.dimensions,
                  kontiWidth,
                  kontiHeight,
                  anaWidth,
                  anaHeight,
                },
                [categoryName]: {
                  ...prev[categoryName],
                  [productIndex]: {
                    name: selectedProduct.name,
                    price: Number(basePrice),
                    productCollectionId: selectedProduct.id,
                    width: kontiWidth,
                    height: kontiHeight,
                  },
                },
              };
            });

            // 2. Dimensions güncelleme
            await setDimensions((prev) => ({
              ...prev,
              kontiWidth,
              kontiHeight,
              anaWidth,
              anaHeight,
            }));

            // 3. Editing values güncelleme
            setEditingValues({
              name: selectedProduct.name,
              price: basePrice.toString(),
            });
          };

          updates();
        }

        // ARTİS KATEGORİSİ İŞLEMLERİ
        if (category?.priceFormat === "artis") {
          const currentProduct = localOrderData[categoryName]?.[productIndex];

          // Boyutları hesapla
          const oldWidth = Number(currentProduct?.width || 0);
          const oldHeight = Number(currentProduct?.height || 0);
          const newWidth = Number(productData?.width || 0);
          const newHeight = Number(productData?.height || 0);

          // Kullanılacak boyutları belirle
          const isKontiEqualToAna =
            Number(dimensions.kontiWidth) === Number(dimensions.anaWidth) &&
            Number(dimensions.kontiHeight) === Number(dimensions.anaHeight);

          // Konti ve ana boyutlarını al
          const kontiWidth = Number(dimensions.kontiWidth) || 0;
          const kontiHeight = Number(dimensions.kontiHeight) || 0;
          const anaWidth = Number(dimensions.anaWidth) || 0;
          const anaHeight = Number(dimensions.anaHeight) || 0;

          // Konti boyutları ana boyutlardan farklıysa, konti boyutlarını kullan
          const currentWidth = isKontiEqualToAna ? kontiWidth : anaWidth;
          const currentHeight = isKontiEqualToAna ? kontiHeight : anaHeight;

          // Yeni boyutları hesapla
          const updatedWidth = currentWidth - oldWidth + newWidth;
          const updatedHeight = currentHeight - oldHeight + newHeight;

          // Detaylı log
          console.log("ARTİS HESAPLAMA DETAYLI:", {
            ürünId: selectedProduct.id,
            ürünAdı: selectedProduct.name,
            birimFiyat: Number(selectedProduct.price),
            eskiGenişlik: oldWidth,
            eskiYükseklik: oldHeight,
            yeniGenişlik: newWidth,
            yeniYükseklik: newHeight,
            kontiGenişlik: kontiWidth,
            kontiYükseklik: kontiHeight,
            anaGenişlik: anaWidth,
            anaYükseklik: anaHeight,
            kullanılanGenişlik: currentWidth,
            kullanılanYükseklik: currentHeight,
            güncelGenişlik: updatedWidth,
            güncelYükseklik: updatedHeight,
            güncelAlan: updatedWidth * updatedHeight,
            eskiAlan: currentWidth * currentHeight,
            farkAlan:
              updatedWidth * updatedHeight - currentWidth * currentHeight,
            boyutKaynağı: isKontiEqualToAna ? "konti" : "ana",
          });

          // Artis ürünü için fiyat hesaplama:
          // Replace the artis price calculation section:

          // Artis ürünü için fiyat hesaplama:
          // ARTİS KATEGORİSİ İŞLEMLERİ içinde fiyat hesaplama kısmını güncelleyelim

          // Artis ürünü için fiyat hesaplama:
          const basePrice = Number(selectedProduct.price);

          // Ana boyutları al
          const originalAnaWidth = Number(dimensions.anaWidth) || 0;
          const originalAnaHeight = Number(dimensions.anaHeight) || 0;

          // Direkt olarak alan farkını hesapla
          const oldArea = currentWidth * currentHeight;
          const newArea = updatedWidth * updatedHeight;
          const areaDifference = newArea - oldArea;

          // Ürün değişimi durumunu tespit et
          const isProductChanged =
            currentProduct?.productCollectionId !== selectedProduct.id;

          let calcPrice;

          if (isProductChanged) {
            // Ürün değiştirme durumunda, ana boyutlara göre fiyat hesapla
            if (categoryName.toLowerCase().includes("en")) {
              // En kategorisi için
              const widthDiff = Math.abs(updatedWidth - originalAnaWidth);
              calcPrice = basePrice * widthDiff * currentHeight;
            } else if (categoryName.toLowerCase().includes("boy")) {
              // Boy kategorisi için
              const heightDiff = Math.abs(updatedHeight - originalAnaHeight);
              calcPrice = basePrice * currentWidth * heightDiff;
            }
          } else {
            // Normal alan farkı hesaplaması
            calcPrice = basePrice * areaDifference;
          }

          console.log("Artis SONUÇ (Geliştirilmiş):", {
            kategori: categoryName,
            ürün: selectedProduct.name,
            eskiBoyutlar: `${currentWidth}x${currentHeight}`,
            yeniBoyutlar: `${updatedWidth}x${updatedHeight}`,
            anaBoyutlar: `${originalAnaWidth}x${originalAnaHeight}`,
            eskiAlan: oldArea,
            yeniAlan: newArea,
            alanFarkı: areaDifference,
            birimFiyat: basePrice,
            ürünDeğişimi: isProductChanged,
            hesaplananFiyat: calcPrice,
          });
          // State güncellemelerini toplu yap
          const updates = async () => {
            // Hangi boyut setini güncelleyeceğimizi belirle
            if (isKontiEqualToAna) {
              // Konti değerleri kullanıldığında - hem konti hem ana değerleri güncelle
              await setDimensions((prev) => ({
                ...prev,
                kontiWidth: updatedWidth,
                kontiHeight: updatedHeight,
                anaWidth: updatedWidth,
                anaHeight: updatedHeight,
              }));

              await setLocalOrderData((prev) => ({
                ...prev,
                dimensions: {
                  ...prev.dimensions,
                  kontiWidth: updatedWidth,
                  kontiHeight: updatedHeight,
                  anaWidth: updatedWidth,
                  anaHeight: updatedHeight,
                },
                [categoryName]: {
                  ...prev[categoryName],
                  [productIndex]: {
                    name: selectedProduct.name,
                    price: calcPrice,
                    productCollectionId: selectedProduct.id,
                    width: newWidth,
                    height: newHeight,
                  },
                },
              }));
            } else {
              // Ana değerleri kullanıldığında - sadece ana değerleri güncelle
              await setDimensions((prev) => ({
                ...prev,
                anaWidth: updatedWidth,
                anaHeight: updatedHeight,
              }));

              await setLocalOrderData((prev) => ({
                ...prev,
                dimensions: {
                  ...prev.dimensions,
                  anaWidth: updatedWidth,
                  anaHeight: updatedHeight,
                },
                [categoryName]: {
                  ...prev[categoryName],
                  [productIndex]: {
                    name: selectedProduct.name,
                    price: calcPrice,
                    productCollectionId: selectedProduct.id,
                    width: newWidth,
                    height: newHeight,
                  },
                },
              }));
            }

            // Editing values güncelleme
            setEditingValues({
              name: selectedProduct.name,
              price: calcPrice.toString(),
            });
          };

          updates();
        }
        // Her durumda selectedProduct'ı güncelle
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

  useEffect(() => {
    if (!categories || !products || !localOrderData || isUpdating) return;

    // Önce konti ürünlerini işle
    const processKontiProducts = () => {
      Object.entries(localOrderData).forEach(
        ([categoryName, categoryProducts]) => {
          const category = Object.values(categories).find(
            (cat) =>
              cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
          );

          if (category?.priceFormat === "konti") {
            Object.entries(categoryProducts).forEach(
              ([productIndex, product]) => {
                if (
                  product.productCollectionId &&
                  product.productCollectionId !== "istemiyorum"
                ) {
                  const simulatedProduct = {
                    id: product.productCollectionId,
                    name: product.name,
                    price: product.price,
                    custom: false,
                  };
                  handleProductSelect(
                    JSON.stringify(simulatedProduct),
                    categoryName,
                    productIndex
                  );
                }
              }
            );
          }
        }
      );
    };

    // İlk yükleme için bir kere çalıştır
    const initialized = sessionStorage.getItem("productsInitialized");
    if (!initialized) {
      processKontiProducts();
      sessionStorage.setItem("productsInitialized", "true");
    }
  }, [categories, products, localOrderData, handleProductSelect, isUpdating]);
  // Değişiklikleri kaydet
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
  return (
    <div className="grid grid-cols-1 divide-y divide-gray-700/50">
      {Object.entries(localOrderData)
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
        .sort(([a], [b]) => sortCategories(a, b))
        .map(([categoryName, categoryProducts]) => {
          const category = Object.values(categories).find(
            (cat) =>
              cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
          );

          return (
            <div key={categoryName}>
              {Object.entries(categoryProducts).map(
                ([productIndex, product]) => (
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
                              selectedProduct
                                ? JSON.stringify(selectedProduct)
                                : ""
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
                                    {Number(product.price)?.toLocaleString(
                                      "tr-TR"
                                    )}
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
                            onClick={() =>
                              handleSave(categoryName, productIndex)
                            }
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
                            handlePriceClick(
                              categoryName,
                              productIndex,
                              product
                            )
                          }
                        >
                          {Number(product.price)?.toLocaleString("tr-TR")}₺
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              handleDelete(categoryName, productIndex)
                            }
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
                )
              )}
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
};

export default OrderDetails;
