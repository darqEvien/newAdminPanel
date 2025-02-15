import { useCallback } from 'react';
import PropTypes from 'prop-types';

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
  setLocalOrderData
}) => {
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

  // Ürün düzenleme modunu aç
  const handleEdit = useCallback((categoryName, productIndex, product) => {
    setEditingItem(`${categoryName}-${productIndex}`);
    
    // Mevcut ürünü selectedProduct olarak ayarla
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
  

  // Ürün seçimi
  const handleProductSelect = useCallback((value, categoryName, productIndex) => {
    try {
      const selectedProduct = JSON.parse(value);
      
      if (selectedProduct.custom) {
        // Diğer seçeneği için
        setSelectedProduct({
          name: editingValues.name,
          price: Number(editingValues.price),
          custom: true
        });
      } else {
        // Varolan ürün seçimi için
        setSelectedProduct(selectedProduct);
        setEditingValues({
          name: selectedProduct.name,
          price: selectedProduct.price?.toString()
        });

        // LocalOrderData'yı güncelle
        setLocalOrderData(prev => ({
          ...prev,
          [categoryName]: {
            ...prev[categoryName],
            [productIndex]: {
              name: selectedProduct.name,
              price: selectedProduct.price,
              productCollectionId: selectedProduct.id
            }
          }
        }));
      }
    } catch (error) {
      console.error('Ürün seçimi hatası:', error);
    }
  }, [editingValues, setSelectedProduct, setEditingValues, setLocalOrderData]);

  // Fiyat değişikliği
  const handlePriceChange = useCallback((e, categoryName, productIndex) => {
    const newPrice = e.target.value;
    setEditingValues(prev => ({
      ...prev,
      price: newPrice
    }));
  }, [setEditingValues]);

  // Değişiklikleri kaydet
  const handleSave = useCallback((categoryName, productIndex) => {
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
    setEditingItem(null);
    setSelectedProduct(null);
  }, [selectedProduct, editingValues, setLocalOrderData, setEditingItem, setSelectedProduct]);

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
  setLocalOrderData: PropTypes.func.isRequired
};

export default OrderDetails;