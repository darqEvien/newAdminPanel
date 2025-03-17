import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "./dialogForCustomers";
import { ref, get, set } from "firebase/database";
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

const OrderEditModal = ({
  isOpen,
  onClose,
  customer,
  orderKey,
  orderData,
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
  const [savedItems, setSavedItems] = useState([]);
  const [notes, setNotes] = useState(orderData.notes || "");
  const [shouldRecalcPrices, setShouldRecalcPrices] = useState(false);
  // İlk yükleme için hesaplama atlama bayrağı ekleniyor
  const [skipInitialCalc, setSkipInitialCalc] = useState(true);

  // OrderDetails state'leri
  const [editingItem, setEditingItem] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: "", price: "0" });

  // İkisi arasında bağlantı kurmak için useCallback ve useState ekleyin

  // İlk veri yüklemesi
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!isOpen) return;

      try {
        const [
          categoriesSnapshot,
          productsSnapshot,
          bonusSnapshot,
          notesSnapshot,
        ] = await Promise.all([
          get(ref(database, "categories")),
          get(ref(database, "products")),
          get(ref(database, `customers/${orderKey}/bonus`)),
          get(ref(database, `customers/${orderKey}/notes`)),
        ]);

        if (categoriesSnapshot.exists()) {
          setCategories(categoriesSnapshot.val());
        }
        if (productsSnapshot.exists()) {
          setProducts(productsSnapshot.val());
        }
        if (bonusSnapshot.exists()) {
          setSavedItems(bonusSnapshot.val() || []);
        }
        if (notesSnapshot.exists()) {
          setNotes(notesSnapshot.val() || "");
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, [isOpen, orderKey]);

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

  // Ana kaydetme fonksiyonu
  const handleSaveChanges = async () => {
    try {
      // Güncel boyutları al
      const currentDimensions = getAllDimensions();

      // Kaydet
      const finalOrderData = {
        ...localOrderData,
        dimensions: currentDimensions,
      };

      await Promise.all([
        set(ref(database, `customers/${orderKey}/products/0`), finalOrderData),
        set(ref(database, `customers/${orderKey}/bonus`), savedItems),
        set(ref(database, `customers/${orderKey}/notes`), notes),
      ]);

      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Değişiklikler kaydedilirken bir hata oluştu.");
    }
  };
  // useEffect içinde arka planı kontrol etme ve temizleme

  // Return kısmını yenileyelim
  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
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
                Sipariş Düzenle - {customer.fullName}
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
                      <CustomerInfo customer={customer} />
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
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
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
                          savedItems={savedItems}
                          setSavedItems={setSavedItems}
                          shouldRecalc={shouldRecalcPrices}
                          setShouldRecalcPrices={setShouldRecalcPrices}
                          skipInitialCalc={skipInitialCalc}
                          isFirstLoad={firstLoadRef.current}
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
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  <OrderNotes
                    orderKey={orderKey}
                    isMainOrder={isMainOrder}
                    customerId={customerId}
                    notes={notes}
                    setNotes={setNotes}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Modern Glassmorphism */}
        <div>
          <OrderSummary
            orderData={localOrderData}
            savedItems={savedItems}
            onSave={handleSaveChanges}
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
  customer: PropTypes.shape({
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
