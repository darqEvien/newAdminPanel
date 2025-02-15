import { useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import useKeyboardShortcuts from './useKeybordShortcuts'

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
  const [editingField, setEditingField] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingValues, setEditingValues] = useState({
    category: '',
    product: '',
    price: '',
    isCustomCategory: false,
    isCustomProduct: false,
    productId: null
  });
  const [isShortcutsVisible, setIsShortcutsVisible] = useState(false);

  // Handler functions defined before useKeyboardShortcuts
  const handleNext = useCallback(() => {
    setActiveIndex(prev => Math.min(prev + 1, savedItems.length - 1));
  }, [savedItems.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const handleStartEdit = useCallback((index, field, item) => {
    setEditingItem(index);
    setEditingField(field);
    setEditingValues({
      ...item,
      price: item.price.toString()
    });
  }, []);

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
    setEditingField(null);
  }, [setSavedItems, editingValues]);

  const handleCancel = useCallback(() => {
    setEditingItem(null);
    setEditingField(null);
  }, []);

  const handleAddNewItem = useCallback(() => {
    setNewItems(prev => [...prev, {
      category: '',
      product: '',
      price: '',
      isCustomCategory: false,
      isCustomProduct: false
    }]);
  }, [setNewItems]);

  // Now we can use useKeyboardShortcuts after all handlers are defined
  const { isMac } = useKeyboardShortcuts({
    items: savedItems,
    currentIndex: activeIndex,
    currentField: editingField,
    isEditing: editingItem !== null,
    onNext: handleNext,
    onPrev: handlePrev,
    onStartEdit: handleStartEdit,
    onSave: handleEditSave,
    onCancel: handleCancel,
    onNewItem: handleAddNewItem
  });
  const handleDelete = useCallback((index) => {
    setSavedItems(prev => prev.filter((_, idx) => idx !== index));
  }, [setSavedItems]);

//   const handleEdit = useCallback((index) => {
//     const item = savedItems[index];
//     setEditingItem(index);
//     setEditingValues({
//       category: item.category,
//       product: item.product,
//       price: item.price,
//       isCustomCategory: item.isCustomCategory,
//       isCustomProduct: item.isCustomProduct,
//       productId: item.productId
//     });
//   }, [savedItems]);

