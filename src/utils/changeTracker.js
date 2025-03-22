/**
 * Siparişteki değişiklikleri izleyen ve özet oluşturan yardımcı fonksiyon
 */

// Kategorilerin başlıklarını bulmak için yardımcı fonksiyon
const getCategoryTitle = (categoryName, categories) => {
  if (!categoryName || !categories)
    return categoryName || "Bilinmeyen Kategori";

  const category = Object.values(categories).find(
    (cat) => cat.propertyName?.toLowerCase() === categoryName?.toLowerCase()
  );
  return category?.title || categoryName;
};

// İki sipariş arasındaki değişiklikleri tespit eder
export const trackOrderChanges = (originalOrder, newOrder, categories) => {
  if (!originalOrder || !newOrder) {
    return {
      addedProducts: [],
      removedProducts: [],
      priceChanges: [],
    };
  }

  const changes = {
    addedProducts: [],
    removedProducts: [],
    priceChanges: [],
    dimensionsChange: null,
    priceChange: null,
  };

  // Konti boyutlarını kontrol et
  const originalDimensions = originalOrder.dimensions || {};
  const newDimensions = newOrder.dimensions || {};

  // Önce tüm boyut değerlerini log'a yazdıralım
  console.log("Boyut karşılaştırması:", {
    original: originalDimensions,
    new: newDimensions,
  });

  // Boyutları kontrol et - daha sıkı karşılaştırma
  // Sadece ikisi de geçerli değer ise ve farklıysa değişiklik olarak işaretle
  if (
    originalDimensions.kontiWidth &&
    originalDimensions.kontiHeight &&
    newDimensions.kontiWidth &&
    newDimensions.kontiHeight
  ) {
    const oldWidth = parseFloat(originalDimensions.kontiWidth);
    const oldHeight = parseFloat(originalDimensions.kontiHeight);
    const newWidth = parseFloat(newDimensions.kontiWidth);
    const newHeight = parseFloat(newDimensions.kontiHeight);

    // Her iki değer de geçerli ve değişiklik önemli ise
    if (
      !isNaN(oldWidth) &&
      !isNaN(oldHeight) &&
      !isNaN(newWidth) &&
      !isNaN(newHeight) &&
      (Math.abs(oldWidth - newWidth) > 0.01 ||
        Math.abs(oldHeight - newHeight) > 0.01)
    ) {
      // Sadece konsola yazdıralım
      console.log("Gerçekten boyut değişikliği tespit edildi:", {
        old: `${oldWidth}x${oldHeight}`,
        new: `${newWidth}x${newHeight}`,
      });

      // Değişikliği ekle
      changes.dimensionsChange = {
        oldWidth: oldWidth,
        oldHeight: oldHeight,
        newWidth: newWidth,
        newHeight: newHeight,
      };
    } else {
      // Değişiklik yok ya da önemsiz değişiklik
      console.log("Boyutlarda önemli bir değişiklik tespit edilmedi");
    }
  } else {
    console.log("Boyut bilgisi eksik veya geçerli değil");
  }

  // Toplam fiyatı kontrol et (hesaplayarak)
  const originalTotal = calculateTotalPrice(originalOrder);
  const newTotal = calculateTotalPrice(newOrder);

  if (Math.abs(originalTotal - newTotal) > 0.5) {
    changes.priceChange = {
      oldPrice: originalTotal,
      newPrice: newTotal,
    };
  }

  // Her kategorideki ürünleri karşılaştır
  const processedCategories = new Set();
  const processedProducts = new Set(); // Processed product names

  // Orijinal siparişten kategori ve ürünleri işle
  Object.entries(originalOrder).forEach(([categoryName, categoryProducts]) => {
    // Özel alanları ve metadata'yı atla
    if (
      typeof categoryProducts !== "object" ||
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
        "bonus",
      ].includes(categoryName)
    ) {
      return;
    }

    processedCategories.add(categoryName);
    const categoryTitle = getCategoryTitle(categoryName, categories);

    // Eğer kategorinin tamamı silindiyse
    if (!newOrder[categoryName]) {
      // Kategorideki tüm ürünleri silinen ürünlere ekle
      Object.entries(categoryProducts).forEach(([productId, product]) => {
        if (product && product.name && product.name.trim() !== "") {
          processedProducts.add(product.name); // Mark as processed
          changes.removedProducts.push({
            category: categoryTitle,
            name: product.name,
            price: Number(product.price) || 0,
          });
        }
      });
      return;
    }

    // Her ürünü kontrol et - orijinal üründe olup yeni siparişteki olmayan ürünler
    Object.entries(categoryProducts).forEach(([productId, product]) => {
      if (!product || !product.name || product.name.trim() === "") return;
      processedProducts.add(product.name); // Mark as processed

      // Bu ürün adını yeni siparişin bu kategorisinde ara
      let foundInNewCategory = false;
      if (newOrder[categoryName]) {
        foundInNewCategory = Object.values(newOrder[categoryName]).some(
          (newProduct) => newProduct?.name === product.name
        );
      }

      // Ürün yeni siparişin bu kategorisinde yoksa, diğer kategorilerde ara
      if (!foundInNewCategory) {
        let foundInOtherCategory = false;

        // Diğer kategorileri kontrol et
        Object.entries(newOrder).forEach(([newCatName, newCatProducts]) => {
          // Metadata'yı atla
          if (
            typeof newCatProducts !== "object" ||
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
              "bonus",
            ].includes(newCatName)
          ) {
            return;
          }

          // Bu kategoride ürün var mı?
          const foundInThis = Object.values(newCatProducts).some(
            (newProduct) => newProduct?.name === product.name
          );

          if (foundInThis) {
            foundInOtherCategory = true;
          }
        });

        // Hiçbir kategoride bulunamadıysa silindi demektir
        if (!foundInOtherCategory) {
          changes.removedProducts.push({
            category: categoryTitle,
            name: product.name,
            price: Number(product.price) || 0,
          });
        }
      }
    });
  });

  // Yeni siparişteki ürünleri kontrol et - yeni eklenen ürünler
  Object.entries(newOrder).forEach(([categoryName, categoryProducts]) => {
    // Özel alanları ve metadata'yı atla
    if (
      typeof categoryProducts !== "object" ||
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
        "bonus",
      ].includes(categoryName)
    ) {
      return;
    }

    const categoryTitle = getCategoryTitle(categoryName, categories);

    // Bu kategorideki ürünleri kontrol et
    Object.entries(categoryProducts).forEach(([productId, product]) => {
      if (!product || !product.name || product.name.trim() === "") return;

      // Eğer bu ürün daha önce işlenmediyse, yeni eklenmiştir
      if (!processedProducts.has(product.name)) {
        // Daha detaylı kategori bilgisi
        let detailedCategory = categoryTitle;

        // Alt kategori varsa ekle
        if (product.type) {
          detailedCategory = `${categoryTitle} [${product.type}]`;
        } else if (product.subCategory) {
          detailedCategory = `${categoryTitle} [${product.subCategory}]`;
        }

        changes.addedProducts.push({
          category: detailedCategory,
          name: product.name,
          price: Number(product.price) || 0,
        });
        processedProducts.add(product.name); // Add to processed set
      }
    });
  });

  // Bonus ürünleri için daha detaylı bilgi topla

  // Bonus ürünlerini işleme mantığını tamamen yenileyelim

  // Normalize fonksiyonu ekleyelim - karşılaştırma sorunlarını çözmek için
  const normalizeString = (str) => {
    if (!str) return "";
    return String(str).trim().toLowerCase();
  };

  // Bonus ürünlerini işle - tamamen yeni karşılaştırma mantığı
  const originalBonus = originalOrder.bonus || [];
  const newBonus = newOrder.bonus || [];

  console.log("Bonus karşılaştırması başlıyor:", {
    originalBonus: originalBonus.map((item) => item?.product),
    newBonus: newBonus.map((item) => item?.product),
  });

  // Orijinal ve yeni bonus ürünlerini normalize edelim
  const normalizedOriginalBonus = originalBonus.map((item) => {
    if (!item) return null;
    return {
      ...item,
      normalizedProduct: normalizeString(item.product),
      normalizedCategory: normalizeString(item.category || item.type || ""),
    };
  });

  const normalizedNewBonus = newBonus.map((item) => {
    if (!item) return null;
    return {
      ...item,
      normalizedProduct: normalizeString(item.product),
      normalizedCategory: normalizeString(item.category || item.type || ""),
    };
  });

  // 1. Silinen bonus ürünleri - daha güvenilir karşılaştırma
  normalizedOriginalBonus.forEach((originalItem) => {
    if (!originalItem || !originalItem.normalizedProduct) return;

    // Yeni ürünlerde bu ürün var mı kontrol et (normalize edilmiş adlarla)
    const foundInNew = normalizedNewBonus.some(
      (newItem) => newItem?.normalizedProduct === originalItem.normalizedProduct
    );

    if (!foundInNew) {
      console.log("Silinen bonus ürünü tespit edildi:", originalItem.product);

      // Kategori bilgisini düzgün hazırla
      let categoryDisplay = "Bonus";
      if (originalItem.category || originalItem.type) {
        const subCategory = originalItem.category || originalItem.type;
        categoryDisplay = `Bonus [${subCategory}]`;
      }

      changes.removedProducts.push({
        category: categoryDisplay,
        name: originalItem.product,
        price: Number(originalItem.price) || 0,
        isBonus: true, // Bonus olduğunu açıkça belirtiyoruz
      });
    }
  });

  // 2. Yeni eklenen veya fiyatı değişen bonus ürünleri
  normalizedNewBonus.forEach((newItem) => {
    if (!newItem || !newItem.normalizedProduct) return;

    // Orijinal ürünlerde bu ürün var mı kontrol et (normalize edilmiş adlarla)
    const originalItem = normalizedOriginalBonus.find(
      (item) => item?.normalizedProduct === newItem.normalizedProduct
    );

    // Kategori bilgisini düzgün hazırla
    let categoryDisplay = "Bonus";
    if (newItem.category || newItem.type) {
      const subCategory = newItem.category || newItem.type;
      categoryDisplay = `Bonus [${subCategory}]`;
    }

    if (!originalItem) {
      // Yeni eklenen bir ürün
      console.log("Eklenen bonus ürünü tespit edildi:", newItem.product);

      changes.addedProducts.push({
        category: categoryDisplay,
        name: newItem.product,
        price: Number(newItem.price) || 0,
        isBonus: true, // Bonus olduğunu açıkça belirtiyoruz
      });
    } else if (
      Math.abs(Number(originalItem.price || 0) - Number(newItem.price || 0)) >
      0.5
    ) {
      // Fiyatı değişen bir ürün
      console.log("Fiyatı değişen bonus ürünü tespit edildi:", {
        product: newItem.product,
        oldPrice: originalItem.price,
        newPrice: newItem.price,
      });

      changes.priceChanges.push({
        category: categoryDisplay,
        name: newItem.product,
        oldPrice: Number(originalItem.price) || 0,
        newPrice: Number(newItem.price) || 0,
        isBonus: true, // Bonus olduğunu açıkça belirtiyoruz
      });
    }
  });

  console.log("Tespit edilen değişiklikler:", changes);
  return changes;
};

// Toplam fiyat hesaplama fonksiyonu
function calculateTotalPrice(orderData) {
  if (!orderData) return 0;

  let total = 0;

  // Ürün fiyatları
  Object.entries(orderData).forEach(([categoryName, categoryProducts]) => {
    if (
      typeof categoryProducts !== "object" ||
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
        "bonus",
      ].includes(categoryName)
    ) {
      return;
    }

    Object.values(categoryProducts).forEach((product) => {
      if (product?.price) {
        total += Number(product.price) || 0;
      }
    });
  });

  // Bonus ürün fiyatları
  if (Array.isArray(orderData.bonus)) {
    orderData.bonus.forEach((item) => {
      if (item?.price) {
        total += Number(item.price) || 0;
      }
    });
  }

  return Number(total.toFixed(2));
}
