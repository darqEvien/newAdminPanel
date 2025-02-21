import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

const BonusItems = ({
  savedItems,
  newItems,
  categories,
  products,
  setSavedItems,
  setNewItems
}) => {
  const [editingItem, setEditingItem] = useState(null);
  const [editingNewItem, setEditingNewItem] = useState(null);
  const [editingValues, setEditingValues] = useState({
    category: '',
    product: '',
    price: '',
    isCustomCategory: false,
    isCustomProduct: false,
    productId: null
  });

  const handleDelete = useCallback((index) => {
    setSavedItems(prev => prev.filter((_, idx) => idx !== index));
  }, [setSavedItems]);

  const handleEdit = useCallback((index) => {
    const item = savedItems[index];
    setEditingItem(index);
    setEditingValues({
      category: item.category,
      product: item.product,
      price: item.price,
      isCustomCategory: item.isCustomCategory,
      isCustomProduct: item.isCustomProduct,
      productId: item.productId
    });
  }, [savedItems]);

  const handleStartPriceEdit = useCallback((index, item) => {
    setEditingItem(index);
    setEditingValues({
      ...item,
      price: item.price.toString()
    });
  }, []);

  // Yeni ürün için fiyat düzenleme başlatma
  const handleStartNewItemPriceEdit = useCallback((index, item) => {
    setEditingNewItem(index);
    setEditingValues({
      ...item,
      price: item.price.toString()
    });
  }, []);
  
  const handlePriceChange = useCallback((e) => {
    setEditingValues(prev => ({
      ...prev,
      price: e.target.value
    }));
  }, []);

  // Yeni ürün fiyat değişikliği
  const handleNewItemPriceChange = useCallback((index, value) => {
    setNewItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        price: value
      };
      return updated;
    });
  }, [setNewItems]);
  
  const handleEditSave = useCallback((index) => {
    setSavedItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...prev[index],
        price: editingValues.price
      };
      return updated;
    });
    setEditingItem(null);
  }, [setSavedItems, editingValues]);

  // Kategorileri sırala
  const sortedCategories = useCallback(() => {
    return Object.values(categories).sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [categories]);

  // Yeni item ekleme
  const handleAddNewItem = () => {
    setNewItems(prev => [...prev, {
      category: '',
      product: '',
      price: '',
      isCustomCategory: false,
      isCustomProduct: false
    }]);
  };

  // Kategori seçimi
  const handleCategorySelect = (index, value) => {
    const updatedItems = [...newItems];
    if (value === 'custom') {
      updatedItems[index] = {
        ...updatedItems[index],
        isCustomCategory: true,
        category: '',
        product: '',
        price: ''
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        isCustomCategory: false,
        category: value,
        product: '',
        price: ''
      };
    }
    setNewItems(updatedItems);
  };

  // Ürün seçimi
  const handleProductSelect = (index, value) => {
    const updatedItems = [...newItems];
    const item = updatedItems[index];
  
    if (value === 'custom') {
      updatedItems[index] = {
        ...item,
        isCustomProduct: true,
        product: '',
        price: ''
      };
    } else {
      const selectedProduct = JSON.parse(value);
      updatedItems[index] = {
        ...item,
        isCustomProduct: false,
        product: selectedProduct.name,
        productId: selectedProduct.id,
        price: selectedProduct.price?.toString() || '0'
      };
    }
    setNewItems(updatedItems);
  };

  // Custom değer girişi
  const handleCustomInput = (index, field, value) => {
    const updatedItems = [...newItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setNewItems(updatedItems);
  };

  // Item'ı kaydet
  const handleSaveItem = (index) => {
    const itemToSave = newItems[index];
    setSavedItems(prev => [...prev, itemToSave]);
    
    // Remove from newItems
    const updatedNewItems = newItems.filter((_, idx) => idx !== index);
    setNewItems(updatedNewItems);
  };

  // Item'ı sil
  const handleRemoveItem = (index) => {
    setNewItems(prev => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="space-y-4">
      {/* Kayıtlı Bonus Ürünler */}
      {savedItems.map((item, index) => (
        <div key={index} className="bg-gray-800/30 p-2 rounded">
          <div className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 items-center">
            {/* Kategori */}
            <span className="text-gray-400 text-xs">
              {categories[item.category]?.title || item.category}
            </span>
            
            {/* Ürün */}
            <span className="text-gray-300 text-xs">
              {item.product}
            </span>
            
            {/* Fiyat */}
            {editingItem === index ? (
              <input
                type="number"
                value={editingValues.price}
                onChange={handlePriceChange}
                onBlur={() => handleEditSave(index)}
                onKeyDown={(e) => e.key === 'Enter' && handleEditSave(index)}
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                autoFocus
              />
            ) : (
              <span 
                className="text-green-400 text-xs cursor-pointer hover:text-green-300"
                onClick={() => handleStartPriceEdit(index, item)}
              >
                {Number(item.price).toLocaleString('tr-TR')}₺
              </span>
            )}

            {/* Silme Butonu */}
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(index)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Yeni Bonus Ürün Ekleme Formları */}
      {newItems.map((item, index) => (
        <div key={index} className="bg-gray-700/30 p-2 rounded">
          <div className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 items-center">
            {/* Kategori Seçimi */}
            <div>
              {item.isCustomCategory ? (
                <input
                  type="text"
                  value={item.category}
                  onChange={(e) => handleCustomInput(index, 'category', e.target.value)}
                  placeholder="Kategori Adı"
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                />
              ) : (
                <select
                  value={item.category}
                  onChange={(e) => handleCategorySelect(index, e.target.value)}
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                >
                  <option value="">Kategori Seçin</option>
                  {sortedCategories().map((category) => (
                    <option key={category.propertyName} value={category.propertyName}>
                      {category.title}
                    </option>
                  ))}
                  <option value="custom">Diğer</option>
                </select>
              )}
            </div>

            {/* Ürün Seçimi */}
            <div>
              {item.isCustomProduct ? (
                <input
                  type="text"
                  value={item.product}
                  onChange={(e) => handleCustomInput(index, 'product', e.target.value)}
                  placeholder="Ürün Adı"
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                />
              ) : (
                <select
                  value={item.productId ? JSON.stringify({
                    id: item.productId,
                    name: item.product,
                    price: item.price
                  }) : ""}
                  onChange={(e) => handleProductSelect(index, e.target.value)}
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                >
                  <option value="">Ürün Seçin</option>
                  {products[item.category] && 
                    Object.entries(products[item.category])
                      .sort(([,a], [,b]) => (a.order || 999) - (b.order || 999))
                      .map(([key, product]) => (
                        <option 
                          key={key} 
                          value={JSON.stringify({
                            id: key,
                            name: product.title || product.name,
                            price: product.price
                          })}
                        >
                          {product.title || product.name} - {Number(product.price).toLocaleString('tr-TR')}₺
                        </option>
                      ))
                  }
                  <option value="custom">Diğer</option>
                </select>
              )}
            </div>

            {/* Fiyat Girişi */}
            {editingNewItem === index ? (
              <input
                type="number"
                value={item.price}
                onChange={(e) => handleNewItemPriceChange(index, e.target.value)}
                onBlur={() => setEditingNewItem(null)}
                onKeyDown={(e) => e.key === 'Enter' && setEditingNewItem(null)}
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                autoFocus
              />
            ) : (
              <span 
                className="text-green-400 text-xs cursor-pointer hover:text-green-300"
                onClick={() => handleStartNewItemPriceEdit(index, item)}
              >
                {item.price ? `${Number(item.price).toLocaleString('tr-TR')}₺` : 'Fiyat girin'}
              </span>
            )}

            {/* Aksiyon Butonları */}
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveItem(index)}
                className="text-green-400 hover:text-green-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => handleRemoveItem(index)}
                className="text-red-400 hover:text-red-300 p-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Yeni Ürün Ekleme Butonu */}
      <button
        onClick={handleAddNewItem}
        className="w-full h-8 flex items-center justify-center text-gray-500 hover:text-gray-400"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
};

BonusItems.propTypes = {
  savedItems: PropTypes.array.isRequired,
  newItems: PropTypes.array.isRequired,
  categories: PropTypes.object.isRequired,
  products: PropTypes.object.isRequired,
  setSavedItems: PropTypes.func.isRequired,
  setNewItems: PropTypes.func.isRequired
};

export default BonusItems;