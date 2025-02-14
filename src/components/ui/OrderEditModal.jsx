import { Dialog, DialogContent } from "./dialogForCustomers";
import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

const OrderSummary = ({ orderData, savedItems, onSave, onCancel }) => {
  const calculateOrderTotal = () => {
    let total = 0;
    Object.values(orderData).forEach((products) => {
      Object.values(products).forEach((product) => {
        if (typeof product.price === "number") {
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
    <div className="bg-gray-800/95 border-t border-gray-700 p-3">
      <div className="flex justify-between items-center">
        <div className="flex gap-3 flex-1">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700/30 rounded flex-1">
            <span className="text-gray-400 text-xs">Fiyat:</span>
            <span className="text-green-400 text-xs font-medium">
              {orderTotal.toLocaleString("tr-TR")}₺
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700/30 rounded flex-1">
            <span className="text-gray-400 text-xs">Bonus:</span>
            <span className="text-blue-400 text-xs font-medium">
              {bonusTotal.toLocaleString("tr-TR")}₺
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-700/30 rounded flex-1">
            <span className="text-gray-400 text-xs">Toplam:</span>
            <span className="text-green-400 text-xs font-medium">
              {grandTotal.toLocaleString("tr-TR")}₺
            </span>
          </div>
        </div>

        <div className="flex gap-2 ml-4">
          <button
            onClick={onCancel}
            className="p-2 text-gray-400 hover:text-gray-300 hover:bg-gray-700/30 rounded"
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
          <button
            onClick={onSave}
            className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded"
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
                d="M8 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7.414A2 2 0 0019.414 6L14 2H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V8"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
              />
            </svg>
          </button>
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
    category: "",
    name: "",
    price: "",
  });
  const [savedItems, setSavedItems] = useState([]);
  const [newItems, setNewItems] = useState([
    { category: "", product: "", price: "" },
  ]);
  const [editingSavedItem, setEditingSavedItem] = useState(null);
  const [editingSavedValues, setEditingSavedValues] = useState({
    category: "",
    product: "",
    price: "",
  });
  const [products, setProducts] = useState({});
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [customProduct, setCustomProduct] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [localOrderData, setLocalOrderData] = useState(orderData);

  // Firebase'e kaydetme fonksiyonunu ekle
  const handleSaveChanges = async () => {
    try {
      // Save all changes to Firebase
      const productsRef = ref(database, `customers/${orderKey}/products/0`);
      await set(productsRef, localOrderData);

      // Save bonus items
      const bonusRef = ref(database, `customers/${orderKey}/bonus`);
      await set(bonusRef, savedItems);

      onClose(); // Modal'ı kapat
    } catch (error) {
      console.error("Error saving changes:", error);
    }
  };
  // Add this new useEffect to fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = ref(database, "products");
        const snapshot = await get(productsRef);
        if (snapshot.exists()) {
          setProducts(snapshot.val());
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  // Add this new function to handle category selection
  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setSelectedProduct("");
    setCustomCategory("");
    setCustomProduct("");
    setCustomPrice("");
  };

  // Add this new function to handle product selection
  const handleProductSelect = (value) => {
    let product;
    try {
      // Check if value is already an object
      if (typeof value === "object") {
        product = value;
      } else {
        // If it's a string, parse it
        product = JSON.parse(value);
      }
    } catch (error) {
      console.error("Error handling product selection:", error);
      return;
    }

    setSelectedProduct(product);
    setCustomProduct("");
    if (product.price) {
      setCustomPrice(product.price.toString());
    }
  };

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
    setSelectedCategory(categoryName);
  
    // Products verisini doğru şekilde kontrol edelim
    const categoryProducts = products[categoryName] || {};
    const existingProduct = Object.values(categoryProducts).find(
      p => (p.name || p.title) === (product.name || product.title)
    );
  
    if (existingProduct) {
      setSelectedProduct(existingProduct);
      setEditingValues({
        category: categoryName,
        name: existingProduct.name || existingProduct.title,
        price: existingProduct.price?.toString() || "0",
      });
    } else {
      setSelectedProduct({ custom: true });
      setEditingValues({
        category: categoryName,
        name: product.name || product.title,
        price: product.price?.toString() || "0",
      });
    }
  };

  // Update handleOrderItemSave function
  const handleOrderItemSave = async (categoryName, productIndex) => {
    try {
      // Update local state first
      const updatedOrderData = { ...localOrderData };
      if (!updatedOrderData[categoryName]) {
        updatedOrderData[categoryName] = {};
      }

      updatedOrderData[categoryName][productIndex] = {
        name: selectedProduct?.custom
          ? editingValues.name
          : selectedProduct?.title || selectedProduct?.name,
        price: Number(editingValues.price),
      };

      setLocalOrderData(updatedOrderData);
      setEditingItem(null);
      setSelectedProduct(null);
    } catch (error) {
      console.error("Error updating item:", error);
    }
  };

  // Update handleDeleteOrderItem function
  const handleDeleteOrderItem = async (categoryName, productIndex) => {
    try {
      // Delete specific product
      const productRef = ref(
        database,
        `customers/${orderKey}/products/0/${categoryName}/${productIndex}`
      );
      await set(productRef, null);

      // Check if category is empty and delete if necessary
      const categoryRef = ref(
        database,
        `customers/${orderKey}/products/0/${categoryName}`
      );
      const categorySnapshot = await get(categoryRef);

      if (
        !categorySnapshot.exists() ||
        Object.keys(categorySnapshot.val()).length === 0
      ) {
        await set(categoryRef, null);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
    }
  };


  const sortProductsByOrder = (products) => {
    return Object.entries(products).sort((a, b) => {
      // Get order values, default to 999 if not present
      const orderA = typeof a[1].order === "number" ? a[1].order : 999;
      const orderB = typeof b[1].order === "number" ? b[1].order : 999;

      // Sort by order first
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      // If orders are the same, sort by name/title
      const nameA = a[1].title || a[1].name || "";
      const nameB = b[1].title || b[1].name || "";
      return nameA.localeCompare(nameB);
    });
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
                {item.category || "Kategori"}
              </span>
              <span className="text-gray-300 text-xs truncate hover:text-gray-200">
                {item.product || "Ürün"}
              </span>
              <div className="flex items-center justify-end gap-1">
                <span className="text-green-400 text-xs">
                  {item.price || "0"}₺
                </span>
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
                  <svg
                    className="w-3 h-3"
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
          ) : (
            <div className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 w-full items-center">
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
                >
                  <option value="">Kategori Seçin</option>
                  <option value="custom">Diğer</option>
                  {Object.values(categories)
                    .sort((a, b) => (a.order || 999) - (b.order || 999)) // Sort by order property
                    .map((category) => (
                      <option
                        key={category.propertyName}
                        value={category.propertyName}
                      >
                        {category.title}
                      </option>
                    ))}
                </select>
                {selectedCategory === "custom" && (
                  <input
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Kategori Girin"
                    className="mt-1 bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
                  />
                )}
              </div>

              <div className="relative">
                <select
                  value={selectedProduct ? JSON.stringify(selectedProduct) : ""}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  disabled={!selectedCategory || selectedCategory === "custom"}
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
                >
                  <option value="">Ürün Seçin</option>
                  <option value='{"custom":true}'>Diğer</option>
                  {selectedCategory &&
                    products[selectedCategory] &&
                    sortProductsByOrder(products[selectedCategory]).map(
                      ([key, product]) => (
                        <option key={key} value={JSON.stringify(product)}>
                          {product.title || product.name}
                        </option>
                      )
                    )}
                </select>

                {(selectedCategory === "custom" ||
                  (selectedProduct && selectedProduct.custom)) && (
                  <input
                    type="text"
                    value={customProduct}
                    onChange={(e) => setCustomProduct(e.target.value)}
                    placeholder="Ürün Girin"
                    className="mt-1 bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
                  />
                )}
              </div>

              <input
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="Fiyat"
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
              />

              <div className="flex gap-1 justify-end">
                <button
                  onClick={() => {
                    try {
                      // Get category title from categories object
                      let categoryTitle;

                      if (selectedCategory === "custom") {
                        categoryTitle = customCategory;
                      } else {
                        const selectedCategoryObj = Object.values(
                          categories
                        ).find((cat) => cat.propertyName === selectedCategory);
                        categoryTitle = selectedCategoryObj?.title;
                      }

                      // Kategori başlığı kontrolü
                      if (!categoryTitle) {
                        console.error("Kategori başlığı bulunamadı");
                        return;
                      }

                      const newItem = {
                        category: categoryTitle, // Directly use categoryTitle
                        product:
                          selectedCategory === "custom" ||
                          (selectedProduct && selectedProduct.custom)
                            ? customProduct
                            : selectedProduct.title || selectedProduct.name,
                        price: customPrice,
                        isEditing: false,
                      };

                      // Update only the current item in newItems
                      const updated = [...newItems];
                      updated[index] = { category: "", product: "", price: "" }; // Reset the current item
                      setNewItems(updated);

                      // Add to savedItems only
                      setSavedItems([
                        ...savedItems,
                        {
                          category: categoryTitle,
                          product: newItem.product,
                          price: customPrice,
                        },
                      ]);

                      // Reset selections
                      setSelectedCategory("");
                      setSelectedProduct("");
                      setCustomCategory("");
                      setCustomProduct("");
                      setCustomPrice("");
                    } catch (error) {
                      console.error("Error saving item:", error);
                    }
                  }}
                  className="text-green-400 hover:text-green-300 p-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
                <button
                  onClick={() => {
                    const updated = newItems.filter((_, idx) => idx !== index);
                    setNewItems(updated);
                  }}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <svg
                    className="w-3.5 h-3.5"
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
          )}
        </div>
      ))}
    </div>
  );

  // Add this new handler
  const handleSavedItemEdit = (index, item) => {
    setEditingSavedItem(index);
    setEditingSavedValues({
      category: item.category,
      product: item.product,
      price: item.price,
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
        <div
          key={index}
          className="grid grid-cols-[1.2fr,1.2fr,1.2fr,auto] gap-2 bg-gray-700/30 p-1.5"
        >
          {editingSavedItem === index ? (
            <>
              <input
                type="text"
                value={editingSavedValues.category}
                onChange={(e) =>
                  setEditingSavedValues({
                    ...editingSavedValues,
                    category: e.target.value,
                  })
                }
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
              />
              <input
                type="text"
                value={editingSavedValues.product}
                onChange={(e) =>
                  setEditingSavedValues({
                    ...editingSavedValues,
                    product: e.target.value,
                  })
                }
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={editingSavedValues.price}
                  onChange={(e) =>
                    setEditingSavedValues({
                      ...editingSavedValues,
                      price: e.target.value,
                    })
                  }
                  className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full min-w-[80px] focus:bg-gray-500/50"
                />
                <div className="flex gap-1">
                  <button
                    onClick={() => handleSavedItemSave(index)}
                    className="text-green-400 hover:text-green-300 p-1"
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                  <button
                    onClick={() => {
                      const updated = savedItems.filter(
                        (_, idx) => idx !== index
                      );
                      setSavedItems(updated);
                      setEditingSavedItem(null);
                    }}
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <svg
                      className="w-3.5 h-3.5"
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
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                      />
                    </svg>
                  </button>
                  <button
                    onClick={() => {
                      const updated = savedItems.filter(
                        (_, idx) => idx !== index
                      );
                      setSavedItems(updated);
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    <svg
                      className="w-3 h-3"
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

  

  const renderOrderDetails = () => {
    return (
      <div className="grid grid-cols-[1fr,380px] gap-4">
        {/* Sol Taraf - Mevcut Ürünler */}
        <div>
          <div className="grid grid-cols-1 divide-y divide-gray-700/50">
            {Object.entries(localOrderData)
              .filter(
                ([categoryName]) =>
                  categoryName !== "status" &&
                  categoryName !== "verandaWidth" &&
                  categoryName !== "verandaHeight"
              )
              .sort(sortByCategories)
              .map(([categoryName, products], index) => {
                const category = Object.values(categories).find(
                  (cat) =>
                    cat.propertyName?.toLowerCase() ===
                    categoryName.toLowerCase()
                );

                return (
                  <div key={index}>
                    {Object.entries(products).map(([productIndex, product]) => (
                      <div
                      key={productIndex}
                      className="grid grid-cols-[2fr,2fr,1fr,auto] items-center bg-gray-700/30 px-2 py-1 cursor-pointer"
                      onClick={() =>
                        !editingItem &&
                        setEditingItem(`${categoryName}-${productIndex}`)
                      }
                    >
   {editingItem === `${categoryName}-${productIndex}` ? (
  <>
    <span className="text-gray-400 text-xs truncate">
      {category?.title || categoryName}
    </span>
    <div className="relative">
      <select
        value={selectedProduct ? JSON.stringify(selectedProduct) : ""}
        onChange={(e) => handleProductSelect(e.target.value)}
        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
      >
        <option value="">Ürün Seçin</option>
        <option value='{"custom":true}'>Diğer</option>
        {products[categoryName] && 
          Object.entries(products[categoryName])
            .sort((a, b) => {
              const orderA = a[1].order || 999;
              const orderB = b[1].order || 999;
              return orderA - orderB;
            })
            .map(([key, product]) => (
              <option 
                key={key} 
                value={JSON.stringify(product)}
              >
                {product.title || product.name}
              </option>
            ))
        }
      </select>

      {selectedProduct?.custom && (
        <input
          type="text"
          value={editingValues.name}
          onChange={(e) =>
            setEditingValues({
              ...editingValues,
              name: e.target.value,
            })
          }
          placeholder="Ürün Adı"
          className="mt-1 bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full focus:bg-gray-500/50"
        />
      )}
    </div>
    <div className="flex items-center justify-end gap-1">
      <input
        type="number"
        value={editingValues.price}
        onChange={(e) =>
          setEditingValues({
            ...editingValues,
            price: e.target.value,
          })
        }
        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full min-w-[80px] focus:bg-gray-500/50"
      />
      <div className="flex gap-1">
        <button
          onClick={() => handleOrderItemSave(categoryName, productIndex)}
          className="text-green-400 hover:text-green-300 p-1"
        >
          <svg
            className="w-3.5 h-3.5"
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
        <button
  onClick={(e) => {
    e.stopPropagation();
    handleOrderItemEdit(categoryName, productIndex, product); // Burada fonksiyonu çağırıyoruz
  }}
  className="text-gray-400 hover:text-blue-400 p-1"
>
  <svg
    className="w-3 h-3"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
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
                                {product.price?.toLocaleString("tr-TR")}₺
                              </span>
                              <div className="flex gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingItem(
                                      `${categoryName}-${productIndex}`
                                    );
                                  }}
                                  className="text-gray-400 hover:text-blue-400 p-1"
                                >
                                  <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth="2"
                                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                    />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteOrderItem(
                                      categoryName,
                                      productIndex
                                    );
                                  }}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <svg
                                    className="w-3 h-3"
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
                setNewItems([
                  ...newItems,
                  { category: "", product: "", price: "" },
                ]);
                setTimeout(() => {
                  const inputs = document.querySelectorAll(".new-item-input");
                  inputs[inputs.length - 3]?.focus();
                }, 0);
              }}
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
                  d="M12 4v16m8-8H4"
                />
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
                    <h1 className="text-2xl font-bold text-gray-100">
                      {customer.fullName}
                    </h1>
                    <div className="space-y-1 mt-2">
                      <p className="text-gray-400">{customer.email}</p>
                      <p className="text-gray-400">{customer.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-4">
                <h2 className="text-xl font-semibold text-gray-200 mb-4">
                  Sipariş Detayları
                </h2>
                {renderOrderDetails()}
              </div>
            </div>

            <div className="w-64 border-l border-gray-700 pl-6 overflow-y-auto">
              <div className="sticky top-0 bg-gray-900 pb-4 z-10">
                <div className="flex items-center gap-2 mb-4 mt-4">
                  <h2 className="text-xl font-semibold text-gray-200">
                    Sipariş Notları
                  </h2>
                  <button
                    onClick={() => setIsAddingNote(true)}
                    className="text-blue-400 hover:text-blue-300 p-1 rounded-full hover:bg-blue-400/10"
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
                        d="M12 4v16m8-8H4"
                      />
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
                        {notesLoading ? "Kaydediliyor..." : "Kaydet"}
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

        <OrderSummary
          orderData={orderData}
          savedItems={savedItems || []}
          onSave={handleSaveChanges}
          onCancel={onClose}
        />
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
      price: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    })
  ).isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

OrderEditModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.object.isRequired,
  orderKey: PropTypes.string.isRequired,
  orderData: PropTypes.object.isRequired,
};

OrderEditModal.defaultProps = {
  savedItems: [],
};

export default OrderEditModal;
