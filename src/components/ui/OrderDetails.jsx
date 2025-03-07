import { useCallback, useEffect, useRef, useMemo } from "react";
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
  shouldRecalc = false,
  setShouldRecalcPrices = () => {},
}) => {
  const isUpdating = useRef(false);
  const initialCalcDone = useRef(false);
  const isInitialMount = useRef(true);

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
  // Fiyat hesaplama useEffect'i - tüm dinamik fiyat formatlarını kapsayacak şekilde güncellendi
  useEffect(() => {
    // İlk mount ise, bunu değiştir ve çık
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // Tüm dinamik fiyat formatlı kategorileri kontrol et
      const dynamicPriceFormats = [
        "artis",
        "metrekare",
        "cevre",
        "onYuzey",
        "tasDuvar",
      ];

      const hasValidPrices = Object.values(categories)
        .filter((cat) => dynamicPriceFormats.includes(cat.priceFormat))
        .every((category) => {
          const categoryName = category.propertyName;
          if (!localOrderData[categoryName]) return true;

          return Object.values(localOrderData[categoryName]).every(
            (product) =>
              product.productCollectionId === "istemiyorum" ||
              (typeof product.price === "number" && product.price > 0)
          );
        });

      if (hasValidPrices) {
        initialCalcDone.current = true;
        return; // Tüm ürünlerin fiyatı varsa hesaplama yapma
      }
    }
    if (initialCalcDone.current && !shouldRecalc) {
      return;
    }
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

    // Hesaplanması gereken ürünleri kontrol et - tüm dinamik fiyat formatlı kategoriler için
    const dynamicPriceFormats = [
      "artis",
      "metrekare",
      "cevre",
      "onYuzey",
      "tasDuvar",
    ];

    const needsPriceCalculation = Object.values(categories)
      .filter((cat) => dynamicPriceFormats.includes(cat.priceFormat))
      .some((category) => {
        const categoryName = category.propertyName;
        if (!localOrderData[categoryName]) return false;

        return Object.values(localOrderData[categoryName]).some(
          (product) =>
            product.price === 0 && product.productCollectionId !== "istemiyorum"
        );
      });

    // İlk yüklemede hesaplama yapma, sadece shouldRecalc true veya fiyatların hesaplanması gerekiyorsa yap
    if (!shouldRecalc && !needsPriceCalculation) {
      return;
    }

    // Güncelleme yapılıyor olarak işaretle
    isUpdating.current = true;

    try {
      // Derin kopya oluştur (mutasyon sorunlarını önlemek için)
      const updatedOrderData = JSON.parse(JSON.stringify(localOrderData));

      let dimensionsToSet = { ...dimensions };

      // Tüm konti boyutlarını al
      const kontiWidth = Number(
        updatedOrderData.dimensions?.kontiWidth ||
          dimensionsToSet.kontiWidth ||
          0
      );
      const kontiHeight = Number(
        updatedOrderData.dimensions?.kontiHeight ||
          dimensionsToSet.kontiHeight ||
          0
      );

      // Tüm dinamik fiyat formatlı kategorileri işle
      Object.values(categories)
        .filter((cat) => dynamicPriceFormats.includes(cat.priceFormat))
        .forEach((category) => {
          const categoryName = category.propertyName;
          const priceFormat = category.priceFormat;

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
              const alanPrice = Number(productData.alanPrice || 0);
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

              // Kategori ve fiyat formatına göre fiyat hesapla
              let calculatedPrice = 0;

              if (priceFormat === "artis") {
                if (categoryName.toLowerCase().includes("en")) {
                  calculatedPrice = productWidth * kontiHeight * basePrice;
                } else if (categoryName.toLowerCase().includes("boy")) {
                  calculatedPrice = productHeight * kontiWidth * basePrice;
                } else {
                  // Standart artis hesaplaması
                  const kontiArea = kontiWidth * kontiHeight;
                  const newWidth = Number(kontiWidth) + Number(productWidth);
                  const newHeight = Number(kontiHeight) + Number(productHeight);
                  const newArea = newWidth * newHeight;
                  calculatedPrice = (newArea - kontiArea) * basePrice;
                }
              } else if (priceFormat === "metrekare") {
                // Alan hesabı: genişlik * yükseklik * birim fiyat
                calculatedPrice = kontiWidth * kontiHeight * basePrice;
              } else if (priceFormat === "cevre") {
                // Çevre hesabı: (2 * (genişlik + yükseklik)) * birim fiyat
                const perimeter = 2 * (kontiWidth + kontiHeight);
                calculatedPrice = perimeter * basePrice;
              } else if (priceFormat === "onYuzey") {
                // Ön yüzey hesabı: yükseklik * birim fiyat
                calculatedPrice = kontiHeight * basePrice;
              } else if (priceFormat === "tasDuvar") {
                // Taş duvar: alan * alanPrice + çevre * basePrice
                const area = kontiWidth * kontiHeight;
                const perimeter = 2 * (kontiWidth + kontiHeight);

                calculatedPrice = area * alanPrice + perimeter * basePrice;
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
    setDimensions,
  ]);
  const parseKontiDimensions = (name) => {
    const dimensions = name.split("x").map((n) => parseInt(n.trim()));
    return dimensions.length === 2 ? dimensions : [0, 0];
  };

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

        const currentProduct = localOrderData[categoryName]?.[productIndex];

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
        } else if (category?.priceFormat === "artis") {
          const currentKontiWidth = Number(dimensions.kontiWidth) || 0;
          const currentKontiHeight = Number(dimensions.kontiHeight) || 0;

          // Yeni ürün boyutları
          const newWidth = Number(productData?.width || 0);
          const newHeight = Number(productData?.height || 0);

          // "İstemiyorum" kontrolü
          const isRemoving = selectedProduct.id === "istemiyorum";

          // Mevcut ürünün tüm bilgilerini konsolda görelim
          console.log("Mevcut ürün bilgileri:", currentProduct);

          const currentProductData = currentProduct?.productCollectionId
            ? products[categoryName]?.[currentProduct.productCollectionId]
            : null;
          // Mevcut ürün boyutları - Doğru şekilde almak için localOrderData'dan kontrol edelim
          const currentWidth = Number(
            currentProductData?.width || currentProduct?.width || 0
          );
          const currentHeight = Number(
            currentProductData?.height || currentProduct?.height || 0
          );

          // Ürün bilgilerini detaylı logla
          console.log("Ürün boyutları:", {
            kategori: categoryName,
            mevcut_urun_id: currentProduct?.productCollectionId,
            mevcut_width: currentWidth,
            mevcut_height: currentHeight,
            yeni_urun_id: selectedProduct.id,
            yeni_width: newWidth,
            yeni_height: newHeight,
          });

          // Güncellenmiş boyutları hesapla
          let updatedWidth = currentKontiWidth;
          let updatedHeight = currentKontiHeight;

          // Kategori türüne göre boyut güncelleme
          if (categoryName.toLowerCase().includes("en")) {
            if (isRemoving) {
              // En ürününü çıkarırken, currentWidth değerini konti genişliğinden çıkar
              updatedWidth = Math.max(0, currentKontiWidth - currentWidth);
            } else {
              // Mevcut en ürününü değiştirirken veya eklerken
              updatedWidth = Math.max(
                0,
                currentKontiWidth - currentWidth + newWidth
              );
            }
          } else if (categoryName.toLowerCase().includes("boy")) {
            if (isRemoving) {
              // Boy ürününü çıkarırken, currentHeight değerini konti yüksekliğinden çıkar
              updatedHeight = Math.max(0, currentKontiHeight - currentHeight);
            } else {
              // Mevcut boy ürününü değiştirirken veya eklerken
              updatedHeight = Math.max(
                0,
                currentKontiHeight - currentHeight + newHeight
              );
            }
          }

          console.log(`${categoryName} işlemi:`, {
            işlem: isRemoving ? "Çıkarma" : "Ekleme/Değiştirme",
            öncekiBoyutlar: {
              width: currentKontiWidth,
              height: currentKontiHeight,
            },
            ürünBoyutları: { width: currentWidth, height: currentHeight },
            yeniBoyutlar: { width: updatedWidth, height: updatedHeight },
          });

          // Alan farkına göre fiyat hesapla
          let calculatedPrice = 0;

          if (!isRemoving) {
            if (categoryName.toLowerCase().includes("en")) {
              // En ürünü için: yükseklik * genişlik farkı * birim fiyat
              calculatedPrice =
                currentKontiHeight *
                newWidth *
                Number(productData?.price || basePrice);
            } else if (categoryName.toLowerCase().includes("boy")) {
              // Boy ürünü için: genişlik * yükseklik farkı * birim fiyat
              calculatedPrice =
                currentKontiWidth *
                newHeight *
                Number(productData?.price || basePrice);
            }
          }

          // Önce boyutları güncelle
          setDimensions((prev) => ({
            ...prev,
            kontiWidth: updatedWidth,
            kontiHeight: updatedHeight,
            anaWidth: updatedWidth,
            anaHeight: updatedHeight,
          }));

          // Sonra sipariş verilerini güncelle
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

          // Düzenleme değerlerini güncelle
          setEditingValues({
            name: selectedProduct.name,
            price: calculatedPrice.toString(),
          });
        }
        // DİĞER KATEGORİLER İŞLEMLERİ
        else {
          // Dinamik fiyat hesaplama
          let calculatedPrice = basePrice;

          // Mevcut boyutları al
          const currentKontiWidth = Number(dimensions.kontiWidth) || 0;
          const currentKontiHeight = Number(dimensions.kontiHeight) || 0;

          // Ürünün kendi boyutları
          const productWidth = Number(productData?.width || 0);
          const productHeight = Number(productData?.height || 0);

          // Kategori formatına göre fiyat hesapla
          if (category?.priceFormat === "metrekare") {
            // Alan hesabı: genişlik * yükseklik * birim fiyat
            calculatedPrice =
              currentKontiWidth * currentKontiHeight * basePrice;
          } else if (category?.priceFormat === "cevre") {
            // Çevre hesabı: (2 * (genişlik + yükseklik)) * birim fiyat
            const perimeter = 2 * (currentKontiWidth + currentKontiHeight);
            calculatedPrice = perimeter * basePrice;
          } else if (category?.priceFormat === "onYuzey") {
            // Ön yüzey hesabı: yükseklik * birim fiyat
            calculatedPrice = currentKontiHeight * basePrice;
          } else if (category?.priceFormat === "tasDuvar") {
            // Taş duvar: alan * alanPrice + çevre * basePrice
            const area = currentKontiWidth * currentKontiHeight;
            const perimeter = 2 * (currentKontiWidth + currentKontiHeight);
            const alanPrice = Number(productData?.alanPrice || 0);

            calculatedPrice = area * alanPrice + perimeter * basePrice;
          }

          // Standard product update with calculated price
          setLocalOrderData((prev) => ({
            ...prev,
            [categoryName]: {
              ...prev[categoryName],
              [productIndex]: {
                name: selectedProduct.name,
                price: calculatedPrice,
                productCollectionId: selectedProduct.id,
                width: productWidth,
                height: productHeight,
              },
            },
          }));

          setEditingValues({
            name: selectedProduct.name,
            price: calculatedPrice.toString(),
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

  const recalculateArtisProductPrices = useCallback(
    (currentOrderData, kontiWidth, kontiHeight) => {
      // Daha detaylı loglama yapalım
      console.log("recalculateArtisProductPrices çağrıldı:", {
        kontiWidth,
        kontiHeight,
        currentOrderData,
      });

      // Artis ve diğer dinamik fiyatlı kategorileri bul
      const dynamicPriceCategories = Object.values(categories).filter((cat) =>
        ["artis", "metrekare", "cevre", "onYuzey", "tasDuvar"].includes(
          cat.priceFormat
        )
      );

      if (dynamicPriceCategories.length === 0) {
        console.log("Dinamik fiyatlı kategori bulunamadı");
        return;
      }

      // Güncellenmiş sipariş verilerini hazırla
      const updatedOrderData = { ...currentOrderData };
      let hasChanges = false;

      // Tüm dinamik fiyatlı kategorileri kontrol et
      dynamicPriceCategories.forEach((category) => {
        const categoryName = category.propertyName;
        const priceFormat = category.priceFormat;

        console.log(`Kategori işleniyor: ${categoryName} (${priceFormat})`);

        // Bu kategorideki ürünleri işle
        if (updatedOrderData[categoryName]) {
          Object.entries(updatedOrderData[categoryName]).forEach(
            ([productIndex, product]) => {
              // productCollectionId yoksa veya "istemiyorum" ise atla
              if (
                !product.productCollectionId ||
                product.productCollectionId === "istemiyorum"
              ) {
                console.log(
                  `Ürün atlandı: ${product.name} (productCollectionId yok veya istemiyorum)`
                );
                return;
              }

              const productData =
                products[categoryName]?.[product.productCollectionId];

              // Ürün bilgilerini logla
              console.log(`Ürün işleniyor: ${product.name}`, {
                productData,
                product,
              });

              // Ürün bilgisi yoksa product nesnesindeki değerleri kullan
              const basePrice = Number(
                productData?.price || product.price || 0
              );
              const alanPrice = Number(productData?.alanPrice || 0);
              const productWidth = Number(
                product.width || productData?.width || 0
              );
              const productHeight = Number(
                product.height || productData?.height || 0
              );

              let calculatedPrice = 0;

              // Kategori türüne göre fiyat hesapla
              if (priceFormat === "artis") {
                if (categoryName.toLowerCase().includes("en")) {
                  calculatedPrice = kontiHeight * productWidth * basePrice;
                  console.log(
                    `Yeniden hesaplama - En: ${kontiHeight} * ${productWidth} * ${basePrice} = ${calculatedPrice}`
                  );
                } else if (categoryName.toLowerCase().includes("boy")) {
                  calculatedPrice = kontiWidth * productHeight * basePrice;
                  console.log(
                    `Yeniden hesaplama - Boy: ${kontiWidth} * ${productHeight} * ${basePrice} = ${calculatedPrice}`
                  );
                } else {
                  // Diğer artis kategorileri için hesaplama
                  calculatedPrice = calculatePrice({
                    priceFormat: "artis",
                    basePrice: basePrice,
                    width: productWidth,
                    height: productHeight,
                    kontiWidth: kontiWidth,
                    kontiHeight: kontiHeight,
                    categoryName: categoryName,
                  });
                  console.log(`Diğer artis hesaplaması: ${calculatedPrice}`);
                }
              } else if (priceFormat === "metrekare") {
                // Alan hesabı: genişlik * yükseklik * birim fiyat
                calculatedPrice = kontiWidth * kontiHeight * basePrice;
                console.log(
                  `Metrekare hesaplaması: ${kontiWidth} * ${kontiHeight} * ${basePrice} = ${calculatedPrice}`
                );
              } else if (priceFormat === "cevre") {
                // Çevre hesabı: (2 * (genişlik + yükseklik)) * birim fiyat
                const perimeter = 2 * (kontiWidth + kontiHeight);
                calculatedPrice = perimeter * basePrice;
                console.log(
                  `Çevre hesaplaması: 2 * (${kontiWidth} + ${kontiHeight}) * ${basePrice} = ${calculatedPrice}`
                );
              } else if (priceFormat === "onYuzey") {
                // Ön yüzey hesabı: yükseklik * birim fiyat
                calculatedPrice = kontiHeight * basePrice;
                console.log(
                  `Ön yüzey hesaplaması: ${kontiHeight} * ${basePrice} = ${calculatedPrice}`
                );
              } else if (priceFormat === "tasDuvar") {
                // Taş duvar: alan * alanPrice + çevre * basePrice
                const area = kontiWidth * kontiHeight;
                const perimeter = 2 * (kontiWidth + kontiHeight);

                calculatedPrice = area * alanPrice + perimeter * basePrice;
                console.log(
                  `Taş duvar hesaplaması: (${area} * ${alanPrice}) + (${perimeter} * ${basePrice}) = ${calculatedPrice}`
                );
              }

              if (
                calculatedPrice > 0 &&
                Math.abs(calculatedPrice - product.price) > 0.01
              ) {
                updatedOrderData[categoryName][productIndex] = {
                  ...product,
                  price: calculatedPrice,
                };
                hasChanges = true;
                console.log(
                  `Ürün fiyatı güncellendi: ${product.name}, ${product.price} -> ${calculatedPrice}`
                );
              }
            }
          );
        } else {
          console.log(`${categoryName} kategorisi için ürün bulunamadı`);
        }
      });

      // Değişiklik varsa state'i güncelle
      if (hasChanges) {
        console.log("Ürün fiyatları güncellendi, state güncellenecek");
        setLocalOrderData(updatedOrderData);

        // Parent'a bildir ve fiyat hesaplama flag'ini aktifleştir
        setShouldRecalcPrices(true);
      } else {
        console.log("Değişiklik yok, state güncellenmeyecek");
      }
    },
    [
      categories,
      products,
      setLocalOrderData,
      setShouldRecalcPrices,
      calculatePrice,
    ]
  );

  // handleDelete fonksiyonunu da güncelleyelim
  const handleDelete = useCallback(
    (categoryName, productIndex) => {
      console.log(`Ürün siliniyor: ${categoryName}-${productIndex}`);

      // Önce silinecek ürünün bilgilerini al
      const productToDelete = localOrderData[categoryName]?.[productIndex];
      if (!productToDelete) {
        console.error(
          `Silinecek ürün bulunamadı: ${categoryName}-${productIndex}`
        );
        return;
      }

      // Kategori bilgisini al
      const category = Object.values(categories).find(
        (cat) => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
      );

      if (!category) {
        console.error(`Kategori bulunamadı: ${categoryName}`);
        return;
      }

      // Artis kategorisi kontrolü
      const isArtisCategory = category?.priceFormat === "artis";
      console.log(`Kategori artis mi: ${isArtisCategory}`);

      // ProductCollectionId'yi kontrol et
      const productId = productToDelete.productCollectionId;
      console.log(`productId: ${productId}, productToDelete:`, productToDelete);

      // Ürün bilgilerini products veya localOrderData'dan al
      const productFromDB =
        productId && productId !== "istemiyorum"
          ? products[categoryName]?.[productId]
          : null;

      // Mevcut ürünün boyutlarını al
      const currentWidth = Number(
        productFromDB?.width || productToDelete?.width || 0
      );
      const currentHeight = Number(
        productFromDB?.height || productToDelete?.height || 0
      );

      // Mevcut konti boyutları
      const currentKontiWidth = Number(dimensions.kontiWidth || 0);
      const currentKontiHeight = Number(dimensions.kontiHeight || 0);

      console.log("Mevcut boyutlar:", {
        ürünBilgileri: productToDelete,
        ürünBoyutları: { width: currentWidth, height: currentHeight },
        kontiBoyutları: {
          width: currentKontiWidth,
          height: currentKontiHeight,
        },
        dbÜrün: productFromDB,
      });

      // Artis kategorisinde ve EN veya BOY kategorisi ise boyutları güncelle
      if (isArtisCategory) {
        let updatedWidth = currentKontiWidth;
        let updatedHeight = currentKontiHeight;

        if (categoryName.toLowerCase().includes("en")) {
          // Ürünün gerçek genişliğini kullan, 0 ise değişiklik yapma
          if (currentWidth > 0) {
            updatedWidth = Math.max(0, currentKontiWidth - currentWidth);
            console.log(
              `En ürünü siliniyor: Konti genişliği ${currentKontiWidth} -> ${updatedWidth} olarak güncelleniyor`
            );
          } else {
            console.log(
              `En ürünü siliniyor: Ürün genişliği 0, boyut değiştirilmedi`
            );
          }
        } else if (categoryName.toLowerCase().includes("boy")) {
          // Ürünün gerçek yüksekliğini kullan, 0 ise değişiklik yapma
          if (currentHeight > 0) {
            updatedHeight = Math.max(0, currentKontiHeight - currentHeight);
            console.log(
              `Boy ürünü siliniyor: Konti yüksekliği ${currentKontiHeight} -> ${updatedHeight} olarak güncelleniyor`
            );
          } else {
            console.log(
              `Boy ürünü siliniyor: Ürün yüksekliği 0, boyut değiştirilmedi`
            );
          }
        }

        // Boyutlar güncellendi mi kontrol et
        const dimensionsChanged =
          updatedWidth !== currentKontiWidth ||
          updatedHeight !== currentKontiHeight;

        console.log("Boyutlar güncelleniyor:", {
          kontiWidth: updatedWidth,
          kontiHeight: updatedHeight,
          değişiklikVar: dimensionsChanged,
        });

        // Boyutları güncelle
        setDimensions((prev) => ({
          ...prev,
          kontiWidth: updatedWidth,
          kontiHeight: updatedHeight,
          anaWidth: updatedWidth,
          anaHeight: updatedHeight,
        }));

        // LocalOrderData içindeki dimensions bilgisini de güncelle
        setLocalOrderData((prev) => {
          const newData = { ...prev };

          // Mevcut ürünü kaldır
          const updatedCategory = { ...newData[categoryName] };
          delete updatedCategory[productIndex];

          // Kalan ürünleri yeniden indeksle
          const reindexed = {};
          Object.values(updatedCategory).forEach((item, index) => {
            reindexed[index] = item;
          });

          // Güncellenmiş veriyi döndür
          const updatedData = {
            ...newData,
            dimensions: {
              ...newData.dimensions,
              kontiWidth: updatedWidth,
              kontiHeight: updatedHeight,
              anaWidth: updatedWidth,
              anaHeight: updatedHeight,
            },
            [categoryName]: reindexed,
          };

          // Sadece boyutlar değiştiyse fiyatları yeniden hesapla
          if (dimensionsChanged) {
            console.log("Fiyat hesaplama zamanlanıyor...");
            setTimeout(() => {
              console.log("Fiyat hesaplama başlıyor...");
              recalculateArtisProductPrices(
                updatedData,
                updatedWidth,
                updatedHeight
              );
            }, 150);
          }

          return updatedData;
        });
      } else {
        // Artis kategorisi değilse sadece ürünü sil
        setLocalOrderData((prev) => {
          const newData = { ...prev };
          const updatedCategory = { ...newData[categoryName] };
          delete updatedCategory[productIndex];

          // Kalan ürünleri yeniden indeksle
          const reindexed = {};
          Object.values(updatedCategory).forEach((item, index) => {
            reindexed[index] = item;
          });

          newData[categoryName] = reindexed;
          return newData;
        });
      }
    },
    [
      localOrderData,
      categories,
      dimensions,
      setDimensions,
      setLocalOrderData,
      recalculateArtisProductPrices,
    ]
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
  setShouldRecalcPrices: PropTypes.func,
};

export default OrderDetails;