//   const handleStartPriceEdit = useCallback((index, item) => {
//     setEditingItem(index);
//     setEditingValues({
//       ...item,
//       price: item.price.toString()
//     });
//   }, []);

  // Yeni ürün için fiyat düzenleme başlatma
  const handleStartNewItemPriceEdit = useCallback((index, item) => {
    setEditingNewItem(index);
    setEditingValues({
      ...item,
      price: item.price.toString()
    });
  }, []);
  


  // Fiyat değişikliği
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
  
  const handleSavedCategoryChange = useCallback((index, value) => {
    setSavedItems(prev => {
      const updated = [...prev];
      if (value === 'custom') {
        updated[index] = {
          ...updated[index],
          category: '',
          product: '',
          productId: null,
          isCustomCategory: true,
          isCustomProduct: true
        };
      } else {
        updated[index] = {
          ...updated[index],
          category: value,
          product: '',
          productId: null,
          isCustomCategory: false,
          isCustomProduct: false
        };
      }
      return updated;
    });
    setEditingField(null);
  }, [setSavedItems]);

  // Kaydedilmiş ürün için ürün değiştirme
  const handleSavedProductChange = useCallback((index, value) => {
    setSavedItems(prev => {
      const updated = [...prev];
      if (value === 'custom') {
        updated[index] = {
          ...updated[index],
          product: '',
          productId: null,
          isCustomProduct: true
        };
      } else {
        const selectedProduct = JSON.parse(value);
        updated[index] = {
          ...updated[index],
          product: selectedProduct.name,
          productId: selectedProduct.id,
          price: selectedProduct.price?.toString() || '0',
          isCustomProduct: false
        };
      }
      return updated;
    });
    setEditingField(null);
  }, [setSavedItems]);



  // Kategorileri sırala
  const sortedCategories = useCallback(() => {
    return Object.values(categories).sort((a, b) => (a.order || 999) - (b.order || 999));
  }, [categories]);

  // Yeni item ekleme


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
  const handleSavedCustomInput = useCallback((index, field, value) => {
    setSavedItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value
      };
      return updated;
    });
  }, [setSavedItems]);
  return (
    
    <div className="space-y-4">
      <div className="text-xs text-gray-500">
    <button
      onClick={() => setIsShortcutsVisible(!isShortcutsVisible)}
      className="flex items-center gap-2 hover:text-gray-400 transition-colors"
    >
      <svg
        className={`w-4 h-4 transform transition-transform ${
          isShortcutsVisible ? 'rotate-180' : ''
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
      <span>Klavye Kısayolları</span>
    </button>

    {isShortcutsVisible && (
  <div className="mt-2 space-y-1 pl-6">
    <ul className="list-disc list-inside">
      <li>{isMac ? '⌥' : 'Alt'} + ↑/↓: Öğeler arası gezinme</li>
      <li>{isMac ? '⌥' : 'Alt'} + 1/2/3: Sırasıyla Kategori/Ürün/Fiyat düzenleme</li>
      <li>{isMac ? '⌥' : 'Alt'} + N: Yeni ürün ekle</li>
      <li>Tab / {isMac ? '⇧' : 'Shift'}+Tab: Alanlar arası gezinme</li>
      <li>{isMac ? '⎋' : 'Esc'}: Düzenlemeyi iptal et</li>
      <li>{isMac ? '↵' : 'Enter'}: Değişiklikleri kaydet</li>
    </ul>
  </div>
)}
  </div>
      {/* Kayıtlı Bonus Ürünler */}
      {savedItems.map((item, index) => (
         <div 
         key={index} 
         className={`bg-gray-800/30 p-2 rounded ${activeIndex === index ? 'ring-2 ring-blue-500' : ''}`}
       >
          <div className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 items-center">
            {/* Kategori */}
            {editingField === 'category' && editingItem === index ? (
              <div>
                {item.isCustomCategory ? (
                  <input
                    type="text"
                    value={item.category}
                    onChange={(e) => handleSavedCustomInput(index, 'category', e.target.value)}
                    onBlur={() => setEditingField(null)}
                    placeholder="Kategori Adı"
                    className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    autoFocus
                  />
                ) : (
                  <select
                    value={item.category}
                    onChange={(e) => handleSavedCategoryChange(index, e.target.value)}
                    onBlur={() => setEditingField(null)}
                    className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    autoFocus
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
            ) : (
              <span 
                className="text-gray-400 text-xs cursor-pointer hover:text-gray-300"
                onClick={() => handleStartEdit(index, 'category', item)}
              >
                {categories[item.category]?.title || item.category}
              </span>
            )}
            
            {/* Ürün */}
            {editingField === 'product' && editingItem === index ? (
              <div>
                {item.isCustomProduct ? (
                  <input
                    type="text"
                    value={item.product}
                    onChange={(e) => handleSavedCustomInput(index, 'product', e.target.value)}
                    onBlur={() => setEditingField(null)}
                    placeholder="Ürün Adı"
                    className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    autoFocus
                  />
                ) : (
                  <select
                    value={item.productId ? JSON.stringify({
                      id: item.productId,
                      name: item.product,
                      price: item.price
                    }) : "custom"}
                    onChange={(e) => handleSavedProductChange(index, e.target.value)}
                    onBlur={() => setEditingField(null)}
                    className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    autoFocus
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
            ) : (
              <span 
                className="text-gray-300 text-xs cursor-pointer hover:text-gray-200"
                onClick={() => handleStartEdit(index, 'product', item)}
              >
                {item.product}
              </span>
            )}
            
            {/* Fiyat */}
            {editingField === 'price' && editingItem === index ? (
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
                onClick={() => handleStartEdit(index, 'price', item)}
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