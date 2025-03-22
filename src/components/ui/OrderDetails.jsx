import { useCallback, useEffect, useRef, useMemo } from "react";
import PropTypes from "prop-types";
import { calculatePrice } from "../../utils/priceCalculator";
import { useDimensionsStore } from "../../store/dimensionsStore";

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
  shouldRecalc = false,
  setShouldRecalcPrices = () => {},
  skipInitialCalc = false,
}) => {
  // Zustand store'dan değerleri al
  const kontiWidth = useDimensionsStore((state) => state.kontiWidth);
  const kontiHeight = useDimensionsStore((state) => state.kontiHeight);
  const anaWidth = useDimensionsStore((state) => state.anaWidth);
  const anaHeight = useDimensionsStore((state) => state.anaHeight);
  const initializeDimensions = useDimensionsStore(
    (state) => state.initializeDimensions
  );
  const needsRecalculation = useDimensionsStore(
    (state) => state.needsRecalculation
  );
  const resetRecalculationFlag = useDimensionsStore(
    (state) => state.resetRecalculationFlag
  );

  // Referanslar ve memoize edilmiş değerler
  const dimensions = useMemo(
    () => ({
      kontiWidth,
      kontiHeight,
      anaWidth,
      anaHeight,
    }),
    [kontiWidth, kontiHeight, anaWidth, anaHeight]
  );

  const isUpdating = useRef(false);
  const initializedRef = useRef(false);
  const lastDimensions = useRef({ kontiWidth, kontiHeight });

  // Dinamik fiyatları hesaplama fonksiyonu - tüm dinamik fiyat formatlarını destekler
  const recalculatePrices = useCallback(() => {
    // İlk yüklemede ve skipInitialCalc true ise hesaplamayı atla
    if (
      skipInitialCalc ||
      isUpdating.current ||
      !Object.keys(localOrderData).length
    )
      return;

    isUpdating.current = true;

    try {
      // Desteklenen tüm dinamik fiyat formatları
      const dynamicPriceFormats = [
        "tasDuvar",
        "onYuzey",
        "cevre",
        "metrekare",
        "artis",
      ];
      const updatedOrderData = { ...localOrderData };
      let hasChanges = false;

      // Her kategoriyi kontrol et
      for (const categoryName in updatedOrderData) {
        // Özel alanları ve metadata'yı atla
        if (
          typeof updatedOrderData[categoryName] !== "object" ||
          [
            "status",
            "verandaWidth",
            "verandaHeight",
            "dimensions",
            "kontiWidth",
            "kontiHeight",
            "notes",
            "anaWidth",
            "anaHeight",
          ].includes(categoryName)
        )
          continue;

        // Kategori formatını bul
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category) continue;
        const priceFormat = category.priceFormat;

        // Format dinamik değilse atla
        if (!dynamicPriceFormats.includes(priceFormat)) continue;

        // Kategorideki ürünleri işle - use index variable in loop
        for (const idx in updatedOrderData[categoryName]) {
          const product = updatedOrderData[categoryName][idx];

          // Ürünün orijinal boyutlarını saklamasını sağlayalım
          if (priceFormat === "artis" && !product.originalDimensions) {
            product.originalDimensions = {
              kontiWidth: Number(dimensions.kontiWidth),
              kontiHeight: Number(dimensions.kontiHeight),
            };
          }

          // İstemiyorum veya geçersiz ürünleri atla
          if (
            !product.productCollectionId ||
            product.productCollectionId === "istemiyorum"
          )
            continue;

          const productData =
            products[categoryName]?.[product.productCollectionId];
          if (!productData) continue;

          // Fiyat parametrelerini al
          const basePrice = Number(productData.price || product.price || 0);
          const alanPrice = Number(productData.alanPrice || 0);
          const productWidth = Number(product.width || productData.width || 0);
          const productHeight = Number(
            product.height || productData.height || 0
          );

          let newPrice = 0;

          // Check if both en and boy artis products exist
          const hasBothEnAndBoyArtis = () => {
            let hasEnArtis = false;
            let hasBoyArtis = false;

            for (const catName in updatedOrderData) {
              if (typeof updatedOrderData[catName] !== "object") continue;

              const category = Object.values(categories).find(
                (cat) =>
                  cat.propertyName?.toLowerCase() === catName.toLowerCase()
              );

              if (category?.priceFormat === "artis") {
                if (catName.toLowerCase().includes("en")) {
                  for (const idx in updatedOrderData[catName]) {
                    const product = updatedOrderData[catName][idx];
                    if (
                      product.productId &&
                      product.productId !== "istemiyorum"
                    ) {
                      hasEnArtis = true;
                    }
                  }
                } else if (catName.toLowerCase().includes("boy")) {
                  for (const idx in updatedOrderData[catName]) {
                    const product = updatedOrderData[catName][idx];
                    if (
                      product.productId &&
                      product.productId !== "istemiyorum"
                    ) {
                      hasBoyArtis = true;
                    }
                  }
                }
              }
            }

            return hasEnArtis && hasBoyArtis;
          };

          const bothDimensionsAdded = hasBothEnAndBoyArtis();

          // Formata göre fiyat hesaplama
          switch (priceFormat) {
            case "tasDuvar": {
              // Taş duvar: alan * alanPrice + çevre * basePrice
              const area = kontiWidth * kontiHeight;
              const perimeter = 2 * (kontiWidth + kontiHeight);
              newPrice = area * alanPrice + perimeter * basePrice;
              break;
            }
            case "onYuzey":
              // Ön yüzey: yükseklik * birim fiyat
              newPrice = kontiHeight * basePrice;
              break;

            case "cevre":
              // Çevre: (genişlik + yükseklik) * 2 * birim fiyat
              newPrice = (kontiWidth + kontiHeight) * 2 * basePrice;
              break;

            case "metrekare":
              // Metrekare: genişlik * yükseklik * birim fiyat
              newPrice = kontiWidth * kontiHeight * basePrice;
              break;

            case "artis":
              // Artis kategorisine göre özel hesaplama
              if (categoryName.toLowerCase().includes("en")) {
                // En artis: ORIJINAL konti yüksekliği * ürün genişliği * birim fiyat
                const heightToUse =
                  product.originalDimensions?.kontiHeight || kontiHeight;
                newPrice = heightToUse * productWidth * basePrice;
              } else if (categoryName.toLowerCase().includes("boy")) {
                // Boy artis: ORIJINAL konti genişliği * ürün yüksekliği * birim fiyat
                const widthToUse =
                  product.originalDimensions?.kontiWidth || kontiWidth;
                newPrice = widthToUse * productHeight * basePrice;
              } else {
                // Diğer artis durumları için calculatePrice kullan
                newPrice = calculatePrice({
                  priceFormat: "artis",
                  basePrice,
                  width: productWidth,
                  height: productHeight,
                  kontiWidth,
                  kontiHeight,
                  categoryName,
                  anaWidth,
                  anaHeight,
                  alanPrice,
                  hasAddedBothDimensions: bothDimensionsAdded,
                });
              }
              break;

            default:
              newPrice = product.price;
          }

          // Fiyat değiştiyse güncelle (0.1'den büyük farklar için)
          if (Math.abs(newPrice - product.price) > 0.1) {
            updatedOrderData[categoryName][idx] = {
              ...product,
              price: newPrice,
            };
            hasChanges = true;
          }
        }
      }

      // Değişiklik varsa state'i güncelle
      if (hasChanges) {
        setLocalOrderData(updatedOrderData);
      }
    } catch (error) {
      console.error("Dinamik fiyat hesaplaması sırasında hata:", error);
    } finally {
      // İşlem bitti, flag'i 100ms sonra sıfırla
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    categories,
    products,
    kontiWidth,
    kontiHeight,
    anaWidth,
    anaHeight,
    localOrderData,
    setLocalOrderData,
    skipInitialCalc, // Yeni bağımlılık
  ]);
  // Add this function after recalculatePrices

  // 1. Boyutları başlangıçta ayarla (sadece bir kez)
  useEffect(() => {
    if (!initializedRef.current && localOrderData?.dimensions) {
      const orderDimensions = localOrderData.dimensions;

      initializeDimensions({
        kontiWidth: Number(orderDimensions.kontiWidth || 0),
        kontiHeight: Number(orderDimensions.kontiHeight || 0),
        anaWidth: Number(orderDimensions.anaWidth || 0),
        anaHeight: Number(orderDimensions.anaHeight || 0),
      });

      initializedRef.current = true;
    }
  }, [localOrderData, initializeDimensions]);

  // 2. Konti boyutları değiştiğinde fiyatları güncelle
  useEffect(() => {
    if (
      lastDimensions.current.kontiWidth !== kontiWidth ||
      lastDimensions.current.kontiHeight !== kontiHeight
    ) {
      // Referansı güncelle
      lastDimensions.current = { kontiWidth, kontiHeight };

      // Fiyatları güncelle (işlem devam etmiyorsa)
      if (!isUpdating.current && Object.keys(localOrderData).length > 0) {
        recalculatePrices();
      }
    }
  }, [kontiWidth, kontiHeight, localOrderData, recalculatePrices]);

  // 3. Zustand store'daki needsRecalculation flag'i değiştiğinde fiyatları güncelle
  useEffect(() => {
    if (
      needsRecalculation &&
      Object.keys(localOrderData).length > 0 &&
      !isUpdating.current
    ) {
      recalculatePrices();
      resetRecalculationFlag();
    }
  }, [
    needsRecalculation,
    localOrderData,
    recalculatePrices,
    resetRecalculationFlag,
  ]);

  // 4. shouldRecalc prop'u değişince fiyatları güncelle
  useEffect(() => {
    if (
      shouldRecalc &&
      Object.keys(localOrderData).length > 0 &&
      !isUpdating.current
    ) {
      recalculatePrices();
    }
  }, [shouldRecalc, localOrderData, recalculatePrices]);

  // Kategorileri sıralama (useMemo ile optimize edildi)
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
            "notes",
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

  // Ürünleri sırala
  const sortProducts = useCallback((products) => {
    return Object.entries(products).sort((a, b) => {
      const orderA = a[1].order || 999;
      const orderB = b[1].order || 999;
      return orderA - orderB;
    });
  }, []);

  // parseKontiDimensions fonksiyonunu güncelle, satır ~384
  const parseKontiDimensions = useCallback((name) => {
    // 'x' karakterini ayırıcı olarak kullan - küçük harf veya büyük harf X olabilir
    const parts = name.toLowerCase().split("x");

    if (parts.length === 2) {
      // parseFloat kullanarak ondalık sayıları destekle
      const width = parseFloat(parts[0].trim());
      const height = parseFloat(parts[1].trim());

      // Geçerli sayılar ise değerleri döndür
      if (!isNaN(width) && !isNaN(height)) {
        return [width, height];
      }
    }

    return [0, 0]; // Geçersiz format
  }, []);
  // Ürün düzenlemeyi başlat
  const handleEdit = useCallback(
    (categoryName, productIndex, product) => {
      setEditingItem(`${categoryName}-${productIndex}`);

      setSelectedProduct({
        id: product.productCollectionId,
        name: product.name,
        price: product.price,
        custom: !product.productCollectionId,
        showInput: false,
      });

      setEditingValues({
        name: product.name,
        price: product.price?.toString() || "0",
      });
    },
    [setEditingItem, setSelectedProduct, setEditingValues]
  );

  // Fiyat değişimi
  const handlePriceChange = useCallback(
    (e) => {
      const value = e.target.value;

      // Matematiksel ifade olup olmadığına bakmaksızın değeri direkt olarak ayarla
      setEditingValues((prev) => ({
        ...prev,
        price: value,
      }));
    },
    [setEditingValues]
  );

  // Fiyat alanına tıklama (direkt düzenleme modu ve seçim)
  const handlePriceClick = useCallback(
    (categoryName, productIndex, product) => {
      handleEdit(categoryName, productIndex, product);

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
    [handleEdit, editingValues.price] // Added missing dependency
  );

  // Ürün seçimi
  const handleProductSelect = useCallback(
    (value, categoryName, productIndex) => {
      try {
        if (!value || !categoryName || productIndex === undefined) return;

        const selectedProduct = JSON.parse(value);

        // Özel ürün seçimi
        // handleProductSelect fonksiyonunda özel ürün seçiminde kategoriyi kontrol et
        if (selectedProduct.custom) {
          setSelectedProduct({
            ...selectedProduct,
            showInput: true, // Yeni seçildiğinde input göster
          });

          // Konti kategorisi için varsayılan format sağla
          if (categoryName.toLowerCase() === "konti") {
            setEditingValues({
              name: ``, // Varsayılan format "0x0"
              price: "0",
            });
          } else {
            setEditingValues({
              name: "", // Diğer kategoriler için boş alan
              price: "0",
            });
          }
          return;
        }

        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category) return;

        const productData = products[categoryName]?.[selectedProduct.id];
        const basePrice = Number(selectedProduct.price);
        const currentProduct = localOrderData[categoryName]?.[productIndex];

        // Konti ürünü seçimi
        if (category?.priceFormat === "konti") {
          const kontiWidth = Number(productData?.width) || 0;
          const kontiHeight = Number(productData?.height) || 0;

          initializeDimensions({
            kontiWidth,
            kontiHeight,
            anaWidth: kontiWidth,
            anaHeight: kontiHeight,
          });

          setLocalOrderData((prev) => {
            const newData = { ...prev };

            newData.dimensions = {
              ...prev.dimensions,
              kontiWidth,
              kontiHeight,
              anaWidth: kontiWidth,
              anaHeight: kontiHeight,
            };

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

            // En/boy artis kategorilerini sıfırla
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
        }
        // Artis ürünü seçimi
        else if (category?.priceFormat === "artis") {
          const currentKontiWidth = Number(dimensions.kontiWidth) || 0;
          const currentKontiHeight = Number(dimensions.kontiHeight) || 0;

          const newWidth = Number(productData?.width || 0);
          const newHeight = Number(productData?.height || 0);
          const isRemoving = selectedProduct.id === "istemiyorum";

          const currentProductData = currentProduct?.productCollectionId
            ? products[categoryName]?.[currentProduct.productCollectionId]
            : null;

          const currentWidth = Number(
            currentProductData?.width || currentProduct?.width || 0
          );
          const currentHeight = Number(
            currentProductData?.height || currentProduct?.height || 0
          );

          // Boyutları güncelle
          let updatedWidth = currentKontiWidth;
          let updatedHeight = currentKontiHeight;

          if (categoryName.toLowerCase().includes("en")) {
            if (isRemoving) {
              updatedWidth = Math.max(0, currentKontiWidth - currentWidth);
            } else {
              updatedWidth = Math.max(
                0,
                currentKontiWidth - currentWidth + newWidth
              );
            }
          } else if (categoryName.toLowerCase().includes("boy")) {
            if (isRemoving) {
              updatedHeight = Math.max(0, currentKontiHeight - currentHeight);
            } else {
              updatedHeight = Math.max(
                0,
                currentKontiHeight - currentHeight + newHeight
              );
            }
          }

          // Fiyat hesapla
          let calculatedPrice = 0;

          // ÖNEMLİ: Ürün eklendiği andaki boyutları saklayacağız
          const originalDimensions = {
            kontiWidth: currentKontiWidth,
            kontiHeight: currentKontiHeight,
          };

          if (!isRemoving) {
            if (categoryName.toLowerCase().includes("en")) {
              // En artis için MEVCUT yüksekliği kullanıyoruz (boy henüz etkilemedi)
              calculatedPrice =
                currentKontiHeight *
                newWidth *
                Number(productData?.price || basePrice);
            } else if (categoryName.toLowerCase().includes("boy")) {
              // Boy artis için MEVCUT genişliği kullanıyoruz (en artis etkilediyse o değeri)
              calculatedPrice =
                currentKontiWidth *
                newHeight *
                Number(productData?.price || basePrice);
            }
          }

          // Boyutları güncelle
          initializeDimensions({
            kontiWidth: updatedWidth,
            kontiHeight: updatedHeight,
            anaWidth: updatedWidth,
            anaHeight: updatedHeight,
          });

          // Sipariş verilerini güncelle
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
                // ÖNEMLİ: Orijinal boyutları kaydedelim
                originalDimensions: isRemoving ? undefined : originalDimensions,
              },
            },
          }));
        }
        // Diğer ürünler (tasDuvar, onYuzey, cevre, metrekare, tekil vb.)
        else {
          let calculatedPrice = basePrice;

          // Dinamik fiyat formatı ise boyutlara göre hesapla
          if (
            ["metrekare", "cevre", "onYuzey", "tasDuvar"].includes(
              category?.priceFormat
            )
          ) {
            const currentKontiWidth = Number(dimensions.kontiWidth) || 0;
            const currentKontiHeight = Number(dimensions.kontiHeight) || 0;

            if (category?.priceFormat === "metrekare") {
              calculatedPrice =
                currentKontiWidth * currentKontiHeight * basePrice;
            } else if (category?.priceFormat === "cevre") {
              const perimeter = 2 * (currentKontiWidth + currentKontiHeight);
              calculatedPrice = perimeter * basePrice;
            } else if (category?.priceFormat === "onYuzey") {
              calculatedPrice = currentKontiHeight * basePrice;
            } else if (category?.priceFormat === "tasDuvar") {
              const area = currentKontiWidth * currentKontiHeight;
              const perimeter = 2 * (currentKontiWidth + currentKontiHeight);
              const alanPrice = Number(productData?.alanPrice || 0);

              calculatedPrice = area * alanPrice + perimeter * basePrice;
            }
          }

          // Sipariş verilerini güncelle
          setLocalOrderData((prev) => ({
            ...prev,
            [categoryName]: {
              ...prev[categoryName],
              [productIndex]: {
                name: selectedProduct.name,
                price: calculatedPrice,
                productCollectionId: selectedProduct.id,
                width: Number(productData?.width || 0),
                height: Number(productData?.height || 0),
              },
            },
          }));
        }

        setSelectedProduct(selectedProduct);
        setEditingValues({
          name: selectedProduct.name,
          price: String(selectedProduct.id === "istemiyorum" ? 0 : basePrice),
        });
      } catch (error) {
        console.error("Ürün seçimi hatası:", error);
      }
    },
    [
      categories,
      products,
      dimensions,
      localOrderData,
      initializeDimensions,
      setLocalOrderData,
      setEditingValues,
      setSelectedProduct,
    ]
  );

  // Ürün düzenlemesini kaydet

  const handleSave = useCallback(
    (categoryName, productIndex) => {
      let finalPrice = editingValues.price;

      try {
        if (
          typeof editingValues.price === "string" &&
          (editingValues.price.includes("*") ||
            editingValues.price.includes("+") ||
            editingValues.price.includes("-") ||
            editingValues.price.includes("/"))
        ) {
          // Matematik ifadesini hesapla
          const calculatedValue = new Function(
            `return ${editingValues.price}`
          )();

          if (!isNaN(calculatedValue)) {
            finalPrice = calculatedValue; // Negatif değerlere izin ver
          }
        } else {
          // handleSave fonksiyonu içinde - satır ~853
          finalPrice = parseFloat(editingValues.price) || 0; // Negatif değerlere izin ver
        }
      } catch (error) {
        finalPrice = 0; // Hata durumunda 0 olarak ayarla
      }
      // Konti kategorisi için özel işleme
      if (categoryName.toLowerCase() === "konti" && selectedProduct?.custom) {
        // Format kontrolü
        const formatCheck =
          /^\s*(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)\s*$/.test(
            editingValues.name
          );

        if (!formatCheck) {
          alert("Lütfen geçerli bir format girin. Örnek: 100x200");
          return;
        }

        const [width, height] = parseKontiDimensions(editingValues.name);
        if (width > 0 && height > 0) {
          // Boyutları güncelle
          initializeDimensions({
            kontiWidth: width,
            kontiHeight: height,
            anaWidth: width,
            anaHeight: height,
          });

          // Sipariş verisini güncelle
          setLocalOrderData((prev) => {
            // Önceki veriyi kopyala
            const newData = { ...prev };

            // Boyutları güncelle
            newData.dimensions = {
              ...prev.dimensions,
              kontiWidth: width,
              kontiHeight: height,
              anaWidth: width,
              anaHeight: height,
            };

            // Konti verilerini güncelle
            newData[categoryName] = {
              ...prev[categoryName],
              [productIndex]: {
                name: editingValues.name,
                price: finalPrice,
                productCollectionId: null,
                width,
                height,
              },
            };

            // Artis kategorilerini güncelle (varsa)
            if (categories) {
              Object.values(categories).forEach((cat) => {
                // Kategori artis formatındaysa ve localOrderData'da mevcutsa işlem yap
                if (
                  cat?.priceFormat === "artis" &&
                  cat?.propertyName &&
                  prev[cat.propertyName] // Bu kontrol önemli - sadece halihazırda var olan kategoriler
                ) {
                  // Kategori verilerini "İstemiyorum" ile güncelle
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
            }

            return newData;
          });

          // Fiyatları yeniden hesapla
          setShouldRecalcPrices(true);
          setTimeout(() => setShouldRecalcPrices(false), 300);
        }
      } else {
        const currentProduct =
          localOrderData[categoryName]?.[productIndex] || {};

        setLocalOrderData((prev) => ({
          ...prev,
          [categoryName]: {
            ...prev[categoryName],
            [productIndex]: {
              name: selectedProduct.custom
                ? editingValues.name
                : selectedProduct.name,
              price: finalPrice,
              productCollectionId: selectedProduct.custom
                ? null
                : selectedProduct.id,
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
      parseKontiDimensions,
      setLocalOrderData,
      initializeDimensions,
      setEditingItem,
      setSelectedProduct,
      setShouldRecalcPrices,
      categories,
    ]
  );

  // Ürün sil
  const handleDelete = useCallback(
    (categoryName, productIndex) => {
      const productToDelete = localOrderData[categoryName]?.[productIndex];
      if (!productToDelete) return;

      const category = Object.values(categories).find(
        (cat) => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
      );

      if (!category) return;

      const isArtisCategory = category?.priceFormat === "artis";
      const productId = productToDelete.productCollectionId;

      const productFromDB =
        productId && productId !== "istemiyorum"
          ? products[categoryName]?.[productId]
          : null;

      const currentWidth = Number(
        productFromDB?.width || productToDelete?.width || 0
      );
      const currentHeight = Number(
        productFromDB?.height || productToDelete?.height || 0
      );

      // Artis kategorisi ise boyutları güncelle
      if (isArtisCategory) {
        let updatedWidth = dimensions.kontiWidth;
        let updatedHeight = dimensions.kontiHeight;

        if (categoryName.toLowerCase().includes("en") && currentWidth > 0) {
          updatedWidth = Math.max(0, dimensions.kontiWidth - currentWidth);
        } else if (
          categoryName.toLowerCase().includes("boy") &&
          currentHeight > 0
        ) {
          updatedHeight = Math.max(0, dimensions.kontiHeight - currentHeight);
        }

        const dimensionsChanged =
          updatedWidth !== dimensions.kontiWidth ||
          updatedHeight !== dimensions.kontiHeight;

        // Boyutları güncelle
        initializeDimensions({
          kontiWidth: updatedWidth,
          kontiHeight: updatedHeight,
          anaWidth: updatedWidth,
          anaHeight: updatedHeight,
        });

        // Ürünü sil ve tekrar indeksle
        setLocalOrderData((prev) => {
          const newData = { ...prev };
          const updatedCategory = { ...newData[categoryName] };
          delete updatedCategory[productIndex];

          // Kategori tamamen boşaldıysa, tüm kategoriyi sil
          if (Object.keys(updatedCategory).length === 0) {
            delete newData[categoryName]; // Boş kategoriyi tamamen kaldır
          } else {
            // Kategori hala ürün içeriyorsa, kalan ürünleri yeniden indeksle
            const reindexed = {};
            Object.values(updatedCategory).forEach((item, idx) => {
              reindexed[idx] = item;
            });
            newData[categoryName] = reindexed;
          }

          return newData;
        });

        // Boyutlar değiştiyse fiyatları yeniden hesapla
        if (dimensionsChanged) {
          setShouldRecalcPrices(true);
          setTimeout(() => setShouldRecalcPrices(false), 300);
        }
      } else {
        // Artis kategorisi değilse sadece sil ve tekrar indeksle
        setLocalOrderData((prev) => {
          const newData = { ...prev };
          const updatedCategory = { ...newData[categoryName] };
          delete updatedCategory[productIndex];

          const reindexed = {};
          Object.values(updatedCategory).forEach((item, idx) => {
            reindexed[idx] = item;
          });

          newData[categoryName] = reindexed;
          return newData;
        });
      }
    },
    [
      categories,
      products,
      dimensions,
      localOrderData,
      initializeDimensions,
      setLocalOrderData,
      setShouldRecalcPrices,
    ]
  );
  const handleKeyDown = useCallback(
    (e, categoryName, productIndex) => {
      // Enter tuşuna basıldığında ve shift tuşu basılı değilse kaydet
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); // Form gönderimini engelle
        handleSave(categoryName, productIndex);
      }
    },
    [handleSave]
  );
  // JSX'de doğrudan sortedCategories'i kullan
  return (
    <div className="grid grid-cols-1 space-y-0.5">
      {sortedCategories.map(([categoryName, categoryProducts]) => {
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        return (
          <div
            key={categoryName}
            className="bg-gray-800/30 rounded overflow-hidden"
          >
            <div className="divide-y divide-gray-700/30">
              {Object.entries(categoryProducts).map(
                ([productIndex, product]) => (
                  <div
                    key={`${categoryName}-${productIndex}`}
                    className="hover:bg-gray-700/20 transition-colors duration-150"
                  >
                    <div className="grid grid-cols-[2fr,2fr,1fr,auto] items-center px-2 py-1.5 gap-1">
                      {editingItem === `${categoryName}-${productIndex}` ? (
                        <>
                          <span
                            className="text-gray-400 text-[0.75rem] truncate"
                            style={{
                              textRendering: "optimizeLegibility",
                              WebkitFontSmoothing: "antialiased",
                            }}
                          >
                            {category?.title || categoryName}
                          </span>
                          <div className="relative">
                            {selectedProduct &&
                            selectedProduct.custom &&
                            selectedProduct.showInput ? (
                              // Diğer seçildiğinde text input göster
                              categoryName.toLowerCase() === "konti" ? (
                                <div className="relative">
                                  <input
                                    type="text"
                                    value={editingValues.name}
                                    onChange={(e) => {
                                      // Herhangi bir girişe izin ver, validation sadece kaydetme sırasında yapılacak
                                      const value = e.target.value;

                                      // Hiçbir regex kontrolü olmadan input değerini kabul et
                                      setEditingValues((prev) => ({
                                        ...prev,
                                        name: value,
                                      }));
                                    }}
                                    onKeyDown={(e) =>
                                      handleKeyDown(
                                        e,
                                        categoryName,
                                        productIndex
                                      )
                                    }
                                    placeholder="Genişlikxuzunluk (örn: 4x8)"
                                    className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                                    style={{
                                      WebkitFontSmoothing: "antialiased",
                                    }}
                                    autoFocus
                                  />
                                  <div className="mt-1 text-[0.7rem] text-blue-300">
                                    Format: GenişlikxYükseklik (örn: 4x8 veya
                                    4.5x8.5)
                                  </div>
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={editingValues.name}
                                  onChange={(e) =>
                                    setEditingValues((prev) => ({
                                      ...prev,
                                      name: e.target.value,
                                    }))
                                  }
                                  onKeyDown={(e) =>
                                    handleKeyDown(e, categoryName, productIndex)
                                  }
                                  placeholder="Özel ürün adı giriniz"
                                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                                  style={{ WebkitFontSmoothing: "antialiased" }}
                                  autoFocus
                                />
                              )
                            ) : (
                              // Normal durumda select göster
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
                                className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                                style={{ WebkitFontSmoothing: "antialiased" }}
                              >
                                {/* Diğer seçeneğini en üste taşı */}
                                <option value='{"custom":true}'>Diğer</option>

                                {/* Önce mevcut seçili ürünü göster */}
                                {selectedProduct && !selectedProduct.custom && (
                                  <option
                                    value={JSON.stringify(selectedProduct)}
                                  >
                                    {selectedProduct.name} -{" "}
                                    {Number(
                                      selectedProduct.price
                                    )?.toLocaleString("tr-TR")}
                                    ₺
                                  </option>
                                )}

                                {/* Sonra diğer ürünleri göster */}
                                {products[categoryName] &&
                                  sortProducts(products[categoryName])
                                    .filter(
                                      ([key]) => key !== selectedProduct?.id
                                    )
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
                              </select>
                            )}
                          </div>
                          <input
                            type="text"
                            value={editingValues.price}
                            onChange={(e) =>
                              handlePriceChange(e, categoryName, productIndex)
                            }
                            onKeyDown={(e) =>
                              handleKeyDown(e, categoryName, productIndex)
                            }
                            className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-green-500/50 outline-none w-full transition-all duration-200"
                            style={{ WebkitFontSmoothing: "antialiased" }}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleSave(categoryName, productIndex)
                              }
                              className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded p-1 transition-colors duration-150"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                shapeRendering="geometricPrecision"
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
                          <span
                            className="text-gray-400 text-[0.75rem] truncate"
                            style={{
                              textRendering: "optimizeLegibility",
                              WebkitFontSmoothing: "antialiased",
                            }}
                          >
                            {category?.title || categoryName}
                          </span>
                          <span
                            className="text-gray-300 text-[0.75rem] truncate cursor-pointer hover:text-indigo-300 transition-colors duration-150"
                            onClick={() =>
                              handleEdit(categoryName, productIndex, product)
                            }
                            style={{
                              textRendering: "optimizeLegibility",
                              WebkitFontSmoothing: "antialiased",
                            }}
                          >
                            {product.name}
                          </span>

                          <span
                            className={`text-[0.75rem] cursor-pointer transition-colors duration-150 ${
                              Number(product.price) < 0
                                ? "text-red-400 hover:text-red-300"
                                : "text-green-400 hover:text-green-300"
                            }`}
                            onClick={() =>
                              handlePriceClick(
                                categoryName,
                                productIndex,
                                product
                              )
                            }
                            style={{
                              textRendering: "optimizeLegibility",
                              WebkitFontSmoothing: "antialiased",
                            }}
                          >
                            {Number(product.price) < 0 ? "-" : ""}
                            {Math.abs(Number(product.price))?.toLocaleString(
                              "tr-TR"
                            )}
                            ₺
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() =>
                                handleDelete(categoryName, productIndex)
                              }
                              className="text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded p-1 transition-colors duration-150"
                              title="Sil"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                shapeRendering="geometricPrecision"
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
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}

      {sortedCategories.length === 0 && (
        <div className="flex flex-col items-center justify-center py-4 px-3 bg-gray-800/20 rounded-lg border border-gray-700/30">
          <p className="text-gray-400 text-sm">Henüz ürün eklenmemiş</p>
        </div>
      )}
    </div>
  );
};

// Update propTypes to remove dimensions and setDimensions
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
  shouldRecalc: PropTypes.bool,
  setShouldRecalcPrices: PropTypes.func,
  skipInitialCalc: PropTypes.bool,
};

export default OrderDetails;
