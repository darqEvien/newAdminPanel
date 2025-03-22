import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { useDimensionsStore } from "../../store/dimensionsStore";

const BonusItems = ({
  categories,
  products,
  localOrderData = {},
  localBonusData,
  setLocalBonusData,
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
    showInput: false, // Ürün seçiminde input gösterme kontrolü
    customCategory: false, // Kategori özel seçim kontrolü
    categoryName: "", // Özel kategori adı
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
    if (isUpdating.current || !localBonusData.length) return;
    isUpdating.current = true;

    try {
      const updatedItems = [...localBonusData];
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
        setLocalBonusData(updatedItems);
      }
    } catch (error) {
      console.error("Dinamik fiyat hesaplaması sırasında hata:", error);
    } finally {
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    localBonusData,
    getCategoryData,
    getProductData,
    kontiWidth,
    kontiHeight,
    setLocalBonusData,
  ]);

  // Sadece artis ürünlerin fiyatlarını hesapla
  const recalculateArtisItems = useCallback(
    (syncWithOrderDetails = false) => {
      if (isUpdating.current || !localBonusData.length) return;
      isUpdating.current = true;

      try {
        console.log(
          `Artis ürünlerin fiyatları hesaplanıyor (OrderDetails sync: ${syncWithOrderDetails})`
        );

        setLocalBonusData((prevItems) => {
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
      localBonusData,
      getCategoryData,
      calculateArtisPrice,
      kontiWidth,
      kontiHeight,
      setLocalBonusData,
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
      (newItem.customCategory && !newItem.categoryName) || // Özel kategori ama isim yok
      (!newItem.customCategory && !newItem.category) || // Özel değil ama kategori seçilmemiş
      (newItem.custom && !newItem.name) || // Özel ürün ama isim yok
      (!newItem.price && newItem.price !== 0) // Fiyat yok
    ) {
      return; // Validasyon başarısız
    }
    let finalPrice = newItem.price;
    // handleAddItem fonksiyonunda değişiklik yap - yaklaşık 411. satır
    try {
      if (
        typeof newItem.price === "string" &&
        (newItem.price.includes("*") ||
          newItem.price.includes("+") ||
          newItem.price.includes("-") ||
          newItem.price.includes("/"))
      ) {
        // Matematik ifadesini hesapla
        const calculatedValue = new Function(`return ${newItem.price}`)();

        if (!isNaN(calculatedValue)) {
          finalPrice = calculatedValue; // Negatif olmasına izin ver (Math.max(0, ...) kaldırıldı)
        }
      } else {
        finalPrice = parseFloat(newItem.price) || 0; // Burada da Math.max(0, ...) kaldırıldı
      }
    } catch (error) {
      finalPrice = 0; // Hata durumunda 0 olarak ayarla
    }

    // Ekleme öncesi mevcut boyutları kaydet
    const currentDimensions = {
      kontiWidth: dimensions.kontiWidth,
      kontiHeight: dimensions.kontiHeight,
    };

    const itemToAdd = {
      id: Date.now().toString(),
      category: newItem.customCategory
        ? newItem.categoryName
        : newItem.category,
      product:
        newItem.custom || newItem.customCategory
          ? newItem.name
          : newItem.product,
      productId:
        newItem.custom || newItem.customCategory ? null : newItem.productId,
      price: Number(finalPrice),
      custom: newItem.custom || newItem.customCategory, // Özel kategori veya özel ürün ise true
      customCategory: newItem.customCategory, // Özel kategori bilgisini de sakla
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
    setLocalBonusData((prev) => [...prev, itemToAdd]);

    // Formu sıfırla
    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
      showInput: false,
      customCategory: false,
      categoryName: "",
    });
    setAdding(false);
  }, [
    newItem,
    dimensions,
    updateKontiDimensions,
    setLocalBonusData,
    getCategoryData,
  ]);

  // handleDeleteItem fonksiyonunda ürünün doğru silindiğinden emin olmak için

  const handleDeleteItem = useCallback(
    (index) => {
      const itemToDelete = localBonusData[index];
      if (!itemToDelete) return;

      // İlk olarak öğeyi listeden kaldır (bunu en önce yapalım ki UI hemen güncellensin)
      setLocalBonusData((prev) => {
        const updatedItems = [...prev];
        updatedItems.splice(index, 1); // İndekse göre sil - filter yerine splice kullandım
        return updatedItems;
      });

      // Silinen öğenin ID'sini kaydet
      if (!deletedItems.current.includes(itemToDelete.id)) {
        deletedItems.current.push(itemToDelete.id);
      }

      // Artis kategorisi ise boyutları güncelle
      if (
        !itemToDelete.custom &&
        itemToDelete.productId &&
        itemToDelete.productId !== "istemiyorum"
      ) {
        const categoryName = itemToDelete.category;
        const category = getCategoryData(categoryName);

        if (category?.priceFormat === "artis") {
          console.log(`Artis kategorili ürün siliniyor:`, itemToDelete);

          // Boyutları güncelle
          updateKontiDimensions(itemToDelete, "remove");

          // Boyut güncellemesi sonrası fiyatları tekrar hesapla
          setTimeout(() => {
            // Store'dan güncel boyutları al
            const actualWidth = useDimensionsStore.getState().kontiWidth;
            const actualHeight = useDimensionsStore.getState().kontiHeight;

            console.log(`Güncel boyutlar: ${actualWidth}x${actualHeight}`);

            // OrderDetails ile senkronize et
            setShouldRecalcPrices(true);

            // Sıfırla
            setTimeout(() => {
              setShouldRecalcPrices(false);
            }, 300);
          }, 300);
        }
      }
    },
    [
      localBonusData,
      getCategoryData,
      updateKontiDimensions,
      setLocalBonusData,
      setShouldRecalcPrices,
    ]
  );

  // Ürün düzenle fonksiyonunu güncelle
  const handleEditItem = useCallback((item, index) => {
    setEditingItem(index);

    // Özel kategori veya özel ürün olsa bile dropdown menüleri göster
    setNewItem({
      // Özel kategori olsa bile kategori seçimine izin ver
      category: item.category, // Önceden: item.customCategory ? "" : item.category,
      product: item.product,
      productId: item.productId,
      price: item.price.toString(),
      // Özel ürün/kategori bilgisini ilk başta false yap, kullanıcı yeniden seçebilsin
      custom: false, // Önceden: item.custom || item.customCategory
      name: item.product,
      // Özel input alanlarını ilk başta gösterme
      showInput: false, // Önceden: item.custom || item.customCategory
      customCategory: false, // Önceden: !!item.customCategory
      categoryName: item.customCategory ? item.category : "",
      // Orijinal değerleri sakla
      originalCustomCategory: !!item.customCategory,
      originalCustom: !!item.custom,
    });
  }, []);

  // Düzenlenmiş öğeyi kaydet
  const handleSaveEdit = useCallback(() => {
    if (editingItem === null) return;

    // Doğrulama kontrolü
    if (
      (newItem.customCategory && !newItem.categoryName) ||
      (!newItem.customCategory && !newItem.category) ||
      (newItem.custom && !newItem.name) ||
      (!newItem.price && newItem.price !== 0)
    ) {
      return;
    }
    let finalPrice = newItem.price;
    try {
      if (
        typeof newItem.price === "string" &&
        (newItem.price.includes("*") ||
          newItem.price.includes("+") ||
          newItem.price.includes("-") ||
          newItem.price.includes("/"))
      ) {
        // Matematik ifadesini hesapla
        const calculatedValue = new Function(`return ${newItem.price}`)();

        if (!isNaN(calculatedValue)) {
          finalPrice = calculatedValue; // Negatif değere izin ver
        }
      } else {
        finalPrice = parseFloat(newItem.price) || 0; // Negatif değerlere izin ver
      }
    } catch (error) {
      finalPrice = 0; // Hata durumunda 0 olarak ayarla
    }
    // Orijinal öğeyi al
    const originalItem = localBonusData[editingItem];

    // Kategori veya ürün değişti mi kontrol et
    const categoryChanged = originalItem.category !== newItem.category;
    const productChanged = originalItem.productId !== newItem.productId;

    // Güncellenmiş öğeyi oluştur - originalDimensions'ı koru
    const updatedItem = {
      ...originalItem,
      category: newItem.customCategory
        ? newItem.categoryName
        : newItem.category,
      product:
        newItem.custom || newItem.customCategory
          ? newItem.name
          : newItem.product,
      productId:
        newItem.custom || newItem.customCategory ? null : newItem.productId,
      price: Number(finalPrice),
      custom: newItem.custom || newItem.customCategory,
      customCategory: newItem.customCategory,
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
    setLocalBonusData((prev) => {
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
    localBonusData,
    dimensions,
    getCategoryData,
    updateKontiDimensions,
    setLocalBonusData,
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
    const value = e.target.value;

    // Diğer seçeneği için
    if (value === "custom") {
      setNewItem((prev) => ({
        ...prev,
        category: "", // Kategoriyi temizle
        customCategory: true,
        categoryName: "",
        product: "",
        productId: "",
        price: "0", // Fiyatı sıfırla
        name: "",
        showInput: true, // Ürün input alanını göster
        custom: true, // Özel ürün olarak işaretle
      }));
      return;
    }

    // Normal kategori seçildiğinde
    setNewItem((prev) => ({
      ...prev,
      category: value,
      customCategory: false,
      categoryName: "",
      product: "",
      productId: "",
      price: "0", // Fiyatı sıfırla
      name: "",
      showInput: false,
      custom: false,
    }));
  }, []);
  // Özel kategori adı değişimi için
  const handleCategoryNameChange = useCallback((e) => {
    setNewItem((prev) => ({
      ...prev,
      categoryName: e.target.value,
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
          showInput: true, // Input göster
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
          showInput: false, // Input gizle
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
    const value = e.target.value;

    // Değeri direkt olarak kaydet, hesaplama kaydetme esnasında yapılacak
    setNewItem((prev) => ({
      ...prev,
      price: value,
    }));
  }, []);

  // Özel isim değişimi
  const handleNameChange = useCallback((e) => {
    setNewItem((prev) => ({
      ...prev,
      name: e.target.value,
    }));
  }, []);

  // categoryOptions useMemo fonksiyonunu güncelle:

  // categoryOptions useMemo fonksiyonunda title ve label kullanımını düzeltelim:

  const categoryOptions = useMemo(() => {
    // 1. OrderDetails'da bulunan en/boy kategorilerini kontrol et
    const existingEnBoyCategories = [];

    // OrderDetails'daki en/boy kategorileri
    Object.keys(localOrderData || {}).forEach((categoryName) => {
      if (
        categoryName.toLowerCase().includes("en") ||
        categoryName.toLowerCase().includes("boy")
      ) {
        // Bu kategoride en az bir aktif ürün var mı kontrol et
        const categoryProducts = localOrderData[categoryName];
        // "istemiyorum" dışında ürün varsa listeye ekle
        const hasActiveProduct = Object.values(categoryProducts || {}).some(
          (product) =>
            product &&
            product.productCollectionId &&
            product.productCollectionId !== "istemiyorum"
        );

        if (hasActiveProduct) {
          existingEnBoyCategories.push(categoryName.toLowerCase());
        }
      }
    });

    // 2. BonusItems'daki mevcut en/boy kategorilerini kontrol et
    const bonusEnBoyCategories = [];

    localBonusData.forEach((item) => {
      if (!item.custom && item.category) {
        const categoryName = item.category.toLowerCase();

        if (
          (categoryName.includes("en") || categoryName.includes("boy")) &&
          item.productId &&
          item.productId !== "istemiyorum"
        ) {
          // Aynı kategori var mı diye kontrol et
          if (!bonusEnBoyCategories.includes(categoryName)) {
            bonusEnBoyCategories.push(categoryName);
          }
        }
      }
    });

    // 3. Tüm mevcut kategorileri birleştir
    const allExistingCategories = [
      ...existingEnBoyCategories,
      ...bonusEnBoyCategories,
    ];
    console.log("Mevcut tüm En/Boy kategorileri:", allExistingCategories);

    // 4. Kullanılabilir kategorileri filtrele
    const availableCategories = Object.values(categories)
      .filter((category) => {
        const categoryName = category.propertyName?.toLowerCase();

        // Konti kategorisi ya da zaten var olan en/boy kategorilerini filtrele
        if (categoryName === "konti" && localOrderData["konti"]) {
          return false;
        }

        // Bu en/boy kategorisi zaten kullanılıyor mu?
        if (
          (categoryName.includes("en") || categoryName.includes("boy")) &&
          allExistingCategories.includes(categoryName)
        ) {
          return false;
        }

        return true;
      })
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .map((category) => ({
        value: category.propertyName,
        label: category.title || category.propertyName, // title öncelikli
      }));

    return availableCategories;
  }, [categories, localOrderData, localBonusData]);
  // productOptions useMemo fonksiyonunu güncelle:
  const productOptions = useMemo(() => {
    const categoryName = newItem.category;
    if (!categoryName || !products[categoryName]) return [];

    const options = Object.entries(products[categoryName])
      .map(([id, product]) => ({
        id,
        name: product.title || product.name, // title öncelikli
        price: product.price,
        order: product.order || 999, // order bilgisi eklendi
      }))
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)); // Önce order'a göre, sonra isme göre sırala

    // İstemiyorum seçeneğini en üste ekle
    options.unshift({
      id: "istemiyorum",
      name: "İstemiyorum",
      price: 0,
      order: -1, // En düşük order değeri
    });

    return options;
  }, [newItem.category, products]);
  // EFFECT HOOKS - İŞLEVSEL OLARAK GÜNCELLENDİ

  // 1. İlk yüklemede boyutları ayarla
  useEffect(() => {
    if (!initializedRef.current && localBonusData.length > 0) {
      // İlk yüklemede mevcut boyutları kaydet
      lastDimensions.current = { kontiWidth, kontiHeight };
      initializedRef.current = true;
    }
  }, [kontiWidth, kontiHeight, localBonusData]);

  // 2. OrderDetails'dan gelen boyut değişikliklerini izle (shouldRecalc prop'u)
  useEffect(() => {
    if (shouldRecalc && localBonusData.length > 0 && !isUpdating.current) {
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
    localBonusData,
    recalculateAllDynamicPrices,
    recalculateArtisItems,
  ]);

  // 3. Zustand store'daki değişiklikleri izle
  useEffect(() => {
    if (
      needsRecalculation &&
      localBonusData.length > 0 &&
      !isUpdating.current
    ) {
      console.log("Dimension store'dan recalculation sinyali alındı");
      recalculateAllDynamicPrices();
      resetRecalculationFlag();
    }
  }, [
    needsRecalculation,
    localBonusData,
    recalculateAllDynamicPrices,
    resetRecalculationFlag,
  ]);
  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();

        if (editingItem !== null) {
          handleSaveEdit();
        } else if (adding) {
          handleAddItem();
        }
      }
    },
    [editingItem, adding, handleSaveEdit, handleAddItem]
  );
  return (
    <div className="space-y-3">
      {/* Öğe Listesi */}
      {localBonusData.length > 0 && (
        <div className="grid grid-cols-1 space-y-0.5">
          {localBonusData.map((item, index) => (
            <div
              key={item.id || index}
              className="bg-gray-800/30 rounded overflow-hidden"
            >
              <div className="divide-y divide-gray-700/30">
                <div className="hover:bg-gray-700/20 transition-colors duration-150">
                  <div className="grid grid-cols-[2fr,2fr,1fr,auto] items-center px-2 py-1.5 gap-1">
                    {editingItem === index ? (
                      <>
                        {/* İlk sütun - Kategori */}
                        <div>
                          {newItem.customCategory ? (
                            <input
                              type="text"
                              value={newItem.categoryName}
                              onChange={handleCategoryNameChange}
                              onKeyDown={handleKeyDown}
                              placeholder="Özel kategori adı"
                              className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                              style={{ WebkitFontSmoothing: "antialiased" }}
                              autoFocus
                            />
                          ) : (
                            <select
                              value={newItem.category}
                              onChange={handleCategoryChange}
                              onKeyDown={handleKeyDown}
                              className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                              style={{ WebkitFontSmoothing: "antialiased" }}
                            >
                              <option value="">Kategori Seçin</option>
                              <option value="custom">Diğer</option>
                              {categoryOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>

                        {/* İkinci sütun - Ürün */}
                        <div>
                          {newItem.customCategory ||
                          (newItem.custom && newItem.showInput) ? (
                            <input
                              type="text"
                              value={newItem.name}
                              onChange={handleNameChange}
                              onKeyDown={handleKeyDown}
                              placeholder="Özel ürün adı"
                              className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                              style={{ WebkitFontSmoothing: "antialiased" }}
                              autoFocus={!newItem.customCategory}
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
                                  : newItem.custom
                                  ? "custom"
                                  : ""
                              }
                              onChange={handleProductChange}
                              onKeyDown={handleKeyDown}
                              disabled={!newItem.category}
                              className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              style={{ WebkitFontSmoothing: "antialiased" }}
                            >
                              <option value="">Ürün Seçin</option>
                              <option value="custom">Diğer</option>
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
                            </select>
                          )}
                        </div>

                        {/* Üçüncü sütun - Fiyat */}
                        <input
                          type="text"
                          value={newItem.price}
                          onChange={handlePriceChange}
                          onKeyDown={handleKeyDown}
                          placeholder="Fiyat"
                          className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-green-500/50 outline-none w-full transition-all duration-200"
                          style={{ WebkitFontSmoothing: "antialiased" }}
                        />

                        {/* Dördüncü sütun - Butonlar */}
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
                          className="text-gray-400 text-[0.75rem] truncate cursor-pointer hover:text-indigo-300 transition-colors duration-150"
                          onClick={() => handleEditItem(item, index)}
                          style={{
                            textRendering: "optimizeLegibility",
                            WebkitFontSmoothing: "antialiased",
                          }}
                        >
                          {(() => {
                            // Kategori adına göre ilgili kategori nesnesini bul
                            const categoryObj = Object.values(categories).find(
                              (cat) =>
                                cat.propertyName?.toLowerCase() ===
                                item.category?.toLowerCase()
                            );
                            // Varsa title'ı, yoksa category adını göster
                            return categoryObj?.title || item.category;
                          })()}
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
                          className={`${
                            item.price < 0
                              ? "text-red-400 hover:text-red-300"
                              : "text-green-400 hover:text-green-300"
                          } text-[0.75rem] cursor-pointer transition-colors duration-150`}
                          onClick={() => handleEditItem(item, index)}
                          style={{
                            textRendering: "optimizeLegibility",
                            WebkitFontSmoothing: "antialiased",
                          }}
                        >
                          {item.price < 0 ? "-" : ""}
                          {Math.abs(Number(item.price)).toLocaleString("tr-TR")}
                          ₺
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
            {/* Kategori seçimi */}
            <div>
              {newItem.customCategory ? (
                <input
                  type="text"
                  value={newItem.categoryName}
                  onChange={handleCategoryNameChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Özel kategori adı giriniz"
                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                  style={{ WebkitFontSmoothing: "antialiased" }}
                  autoFocus
                />
              ) : (
                <select
                  value={newItem.category}
                  onChange={handleCategoryChange}
                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                  style={{ WebkitFontSmoothing: "antialiased" }}
                >
                  <option value="">Kategori Seçin</option>
                  <option value="custom">Diğer</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Ürün seçimi */}
            <div>
              {(newItem.custom && newItem.showInput) ||
              newItem.customCategory ? (
                <input
                  type="text"
                  value={newItem.name}
                  onChange={handleNameChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Özel ürün adı giriniz"
                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200"
                  style={{ WebkitFontSmoothing: "antialiased" }}
                  autoFocus={newItem.customCategory ? false : true}
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
                      : newItem.custom
                      ? "custom"
                      : ""
                  }
                  onChange={handleProductChange}
                  onKeyDown={handleKeyDown}
                  disabled={!newItem.category}
                  className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-indigo-500/50 outline-none w-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ WebkitFontSmoothing: "antialiased" }}
                >
                  <option value="">Ürün Seçin</option>
                  <option value="custom">Diğer</option>
                  {newItem.productId && !newItem.custom && (
                    <option
                      value={JSON.stringify({
                        id: newItem.productId,
                        name: newItem.product,
                        price: newItem.price,
                      })}
                    >
                      {newItem.product} -{" "}
                      {Number(newItem.price).toLocaleString("tr-TR")}₺
                    </option>
                  )}
                  {productOptions
                    .filter((product) => product.id !== newItem.productId)
                    .map((product) => (
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
                </select>
              )}
            </div>

            {/* Fiyat girişi */}
            <div>
              <input
                type="text"
                value={newItem.price}
                onChange={handlePriceChange}
                onKeyDown={handleKeyDown}
                placeholder="Fiyat"
                className="bg-gray-600/90 text-[0.75rem] text-gray-200 px-2 py-1.5 rounded border border-gray-500/40 focus:border-green-500/50 outline-none w-full transition-all duration-200"
                style={{ WebkitFontSmoothing: "antialiased" }}
              />
            </div>

            {/* İşlem butonları */}
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
          {localBonusData.length === 0 ? (
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
  localOrderData: PropTypes.object.isRequired,
  localBonusData: PropTypes.array.isRequired,
  setLocalBonusData: PropTypes.func.isRequired,
  shouldRecalc: PropTypes.bool,
  setShouldRecalcPrices: PropTypes.func,
  skipInitialCalc: PropTypes.bool,
};

export default BonusItems;
