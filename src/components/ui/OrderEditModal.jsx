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
const OrderEditModal = ({
  isOpen,
  onClose,
  customer,
  orderKey,
  orderData,
  initialDimensions,
  isMainOrder = true, // Default to true for backward compatibility
  customerId = null, // This should be passed from CustomerDetailModal
}) => {
  // Ana state'ler
  const [categories, setCategories] = useState({});
  const [products, setProducts] = useState({});
  const [localOrderData, setLocalOrderData] = useState(orderData);
  const [dimensions, setDimensions] = useState({
    kontiWidth: Number(initialDimensions?.kontiWidth || 0),
    kontiHeight: Number(initialDimensions?.kontiHeight || 0),
    anaWidth: Number(initialDimensions?.anaWidth || 0),
    anaHeight: Number(initialDimensions?.anaHeight || 0),
    verandaWidth: initialDimensions?.verandaWidth || "Seçilmedi",
    verandaHeight: initialDimensions?.verandaHeight || "Seçilmedi",
    length: Number(initialDimensions?.length || 0),
  });
  useEffect(() => {
    setDimensions((prev) => ({
      ...prev,
      kontiWidth: Number(prev.kontiWidth) || 0,
      kontiHeight: Number(prev.kontiHeight) || 0,
      length: Number(prev.length) || 0,
    }));
  }, [localOrderData]);
  // Sol taraf için state'ler (OrderDetails)
  const [editingItem, setEditingItem] = useState(null);
  const [editingValues, setEditingValues] = useState({ name: "", price: "" });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [notes] = useState(orderData.notes || ""); // Add notes state
  // Sağ taraf için state'ler (BonusItems)
  const [savedItems, setSavedItems] = useState([]);
  const [editingSavedItem, setEditingSavedItem] = useState(null);
  const [editingSavedValues, setEditingSavedValues] = useState({
    category: "",
    product: "",
    price: "",
    priceOnly: false,
  });
  const [newItems, setNewItems] = useState([
    { category: "", product: "", price: "" },
  ]);
  const [shouldRecalcPrices, setShouldRecalcPrices] = useState(false); // Yeni state
  const hasMounted = useRef(false); // Bileşenin mount olup olmadığını izlemek için

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [categoriesSnapshot, productsSnapshot] = await Promise.all([
          get(ref(database, "categories")),
          get(ref(database, "products")),
        ]);

        if (categoriesSnapshot.exists()) {
          setCategories(categoriesSnapshot.val());
        }
        if (productsSnapshot.exists()) {
          setProducts(productsSnapshot.val());
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      }
    };

    fetchInitialData();
  }, []);
  useEffect(() => {
    if (isOpen && initialDimensions) {
      const dimensionsToSet = {
        kontiWidth: Number(initialDimensions?.kontiWidth || 0),
        kontiHeight: Number(initialDimensions?.kontiHeight || 0),
        anaWidth: Number(initialDimensions?.anaWidth || 0),
        anaHeight: Number(initialDimensions?.anaHeight || 0),
        verandaWidth: initialDimensions?.verandaWidth || "Seçilmedi",
        verandaHeight: initialDimensions?.verandaHeight || "Seçilmedi",
        length: Number(initialDimensions?.length || 0),
      };
      setDimensions(dimensionsToSet);
      // Also make sure localOrderData has dimensions
      setLocalOrderData((prev) => ({
        ...prev,
        dimensions: dimensionsToSet,
      }));
    }
  }, [isOpen, initialDimensions, setLocalOrderData]);
  // Ana kaydetme fonksiyonu
  const handleSaveChanges = async () => {
    try {
      await Promise.all([
        set(ref(database, `customers/${orderKey}/products/0`), localOrderData),
        set(ref(database, `customers/${orderKey}/bonus`), savedItems),
        set(ref(database, `customers/${orderKey}/notes`), notes), // Save notes
      ]);
      onClose();
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };
  useEffect(() => {
    if (isOpen) {
      setShouldRecalcPrices(false);
    }
  }, [isOpen]);
  // Fiyatları yenileme fonksiyonu
  const handleRefreshPrices = async () => {
    try {
      // İşlem başladığını kullanıcıya bildir
      const loadingToast = toast.loading("Fiyatlar güncelleniyor...");
      setShouldRecalcPrices(true);
      // Kategorileri veritabanından yeniden alalım ve güncelleyelim
      const categoriesSnapshot = await get(ref(database, "categories"));
      if (!categoriesSnapshot.exists()) {
        console.error("Kategoriler veritabanında bulunamadı!");
        toast.error("Kategori bilgileri yüklenemedi!");
        return;
      }

      const updatedCategories = categoriesSnapshot.val();
      setCategories(updatedCategories);

      setTimeout(async () => {
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

        // Ana kategorileri işlemek için Promise dizisi
        const categoryPromises = Object.entries(updatedOrderData).map(
          ([categoryName, categoryProducts], categoryIndex) =>
            new Promise((resolve) => {
              // Her kategori işlemesi arasında 0.5ms gecikme ekle
              setTimeout(async () => {
                try {
                  // Sadece object olan ve özel alanlar olmayan kategorileri işle
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

                  // Kategorinin priceFormat değerini bul
                  let categoryPriceFormat = "tekil"; // Varsayılan değer
                  const matchingCategory =
                    findCategoryByPropertyName(categoryName);

                  if (matchingCategory && matchingCategory.priceFormat) {
                    categoryPriceFormat = matchingCategory.priceFormat;
                    console.log(
                      `✓ Kategori ${categoryName} için priceFormat: ${categoryPriceFormat}`
                    );
                  } else if (
                    updatedCategories[categoryName] &&
                    updatedCategories[categoryName].priceFormat
                  ) {
                    categoryPriceFormat =
                      updatedCategories[categoryName].priceFormat;
                    console.log(
                      `✓ Kategori ${categoryName} için priceFormat: ${categoryPriceFormat}`
                    );
                  } else {
                    console.warn(
                      `⚠️ Kategori ${categoryName} için priceFormat bulunamadı, tekil kullanılıyor`
                    );
                  }

                  // Kategorideki ürünleri işlemek için Promise dizisi
                  const productPromises = Object.entries(categoryProducts).map(
                    ([productIndex, product], pIndex) =>
                      new Promise((resolveProduct) => {
                        // Her ürün işlemesi arasında 0.5ms gecikme ekle
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

                              // Width ve height değerlerini sayıya çevir
                              const productWidth = Number(
                                productData.width || 0
                              );
                              const productHeight = Number(
                                productData.height || 0
                              );
                              const kontiWidth = Number(
                                dimensions.kontiWidth || 0
                              );
                              const kontiHeight = Number(
                                dimensions.kontiHeight || 0
                              );
                              const anaWidth = Number(dimensions.anaWidth || 0); // Konti değerleri ana değerler olarak kullan
                              const anaHeight = Number(
                                dimensions.anaHeight || 0
                              ); // Konti değerleri ana değerler olarak kullan

                              let calculatedPrice;

                              // Artis kategorisi için özel hesaplama
                              if (categoryPriceFormat === "artis") {
                                const currentWidth = anaWidth;
                                const currentHeight = anaHeight;
                                const newWidth = Number(
                                  productData?.width || 0
                                );
                                const newHeight = Number(
                                  productData?.height || 0
                                );
                                const totalWidth = currentWidth + newWidth;
                                const totalHeight = currentHeight + newHeight;
                                const newArea = totalWidth * totalHeight;
                                const anaArea = currentWidth * currentHeight;

                                const calculatedPrice = calculatePrice({
                                  priceFormat: "artis",
                                  basePrice: Number(selectedProduct.price),
                                  width: newWidth,
                                  height: newHeight,
                                  kontiWidth: currentWidth, // Mevcut konti boyutlarını kullan
                                  kontiHeight: currentHeight, // Mevcut konti boyutlarını kullan
                                });
                              } else {
                                // Diğer kategoriler için normal hesaplama
                                calculatedPrice = calculatePrice({
                                  priceFormat: categoryPriceFormat,
                                  basePrice,
                                  width: productWidth,
                                  height: productHeight,
                                  kontiWidth,
                                  kontiHeight,
                                  anaWidth,
                                  anaHeight,
                                });
                              }

                              console.log(
                                `Ürün: ${productData.name}, Fiyat: ${basePrice}, Hesaplanan: ${calculatedPrice}`
                              );

                              // Fiyatı güncelle
                              updatedOrderData[categoryName][productIndex] = {
                                ...product,
                                price: calculatedPrice,
                              };
                            }
                            resolveProduct();
                          } catch (error) {
                            console.error(
                              `${categoryName} ürün fiyatı güncellenirken hata:`,
                              error
                            );
                            resolveProduct();
                          }
                        }, pIndex * 0.5); // Her ürün arasında 0.5ms gecikme
                      })
                  );

                  // Kategori içindeki tüm ürünlerin işlenmesini bekle
                  await Promise.all(productPromises);
                  resolve();
                } catch (error) {
                  console.error(
                    `Kategori ${categoryName} işlenirken hata:`,
                    error
                  );
                  resolve();
                }
              }, categoryIndex * 0.5); // Her kategori arasında 0.5ms gecikme
            })
        );

        // Tüm kategorilerin işlenmesini bekle
        await Promise.all(categoryPromises);

        // Bonus ürünlerin fiyatlarını güncelle
        const updatedBonusItems = [...savedItems];

        // Bonus öğeleri işlemek için Promise dizisi
        const bonusPromises = updatedBonusItems.map(
          (bonusItem, index) =>
            new Promise((resolve) => {
              // Her bonus öğesi arasında 0.5ms gecikme ekle
              setTimeout(async () => {
                try {
                  // Sadece fiyat olarak eklenmiş öğeler için güncelleme yapmıyoruz
                  if (
                    bonusItem.priceOnly ||
                    !bonusItem.category ||
                    !bonusItem.product
                  ) {
                    resolve();
                    return;
                  }

                  // Bonus ürünün kategorisinin priceFormat değerini alalım
                  let bonusCategoryPriceFormat = "tekil"; // Varsayılan değer
                  const matchingBonusCategory = findCategoryByPropertyName(
                    bonusItem.category
                  );

                  if (
                    matchingBonusCategory &&
                    matchingBonusCategory.priceFormat
                  ) {
                    bonusCategoryPriceFormat =
                      matchingBonusCategory.priceFormat;
                  } else if (
                    updatedCategories[bonusItem.category] &&
                    updatedCategories[bonusItem.category].priceFormat
                  ) {
                    bonusCategoryPriceFormat =
                      updatedCategories[bonusItem.category].priceFormat;
                  }

                  const productRef = ref(
                    database,
                    `products/${bonusItem.category}/${bonusItem.product}`
                  );
                  const snapshot = await get(productRef);

                  if (snapshot.exists()) {
                    const productData = snapshot.val();
                    const basePrice = Number(
                      productData.price || bonusItem.price
                    );

                    // Width ve height değerlerini sayıya çevir
                    const itemWidth = Number(bonusItem.width || 0);
                    const itemHeight = Number(bonusItem.height || 0);
                    const kontiWidth = Number(dimensions.kontiWidth || 0);
                    const kontiHeight = Number(dimensions.kontiHeight || 0);
                    const anaWidth = Number(dimensions.kontiWidth || 0); // Konti değerleri ana değerler olarak kullan
                    const anaHeight = Number(dimensions.kontiHeight || 0); // Konti değerleri ana değerler olarak kullan

                    let calculatedPrice;

                    // Artis kategorisi için özel hesaplama
                    if (bonusCategoryPriceFormat === "artis") {
                      const currentWidth = anaWidth;
                      const currentHeight = anaHeight;
                      const newWidth = Number(productData?.width || 0);
                      const newHeight = Number(productData?.height || 0);
                      const totalWidth = currentWidth + newWidth;
                      const totalHeight = currentHeight + newHeight;
                      const newArea = totalWidth * totalHeight;
                      const anaArea = currentWidth * currentHeight;

                      const calculatedPrice = calculatePrice({
                        priceFormat: "artis",
                        basePrice: Number(selectedProduct.price),
                        width: newWidth,
                        height: newHeight,
                        kontiWidth: currentWidth, // Mevcut konti boyutlarını kullan
                        kontiHeight: currentHeight, // Mevcut konti boyutlarını kullan
                      });
                    } else {
                      // Diğer kategoriler için normal hesaplama
                      calculatedPrice = calculatePrice({
                        priceFormat: bonusCategoryPriceFormat,
                        basePrice,
                        width: itemWidth,
                        height: itemHeight,
                        kontiWidth,
                        kontiHeight,
                        anaWidth,
                        anaHeight,
                      });
                    }

                    // Bonus ürünün fiyatını güncelle
                    updatedBonusItems[index] = {
                      ...bonusItem,
                      price: calculatedPrice,
                    };
                  }
                  resolve();
                } catch (error) {
                  console.error(
                    `Bonus ürün fiyatı güncellenirken hata:`,
                    error
                  );
                  resolve();
                }
              }, index * 0.5); // Her bonus öğesi arasında 0.5ms gecikme
            })
        );

        // Tüm bonus öğelerinin işlenmesini bekle
        await Promise.all(bonusPromises);

        // State'leri güncelle
        setLocalOrderData(updatedOrderData);
        setSavedItems(updatedBonusItems);
        setShouldRecalcPrices(false);
        // İşlem tamamlandı bildirimi
        toast.dismiss(loadingToast);
        toast.success("Ürün fiyatları başarıyla güncellendi");
      }, 300);
      // Ana ürünlerin fiyatlarını güncelle
    } catch (error) {
      console.error("Fiyat güncellemesi sırasında hata:", error);
      toast.error("Fiyat güncellemesi sırasında bir hata oluştu");
      setShouldRecalcPrices(false);
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] max-h-[85vh] p-0 flex flex-col bg-gray-900">
        {/* Header */}
        <div className="border-b border-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-100">
              Sipariş Düzenle - {customer.fullName}
            </h1>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Left Panel */}
            <div className="flex-1 flex flex-col h-full border-r border-gray-800">
              <div className="p-4 space-y-4 overflow-y-auto">
                {/* Customer Info Card */}
                <div className="bg-gray-800/40 rounded-lg p-4 backdrop-blur-sm">
                  <CustomerInfo customer={customer} />
                </div>

                {/* Order Details Card */}
                <div className="bg-gray-800/40 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex justify-between mb-4">
                    <h2 className="text-lg font-medium text-gray-200">
                      Sipariş Detayları
                    </h2>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-400">
                        {
                          Object.keys(localOrderData).filter(
                            (key) =>
                              ![
                                "status",
                                "verandaWidth",
                                "verandaHeight",
                                "dimensions",
                                "kontiWidth",
                                "kontiHeight",
                                "notes",
                              ].includes(key)
                          ).length
                        }{" "}
                        Ürün
                      </span>
                      <button
                        onClick={handleRefreshPrices}
                        className="p-1 rounded hover:bg-gray-700/50 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Fiyatları Güncelle"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* OrderDetails */}
                    <div className="border-r border-gray-700 pr-3">
                      <div className="mb-3 pb-2 border-b border-gray-700">
                        <h3 className="text-sm font-medium text-gray-300">
                          Ürünler
                        </h3>
                      </div>
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
                        orderKey={orderKey}
                        dimensions={dimensions}
                        setDimensions={setDimensions}
                        shouldRecalc={shouldRecalcPrices}
                      />
                    </div>

                    {/* Bonus Items */}
                    <div className="pl-3">
                      <div className="mb-3 pb-2 border-b border-gray-700">
                        <h3 className="text-sm font-medium text-gray-300">
                          Bonus Ürünler
                        </h3>
                      </div>
                      <BonusItems
                        localOrderData={localOrderData}
                        savedItems={savedItems}
                        newItems={newItems}
                        categories={categories}
                        products={products}
                        editingSavedItem={editingSavedItem}
                        editingSavedValues={editingSavedValues}
                        setSavedItems={setSavedItems}
                        setNewItems={setNewItems}
                        setEditingSavedItem={setEditingSavedItem}
                        setEditingSavedValues={setEditingSavedValues}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Split into two sections */}
            <div className="w-[300px] flex flex-col h-full bg-gray-800/30 border-l border-gray-700">
              {/* Notes Section */}
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto p-3">
                  <OrderNotes
                    orderKey={orderKey}
                    isMainOrder={isMainOrder}
                    customerId={customerId} // Use customerId if provided, else fallback to customer.id
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 bg-gray-900/95 backdrop-blur-sm p-4">
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

OrderEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.shape({
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string,
    phone: PropTypes.string,
  }).isRequired,
  orderKey: PropTypes.string.isRequired,
  orderData: PropTypes.shape({
    status: PropTypes.string,
    notes: PropTypes.string,
    dimensions: PropTypes.shape({
      kontiWidth: PropTypes.number,
      kontiHeight: PropTypes.number,
      anaWidth: PropTypes.number,
      anaHeight: PropTypes.number,
      verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      length: PropTypes.number,
    }),
    // Her kategori için dinamik nesne yapısı
    [PropTypes.string]: PropTypes.objectOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        price: PropTypes.number.isRequired,
        productCollectionId: PropTypes.string,
      })
    ),
  }).isRequired,
  initialDimensions: PropTypes.shape({
    kontiWidth: PropTypes.number,
    kontiHeight: PropTypes.number,
    anaWidth: PropTypes.number,
    anaHeight: PropTypes.number,
    verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    length: PropTypes.number,
  }),
  isMainOrder: PropTypes.bool,
  customerId: PropTypes.string,
};

export default OrderEditModal;
