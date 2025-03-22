import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent } from "./dialogForCustomers";
import { ref, get, set, update } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";
import { toast } from "react-toastify";
import OrderDetails from "./OrderDetails";
import BonusItems from "./BonusItems";
import OrderNotes from "./OrderNotes";
import OrderSummary from "./OrderSummary";
import CustomerInfo from "./CustomerInfo";
import PropTypes from "prop-types";
import { calculatePrice } from "../../utils/priceCalculator";
import { useDimensionsStore } from "../../store/dimensionsStore"; // Import as named export

import { trackOrderChanges } from "../../utils/changeTracker";
import ChangelogHistory from "./ChangelogHistory";
const OrderEditModal = ({
  isOpen,
  onClose,
  customer = {}, // Add default empty object
  orderKey,
  orderData = {}, // Add default empty object
  initialDimensions,
  isMainOrder = true,
  customerId = null,
}) => {
  // Use individual selectors for better performance
  const kontiWidth = useDimensionsStore((state) => state.kontiWidth);
  const kontiHeight = useDimensionsStore((state) => state.kontiHeight);
  const anaWidth = useDimensionsStore((state) => state.anaWidth);
  const anaHeight = useDimensionsStore((state) => state.anaHeight);
  const initializeDimensions = useDimensionsStore(
    (state) => state.initializeDimensions
  );
  const getAllDimensions = useDimensionsStore(
    (state) => state.getAllDimensions
  );

  // Ana state'ler
  const [categories, setCategories] = useState({});
  const [products, setProducts] = useState({});
  const [localOrderData, setLocalOrderData] = useState(orderData);
  const [localBonusData, setLocalBonusData] = useState([]);
  const [notes, setNotes] = useState(orderData.notes || "");
  const [shouldRecalcPrices, setShouldRecalcPrices] = useState(false);
  // İlk yükleme için hesaplama atlama bayrağı ekleniyor
  const [skipInitialCalc, setSkipInitialCalc] = useState(true);
  const [activePanel, setActivePanel] = useState("notes"); // 'notes' veya 'changelog'
  // Müşteri düzenleme state'leri
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editedCustomerData, setEditedCustomerData] = useState({});
  // Ana state'ler kısmına ekleyelim
  const [localCustomer, setLocalCustomer] = useState(customer); // Yerel müşteri verisi
  const [customerChanges, setCustomerChanges] = useState({}); // Müşteri değişikliklerini takip etmek için
  // OrderDetails state'leri
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: "", price: "0" });
  const [originalOrderData, setOriginalOrderData] = useState(null);
  const [originalBonusItems, setOriginalBonusItems] = useState([]);

  const [orderChanges, setOrderChanges] = useState({
    addedProducts: [],
    removedProducts: [],
    priceChanges: [],
  });

  // İkisi arasında bağlantı kurmak için useCallback ve useState ekleyin
  useEffect(() => {
    if (isOpen && orderData) {
      // Derin kopya oluştur
      setOriginalOrderData(JSON.parse(JSON.stringify(orderData)));
    }
  }, [isOpen, orderData]);
  // originalBonusItems'ı doğru şekilde kullanmak için computeChanges fonksiyonunu düzeltelim

  // computeChanges fonksiyonuna müşteri değişikliklerini ekleyelim
  const computeChanges = useCallback(() => {
    if (!originalOrderData || !localOrderData) {
      console.log("originalOrderData veya localOrderData eksik");
      return {
        addedProducts: [],
        removedProducts: [],
        priceChanges: [],
      };
    }

    try {
      // Derin kopyalarını oluştur
      const originalClone = JSON.parse(JSON.stringify(originalOrderData));

      // ÖNEMLİ: Orijinal bonus öğelerini ekleyelim
      originalClone.bonus = originalBonusItems || [];

      // ÖNEMLİ: İlk boyut değerlerini orijinal olarak sakla
      originalClone.dimensions = initialDimensions || {};

      const localClone = JSON.parse(JSON.stringify(localOrderData));

      // Güncel bonus öğelerini ekle
      localClone.bonus = localBonusData || [];

      // Ürünlerdeki değişiklikleri hesapla
      const productChanges = trackOrderChanges(
        originalClone,
        localClone,
        categories
      );

      // Müşteri değişikliklerini kontrol et
      const customerFieldChanges = [];

      if (Object.keys(customerChanges).length > 0) {
        // Değişen müşteri alanlarını belirle
        Object.keys(customerChanges).forEach((key) => {
          customerFieldChanges.push({
            field: key,
            oldValue: customer[key] || "",
            newValue: customerChanges[key] || "",
          });
        });
      }

      // Değişiklikleri birleştir
      return {
        ...productChanges,
        customerChanges: customerFieldChanges,
        hasCustomerChanges: customerFieldChanges.length > 0,
      };
    } catch (error) {
      console.error("Değişiklik hesaplama hatası:", error);
      return {
        addedProducts: [],
        removedProducts: [],
        priceChanges: [],
        customerChanges: [],
        error: error.message,
      };
    }
  }, [
    originalOrderData,
    localOrderData,
    categories,
    localBonusData,
    originalBonusItems,
    initialDimensions,
    customerChanges,
    customer,
  ]);
  // İlk veri yüklemesi
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isOpen) return;

      try {
        // Ana siparişler ve diğer siparişler için doğru yollar belirleniyor
        const mainCustomerId = isMainOrder ? orderKey : customerId;

        const bonusPath = isMainOrder
          ? `customers/${mainCustomerId}/bonus`
          : `customers/${mainCustomerId}/otherOrders/${orderKey}/bonus`;

        const notesPath = isMainOrder
          ? `customers/${mainCustomerId}/notes`
          : `customers/${mainCustomerId}/otherOrders/${orderKey}/notes`;

        console.log("Veri yükleniyor:", {
          isMainOrder,
          mainCustomerId,
          bonusPath,
          notesPath,
        });

        const [
          categoriesSnapshot,
          productsSnapshot,
          bonusSnapshot,
          notesSnapshot,
        ] = await Promise.all([
          get(ref(database, "categories")),
          get(ref(database, "products")),
          get(ref(database, bonusPath)),
          get(ref(database, notesPath)),
        ]);

        if (categoriesSnapshot.exists()) {
          setCategories(categoriesSnapshot.val());
        }
        if (productsSnapshot.exists()) {
          setProducts(productsSnapshot.val());
        }
        if (bonusSnapshot.exists()) {
          const bonusItems = bonusSnapshot.val() || [];
          console.log("Yüklenen bonus öğeleri:", bonusItems);
          setLocalBonusData(bonusItems);
          // Orijinal bonus öğelerini de sakla - derin kopya oluştur
          setOriginalBonusItems(JSON.parse(JSON.stringify(bonusItems)));
        } else {
          console.log("Bonus öğeleri bulunamadı");
          setLocalBonusData([]);
          setOriginalBonusItems([]);
        }
        if (notesSnapshot.exists()) {
          setNotes(notesSnapshot.val() || "");
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, [isOpen, orderKey, customerId, isMainOrder]);
  // İlk yüklemede dimensions'ı Zustand store'una aktar
  const initializedRef = useRef(false);
  const firstLoadRef = useRef(true); // Yeni ref ekleyin

  useEffect(() => {
    if (isOpen && initialDimensions && !initializedRef.current) {
      console.log(
        "Initializing dimensions from initialDimensions:",
        initialDimensions
      );

      // İlk yükleme olduğunu belirtelim
      firstLoadRef.current = true;

      // Sessizce boyutları güncelle - fiyat hesaplaması tetiklemeden
      initializeDimensions(initialDimensions);
      initializedRef.current = true;

      // LocalOrderData'yı da güncelle ama fiyat hesaplamadan
      setLocalOrderData((prev) => ({
        ...prev,
        dimensions: initialDimensions,
      }));

      // Bir sonraki render döngüsünde ilk yükleme bayrağını kaldırıyoruz
      setTimeout(() => {
        firstLoadRef.current = false;
      }, 500);
    }
  }, [isOpen, initialDimensions, initializeDimensions]);

  // Konti boyut değişikliklerini izleyen useEffect
  const prevKontiWidth = useRef(kontiWidth);
  const prevKontiHeight = useRef(kontiHeight);

  useEffect(() => {
    // İlk yükleme veya modal kapalıysa değişikliği işleme
    if (!initializedRef.current || !isOpen || firstLoadRef.current) {
      // Sadece referans değerleri güncelle ama fiyat hesaplama yapma
      prevKontiWidth.current = kontiWidth;
      prevKontiHeight.current = kontiHeight;
      return;
    }

    // Boyutların değişip değişmediğini kontrol et
    if (
      prevKontiWidth.current !== kontiWidth ||
      prevKontiHeight.current !== kontiHeight
    ) {
      // Manuel olarak tetiklenmiş bir boyut değişikliği - hesaplama yap
      if (skipInitialCalc) setSkipInitialCalc(false);
      useDimensionsStore.setState({
        kontiWidth: kontiWidth,
        kontiHeight: kontiHeight,
        anaWidth: kontiWidth,
        anaHeight: kontiHeight,
        needsRecalculation: true, // Recalculation flag'ini aktifleştir
      });

      setShouldRecalcPrices(true);

      // Zaman aşımından sonra bayrağı sıfırla
      setTimeout(() => setShouldRecalcPrices(false), 100);

      // Güncel değerleri sakla
      prevKontiWidth.current = kontiWidth;
      prevKontiHeight.current = kontiHeight;
    }
  }, [kontiWidth, kontiHeight, isOpen, skipInitialCalc]);

  // DEBUG: OrderDetails ve BonusItems arasındaki senkronizasyonu kontrol et
  const saveCustomerChanges = () => {
    try {
      // Değişmiş alanları tespit edip güncelleme
      const customerUpdates = {};

      // Sadece değişen alanları güncelle
      Object.keys(editedCustomerData).forEach((key) => {
        if (editedCustomerData[key] !== customer[key]) {
          customerUpdates[key] = editedCustomerData[key];
        }
      });

      // Değişiklik yoksa işlemi sonlandır
      if (Object.keys(customerUpdates).length === 0) {
        setIsEditingCustomer(false);
        return;
      }

      // Yerel müşteri verisini güncelle
      setLocalCustomer({
        ...customer,
        ...customerUpdates,
      });

      // Değişiklikleri takip etmek için bir state tutuyoruz
      setCustomerChanges(customerUpdates);

      toast.success(
        "Müşteri bilgileri değiştirildi (Kaydetmek için Sipariş Kaydet butonunu kullanın)"
      );
      setIsEditingCustomer(false);
    } catch (error) {
      console.error("Müşteri bilgileri güncellenirken hata:", error);
      toast.error("Müşteri bilgileri güncellenirken bir hata oluştu");
    }
  };
  // Fiyatları yenileme fonksiyonu
  const handleRefreshPrices = async () => {
    try {
      // Manuel fiyat yenileme işleminde artık ilk hesaplamayı atlamıyoruz
      if (skipInitialCalc) setSkipInitialCalc(false);

      const loadingToast = toast.loading("Fiyatlar güncelleniyor...");
      setShouldRecalcPrices(true);

      // Kategorileri yenile
      const categoriesSnapshot = await get(ref(database, "categories"));
      if (!categoriesSnapshot.exists()) {
        toast.error("Kategori bilgileri yüklenemedi!");
        return;
      }

      setCategories(categoriesSnapshot.val());
      const updatedCategories = categoriesSnapshot.val();

      setTimeout(async () => {
        // Güncel konti boyutlarını al
        const currentKontiWidth = kontiWidth;
        const currentKontiHeight = kontiHeight;
        const currentAnaWidth = anaWidth;
        const currentAnaHeight = anaHeight;

        console.log("Fiyat hesaplamada kullanılan boyutlar:", {
          kontiWidth: currentKontiWidth,
          kontiHeight: currentKontiHeight,
          anaWidth: currentAnaWidth,
          anaHeight: currentAnaHeight,
        });

        const updatedOrderData = { ...localOrderData };

        // PropertyName'e göre kategori bulma fonksiyonu
        const findCategoryByPropertyName = (propName) => {
          for (const [, category] of Object.entries(updatedCategories)) {
            if (category.propertyName === propName) {
              return category;
            }
          }
          return null;
        };

        // Add this function before processing the categories:
        const checkBothDimensionsAdded = () => {
          let hasEnArtis = false;
          let hasBoyArtis = false;

          for (const categoryName in updatedOrderData) {
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
              ].includes(categoryName)
            ) {
              continue;
            }

            const category = findCategoryByPropertyName(categoryName);
            if (category?.priceFormat === "artis") {
              if (categoryName.toLowerCase().includes("en")) {
                for (const idx in updatedOrderData[categoryName]) {
                  const product = updatedOrderData[categoryName][idx];
                  if (
                    product.productId &&
                    product.productId !== "istemiyorum"
                  ) {
                    hasEnArtis = true;
                  }
                }
              } else if (categoryName.toLowerCase().includes("boy")) {
                for (const idx in updatedOrderData[categoryName]) {
                  const product = updatedOrderData[categoryName][idx];
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

        const bothDimensionsAdded = checkBothDimensionsAdded();

        // Ana kategorileri işle
        const categoryPromises = Object.entries(updatedOrderData).map(
          ([categoryName, categoryProducts], categoryIndex) =>
            new Promise((resolve) => {
              setTimeout(async () => {
                try {
                  // Özel alanları atla
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
                    ].includes(categoryName)
                  ) {
                    resolve();
                    return;
                  }

                  // Kategori priceFormat'ını bul
                  let categoryPriceFormat = "tekil";
                  const matchingCategory =
                    findCategoryByPropertyName(categoryName);

                  if (matchingCategory && matchingCategory.priceFormat) {
                    categoryPriceFormat = matchingCategory.priceFormat;
                  } else if (
                    updatedCategories[categoryName] &&
                    updatedCategories[categoryName].priceFormat
                  ) {
                    categoryPriceFormat =
                      updatedCategories[categoryName].priceFormat;
                  }

                  // Kategorideki ürünleri işle
                  const productPromises = Object.entries(categoryProducts).map(
                    ([productIndex, product], pIndex) =>
                      new Promise((resolveProduct) => {
                        setTimeout(async () => {
                          try {
                            if (!product.productCollectionId) {
                              resolveProduct();
                              return;
                            }

                            const productRef = ref(
                              database,
                              `products/${categoryName}/${product.productCollectionId}`
                            );
                            const snapshot = await get(productRef);

                            if (snapshot.exists()) {
                              const productData = snapshot.val();
                              const basePrice = Number(
                                productData.price || product.price
                              );

                              // Width ve height değerleri
                              const productWidth = Number(
                                productData.width || 0
                              );
                              const productHeight = Number(
                                productData.height || 0
                              );

                              let calculatedPrice;

                              // Artis kategorisi için özel hesaplama
                              if (categoryPriceFormat === "artis") {
                                if (categoryName.toLowerCase().includes("en")) {
                                  calculatedPrice =
                                    currentKontiHeight *
                                    productWidth *
                                    basePrice;
                                } else if (
                                  categoryName.toLowerCase().includes("boy")
                                ) {
                                  calculatedPrice =
                                    currentKontiWidth *
                                    productHeight *
                                    basePrice;
                                } else {
                                  calculatedPrice = calculatePrice({
                                    priceFormat: "artis",
                                    basePrice: basePrice,
                                    width: productWidth,
                                    height: productHeight,
                                    kontiWidth: currentKontiWidth,
                                    kontiHeight: currentKontiHeight,
                                    categoryName: categoryName,
                                    anaWidth: currentAnaWidth,
                                    anaHeight: currentAnaHeight,
                                    alanPrice: productData?.alanPrice || 0,
                                    hasAddedBothDimensions: bothDimensionsAdded,
                                  });
                                }
                              } else {
                                // Diğer kategoriler için hesaplama
                                calculatedPrice = calculatePrice({
                                  priceFormat: categoryPriceFormat,
                                  basePrice: basePrice,
                                  width: productWidth,
                                  height: productHeight,
                                  kontiWidth: currentKontiWidth,
                                  kontiHeight: currentKontiHeight,
                                  categoryName: categoryName,
                                  anaWidth: currentAnaWidth,
                                  anaHeight: currentAnaHeight,
                                  alanPrice: productData?.alanPrice || 0,
                                });
                              }

                              // Fiyatı güncelle
                              updatedOrderData[categoryName][productIndex] = {
                                ...product,
                                price: calculatedPrice,
                              };
                            }
                            resolveProduct();
                          } catch (error) {
                            console.error(
                              `Ürün fiyatı güncellenirken hata:`,
                              error
                            );
                            resolveProduct();
                          }
                        }, pIndex * 0.5);
                      })
                  );

                  // Tüm ürünleri işle
                  await Promise.all(productPromises);
                  resolve();
                } catch (error) {
                  console.error(`Kategori işlenirken hata:`, error);
                  resolve();
                }
              }, categoryIndex * 0.5);
            })
        );

        // Tüm kategorileri işle
        await Promise.all(categoryPromises);

        // State'leri güncelle
        setLocalOrderData(updatedOrderData);
        setShouldRecalcPrices(false);

        // Tamamlama bildirimi
        toast.dismiss(loadingToast);
        toast.success("Ürün fiyatları başarıyla güncellendi");
      }, 300);
    } catch (error) {
      console.error("Fiyat güncellemesi sırasında hata:", error);
      toast.error("Fiyat güncellemesi sırasında bir hata oluştu");
      setShouldRecalcPrices(false);
    }
  };
  const saveOrder = async () => {
    try {
      if (!customer || !customer.id) {
        console.error("Customer data is missing");
        toast.error("Müşteri bilgileri eksik, lütfen sayfayı yenileyin.");
        return;
      }

      // Calculate current dimensions and total price
      const currentDimensions = getAllDimensions();
      const { dimensions, ...productsData } = localOrderData;

      // Calculate total price from order items
      let totalPrice = calculateTotalPrice(productsData, localBonusData);

      // CRITICAL FIX: Make sure we're using the correct customer ID
      const targetCustomerId = isMainOrder ? customer.id : customerId;

      console.log("Customer info:", {
        providedOrderKey: orderKey,
        customerIdProp: customerId,
        customerId: customer.id,
        isMainOrder,
        usingId: targetCustomerId,
      });

      // Create updates object
      const updates = {};

      // Müşteri değişikliklerini ekleyelim (eğer varsa), ama sadece değişen alanları güncelle
      if (Object.keys(customerChanges).length > 0) {
        // Örnek: Eğer sadece fullName değişmişse, sadece onu güncelle
        // Tüm müşteri nesnesini güncellemekten kaçın
        Object.keys(customerChanges).forEach((key) => {
          updates[`customers/${targetCustomerId}/${key}`] =
            customerChanges[key];
        });

        // Güncellenme zamanını da ekle
        updates[`customers/${targetCustomerId}/lastUpdated`] = Date.now();
      }

      // Değişiklik varsa changelog'ı da kaydet
      const changes = computeChanges();
      const hasSignificantChanges =
        (changes.addedProducts && changes.addedProducts.length > 0) ||
        (changes.removedProducts && changes.removedProducts.length > 0) ||
        (changes.priceChanges && changes.priceChanges.length > 0) ||
        changes.hasCustomerChanges ||
        changes.dimensionsChange ||
        changes.priceChange;

      if (hasSignificantChanges) {
        // Changelog'a tarih ekle
        const changelogEntry = {
          ...changes,
          timestamp: Date.now(),
          formattedDate: new Date().toLocaleDateString("tr-TR"),
          formattedTime: new Date().toLocaleTimeString("tr-TR"),
        };

        if (isMainOrder) {
          // Changelog path oluştur - ana sipariş
          const changelogPath = `customers/${targetCustomerId}/changelog`;

          // Önce mevcut changelog'ı al
          const changelogRef = ref(database, changelogPath);
          const snapshot = await get(changelogRef);

          let existingChangelog = [];
          if (snapshot.exists()) {
            existingChangelog = snapshot.val();
            if (!Array.isArray(existingChangelog)) {
              existingChangelog = [existingChangelog];
            }
          }

          // En son değişiklikleri ekle
          existingChangelog.push(changelogEntry);

          // Changelog'ı güncelle
          updates[changelogPath] = existingChangelog;
        } else {
          // Changelog path oluştur - alt sipariş
          const changelogPath = `customers/${targetCustomerId}/otherOrders/${orderKey}/changelog`;

          // Önce mevcut changelog'ı al
          const changelogRef = ref(database, changelogPath);
          const snapshot = await get(changelogRef);

          let existingChangelog = [];
          if (snapshot.exists()) {
            existingChangelog = snapshot.val();
            if (!Array.isArray(existingChangelog)) {
              existingChangelog = [existingChangelog];
            }
          }

          // En son değişiklikleri ekle
          existingChangelog.push(changelogEntry);

          // Changelog'ı güncelle
          updates[changelogPath] = existingChangelog;
        }
      }

      // Sipariş güncellemelerini ekle
      if (isMainOrder) {
        updates[`customers/${targetCustomerId}/products/0`] = productsData;
        updates[`customers/${targetCustomerId}/dimensions`] = currentDimensions;
        updates[`customers/${targetCustomerId}/bonus`] = localBonusData;
        updates[`customers/${targetCustomerId}/totalPrice`] = totalPrice;
        updates[`customers/${targetCustomerId}/notes`] = notes;
      } else {
        updates[
          `customers/${targetCustomerId}/otherOrders/${orderKey}/products`
        ] = productsData;
        updates[
          `customers/${targetCustomerId}/otherOrders/${orderKey}/dimensions`
        ] = currentDimensions;
        updates[`customers/${targetCustomerId}/otherOrders/${orderKey}/bonus`] =
          localBonusData;
        updates[
          `customers/${targetCustomerId}/otherOrders/${orderKey}/totalPrice`
        ] = totalPrice;
        updates[`customers/${targetCustomerId}/otherOrders/${orderKey}/notes`] =
          notes;
      }

      // Execute the update
      await update(ref(database), updates);

      console.log("Tüm değişiklikler başarıyla kaydedildi");
      toast.success("Değişiklikler başarıyla kaydedildi");

      // Değişiklik state'lerini temizle
      setCustomerChanges({});

      onClose();
    } catch (error) {
      console.error("Kaydetme hatası:", error);
      toast.error("Değişiklikler kaydedilirken bir hata oluştu.");
    }
  };

  // Helper function to calculate total price consistently
  const calculateTotalPrice = (productsData, bonusItems) => {
    let total = 0;

    // Add product prices - make sure to skip non-product fields
    Object.entries(productsData).forEach(([categoryName, categoryProducts]) => {
      // Skip non-product properties
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
        ].includes(categoryName)
      ) {
        return;
      }

      // Process product entries
      Object.values(categoryProducts).forEach((product) => {
        if (product?.price) {
          // Ensure price is a number and handle floating point precision
          const price = Number(parseFloat(product.price).toFixed(2));
          total += price || 0;
        }
      });
    });

    // Add bonus item prices
    if (Array.isArray(bonusItems)) {
      bonusItems.forEach((item) => {
        if (item?.price) {
          // Ensure price is a number and handle floating point precision
          const itemPrice = Number(parseFloat(item.price).toFixed(2));
          total += itemPrice || 0;
        }
      });
    }

    // Return with consistent formatting (2 decimal places)
    return Number(total.toFixed(2));
  };
  // useEffect içinde arka planı kontrol etme ve temizleme

  // Return kısmını yenileyelim
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          // Modal kapanırken state'leri temizle
          setLocalOrderData({});
          setLocalBonusData([]);
          setNotes("");
          setCustomerChanges({});
          setEditingItem(null);
          setSelectedProduct(null);
          setEditingValues({ name: "", price: "0" });

          // Zustand store'u da temizle
          initializeDimensions({
            kontiWidth: 0,
            kontiHeight: 0,
            anaWidth: 0,
            anaHeight: 0,
          });

          // Modal'ı kapat
          onClose();
        }
      }}
      className="dark-theme-dialog z-[9999]"
    >
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] max-h-[90vh] p-0 flex flex-col bg-gradient-to-br from-gray-950 to-gray-900 border border-gray-800/40 shadow-xl rounded-lg overflow-hidden z-[9999]">
        {/* Header - Gradient background ile şık başlık */}
        <div className="border-b border-gray-800/50 bg-gradient-to-r from-gray-900 to-gray-850 p-4 backdrop-blur-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-1 rounded-full bg-indigo-500"></div>
              <h1
                className="text-xl font-semibold text-gray-100"
                style={{
                  textRendering: "optimizeLegibility",
                  WebkitFontSmoothing: "antialiased",
                }}
              >
                Sipariş Düzenle - {localCustomer.fullName}
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content - Glass effect container */}
        <div className="flex-1 overflow-hidden bg-gray-900/30 backdrop-blur-md">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="flex-1 flex flex-col h-full border-r border-gray-800/30">
              <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar">
                {/* Customer Info Card - Modern Glassmorphism */}
                <div className="bg-gradient-to-br from-gray-800/40 to-gray-800/20 rounded-xl backdrop-blur-lg border border-gray-700/30 shadow-lg overflow-hidden">
                  <div className="flex flex-col">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/10 p-4 border-b border-gray-700/30">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
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
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-md font-medium text-gray-100">
                          Müşteri Bilgileri
                        </h3>
                      </div>
                    </div>

                    {/* Card Content - Enhanced Design */}
                    <div className="p-5">
                      <CustomerInfo
                        customer={localCustomer}
                        isEditing={isEditingCustomer}
                        setIsEditing={setIsEditingCustomer}
                        editedData={editedCustomerData}
                        setEditedData={setEditedCustomerData}
                        onSave={saveCustomerChanges}
                      />
                    </div>
                  </div>
                </div>

                {/* Order Details Card - Modern Glassmorphism */}
                <div className="bg-gray-800/30 rounded-xl p-5 backdrop-blur-lg border border-gray-700/20 shadow-lg">
                  <div className="flex justify-between mb-5">
                    <h2
                      className="text-lg font-medium text-gray-200 flex items-center gap-2"
                      style={{
                        textRendering: "optimizeLegibility",
                        WebkitFontSmoothing: "antialiased",
                      }}
                    >
                      <svg
                        className="w-5 h-5 text-indigo-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        shapeRendering="geometricPrecision"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9h3m-3 4h3m-6-4h.01M9 16h.01"
                        />
                      </svg>
                      Sipariş Detayları
                    </h2>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleRefreshPrices}
                        className="p-2 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all duration-200"
                        title="Fiyatları Güncelle"
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
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Grid layout with tabs style */}
                  <div className="grid grid-cols-2 gap-6">
                    {/* OrderDetails */}
                    <div className="border-r border-gray-700/30 pr-5">
                      <div className="mb-4 pb-2 border-b border-gray-700/30 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <h3
                          className="text-sm font-medium text-gray-300"
                          style={{
                            textRendering: "optimizeLegibility",
                            WebkitFontSmoothing: "antialiased",
                          }}
                        >
                          Ürünler
                        </h3>
                      </div>
                      <div className="custom-scrollbar pr-1 max-h-[60vh] overflow-y-auto">
                        <OrderDetails
                          categories={categories}
                          products={products}
                          localOrderData={localOrderData}
                          editingItem={editingItem}
                          selectedProduct={selectedProduct}
                          editingValues={editingValues}
                          setEditingItem={setEditingItem}
                          setSelectedProduct={setSelectedProduct}
                          setEditingValues={setEditingValues}
                          setLocalOrderData={setLocalOrderData}
                          shouldRecalc={shouldRecalcPrices}
                          setShouldRecalcPrices={setShouldRecalcPrices}
                          skipInitialCalc={skipInitialCalc}
                          isFirstLoad={firstLoadRef.current}
                        />
                      </div>
                    </div>

                    {/* Bonus Items */}
                    <div className="pl-3">
                      <div className="mb-4 pb-2 border-b border-gray-700/30 flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-purple-500"></div>
                        <h3
                          className="text-sm font-medium text-gray-300"
                          style={{
                            textRendering: "optimizeLegibility",
                            WebkitFontSmoothing: "antialiased",
                          }}
                        >
                          Bonus Ürünler
                        </h3>
                      </div>
                      <div className="custom-scrollbar pr-1 max-h-[60vh] overflow-y-auto">
                        <BonusItems
                          categories={categories}
                          products={products}
                          localOrderData={localOrderData}
                          localBonusData={localBonusData}
                          setLocalBonusData={setLocalBonusData}
                          shouldRecalc={shouldRecalcPrices}
                          setShouldRecalcPrices={setShouldRecalcPrices}
                          skipInitialCalc={skipInitialCalc}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Notes Section */}
            <div className="w-[320px] flex flex-col h-full bg-gray-900/60 backdrop-blur-lg border-l border-gray-800/30">
              <div className="flex flex-col h-full">
                {/* Panel Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActivePanel("notes")}
                      className={`flex items-center gap-2 py-1 px-2.5 rounded-md transition-colors ${
                        activePanel === "notes"
                          ? "bg-indigo-500/20 text-indigo-300"
                          : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                      }`}
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                      <span className="text-sm">Notlar</span>
                    </button>

                    <button
                      onClick={() => {
                        // Değişiklikleri hesapla
                        const changes = computeChanges();
                        setOrderChanges(changes);
                        setActivePanel("changelog");
                      }}
                      className={`flex items-center gap-2 py-1 px-2.5 rounded-md transition-colors ${
                        activePanel === "changelog"
                          ? "bg-blue-500/20 text-blue-300"
                          : "text-gray-400 hover:text-gray-300 hover:bg-gray-800/50"
                      }`}
                    >
                      <svg
                        className={`w-4 h-4 transition-all duration-300`}
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
                      <span className="text-sm">Değişiklikler</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                  {/* Notes Panel */}
                  <div
                    className={
                      activePanel === "notes" ? "block h-full" : "hidden"
                    }
                  >
                    <div className="p-4">
                      <OrderNotes
                        orderKey={orderKey}
                        isMainOrder={isMainOrder}
                        customerId={customerId}
                        notes={notes}
                        setNotes={setNotes}
                      />
                    </div>
                  </div>

                  {/* Changelog Panel */}
                  <div
                    className={
                      activePanel === "changelog" ? "block h-full" : "hidden"
                    }
                  >
                    {/* İçerik */}
                    <div
                      className={
                        activePanel === "changelog" ? "block h-full" : "hidden"
                      }
                    >
                      {/* Mod seçim butonlarını kaldırın */}
                      {/* Doğrudan ChangelogHistory gösterin */}
                      <ChangelogHistory
                        customerId={customerId || customer.id}
                        orderKey={orderKey}
                        isMainOrder={isMainOrder}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Modern Glassmorphism */}
        <div>
          <OrderSummary
            orderData={localOrderData}
            localBonusData={localBonusData}
            onSave={saveOrder}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
// Add this before the export statement

OrderEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onCustomerUpdate: PropTypes.func, // Yeni prop ekleyelim
  customer: PropTypes.shape({
    id: PropTypes.string.isRequired, // Add this line
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string,
    message: PropTypes.string,
  }).isRequired,
  orderKey: PropTypes.string.isRequired,
  orderData: PropTypes.object.isRequired,
  initialDimensions: PropTypes.shape({
    kontiWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    kontiHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    anaWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    anaHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    verandaWidth: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    verandaHeight: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  }),
  isMainOrder: PropTypes.bool,
  customerId: PropTypes.string,
};

export default OrderEditModal;
