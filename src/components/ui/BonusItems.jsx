import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { calculatePrice } from "../../utils/priceCalculator";
import { useDimensionsStore } from "../../store/dimensionsStore";

const BonusItems = ({
  categories,
  products,
  savedItems,
  setSavedItems,
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

  // UI state
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    category: "",
    product: "",
    productId: "",
    price: "",
    custom: false,
    name: "",
  });

  // Referanslar
  const isUpdating = useRef(false);
  const initializedRef = useRef(false);
  const lastDimensions = useRef({ kontiWidth, kontiHeight });
  const deletedItems = useRef([]);

  // Memoized dimensions
  const dimensions = useMemo(
    () => ({
      kontiWidth,
      kontiHeight,
      anaWidth,
      anaHeight,
    }),
    [kontiWidth, kontiHeight, anaWidth, anaHeight]
  );

  // Ürün bilgilerini al (ID ile)
  const getProductData = useCallback(
    (categoryName, productId) => {
      if (!categoryName || !productId || !products[categoryName]) return null;
      return products[categoryName][productId] || null;
    },
    [products]
  );

  // Kategori bilgisini al (isim ile)
  const getCategoryData = useCallback(
    (categoryName) => {
      if (!categoryName) return null;
      return Object.values(categories).find(
        (cat) => cat.propertyName?.toLowerCase() === categoryName?.toLowerCase()
      );
    },
    [categories]
  );

  // Artis kategorisindeki öğeler için fiyat hesaplama - ÖNEMLİ YENİ FONKSİYON
  const calculateArtisPrice = useCallback(
    (item, useCurrentDimensions = false) => {
      const categoryName = item.category;
      const productId = item.productId;
      const category = getCategoryData(categoryName);

      // Artis kategorisi değilse veya kategori/ürün yoksa hesaplama
      if (
        !category ||
        category.priceFormat !== "artis" ||
        !productId ||
        productId === "istemiyorum"
      ) {
        return null;
      }

      const productData = getProductData(categoryName, productId);
      if (!productData) return null;

      const basePrice = Number(productData.price || 0);
      const productWidth = Number(productData.width || 0);
      const productHeight = Number(productData.height || 0);

      // Kullanılacak boyutları belirle
      // useCurrentDimensions true ise mevcut boyutları,
      // false ise ürünün original boyutlarını kullan
      const dimensionsToUse = useCurrentDimensions
        ? { kontiWidth, kontiHeight }
        : item.originalDimensions || { kontiWidth, kontiHeight };

      let calculatedPrice = 0;
      const isEnItem = categoryName.toLowerCase().includes("en");
      const isBoyItem = categoryName.toLowerCase().includes("boy");

      if (isEnItem) {
        // En için: height * productWidth * basePrice
        calculatedPrice =
          dimensionsToUse.kontiHeight * productWidth * basePrice;
        console.log(
          `En ürünü "${item.product}" için fiyat hesaplanıyor (${
            useCurrentDimensions ? "güncel" : "orijinal"
          } boyut): ` +
            `Height=${dimensionsToUse.kontiHeight}, Width=${productWidth}, Fiyat=${calculatedPrice}`
        );
      } else if (isBoyItem) {
        // Boy için: width * productHeight * basePrice
        calculatedPrice =
          dimensionsToUse.kontiWidth * productHeight * basePrice;
        console.log(
          `Boy ürünü "${item.product}" için fiyat hesaplanıyor (${
            useCurrentDimensions ? "güncel" : "orijinal"
          } boyut): ` +
            `Width=${dimensionsToUse.kontiWidth}, Height=${productHeight}, Fiyat=${calculatedPrice}`
        );
      }

      return calculatedPrice;
    },
    [getCategoryData, getProductData, kontiWidth, kontiHeight]
  );

  // Dinamik fiyatları hesapla - tüm formatlar için
  const recalculateAllDynamicPrices = useCallback(() => {
    if (isUpdating.current || !savedItems.length) return;
    isUpdating.current = true;

    try {
      const updatedItems = [...savedItems];
      let hasChanges = false;

      // Desteklenen tüm dinamik fiyat formatları (artis HARİÇ)
      const dynamicPriceFormats = ["tasDuvar", "onYuzey", "cevre", "metrekare"];

      // Her öğeyi kontrol et
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId || item.productId === "istemiyorum")
          continue;

        const categoryName = item.category;
        const category = getCategoryData(categoryName);
        if (!category) continue;

        const priceFormat = category.priceFormat;

        // Artis kategorisi için farklı işlem yapacağız, burada atla
        if (priceFormat === "artis") continue;

        // Dinamik olmayan fiyat formatlarını atla
        if (!dynamicPriceFormats.includes(priceFormat)) continue;

        const productData = getProductData(categoryName, item.productId);
        if (!productData) continue;

        // Fiyat hesapla
        let newPrice = 0;
        const basePrice = Number(productData.price || 0);
        const alanPrice = Number(productData.alanPrice || 0);

        switch (priceFormat) {
          case "tasDuvar": {
            const area = kontiWidth * kontiHeight;
            const perimeter = 2 * (kontiWidth + kontiHeight);
            newPrice = area * alanPrice + perimeter * basePrice;
            break;
          }
          case "onYuzey":
            newPrice = kontiHeight * basePrice;
            break;
          case "cevre":
            newPrice = (kontiWidth + kontiHeight) * 2 * basePrice;
            break;
          case "metrekare":
            newPrice = kontiWidth * kontiHeight * basePrice;
            break;
          default:
            newPrice = item.price;
        }

        // Fiyat değiştiyse güncelle
        if (Math.abs(newPrice - item.price) > 0.1) {
          updatedItems[i] = { ...item, price: newPrice };
          hasChanges = true;
        }
      }

      // Değişiklik varsa state'i güncelle
      if (hasChanges) {
        setSavedItems(updatedItems);
      }
    } catch (error) {
      console.error("Dinamik fiyat hesaplaması sırasında hata:", error);
    } finally {
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    savedItems,
    getCategoryData,
    getProductData,
    kontiWidth,
    kontiHeight,
    setSavedItems,
  ]);

  // Sadece artis ürünlerin fiyatlarını hesapla
  const recalculateArtisItems = useCallback(
    (syncWithOrderDetails = false) => {
      if (isUpdating.current || !savedItems.length) return;
      isUpdating.current = true;

      try {
        console.log(
          `Artis ürünlerin fiyatları hesaplanıyor (OrderDetails sync: ${syncWithOrderDetails})`
        );

        setSavedItems((prevItems) => {
          const updatedItems = [...prevItems];
          let hasChanges = false;

          for (let i = 0; i < updatedItems.length; i++) {
            const item = updatedItems[i];
            if (
              item.custom ||
              !item.productId ||
              item.productId === "istemiyorum"
            )
              continue;

            const categoryName = item.category;
            const category = getCategoryData(categoryName);

            // Sadece artis kategorisindeki ürünleri hesapla
            if (!category || category.priceFormat !== "artis") continue;

            // OrderDetails ile senkronizasyon istendiyse güncel boyutları kullan,
            // aksi halde ürünün orijinal boyutlarını kullan
            const newPrice = calculateArtisPrice(item, syncWithOrderDetails);

            if (newPrice !== null && Math.abs(newPrice - item.price) > 0.1) {
              updatedItems[i] = {
                ...item,
                price: newPrice,
                // OrderDetails ile senkronizasyon istendiyse originalDimensions'ı güncelle
                ...(syncWithOrderDetails
                  ? {
                      originalDimensions: {
                        kontiWidth,
                        kontiHeight,
                      },
                    }
                  : {}),
              };
              hasChanges = true;
            }
          }

          return hasChanges ? updatedItems : prevItems;
        });
      } catch (error) {
        console.error("Artis fiyat hesaplaması sırasında hata:", error);
      } finally {
        setTimeout(() => {
          isUpdating.current = false;
        }, 100);
      }
    },
    [
      savedItems,
      getCategoryData,
      calculateArtisPrice,
      kontiWidth,
      kontiHeight,
      setSavedItems,
    ]
  );

  // Konti boyutlarını güncelleme (artis ürünleri için)
  const updateKontiDimensions = useCallback(
    (item, action = "add") => {
      if (
        !item ||
        !item.productId ||
        item.custom ||
        item.productId === "istemiyorum"
      )
        return;

      const categoryName = item.category;
      const category = getCategoryData(categoryName);

      // Sadece artis kategorisi için boyutları güncelle
      if (category?.priceFormat !== "artis") return;

      const productData = getProductData(categoryName, item.productId);
      if (!productData) return;

      const productWidth = Number(productData.width || 0);
      const productHeight = Number(productData.height || 0);
      const currentWidth = Number(dimensions.kontiWidth || 0);
      const currentHeight = Number(dimensions.kontiHeight || 0);

      let newWidth = currentWidth;
      let newHeight = currentHeight;
      let dimensionChanged = false;

      // En kategorisi ise genişliği ayarla
      if (categoryName.toLowerCase().includes("en")) {
        newWidth =
          action === "add"
            ? currentWidth + productWidth
            : Math.max(0, currentWidth - productWidth);

        if (newWidth > 0 && Math.abs(newWidth - currentWidth) > 0.01) {
          dimensionChanged = true;
        }
      }
      // Boy kategorisi ise yüksekliği ayarla
      else if (categoryName.toLowerCase().includes("boy")) {
        newHeight =
          action === "add"
            ? currentHeight + productHeight
            : Math.max(0, currentHeight - productHeight);

        if (newHeight > 0 && Math.abs(newHeight - currentHeight) > 0.01) {
          dimensionChanged = true;
        }
      }

      // Boyutlar değiştiyse store'u güncelle
      if (dimensionChanged) {
        console.log(
          `Konti boyutları güncelleniyor (${action}): ${currentWidth}x${currentHeight} -> ${newWidth}x${newHeight}`
        );

        initializeDimensions({
          kontiWidth: newWidth,
          kontiHeight: newHeight,
          anaWidth: newWidth,
          anaHeight: newHeight,
        });

        // İşlem ekleme ise fiyat hesaplama tetiklemeye gerek yok,
        // çünkü ürün zaten doğru fiyatla eklenecek
        if (action === "remove") {
          setShouldRecalcPrices(true);
          setTimeout(() => setShouldRecalcPrices(false), 100);
        }
      }
    },
    [
      getCategoryData,
      getProductData,
      dimensions,
      initializeDimensions,
      setShouldRecalcPrices,
    ]
  );

  // Yeni öğe ekle
  const handleAddItem = useCallback(() => {
    // Doğrulama kontrolü
    if (
      (newItem.custom && !newItem.name) ||
      !newItem.category ||
      (!newItem.price && newItem.price !== 0)
    ) {
      return; // Validasyon başarısız
    }

    // Ekleme öncesi mevcut boyutları kaydet
    const currentDimensions = {
      kontiWidth: dimensions.kontiWidth,
      kontiHeight: dimensions.kontiHeight,
    };

    const itemToAdd = {
      id: Date.now().toString(),
      category: newItem.category,
      product: newItem.custom ? newItem.name : newItem.product,
      productId: newItem.custom ? null : newItem.productId,
      price: Number(newItem.price),
      custom: newItem.custom,
      originalDimensions: currentDimensions, // Ekleme anındaki boyutları sakla
      addedAt: Date.now(), // Sıralama için ekleme zamanı
    };

    console.log("Eklenen ürün:", itemToAdd);

    // Artis kategorilerinde boyutları güncelle
    if (
      !newItem.custom &&
      newItem.productId &&
      newItem.productId !== "istemiyorum"
    ) {
      const category = getCategoryData(newItem.category);
      if (category?.priceFormat === "artis") {
        updateKontiDimensions(itemToAdd, "add");
      }
    }

    // Ürünü listeye ekle
    setSavedItems((prev) => [...prev, itemToAdd]);

    // Formu sıfırla
    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
    });
    setAdding(false);
  }, [
    newItem,
    dimensions,
    updateKontiDimensions,
    setSavedItems,
    getCategoryData,
  ]);

  // Ürün sil
  // handleDeleteItem fonksiyonunu tamamen güncelleyelim

  const handleDeleteItem = useCallback(
    (index) => {
      const itemToDelete = savedItems[index];
      if (!itemToDelete) return;

      const itemId = itemToDelete.id;

      // Artis kategorisindeki ürünler için özel işlem
      if (
        !itemToDelete.custom &&
        itemToDelete.productId &&
        itemToDelete.productId !== "istemiyorum"
      ) {
        const categoryName = itemToDelete.category;
        const category = getCategoryData(categoryName);

        // Sadece artis kategorisi için özel işlem yapıyoruz
        if (category?.priceFormat === "artis") {
          console.log("Artis kategorili ürün siliniyor:", itemToDelete);

          // Boyut değişikliği öncesi mevcut boyutları kaydet
          const originalWidth = dimensions.kontiWidth;
          const originalHeight = dimensions.kontiHeight;

          // Önce boyutları güncelle
          updateKontiDimensions(itemToDelete, "remove");

          // Öğeyi listeden çıkar
          setSavedItems((prev) => {
            const updatedItems = prev.filter((_, i) => i !== index);
            return updatedItems;
          });

          // Silinen öğenin ID'sini kaydet
          if (!deletedItems.current.includes(itemId)) {
            deletedItems.current.push(itemId);
          }

          // Silinen ürünün türüne göre hangi boyut değişti?
          const isWidthChanged = itemToDelete.category
            .toLowerCase()
            .includes("en");
          const isHeightChanged = itemToDelete.category
            .toLowerCase()
            .includes("boy");

          // Gecikmeyle kalan artis ürünlerinin fiyatlarını yeniden hesapla
          setTimeout(() => {
            console.log("Artis ürün silme sonrası fiyat güncelleme başlıyor");

            // Son boyutları al
            const newWidth = dimensions.kontiWidth;
            const newHeight = dimensions.kontiHeight;
            console.log(
              `Boyut değişimi: ${originalWidth}x${originalHeight} -> ${newWidth}x${newHeight}`
            );

            // Kalan artis ürünlerinin fiyatlarını güncelle
            setSavedItems((prevItems) => {
              const items = [...prevItems];
              let hasChanges = false;

              // Her bir ürünü kontrol et
              for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Sadece artis kategorisindeki ürünleri güncelle
                if (
                  !item.custom &&
                  item.productId &&
                  item.productId !== "istemiyorum"
                ) {
                  const itemCategoryName = item.category;
                  const itemCategory = getCategoryData(itemCategoryName);

                  if (itemCategory?.priceFormat === "artis") {
                    const isItemEn = itemCategoryName
                      .toLowerCase()
                      .includes("en");
                    const isItemBoy = itemCategoryName
                      .toLowerCase()
                      .includes("boy");

                    const productData = getProductData(
                      itemCategoryName,
                      item.productId
                    );
                    if (productData) {
                      const basePrice = Number(productData.price || 0);
                      const productWidth = Number(productData.width || 0);
                      const productHeight = Number(productData.height || 0);

                      let newPrice = item.price;

                      // En ürünlerinin fiyatını yükseklik değiştiyse güncelle
                      if (isItemEn && isHeightChanged) {
                        // En ürünleri boy değişiminden etkilenir
                        newPrice = newHeight * productWidth * basePrice;
                        console.log(
                          `En ürünü "${item.product}" boy değişiminden sonra güncelleniyor: ` +
                            `Yeni yükseklik=${newHeight}, Width=${productWidth}, Fiyat=${newPrice}`
                        );
                      }
                      // Boy ürünlerinin fiyatını genişlik değiştiyse güncelle
                      else if (isItemBoy && isWidthChanged) {
                        // Boy ürünleri en değişiminden etkilenir
                        newPrice = newWidth * productHeight * basePrice;
                        console.log(
                          `Boy ürünü "${item.product}" en değişiminden sonra güncelleniyor: ` +
                            `Yeni genişlik=${newWidth}, Height=${productHeight}, Fiyat=${newPrice}`
                        );
                      }

                      // Fiyat değiştiyse güncelle
                      if (Math.abs(newPrice - item.price) > 0.1) {
                        items[i] = {
                          ...item,
                          price: newPrice,
                          // Ürünün originalDimensions'ını güncelleme - bu kritik nokta
                        };
                        hasChanges = true;
                      }
                    }
                  }
                }
              }

              return hasChanges ? items : prevItems;
            });
          }, 300); // Boyut değişiminin tamamlanması için yeterli gecikme

          return;
        }
      }

      // Artis kategorisinde olmayan ürünler için normal silme işlemi
      setSavedItems((prev) => prev.filter((_, i) => i !== index));

      // Silinen öğenin ID'sini kaydet
      if (!deletedItems.current.includes(itemId)) {
        deletedItems.current.push(itemId);
      }
    },
    [
      savedItems,
      dimensions,
      getCategoryData,
      getProductData,
      updateKontiDimensions,
      setSavedItems,
    ]
  );
  // Ürün düzenle
  const handleEditItem = useCallback((item, index) => {
    setEditingItem(index);
    setNewItem({
      category: item.category,
      product: item.product,
      productId: item.productId,
      price: item.price.toString(),
      custom: item.custom,
      name: item.custom ? item.product : "",
    });
  }, []);

  // Düzenlenmiş öğeyi kaydet
  const handleSaveEdit = useCallback(() => {
    if (editingItem === null) return;

    // Doğrulama kontrolü
    if (
      (newItem.custom && !newItem.name) ||
      !newItem.category ||
      (!newItem.price && newItem.price !== 0)
    ) {
      return; // Validasyon başarısız
    }

    // Orijinal öğeyi al
    const originalItem = savedItems[editingItem];

    // Kategori veya ürün değişti mi kontrol et
    const categoryChanged = originalItem.category !== newItem.category;
    const productChanged = originalItem.productId !== newItem.productId;

    // Güncellenmiş öğeyi oluştur - originalDimensions'ı koru
    const updatedItem = {
      ...originalItem,
      category: newItem.category,
      product: newItem.custom ? newItem.name : newItem.product,
      productId: newItem.custom ? null : newItem.productId,
      price: Number(newItem.price),
      custom: newItem.custom,
    };

    // Artis kategorilerinde boyut değişimlerini uygula
    if (categoryChanged || productChanged) {
      // Eski ürünün etkisini kaldır (Artis ise)
      if (originalItem.productId && !originalItem.custom) {
        const originalCategory = getCategoryData(originalItem.category);
        if (originalCategory?.priceFormat === "artis") {
          updateKontiDimensions(originalItem, "remove");
        }
      }

      // Yeni ürünün etkisini ekle (Artis ise)
      if (updatedItem.productId && !updatedItem.custom) {
        const newCategory = getCategoryData(updatedItem.category);
        if (newCategory?.priceFormat === "artis") {
          // Güncel boyutlarda bir ürün ekleniyor gibi düşün
          updatedItem.originalDimensions = {
            kontiWidth: dimensions.kontiWidth,
            kontiHeight: dimensions.kontiHeight,
          };
          updateKontiDimensions(updatedItem, "add");
        }
      }
    }

    // Listeyi güncelle
    setSavedItems((prev) => {
      const updated = [...prev];
      updated[editingItem] = updatedItem;
      return updated;
    });

    // Formu sıfırla
    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
    });
    setEditingItem(null);
  }, [
    editingItem,
    newItem,
    savedItems,
    dimensions,
    getCategoryData,
    updateKontiDimensions,
    setSavedItems,
  ]);

  // Ekleme iptal
  const handleCancelAdd = useCallback(() => {
    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
    });
    setAdding(false);
  }, []);

  // Kategori değişimi
  const handleCategoryChange = useCallback((e) => {
    const categoryName = e.target.value;
    setNewItem((prev) => ({
      ...prev,
      category: categoryName,
      product: "",
      productId: "",
      price: "",
      name: "",
    }));
  }, []);

  // Ürün değişimi
  const handleProductChange = useCallback(
    (e) => {
      const value = e.target.value;

      if (value === "custom") {
        setNewItem((prev) => ({
          ...prev,
          product: "",
          productId: "",
          price: "",
          custom: true,
          name: "",
        }));
        return;
      }

      if (!value) {
        setNewItem((prev) => ({
          ...prev,
          product: "",
          productId: "",
          price: "",
          custom: false,
          name: "",
        }));
        return;
      }

      try {
        const selectedProduct = JSON.parse(value);
        const categoryName = newItem.category;

        // İstemiyorum seçildiyse
        if (selectedProduct.id === "istemiyorum") {
          setNewItem((prev) => ({
            ...prev,
            product: "İstemiyorum",
            productId: "istemiyorum",
            price: 0,
            custom: false,
            name: "İstemiyorum",
          }));
          return;
        }

        // Kategori bilgilerini al
        const category = getCategoryData(categoryName);
        const productData = getProductData(categoryName, selectedProduct.id);

        if (category && productData) {
          let calculatedPrice = selectedProduct.price;

          // Dinamik fiyat hesaplama
          if (category.priceFormat === "metrekare") {
            calculatedPrice =
              kontiWidth * kontiHeight * Number(productData.price || 0);
          } else if (category.priceFormat === "cevre") {
            const perimeter = 2 * (kontiWidth + kontiHeight);
            calculatedPrice = perimeter * Number(productData.price || 0);
          } else if (category.priceFormat === "onYuzey") {
            calculatedPrice = kontiHeight * Number(productData.price || 0);
          } else if (category.priceFormat === "tasDuvar") {
            const area = kontiWidth * kontiHeight;
            const perimeter = 2 * (kontiWidth + kontiHeight);
            calculatedPrice =
              area * Number(productData.alanPrice || 0) +
              perimeter * Number(productData.price || 0);
          } else if (category.priceFormat === "artis") {
            // Artis için özel hesaplama
            if (categoryName.toLowerCase().includes("en")) {
              const productWidth = Number(productData.width || 0);
              calculatedPrice =
                kontiHeight * productWidth * Number(productData.price || 0);
            } else if (categoryName.toLowerCase().includes("boy")) {
              const productHeight = Number(productData.height || 0);
              calculatedPrice =
                kontiWidth * productHeight * Number(productData.price || 0);
            }
          }

          setNewItem((prev) => ({
            ...prev,
            product: selectedProduct.name,
            productId: selectedProduct.id,
            price: calculatedPrice,
            custom: false,
            name: selectedProduct.name,
          }));
        } else {
          // Kategori veya ürün bulunamazsa
          setNewItem((prev) => ({
            ...prev,
            product: selectedProduct.name,
            productId: selectedProduct.id,
            price: Number(selectedProduct.price),
            custom: false,
            name: selectedProduct.name,
          }));
        }
      } catch (error) {
        console.error("Ürün seçimi hatası:", error);
      }
    },
    [newItem.category, getCategoryData, getProductData, kontiWidth, kontiHeight]
  );

  // Fiyat değişimi
  const handlePriceChange = useCallback((e) => {
    setNewItem((prev) => ({
      ...prev,
      price: e.target.value,
    }));
  }, []);

  // Özel isim değişimi
  const handleNameChange = useCallback((e) => {
    setNewItem((prev) => ({
      ...prev,
      name: e.target.value,
    }));
  }, []);

  // Kategoriler için dropdown seçenekleri
  const categoryOptions = useMemo(() => {
    return Object.values(categories)
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .map((category) => ({
        value: category.propertyName,
        label: category.title || category.propertyName,
      }));
  }, [categories]);

  // Seçili kategoriye göre ürün seçenekleri
  const productOptions = useMemo(() => {
    const categoryName = newItem.category;
    if (!categoryName || !products[categoryName]) return [];

    const options = Object.entries(products[categoryName])
      .map(([id, product]) => ({
        id,
        name: product.title || product.name,
        price: product.price,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // İstemiyorum seçeneğini ekle
    if (options.length > 0) {
      options.unshift({
        id: "istemiyorum",
        name: "İstemiyorum",
        price: 0,
      });
    }

    return options;
  }, [newItem.category, products]);

  // EFFECT HOOKS - İŞLEVSEL OLARAK GÜNCELLENDİ

  // 1. İlk yüklemede boyutları ayarla
  useEffect(() => {
    if (!initializedRef.current && savedItems.length > 0) {
      // İlk yüklemede mevcut boyutları kaydet
      lastDimensions.current = { kontiWidth, kontiHeight };
      initializedRef.current = true;
    }
  }, [kontiWidth, kontiHeight, savedItems]);

  // 2. OrderDetails'dan gelen boyut değişikliklerini izle (shouldRecalc prop'u)
  useEffect(() => {
    if (shouldRecalc && savedItems.length > 0 && !isUpdating.current) {
      console.log(
        "OrderDetails'dan boyut değişikliği sinyali alındı. Fiyatlar güncelleniyor..."
      );

      // İlk önce artis olmayan dinamik ürünler hesaplanır
      recalculateAllDynamicPrices();

      // Sonra OrderDetails ile senkronize olarak artis ürünleri hesaplanır
      setTimeout(() => {
        recalculateArtisItems(true); // OrderDetails ile senkronize
      }, 100);
    }
  }, [
    shouldRecalc,
    savedItems,
    recalculateAllDynamicPrices,
    recalculateArtisItems,
  ]);

  // 3. Zustand store'daki değişiklikleri izle
  useEffect(() => {
    if (needsRecalculation && savedItems.length > 0 && !isUpdating.current) {
      console.log("Dimension store'dan recalculation sinyali alındı");
      recalculateAllDynamicPrices();
      resetRecalculationFlag();
    }
  }, [
    needsRecalculation,
    savedItems,
    recalculateAllDynamicPrices,
    resetRecalculationFlag,
  ]);

  return (
    <div className="space-y-3">
      {/* Öğe Listesi */}
      {savedItems.length > 0 && (
        <div className="grid grid-cols-1 space-y-0.5">
          {savedItems.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-gray-800/30 rounded overflow-hidden"
            >
              <div className="divide-y divide-gray-700/30">
                <div className="hover:bg-gray-700/20 transition-colors duration-150">
                  <div className="grid grid-cols-[2fr,2fr,1fr,auto] items-center px-2 py-1.5 gap-1">
                    {editingItem === index ? (
                      <>
                        <div>
                          <select
                            value={newItem.category}
                            onChange={handleCategoryChange}
                            className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                            style={{ WebkitFontSmoothing: "antialiased" }}
                          >
                            <option value="">Kategori Seçin</option>
                            {categoryOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          {newItem.custom ? (
                            <input
                              type="text"
                              value={newItem.name}
                              onChange={handleNameChange}
                              placeholder="Ürün adı"
                              className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                              style={{ WebkitFontSmoothing: "antialiased" }}
                            />
                          ) : (
                            <select
                              value={
                                newItem.productId
                                  ? JSON.stringify({
                                      id: newItem.productId,
                                      name: newItem.product,
                                      price: newItem.price,
                                    })
                                  : ""
                              }
                              onChange={handleProductChange}
                              className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                              style={{ WebkitFontSmoothing: "antialiased" }}
                            >
                              <option value="">Ürün Seçin</option>
                              {productOptions.map((product) => (
                                <option
                                  key={product.id}
                                  value={JSON.stringify({
                                    id: product.id,
                                    name: product.name,
                                    price: product.price,
                                  })}
                                >
                                  {product.name} -{" "}
                                  {Number(product.price).toLocaleString(
                                    "tr-TR"
                                  )}
                                  ₺
                                </option>
                              ))}
                              <option value="custom">Diğer</option>
                            </select>
                          )}
                        </div>

                        <input
                          type="number"
                          value={newItem.price}
                          onChange={handlePriceChange}
                          placeholder="Fiyat"
                          className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-green-500/50 outline-none w-full transition-all duration-200"
                          style={{ WebkitFontSmoothing: "antialiased" }}
                        />

                        <div className="flex gap-1">
                          <button
                            onClick={handleSaveEdit}
                            className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded p-1 transition-colors duration-150"
                            title="Kaydet"
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
                          <button
                            onClick={() => setEditingItem(null)}
                            className="text-gray-400 hover:text-gray-300 bg-gray-500/10 hover:bg-gray-500/20 rounded p-1 transition-colors duration-150"
                            title="İptal"
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
                                d="M6 18L18 6M6 6l12 12"
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
                          {categoryOptions.find(
                            (c) => c.value === item.category
                          )?.label || item.category}
                        </span>
                        <span
                          className="text-gray-300 text-[0.75rem] truncate cursor-pointer hover:text-indigo-300 transition-colors duration-150"
                          onClick={() => handleEditItem(item, index)}
                          style={{
                            textRendering: "optimizeLegibility",
                            WebkitFontSmoothing: "antialiased",
                          }}
                        >
                          {item.product}
                        </span>
                        <span
                          className="text-green-400 text-[0.75rem] cursor-pointer hover:text-green-300 transition-colors duration-150"
                          onClick={() => handleEditItem(item, index)}
                          style={{
                            textRendering: "optimizeLegibility",
                            WebkitFontSmoothing: "antialiased",
                          }}
                        >
                          {Number(item.price)?.toLocaleString("tr-TR")}₺
                        </span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteItem(index)}
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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Yeni Öğe Ekleme Formu */}
      {adding ? (
        <div className="bg-gray-800/30 rounded p-3 border border-gray-700/30">
          <div className="grid grid-cols-[2fr,2fr,1fr,auto] items-center gap-2">
            <div>
              <select
                value={newItem.category}
                onChange={handleCategoryChange}
                className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                style={{ WebkitFontSmoothing: "antialiased" }}
              >
                <option value="">Kategori Seçin</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              {newItem.custom ? (
                <input
                  type="text"
                  value={newItem.name}
                  onChange={handleNameChange}
                  placeholder="Ürün adı"
                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                  style={{ WebkitFontSmoothing: "antialiased" }}
                />
              ) : (
                <select
                  value={
                    newItem.productId
                      ? JSON.stringify({
                          id: newItem.productId,
                          name: newItem.product,
                          price: newItem.price,
                        })
                      : ""
                  }
                  onChange={handleProductChange}
                  disabled={!newItem.category}
                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitFontSmoothing: "antialiased" }}
                >
                  <option value="">Ürün Seçin</option>
                  {productOptions.map((product) => (
                    <option
                      key={product.id}
                      value={JSON.stringify({
                        id: product.id,
                        name: product.name,
                        price: product.price,
                      })}
                    >
                      {product.name} -{" "}
                      {Number(product.price).toLocaleString("tr-TR")}₺
                    </option>
                  ))}
                  <option value="custom">Diğer</option>
                </select>
              )}
            </div>

            <div>
              <input
                type="number"
                value={newItem.price}
                onChange={handlePriceChange}
                placeholder="Fiyat"
                className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-green-500/50 outline-none w-full transition-all duration-200"
                style={{ WebkitFontSmoothing: "antialiased" }}
              />
            </div>

            <div className="flex gap-1">
              <button
                onClick={handleAddItem}
                className="text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded p-1 transition-colors duration-150"
                title="Ekle"
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
              <button
                onClick={handleCancelAdd}
                className="text-gray-400 hover:text-gray-300 bg-gray-500/10 hover:bg-gray-500/20 rounded p-1 transition-colors duration-150"
                title="İptal"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {savedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 px-3 bg-gray-800/20 rounded-lg border border-gray-700/30">
              <p className="text-gray-400 text-sm">
                Henüz bonus ürün eklenmemiş
              </p>
              <button
                onClick={() => setAdding(true)}
                className="mt-2 flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 py-1.5 px-3 rounded-md transition-all duration-200"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  shapeRendering="geometricPrecision"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-xs font-medium">Bonus Ürün Ekle</span>
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={() => setAdding(true)}
                className="flex items-center justify-center gap-2 text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 py-2 px-3 rounded-lg transition-all duration-200"
                title="Bonus Ürün Ekle"
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
                    strokeWidth="1.5"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                <span className="text-xs font-medium">Bonus Ürün Ekle</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

BonusItems.propTypes = {
  categories: PropTypes.object.isRequired,
  products: PropTypes.object.isRequired,
  savedItems: PropTypes.array.isRequired,
  setSavedItems: PropTypes.func.isRequired,
  shouldRecalc: PropTypes.bool,
  setShouldRecalcPrices: PropTypes.func,
  skipInitialCalc: PropTypes.bool,
};

export default BonusItems;
