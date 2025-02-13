import { Dialog, DialogContent } from "./dialogForCustomers";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

const OrderSummary = ({ orderData, savedItems }) => {
    const calculateOrderTotal = () => {
      let total = 0;
      Object.values(orderData).forEach(products => {
        Object.values(products).forEach(product => {
          if (typeof product.price === 'number') {
            total += product.price;
          }
        });
      });
      return total;
    };
  
    const calculateBonusTotal = () => {
      return savedItems.reduce((total, item) => {
        return total + (Number(item.price) || 0);
      }, 0);
    };
  
    const orderTotal = calculateOrderTotal();
    const bonusTotal = calculateBonusTotal();
    const grandTotal = orderTotal + bonusTotal;
  
    return (
      <div className="bg-gray-800/95 border-t border-gray-700 p-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-700/30 rounded">
            <span className="text-gray-400">Fiyat:</span>
            <span className="text-green-400 font-medium">
              {orderTotal.toLocaleString('tr-TR')}₺
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-700/30 rounded">
            <span className="text-gray-400">Bonus:</span>
            <span className="text-blue-400 font-medium">
              {bonusTotal.toLocaleString('tr-TR')}₺
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-700/30 rounded">
            <span className="text-gray-400">Toplam Fiyat:</span>
            <span className="text-green-400 font-medium">
              {grandTotal.toLocaleString('tr-TR')}₺
            </span>
          </div>
        </div>
      </div>
    );
  };
  
  // Then use it inside OrderEditModa
  const OrderEditModal = ({ isOpen, onClose, customer, orderKey, orderData }) => {
    const [isAddingNote, setIsAddingNote] = useState(false);
    const [newNote, setNewNote] = useState("");
    const [notesLoading, setNotesLoading] = useState(false);
    const [categories, setCategories] = useState({});
    const [editingItem, setEditingItem] = useState(null);
    const [editingValues, setEditingValues] = useState({
      category: '',
      name: '',
      price: ''
    });
    const [savedItems, setSavedItems] = useState([]);
    const [newItems, setNewItems] = useState([
      { category: '', product: '', price: '' }
    ]);
    const [editingSavedItem, setEditingSavedItem] = useState(null);
const [editingSavedValues, setEditingSavedValues] = useState({
  category: '',
  product: '',
  price: ''
});

    useEffect(() => {
      const fetchCategories = async () => {
        try {
          const categoriesRef = ref(database, "categories");
          const snapshot = await get(categoriesRef);
          if (snapshot.exists()) {
            setCategories(snapshot.val());
          }
        } catch (error) {
          console.error("Error fetching categories:", error);
        }
      };
  
      fetchCategories();
    }, []);

      
    const handleOrderItemEdit = (categoryName, productIndex, product) => {
      setEditingItem(`${categoryName}-${productIndex}`);
      setEditingValues({
        category: categoryName,
        name: product.name || product.title,
        price: product.price
      });
    };
  
    // Update handleOrderItemSave function
const handleOrderItemSave = async (categoryName, productIndex) => {
    try {
      const updatedOrderData = { ...orderData };
      
      if (editingValues.category !== categoryName) {
        // Create new category if it doesn't exist
        if (!updatedOrderData[editingValues.category]) {
          updatedOrderData[editingValues.category] = {};
        }
        
        // Add the product to new category
        const productRef = ref(database, `customers/${orderKey}/products/0/${editingValues.category}/${productIndex}`);
        await set(productRef, {
          name: editingValues.name,
          price: Number(editingValues.price)
        });
        
        // Delete from old category
        const oldProductRef = ref(database, `customers/${orderKey}/products/0/${categoryName}/${productIndex}`);
        await set(oldProductRef, null);
        
        // Clean up empty category
        if (Object.keys(updatedOrderData[categoryName]).length === 0) {
          const oldCategoryRef = ref(database, `customers/${orderKey}/products/0/${categoryName}`);
          await set(oldCategoryRef, null);
        }
      } else {
        // Update in same category
        const productRef = ref(database, `customers/${orderKey}/products/0/${categoryName}/${productIndex}`);
        await set(productRef, {
          name: editingValues.name,
          price: Number(editingValues.price)
        });
      }
      
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };
  
  // Update handleDeleteOrderItem function
  const handleDeleteOrderItem = async (categoryName, productIndex) => {
    try {
      // Delete specific product
      const productRef = ref(database, `customers/${orderKey}/products/0/${categoryName}/${productIndex}`);
      await set(productRef, null);
      
      // Check if category is empty and delete if necessary
      const categoryRef = ref(database, `customers/${orderKey}/products/0/${categoryName}`);
      const categorySnapshot = await get(categoryRef);
      
      if (!categorySnapshot.exists() || Object.keys(categorySnapshot.val()).length === 0) {
        await set(categoryRef, null);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };
  
  // Add handleEditingKeyDown handler
  const handleEditingKeyDown = async (e, categoryName, productIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleOrderItemSave(categoryName, productIndex);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingItem(null);
    }
  };
  
    const handleKeyDown = (e, index) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const currentItem = newItems[index];
        
        if (currentItem.category && currentItem.product && currentItem.price) {
          setSavedItems([...savedItems, currentItem]);
          
          const updated = [...newItems];
          updated[index] = { category: '', product: '', price: '' };
          setNewItems(updated);
          
          const inputs = document.querySelectorAll('.new-item-input');
          inputs[index * 3]?.focus();
        }
      }
    };
  

const renderNewItemForms = () => (
    <div className="space-y-1">
      {newItems.map((item, index) => (
        <div key={index} className="bg-gray-700/30 p-1.5 rounded">
          {!item.isEditing ? (
            <div 
              className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 w-full cursor-pointer items-center"
              onClick={() => {
                const updated = [...newItems];
                updated[index] = { ...item, isEditing: true };
                setNewItems(updated);
              }}
            >
              <span className="text-gray-400 text-xs truncate hover:text-gray-300">
                {item.category || 'Kategori'}
              </span>
              <span className="text-gray-300 text-xs truncate hover:text-gray-200">
                {item.product || 'Ürün'}
              </span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-green-400 text-xs">{item.price || '0'}₺</span>
              </div>
              <div className="flex gap-1 justify-end">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    const updated = newItems.filter((_, idx) => idx !== index);
                    setNewItems(updated);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 w-full items-center">
              <input
                type="text"
                placeholder="Kategori"
                value={item.category}
                onChange={(e) => {
                  const updated = [...newItems];
                  updated[index].category = e.target.value;
                  setNewItems(updated);
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="new-item-input bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
              />
              <input
                type="text"
                placeholder="Ürün"
                value={item.product}
                onChange={(e) => {
                  const updated = [...newItems];
                  updated[index].product = e.target.value;
                  setNewItems(updated);
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="new-item-input bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
              />
              <input
                type="number"
                placeholder="Fiyat"
                value={item.price}
                onChange={(e) => {
                  const updated = [...newItems];
                  updated[index].price = e.target.value;
                  setNewItems(updated);
                }}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="new-item-input bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
              />
              <div className="flex gap-1 justify-end">
                <button 
                  onClick={() => {
                    const updated = [...newItems];
                    updated[index].isEditing = false;
                    setNewItems(updated);
                  }}
                  className="text-green-400 hover:text-green-300 p-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    const updated = newItems.filter((_, idx) => idx !== index);
                    setNewItems(updated);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
  
  // Update the add button onClick handler
  <button 
    className="w-full h-8 flex items-center justify-center text-gray-500 hover:text-gray-400 mt-2"
    onClick={() => {
      setNewItems([...newItems, { 
        category: '', 
        product: '', 
        price: '', 
        isEditing: true // Add this flag
      }]);
      setTimeout(() => {
        const inputs = document.querySelectorAll('.new-item-input');
        inputs[inputs.length - 3]?.focus();
      }, 0);
    }}
  >
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>



// Add this new handler
const handleSavedItemEdit = (index, item) => {
  setEditingSavedItem(index);
  setEditingSavedValues({
    category: item.category,
    product: item.product,
    price: item.price
  });
};

// Add this new handler
const handleSavedItemSave = (index) => {
  const updatedItems = [...savedItems];
  updatedItems[index] = editingSavedValues;
  setSavedItems(updatedItems);
  setEditingSavedItem(null);
};

// Update the renderSavedItems function
const renderSavedItems = () => (
  <div className="space-y-1">
    {savedItems.map((item, index) => (
      <div key={index} className="grid grid-cols-[1.2fr,1.2fr,1.2fr,auto] gap-2 bg-gray-700/30 p-1.5">
        {editingSavedItem === index ? (
       <>
       <input
         type="text"
         value={editingSavedValues.category}
         onChange={(e) => setEditingSavedValues({ ...editingSavedValues, category: e.target.value })}
         className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
       />
       <input
         type="text"
         value={editingSavedValues.product}
         onChange={(e) => setEditingSavedValues({ ...editingSavedValues, product: e.target.value })}
         className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
       />
       <div className="flex items-center gap-1">
         <input
           type="number"
           value={editingSavedValues.price}
           onChange={(e) => setEditingSavedValues({ ...editingSavedValues, price: e.target.value })}
           className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full min-w-[80px] focus:bg-gray-500/50"
         />
         <div className="flex gap-1">
           <button 
             onClick={() => handleSavedItemSave(index)}
             className="text-green-400 hover:text-green-300 p-1"
           >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
             </svg>
           </button>
           <button 
             onClick={() => {
               const updated = savedItems.filter((_, idx) => idx !== index);
               setSavedItems(updated);
               setEditingSavedItem(null);
             }}
             className="text-red-400 hover:text-red-300 p-1"
           >
             <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
             </svg>
           </button>
         </div>
       </div>
     </>
        ) : (
          <>
            <span 
              className="text-gray-400 text-xs truncate cursor-pointer hover:text-gray-300"
              onClick={() => handleSavedItemEdit(index, item)}
            >
              {item.category}
            </span>
            <span 
              className="text-gray-300 text-xs truncate cursor-pointer hover:text-gray-200"
              onClick={() => handleSavedItemEdit(index, item)}
            >
              {item.product}
            </span>
            <div className="flex items-center justify-end gap-1">
              <span className="text-green-400 text-xs">{item.price}₺</span>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleSavedItemEdit(index, item)}
                  className="text-gray-400 hover:text-blue-400"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button 
                  onClick={() => {
                    const updated = savedItems.filter((_, idx) => idx !== index);
                    setSavedItems(updated);
                  }}
                  className="text-red-400 hover:text-red-300"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    ))}
  </div>
);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRef = ref(database, "categories");
        const snapshot = await get(categoriesRef);
        if (snapshot.exists()) {
          setCategories(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };

    fetchCategories();
  }, []);

  const sortByCategories = (a, b) => {
    const categoryA = Object.values(categories).find(
      (cat) => cat.propertyName?.toLowerCase() === a[0].toLowerCase()
    );
    const categoryB = Object.values(categories).find(
      (cat) => cat.propertyName?.toLowerCase() === b[0].toLowerCase()
    );

    const orderA = categoryA?.order ?? 999;
    const orderB = categoryB?.order ?? 999;

    return orderA - orderB;
  };

  const handleSaveEdit = (categoryName, productIndex, updatedProduct) => {
    // Firebase güncelleme işlemi burada yapılacak
    setEditingItem(null);
  };

 

  const renderOrderDetails = () => {
    return (
        <div className="grid grid-cols-[1fr,380px] gap-4">
        {/* Sol Taraf - Mevcut Ürünler */}
        <div>
          <div className="grid grid-cols-1 divide-y divide-gray-700/50">
            {Object.entries(orderData)
              .filter(([categoryName]) => 
                categoryName !== "status" &&
                categoryName !== "verandaWidth" &&
                categoryName !== "verandaHeight"
              )
              .sort(sortByCategories)
              .map(([categoryName, products], index) => {
                const category = Object.values(categories).find(
                  (cat) => cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
                );

                return (
                  <div key={index}>
                  {Object.entries(products).map(([productIndex, product]) => (
  <div 
    key={productIndex}
    className="grid grid-cols-[2fr,2fr,1fr,auto] items-center bg-gray-700/30 px-2 py-1 cursor-pointer"
    onClick={() => !editingItem && setEditingItem(`${categoryName}-${productIndex}`)}
  >
    {editingItem === `${categoryName}-${productIndex}` ? (
  <>
    <input
      type="text"
      defaultValue={category?.title || categoryName}
      onChange={(e) => setEditingValues({
        ...editingValues,
        category: e.target.value
      })}
      onKeyDown={(e) => handleEditingKeyDown(e, categoryName, productIndex)}
      className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
    />
    <input
      type="text"
      defaultValue={product.name || product.title}
      onChange={(e) => setEditingValues({
        ...editingValues,
        name: e.target.value
      })}
      onKeyDown={(e) => handleEditingKeyDown(e, categoryName, productIndex)}
      className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
    />
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        defaultValue={product.price || ''}
        onChange={(e) => setEditingValues({
          ...editingValues,
          price: e.target.value
        })}
        onKeyDown={(e) => handleEditingKeyDown(e, categoryName, productIndex)}
        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full min-w-[80px] focus:bg-gray-500/50"
      />
          <div className="flex gap-1">
            <button 
              onClick={() => handleOrderItemSave(categoryName, productIndex)}
              className="text-green-400 hover:text-green-300 p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteOrderItem(categoryName, productIndex);
              }}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </>
    ) : (
      <>
        <span className="text-gray-400 text-xs truncate hover:text-gray-300">
          {category?.title || categoryName}
        </span>
        <span className="text-gray-300 text-xs truncate hover:text-gray-200">
          {product.name || product.title}
        </span>
        <div className="flex items-center justify-end gap-1">
          <span className="text-green-400 text-xs">
            {product.price?.toLocaleString('tr-TR')}₺
          </span>
          <div className="flex gap-1">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingItem(`${categoryName}-${productIndex}`);
              }}
              className="text-gray-400 hover:text-blue-400 p-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteOrderItem(categoryName, productIndex);
              }}
              className="text-red-400 hover:text-red-300 p-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </>
    )}
  </div>
))}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Sağ Taraf - Yeni Ürün */}
   
        <div className="border-l border-gray-700 pl-4 overflow-y-auto">
          <div className="space-y-1">
            {renderSavedItems()}
            {renderNewItemForms()}
            
            {/* Add button */}
            <button 
              className="w-full h-8 flex items-center justify-center text-gray-500 hover:text-gray-400 mt-2"
              onClick={() => {
                setNewItems([...newItems, { category: '', product: '', price: '' }]);
                setTimeout(() => {
                  const inputs = document.querySelectorAll('.new-item-input');
                  inputs[inputs.length - 3]?.focus();
                }, 0);
              }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };
 
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[90vw] w-[90vw] h-[85vh] max-h-[85vh] p-0 flex flex-col">
        <div className="flex-1 overflow-hidden">
        <div className="flex h-full gap-6">
          <div className="flex-1 space-y-6 overflow-y-auto pr-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-100">{customer.fullName}</h1>
                  <div className="space-y-1 mt-2">
                    <p className="text-gray-400">{customer.email}</p>
                    <p className="text-gray-400">{customer.phone}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/30 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-200 mb-4">Sipariş Detayları</h2>
              {renderOrderDetails()}
            </div>
          </div>

          <div className="w-64 border-l border-gray-700 pl-6 overflow-y-auto">
            <div className="sticky top-0 bg-gray-900 pb-4 z-10">
              <div className="flex items-center gap-2 mb-4 mt-4">
                <h2 className="text-xl font-semibold text-gray-200">Sipariş Notları</h2>
                <button
                  onClick={() => setIsAddingNote(true)}
                  className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-blue-400/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>

              {isAddingNote && (
                <div className="mt-4 space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Not ekleyin..."
                    className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-2 text-gray-300 text-sm resize-none focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingNote(false)}
                      className="px-3 py-1 text-sm text-gray-400 hover:text-gray-300"
                    >
                      İptal
                    </button>
                    <button
                      onClick={() => {}}
                      disabled={notesLoading}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {notesLoading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 mt-4">
              <p className="text-gray-500">Not bulunmamaktadır.</p>
            </div>
          </div>
        </div>
        </div>
        
      <OrderSummary orderData={orderData} savedItems={savedItems || []} />
      </DialogContent>
    </Dialog>
  );
};

// Update PropTypes at the bottom of the file
OrderSummary.propTypes = {
    orderData: PropTypes.object.isRequired,
    savedItems: PropTypes.arrayOf(
      PropTypes.shape({
        category: PropTypes.string,
        product: PropTypes.string,
        price: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
      })
    ).isRequired
  };
  
  OrderEditModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    customer: PropTypes.object.isRequired,
    orderKey: PropTypes.string.isRequired,
    orderData: PropTypes.object.isRequired
  };
  
  OrderEditModal.defaultProps = {
    savedItems: []
  };
  
  export default OrderEditModal;