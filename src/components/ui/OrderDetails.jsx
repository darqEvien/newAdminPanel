import { useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { calculatePrice } from '../../utils/priceCalculator'
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
    setDimensions
  }) => {
    
    // Initialize konti dimensions from dimensions object
    useEffect(() => {
        if (localOrderData.dimensions) {
          setDimensions({
            kontiWidth: Number(localOrderData.dimensions?.kontiWidth) || 0,
            kontiHeight: Number(localOrderData.dimensions?.kontiHeight) || 0
          });
          console.log('Initial kontiWidth:', Number(localOrderData.dimensions?.kontiWidth));
          console.log('Initial kontiHeight:', Number(localOrderData.dimensions?.kontiHeight));
        }
      }, [localOrderData, setDimensions]);
  
    // Parse konti dimensions from product name
      const parseKontiDimensions = (name) => {
    const dimensions = name.split('x').map(n => parseInt(n.trim()));
    return dimensions.length === 2 ? dimensions : [0, 0];
  };
  
    // Kategorileri sırala
    const sortCategories = useCallback((a, b) => {
      const categoryA = Object.values(categories).find(
        cat => cat.propertyName?.toLowerCase() === a.toLowerCase()
      );
      const categoryB = Object.values(categories).find(
        cat => cat.propertyName?.toLowerCase() === b.toLowerCase()
      );
      return (categoryA?.order || 999) - (categoryB?.order || 999);
    }, [categories]);
  
    // Ürünleri sırala
    const sortProducts = useCallback((products) => {
      return Object.entries(products).sort((a, b) => {
        const orderA = a[1].order || 999;
        const orderB = b[1].order || 999;
        return orderA - orderB;
      });
    }, []);
  
    // Update artis dimensions
    const updateArtisDimensions = (newProduct, oldProduct = null) => {
      setLocalOrderData(prev => {
        let kontiWidth = parseFloat(prev.kontiWidth) || 0;
        let kontiHeight = parseFloat(prev.kontiHeight) || 0;
  
        // Remove old product dimensions if exists
        if (oldProduct) {
          kontiWidth -= parseFloat(oldProduct.width) || 0;
          kontiHeight -= parseFloat(oldProduct.height) || 0;
        }
  
        // Add new product dimensions
        kontiWidth += parseFloat(newProduct.width) || 0;
        kontiHeight += parseFloat(newProduct.height) || 0;
  
        return {
          ...prev,
          kontiWidth,
          kontiHeight
        };
      });
    };
  
    // Ürün düzenleme modunu aç
    const handleEdit = useCallback((categoryName, productIndex, product) => {
      setEditingItem(`${categoryName}-${productIndex}`);
      
      setSelectedProduct({
        id: product.productCollectionId,
        name: product.name,
        price: product.price,
        custom: !product.productCollectionId
      });
    
      setEditingValues({
        name: product.name,
        price: product.price?.toString() || "0"
      });
    }, [setEditingItem, setSelectedProduct, setEditingValues]);
  
    // Handle custom konti name input
    const handleKontiNameChange = (value) => {
        const [width, height] = parseKontiDimensions(value);
        setEditingValues(prev => ({
          ...prev,
          name: value
        }));
        setLocalOrderData(prev => ({
          ...prev,
          kontiWidth: width,
          kontiHeight: height
        }));
      };
  
    // Ürün seçimi
    const handleProductSelect = useCallback((value, categoryName, productIndex) => {
      try {
        const selectedProduct = JSON.parse(value);
        const category = Object.values(categories).find(
          cat => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );
        
        if (selectedProduct.custom) {
          // Konti için özel işlem
          if (categoryName.toLowerCase() === 'konti') {
            setSelectedProduct({
              name: '',
              price: 0,
              custom: true
            });
            setEditingValues({
              name: '',
              price: '0'
            });
          } else {
            setSelectedProduct({
              name: editingValues.name,
              price: Number(editingValues.price),
              custom: true
            });
          }
        } else {
          const productData = products[categoryName]?.[selectedProduct.id];
          
          // Handle artis category
          if (category?.format === 'artis') {
            const currentProduct = localOrderData[categoryName]?.[productIndex];
            if (productData) {
              updateArtisDimensions(productData, currentProduct);
            }
          }
          
          // Handle konti selection
          if (categoryName.toLowerCase() === 'konti') {
            setLocalOrderData(prev => ({
              ...prev,
              kontiWidth: productData?.width || 0,
              kontiHeight: productData?.height || 0
            }));
          }
          const calcPrice = calculatePrice({
            priceFormat: category?.priceFormat,
            basePrice: selectedProduct.price,
            width: Number(selectedProduct.width) || 0,
            height: Number(selectedProduct.height) || 0,
            kontiWidth: Number(dimensions.kontiWidth) || 0,
            kontiHeight: Number(dimensions.kontiHeight) || 0
          });
          setSelectedProduct(selectedProduct);
          setEditingValues({
            name: selectedProduct.name,
            price: calcPrice?.toString(),
            width: selectedProduct.width,
            height: selectedProduct.height
          });
  
          setLocalOrderData(prev => ({
            ...prev,
            [categoryName]: {
              ...prev[categoryName],
              [productIndex]: {
                name: selectedProduct.name,
                price: calcPrice,
                productCollectionId: selectedProduct.id,
                width: productData?.width,
                height: productData?.height
              }
            }
          }));
        }
      } catch (error) {
        console.error('Ürün seçimi hatası:', error);
      }
    }, [editingValues, setSelectedProduct, setEditingValues, setLocalOrderData, categories, products,dimensions]);
  
    // Değişiklikleri kaydet
    const handleSave = useCallback((categoryName, productIndex) => {
      if (categoryName.toLowerCase() === 'konti' && selectedProduct?.custom) {
        const [width, height] = parseKontiDimensions(editingValues.name);
        setLocalOrderData(prev => ({
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
              height
            }
          }
        }));
      } else {
        setLocalOrderData(prev => ({
          ...prev,
          [categoryName]: {
            ...prev[categoryName],
            [productIndex]: {
              name: selectedProduct.custom ? editingValues.name : selectedProduct.name,
              price: Number(editingValues.price),
              productCollectionId: selectedProduct.custom ? null : selectedProduct.id
            }
          }
        }));
      }
      setEditingItem(null);
      setSelectedProduct(null);
    }, [selectedProduct, editingValues, setLocalOrderData, setEditingItem, setSelectedProduct]);
  
    
    const handlePriceChange = useCallback((e, categoryName, productIndex) => {
        const newPrice = e.target.value;
        setEditingValues(prev => ({
          ...prev,
          price: newPrice
        }));
      }, [setEditingValues]);
  return (
    <div className="grid grid-cols-1 divide-y divide-gray-700/50">
      {Object.entries(localOrderData)
        .filter(([categoryName]) => 
          !['status', 'verandaWidth', 'verandaHeight'].includes(categoryName))
        .sort(([a], [b]) => sortCategories(a, b))
        .map(([categoryName, categoryProducts]) => {
          const category = Object.values(categories).find(
            cat => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
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
  value={selectedProduct ? JSON.stringify(selectedProduct) : ""}
  onChange={(e) => handleProductSelect(e.target.value, categoryName, productIndex)}
  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
>
  {/* Önce mevcut seçili ürünü göster */}
  {selectedProduct && !selectedProduct.custom && (
    <option 
      value={JSON.stringify(selectedProduct)}
    >
      {selectedProduct.name} - {Number(selectedProduct.price)?.toLocaleString("tr-TR")}₺
    </option>
  )}
  {/* Sonra diğer ürünleri göster */}
  {products[categoryName] && 
    sortProducts(products[categoryName])
      .filter(([key, _]) => key !== selectedProduct?.id) // Seçili ürünü filtrele
      .map(([key, product]) => (
        <option 
          key={key} 
          value={JSON.stringify({
            id: key,
            name: product.title || product.name,
            price: product.price,
            custom: false
          })}
        >
          {product.title || product.name} - {Number(product.price)?.toLocaleString("tr-TR")}₺
        </option>
      ))
  }
  <option value='{"custom":true}'>Diğer</option>
</select>
                      </div>
                      <input
                        type="number"
                        value={editingValues.price}
                        onChange={(e) => handlePriceChange(e, categoryName, productIndex)}
                        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSave(categoryName, productIndex)}
                          className="text-green-400 hover:text-green-300 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
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
                        onClick={() => handleEdit(categoryName, productIndex, product)}
                      >
                        {product.name}
                      </span>
                      <span className="text-green-400 text-xs">
                        {Number(product.price)?.toLocaleString("tr-TR")}₺
                      </span>
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
    verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    length: PropTypes.number
  }).isRequired,
  setDimensions: PropTypes.func.isRequired
};

export default OrderDetails;