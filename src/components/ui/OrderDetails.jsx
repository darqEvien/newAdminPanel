import { useCallback, useEffect, useState, useRef } from "react";
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
  const hasInitialized = useRef(false);
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

  // Replace your initialization useEffect with this one
  useEffect(() => {
    // Use a ref to track if we've already run the initialization

    // Only run once when data is available
    if (
      hasInitialized.current ||
      !categories ||
      !products ||
      !localOrderData ||
      Object.keys(categories).length === 0 ||
      Object.keys(products).length === 0 ||
      isUpdating
    ) {
      return;
    }

    console.log(
      "⚠️ Artis ürünleri başlangıç durumu için fiyat hesaplanıyor..."
    );

    // Mark as initialized to prevent further runs
    hasInitialized.current = true;
    setIsUpdating(true);

    try {
      // Create new order data without mutating the original
      const updatedOrderData = JSON.parse(JSON.stringify(localOrderData));
      let dimensionsUpdated = false;
      let dimensionsToSet = { ...dimensions };

      // First ensure dimensions are set from konti products if needed
      if (!dimensionsToSet.kontiWidth || !dimensionsToSet.kontiHeight) {
        const kontiCategory = Object.values(categories).find(
          (cat) => cat.priceFormat === "konti"
        );

        if (kontiCategory) {
          const kontiCategoryName = kontiCategory.propertyName;
          const kontiProducts = updatedOrderData[kontiCategoryName];

          if (kontiProducts) {
            const kontiProduct = Object.values(kontiProducts).find(
              (p) =>
                p.productCollectionId && p.productCollectionId !== "istemiyorum"
            );

            if (kontiProduct) {
              const productData =
                products[kontiCategoryName]?.[kontiProduct.productCollectionId];
              if (productData) {
                const kontiWidth = Number(
                  productData.width || kontiProduct.width || 0
                );
                const kontiHeight = Number(
                  productData.height || kontiProduct.height || 0
                );

                if (kontiWidth > 0 && kontiHeight > 0) {
                  dimensionsToSet = {
                    ...dimensionsToSet,
                    kontiWidth,
                    kontiHeight,
                    anaWidth: kontiWidth,
                    anaHeight: kontiHeight,
                  };

                  updatedOrderData.dimensions = {
                    ...updatedOrderData.dimensions,
                    ...dimensionsToSet,
                  };

                  dimensionsUpdated = true;
                  console.log("⚙️ Konti boyutları ayarlandı:", {
                    kontiWidth,
                    kontiHeight,
                  });
                }
              }
            }
          }
        }
      }

      // Then calculate artis prices
      Object.values(categories)
        .filter((cat) => cat.priceFormat === "artis")
        .forEach((category) => {
          const categoryName = category.propertyName;

          // Skip if this category doesn't exist
          if (!updatedOrderData[categoryName]) return;

          console.log(
            `🧮 "${categoryName}" kategorisi için fiyatlar hesaplanıyor...`
          );

          // Calculate prices for each product
          Object.entries(updatedOrderData[categoryName]).forEach(
            ([productIndex, product]) => {
              if (
                !product.productCollectionId ||
                product.productCollectionId === "istemiyorum"
              )
                return;

              const productData =
                products[categoryName]?.[product.productCollectionId];
              if (!productData) return;

              const basePrice = Number(productData.price || 0);
              const productWidth = Number(
                productData.width || product.width || 0
              );
              const productHeight = Number(
                productData.height || product.height || 0
              );

              // Set width/height if missing
              updatedOrderData[categoryName][productIndex] = {
                ...product,
                width: productWidth,
                height: productHeight,
              };

              // Calculate price based on category type
              let calculatedPrice = 0;

              if (categoryName.toLowerCase().includes("en")) {
                calculatedPrice =
                  productWidth * dimensionsToSet.kontiHeight * basePrice;
              } else if (categoryName.toLowerCase().includes("boy")) {
                calculatedPrice =
                  productHeight * dimensionsToSet.kontiWidth * basePrice;
              }

              // Set price
              updatedOrderData[categoryName][productIndex].price =
                calculatedPrice;

              console.log(`💰 ${product.name} fiyatı hesaplandı:`, {
                basePrice,
                width: productWidth,
                height: productHeight,
                kontiWidth: dimensionsToSet.kontiWidth,
                kontiHeight: dimensionsToSet.kontiHeight,
                calculatedPrice,
              });
            }
          );
        });

      // Batch our state updates to reduce renders
      if (dimensionsUpdated) {
        setDimensions(dimensionsToSet);
      }

      // Update order data with all calculated prices
      setLocalOrderData(updatedOrderData);

      console.log("✅ Artis ürünleri fiyatlandırma tamamlandı");
    } finally {
      // Reset updating flag
      setTimeout(() => setIsUpdating(false), 100);
    }
  }, [categories, products]); // Only depend on categories and products, not localOrderData or dimensions
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
        // ARTİS KATEGORİSİ İŞLEMLERİ
        else if (category?.priceFormat === "artis") {
          // Current dimensions
          const currentKontiWidth = Number(dimensions.kontiWidth) || 0;
          const currentKontiHeight = Number(dimensions.kontiHeight) || 0;

          // Current product dimensions (what we'll remove)
          // Make sure we're getting valid numbers even if width/height are missing
          const currentWidth = Number(currentProduct?.width || 0);
          const currentHeight = Number(currentProduct?.height || 0);

          // New product dimensions (what we'll add)
          const newWidth = Number(productData?.width || 0);
          const newHeight = Number(productData?.height || 0);

          console.log("MEVCUT ÜRÜN:", {
            product: currentProduct?.name || "Yok",
            width: currentWidth,
            height: currentHeight,
          });

          console.log("YENİ ÜRÜN:", {
            product: selectedProduct.name,
            width: newWidth,
            height: newHeight,
          });

          // Calculate updated dimensions based on category
          let updatedWidth = currentKontiWidth;
          let updatedHeight = currentKontiHeight;

          // Special handling for "İstemiyorum" (deletion case)
          const isRemoving = selectedProduct.id === "istemiyorum";

          if (categoryName.toLowerCase().includes("en")) {
            // For width category - explicitly subtract the old width before adding new width
            updatedWidth = isRemoving
              ? Math.max(0, currentKontiWidth - currentWidth)
              : Math.max(0, currentKontiWidth - currentWidth + newWidth);

            console.log("EN KATEGORİSİ HESAPLAMA:", {
              eskiKontiWidth: currentKontiWidth,
              çıkarılanWidth: currentWidth,
              eklenenWidth: newWidth,
              yeniKontiWidth: updatedWidth,
            });
          } else if (categoryName.toLowerCase().includes("boy")) {
            // For height category - explicitly subtract the old height before adding new height
            updatedHeight = isRemoving
              ? Math.max(0, currentKontiHeight - currentHeight)
              : Math.max(0, currentKontiHeight - currentHeight + newHeight);

            console.log("BOY KATEGORİSİ HESAPLAMA:", {
              eskiKontiHeight: currentKontiHeight,
              çıkarılanHeight: currentHeight,
              eklenenHeight: newHeight,
              yeniKontiHeight: updatedHeight,
            });
          }

          // Ensure dimensions don't go negative
          updatedWidth = Math.max(0, updatedWidth);
          updatedHeight = Math.max(0, updatedHeight);

          // Calculate price based on area difference
          const oldArea = currentKontiWidth * currentKontiHeight;
          const newArea = updatedWidth * updatedHeight;
          const areaDifference = newArea - oldArea;

          // Calculate price - use basePrice directly from product data to ensure accuracy
          const calculatedPrice = isRemoving
            ? 0
            : Number(productData?.price || basePrice) * areaDifference;

          console.log("ARTİS HESAPLAMA:", {
            kategori: categoryName,
            ürün: selectedProduct.name,
            eskiGenişlik: currentKontiWidth,
            eskiYükseklik: currentKontiHeight,
            yeniGenişlik: updatedWidth,
            yeniYükseklik: updatedHeight,
            eskiAlan: oldArea,
            yeniAlan: newArea,
            alanFarkı: areaDifference,
            birimFiyat: Number(productData?.price || basePrice),
            hesaplananFiyat: calculatedPrice,
            silmeİşlemi: isRemoving,
          });

          // Update dimensions
          setDimensions((prev) => ({
            ...prev,
            kontiWidth: updatedWidth,
            kontiHeight: updatedHeight,
            anaWidth: updatedWidth,
            anaHeight: updatedHeight,
          }));

          // Update local order data
          setLocalOrderData((prev) => ({
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
                price: calculatedPrice,
                productCollectionId: selectedProduct.id,
                width: isRemoving ? 0 : newWidth,
                height: isRemoving ? 0 : newHeight,
              },
            },
          }));

          setEditingValues({
            name: selectedProduct.name,
            price: calculatedPrice.toString(),
          });
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

  // useEffect(() => {
  //   if (!categories || !products || !localOrderData || isUpdating) return;

  //   // Önce konti ürünlerini işle
  //   const processKontiProducts = () => {
  //     Object.entries(localOrderData).forEach(
  //       ([categoryName, categoryProducts]) => {
  //         const category = Object.values(categories).find(
  //           (cat) =>
  //             cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
  //         );

  //         if (category?.priceFormat === "konti") {
  //           Object.entries(categoryProducts).forEach(
  //             ([productIndex, product]) => {
  //               if (
  //                 product.productCollectionId &&
  //                 product.productCollectionId !== "istemiyorum"
  //               ) {
  //                 const simulatedProduct = {
  //                   id: product.productCollectionId,
  //                   name: product.name,
  //                   price: product.price,
  //                   custom: false,
  //                 };
  //                 handleProductSelect(
  //                   JSON.stringify(simulatedProduct),
  //                   categoryName,
  //                   productIndex
  //                 );
  //               }
  //             }
  //           );
  //         }
  //       }
  //     );
  //   };

  //   // İlk yükleme için bir kere çalıştır
  //   const initialized = sessionStorage.getItem("productsInitialized");
  //   if (!initialized) {
  //     processKontiProducts();
  //     sessionStorage.setItem("productsInitialized", "true");
  //   }
  // }, [categories, products, localOrderData, handleProductSelect, isUpdating]);
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

  // Add this useEffect before your existing useEffects
  useEffect(() => {
    // Run this once when dimensions, categories, and products are all available
    if (
      !categories ||
      !products ||
      !localOrderData ||
      Object.keys(categories).length === 0 ||
      Object.keys(products).length === 0 ||
      isUpdating
    ) {
      return;
    }

    // Check if we need to initialize artis products
    const needsInitialization = Object.values(categories)
      .filter((cat) => cat.priceFormat === "artis")
      .some((category) => {
        const categoryName = category.propertyName;
        if (!localOrderData[categoryName]) return false;

        // Check if any artis product has price 0
        return Object.values(localOrderData[categoryName]).some(
          (product) =>
            product.price === 0 && product.productCollectionId !== "istemiyorum"
        );
      });

    if (!needsInitialization) return;

    console.log(
      "⚠️ Artis ürünleri başlangıç durumu için fiyat hesaplanıyor..."
    );
    setIsUpdating(true);

    try {
      // Process all artis categories
      const updatedOrderData = { ...localOrderData };
      let dimensionsUpdated = false;

      Object.values(categories)
        .filter((cat) => cat.priceFormat === "artis")
        .forEach((category) => {
          const categoryName = category.propertyName;

          // Skip if this category doesn't exist in the order
          if (!updatedOrderData[categoryName]) return;

          // Process products in this category
          Object.entries(updatedOrderData[categoryName]).forEach(
            ([productIndex, product]) => {
              // Skip istemiyorum or products without IDs
              if (
                !product.productCollectionId ||
                product.productCollectionId === "istemiyorum"
              )
                return;

              const productData =
                products[categoryName]?.[product.productCollectionId];
              if (!productData) return;

              const basePrice = Number(productData.price || product.price);
              const productWidth = Number(
                product.width || productData.width || 0
              );
              const productHeight = Number(
                product.height || productData.height || 0
              );

              // Make sure the product has width/height data
              updatedOrderData[categoryName][productIndex] = {
                ...product,
                width: productWidth,
                height: productHeight,
              };

              // Calculate price based on area
              let calculatedPrice = 0;

              // If dimensions are not set yet, set them now
              if (
                !dimensionsUpdated &&
                (!updatedOrderData.dimensions?.kontiWidth ||
                  !updatedOrderData.dimensions?.kontiHeight)
              ) {
                // Find konti product for dimensions
                const kontiCategory = Object.values(categories).find(
                  (cat) => cat.priceFormat === "konti"
                );
                if (kontiCategory) {
                  const kontiCategoryName = kontiCategory.propertyName;
                  const kontiProduct = Object.values(
                    updatedOrderData[kontiCategoryName] || {}
                  )[0];

                  if (kontiProduct) {
                    const kontiWidth = Number(kontiProduct.width || 0);
                    const kontiHeight = Number(kontiProduct.height || 0);

                    // Set initial dimensions if they're valid
                    if (kontiWidth > 0 && kontiHeight > 0) {
                      updatedOrderData.dimensions =
                        updatedOrderData.dimensions || {};
                      updatedOrderData.dimensions.kontiWidth = kontiWidth;
                      updatedOrderData.dimensions.kontiHeight = kontiHeight;
                      updatedOrderData.dimensions.anaWidth = kontiWidth;
                      updatedOrderData.dimensions.anaHeight = kontiHeight;

                      // Update dimensions state
                      setDimensions((prev) => ({
                        ...prev,
                        kontiWidth,
                        kontiHeight,
                        anaWidth: kontiWidth,
                        anaHeight: kontiHeight,
                      }));

                      dimensionsUpdated = true;

                      console.log("⚙️ Konti boyutları ayarlandı:", {
                        kontiWidth,
                        kontiHeight,
                      });
                    }
                  }
                }
              }

              // Calculate based on current dimensions
              const kontiWidth = Number(
                updatedOrderData.dimensions?.kontiWidth ||
                  dimensions.kontiWidth ||
                  0
              );
              const kontiHeight = Number(
                updatedOrderData.dimensions?.kontiHeight ||
                  dimensions.kontiHeight ||
                  0
              );

              if (categoryName.toLowerCase().includes("en")) {
                // Width category
                calculatedPrice = productWidth * kontiHeight * basePrice;
                console.log(
                  `💰 ${categoryName} (${product.name}) fiyatı hesaplandı:`,
                  {
                    width: productWidth,
                    kontiHeight,
                    basePrice,
                    calculatedPrice,
                  }
                );
              } else if (categoryName.toLowerCase().includes("boy")) {
                // Height category
                calculatedPrice = productHeight * kontiWidth * basePrice;
                console.log(
                  `💰 ${categoryName} (${product.name}) fiyatı hesaplandı:`,
                  {
                    height: productHeight,
                    kontiWidth,
                    basePrice,
                    calculatedPrice,
                  }
                );
              }

              // Update product price
              if (calculatedPrice > 0) {
                updatedOrderData[categoryName][productIndex] = {
                  ...updatedOrderData[categoryName][productIndex],
                  price: calculatedPrice,
                };
              }
            }
          );
        });

      // Update local order data with calculated prices
      setLocalOrderData(updatedOrderData);
    } finally {
      setTimeout(() => setIsUpdating(false), 100);
    }
  }, [
    categories,
    products,
    localOrderData,
    dimensions.kontiWidth,
    dimensions.kontiHeight,
    setDimensions,
  ]);

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
