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
          console.error("Geçersiz giriş değerleri:", { value, categoryName, productIndex });
          return;
        }
  
        const selectedProduct = JSON.parse(value);
        const category = Object.values(categories).find(
          (cat) => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
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
  
          // State güncellemelerini toplu yap
          const updates = async () => {
            // 1. LocalOrderData güncelleme
            await setLocalOrderData(prev => {
              const newData = { ...prev };
              
              // Artis kategorilerini temizle
              Object.entries(prev).forEach(([key, _]) => {
                if (key.toLowerCase().includes("en") || key.toLowerCase().includes("boy")) {
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
            await setDimensions(prev => ({
              ...prev,
              kontiWidth,
              kontiHeight,
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
          
          const currentKontiWidth = Number(dimensions.kontiWidth) || 0;
          const currentKontiHeight = Number(dimensions.kontiHeight) || 0;
        
          // Yeni konti boyutları
          const updatedKontiWidth = currentKontiWidth - oldWidth + newWidth;
          const updatedKontiHeight = currentKontiHeight - oldHeight + newHeight;
        
          // Fiyat hesaplama - kenar uzunluğuna göre
          const calcPrice = calculatePrice({
            priceFormat: "artis",
            basePrice: Number(selectedProduct.price),
            width: newWidth,
            height: newHeight,
            kontiWidth: currentKontiWidth, // Mevcut konti boyutlarını kullan
            kontiHeight: currentKontiHeight // Mevcut konti boyutlarını kullan
          });
        
          console.log("Artis Hesaplama:", {
            kategori: categoryName,
            ürün: selectedProduct.name,
            eskiBoyutlar: `${currentKontiWidth}x${currentKontiHeight}`,
            yeniBoyutlar: `${updatedKontiWidth}x${updatedKontiHeight}`,
            kenarUzunluğu: newWidth || newHeight,
            fiyat: calcPrice
          });
  
          // State güncellemelerini toplu yap
          const updates = async () => {
            // 1. Dimensions güncelleme
            await setDimensions(prev => ({
              ...prev,
              kontiWidth: updatedKontiWidth,
              kontiHeight: updatedKontiHeight,
            }));
  
            // 2. LocalOrderData güncelleme
            await setLocalOrderData(prev => ({
              ...prev,
              dimensions: {
                ...prev.dimensions,
                kontiWidth: updatedKontiWidth,
                kontiHeight: updatedKontiHeight,
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
  
            // 3. Editing values güncelleme
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
    [categories, products, dimensions, localOrderData, setDimensions, setLocalOrderData, setEditingValues, setSelectedProduct]
  );
  
  useEffect(() => {
    if (!categories || !products || !localOrderData || isUpdating) return;
  
    // Önce konti ürünlerini işle
    const processKontiProducts = () => {
      Object.entries(localOrderData).forEach(([categoryName, categoryProducts]) => {
        const category = Object.values(categories).find(
          (cat) => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );
  
        if (category?.priceFormat === "konti") {
          Object.entries(categoryProducts).forEach(([productIndex, product]) => {
            if (product.productCollectionId && product.productCollectionId !== "istemiyorum") {
              const simulatedProduct = {
                id: product.productCollectionId,
                name: product.name,
                price: product.price,
                custom: false
              };
              handleProductSelect(JSON.stringify(simulatedProduct), categoryName, productIndex);
            }
          });
        }
      });
    };
  
    // İlk yükleme için bir kere çalıştır
    const initialized = sessionStorage.getItem('productsInitialized');
    if (!initialized) {
      processKontiProducts();
      sessionStorage.setItem('productsInitialized', 'true');
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
                                .filter(
                                  ([key, ]) => key !== selectedProduct?.id
                                ) // Seçili ürünü filtrele
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
                        <span className="text-green-400 text-xs">
                          {Number(product.price)?.toLocaleString("tr-TR")}₺
                        </span>
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
    verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    length: PropTypes.number,
  }).isRequired,
  setDimensions: PropTypes.func.isRequired,
};

export default OrderDetails;
