import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";

const BonusItems = ({
  categories,
  products,
  savedItems,
  setSavedItems,
  dimensions,
  setDimensions,
  shouldRecalc = false,
}) => {
  const [adding, setAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItem, setNewItem] = useState({
    category: "",
    product: "",
    productId: "",
    price: "",
    custom: false,
    name: "",
  });

  // Refs for tracking calculation state
  const isInitialMount = useRef(true);
  const initialCalcDone = useRef(false);
  const isUpdating = useRef(false);
  const originalDimensions = useRef(null);
  const lastDimensions = useRef(null); // Track last dimensions to detect changes
  const previousSavedItems = useRef([]); // Track previous items
  const deletedItems = useRef([]);

  // Store initial dimensions when first mounting
  useEffect(() => {
    if (
      dimensions?.kontiWidth &&
      dimensions?.kontiHeight &&
      !originalDimensions.current
    ) {
      originalDimensions.current = {
        kontiWidth: Number(dimensions.kontiWidth),
        kontiHeight: Number(dimensions.kontiHeight),
      };
      console.log("Initial dimensions stored:", originalDimensions.current);
    }
  }, [dimensions?.kontiWidth, dimensions?.kontiHeight]);

  // Load saved items when component mounts
  useEffect(() => {
    if (!adding && !editingItem && savedItems?.length === 0) {
      setAdding(false);
    }

    // Update previousSavedItems ref when savedItems change
    previousSavedItems.current = JSON.parse(JSON.stringify(savedItems));
  }, [savedItems, adding, editingItem]);

  // Enhanced price calculation useEffect
  useEffect(() => {
    // If it's the first mount, mark and potentially exit
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // Check all dynamic price format categories
      const dynamicPriceFormats = [
        "artis",
        "metrekare",
        "cevre",
        "onYuzey",
        "tasDuvar",
      ];

      // Check if all items already have valid prices
      const hasValidPrices = savedItems.every((item) => {
        if (item.custom) return true; // Custom items already have prices

        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === item.category?.toLowerCase()
        );

        if (!category || !dynamicPriceFormats.includes(category.priceFormat))
          return true;

        return typeof item.price === "number" && item.price > 0;
      });

      if (hasValidPrices) {
        initialCalcDone.current = true;
        return; // All prices valid, no need to recalculate
      }
    }

    if (initialCalcDone.current && !shouldRecalc) {
      return;
    }

    if (
      !categories ||
      !products ||
      !savedItems?.length ||
      Object.keys(categories).length === 0 ||
      Object.keys(products).length === 0 ||
      isUpdating.current
    ) {
      return;
    }

    // Mark as updating
    isUpdating.current = true;

    try {
      // Create deep copy to avoid mutation issues
      const updatedItems = JSON.parse(JSON.stringify(savedItems));

      // Get konti dimensions
      const kontiWidth = Number(dimensions?.kontiWidth || 0);
      const kontiHeight = Number(dimensions?.kontiHeight || 0);

      // Process all items with dynamic pricing
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId) continue;

        // Skip "istemiyorum" items
        if (item.productId === "istemiyorum") continue;

        const categoryName = item.category;
        const productData = products[categoryName]?.[item.productId];

        if (!productData) continue;

        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        const dynamicPriceFormats = [
          "artis",
          "metrekare",
          "cevre",
          "onYuzey",
          "tasDuvar",
        ];
        if (!category || !dynamicPriceFormats.includes(category.priceFormat))
          continue;

        // Calculate base price using appropriate dimensions
        updatedItems[i].price = calculateItemPrice(
          category.priceFormat,
          categoryName,
          productData,
          kontiWidth,
          kontiHeight,
          originalDimensions.current
        );
      }

      // Only update if prices actually changed
      const hasChanges = updatedItems.some((item, index) => {
        return savedItems[index]?.price !== item.price;
      });

      if (hasChanges) {
        setSavedItems(updatedItems);
      }

      // Mark initial calculation as done
      initialCalcDone.current = true;
    } catch (error) {
      console.error("Error calculating product prices:", error);
    } finally {
      // Clear the updating flag after a short delay
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    shouldRecalc,
    categories,
    products,
    savedItems,
    dimensions,
    setSavedItems,
  ]);

  // Function to calculate item price based on format
  const calculateItemPrice = useCallback(
    (
      priceFormat,
      categoryName,
      productData,
      kontiWidth,
      kontiHeight,
      origDimensions
    ) => {
      // Use current dimensions for calculations
      const basePrice = Number(productData.price || 0);
      const alanPrice = Number(productData.alanPrice || 0);
      const productWidth = Number(productData.width || 0);
      const productHeight = Number(productData.height || 0);

      let calculatedPrice = 0;

      // Calculate price based on category and format
      if (priceFormat === "artis") {
        if (categoryName.toLowerCase().includes("en")) {
          // For "en" products, use current dimensions
          calculatedPrice = productWidth * kontiHeight * basePrice;
          console.log(
            `En hesaplama: ${kontiHeight} * ${productWidth} * ${basePrice} = ${calculatedPrice}`
          );
        } else if (categoryName.toLowerCase().includes("boy")) {
          // For "boy" products, use current dimensions
          calculatedPrice = productHeight * kontiWidth * basePrice;
          console.log(
            `Boy hesaplama: ${kontiWidth} * ${productHeight} * ${basePrice} = ${calculatedPrice}`
          );
        } else {
          // Standard increase calculation
          const kontiArea = kontiWidth * kontiHeight;
          const newWidth = Number(kontiWidth) + Number(productWidth);
          const newHeight = Number(kontiHeight) + Number(productHeight);
          const newArea = newWidth * newHeight;
          calculatedPrice = (newArea - kontiArea) * basePrice;
        }
      } else if (priceFormat === "metrekare") {
        calculatedPrice = kontiWidth * kontiHeight * basePrice;
      } else if (priceFormat === "cevre") {
        const perimeter = 2 * (kontiWidth + kontiHeight);
        calculatedPrice = perimeter * basePrice;
      } else if (priceFormat === "onYuzey") {
        calculatedPrice = kontiHeight * basePrice;
      } else if (priceFormat === "tasDuvar") {
        const area = kontiWidth * kontiHeight;
        const perimeter = 2 * (kontiWidth + kontiHeight);
        calculatedPrice = area * alanPrice + perimeter * basePrice;
      }

      return calculatedPrice;
    },
    []
  );

  // Handle dimension changes and recalculate prices
  // Handle dimension changes and recalculate prices
  useEffect(() => {
    // Skip if dimensions aren't defined
    if (!dimensions?.kontiWidth || !dimensions?.kontiHeight) {
      return;
    }

    // Check if dimensions have actually changed
    const dimensionsChanged =
      lastDimensions.current?.kontiWidth !== dimensions.kontiWidth ||
      lastDimensions.current?.kontiHeight !== dimensions.kontiHeight;

    // Log dimension changes for debugging
    if (dimensionsChanged) {
      console.log("Konti dimensions changed:", {
        from: lastDimensions.current,
        to: {
          kontiWidth: dimensions.kontiWidth,
          kontiHeight: dimensions.kontiHeight,
        },
      });
    }

    // Update last dimensions ref
    lastDimensions.current = {
      kontiWidth: dimensions.kontiWidth,
      kontiHeight: dimensions.kontiHeight,
    };

    // Only recalculate if dimensions changed, we have items and original dimensions
    if (
      dimensionsChanged &&
      savedItems.length > 0 &&
      originalDimensions.current
    ) {
      console.log("Triggering recalculation due to dimension changes");

      // Force a recalculation with a slight delay to ensure all state updates are processed
      setTimeout(() => {
        if (!isUpdating.current) {
          recalculateArtisItems();
        }
      }, 150);
    }
  }, [dimensions?.kontiWidth, dimensions?.kontiHeight, savedItems.length]);

  // Function to recalculate "En" and "Boy" items
  const recalculateArtisItems = useCallback(() => {
    if (isUpdating.current || !originalDimensions.current) return;

    // Directly get the latest dimensions from the dimensions prop
    const currentDimensions = {
      kontiWidth: Number(dimensions.kontiWidth),
      kontiHeight: Number(dimensions.kontiHeight),
    };

    console.log(
      "Recalculating En/Boy items with CURRENT dimensions:",
      currentDimensions
    );
    isUpdating.current = true;

    try {
      const updatedItems = JSON.parse(JSON.stringify(savedItems)).filter(
        (item) => !deletedItems.current.includes(item.id)
      );

      let hasChanges = false;
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId) continue;

        // Skip "istemiyorum" items
        if (item.productId === "istemiyorum") continue;

        const categoryName = item.category;
        if (
          !categoryName.toLowerCase().includes("en") &&
          !categoryName.toLowerCase().includes("boy")
        ) {
          continue; // Only recalculate En/Boy items
        }

        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category || category.priceFormat !== "artis") continue;

        const productData = products[categoryName]?.[item.productId];
        if (!productData) continue;

        // Use current dimensions explicitly
        const newPrice = calculateItemPrice(
          "artis",
          categoryName,
          productData,
          currentDimensions.kontiWidth, // Use explicit current value
          currentDimensions.kontiHeight, // Use explicit current value
          null
        );

        if (Math.abs(newPrice - item.price) > 0.1) {
          // Accounting for floating point precision
          console.log(
            `Recalculating ${categoryName} price: ${item.price} -> ${newPrice}, using dimensions: width=${currentDimensions.kontiWidth}, height=${currentDimensions.kontiHeight}`
          );
          updatedItems[i].price = newPrice;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setSavedItems(updatedItems);
      }
    } catch (error) {
      console.error("Error recalculating Artis item prices:", error);
    } finally {
      // Clear updating flag after a delay
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    categories,
    dimensions,
    products,
    savedItems,
    setSavedItems,
    calculateItemPrice,
  ]);

  // Function to handle recalculation of prices after dimension changes
  // Function to handle recalculation of prices after dimension changes
  const recalculateAllArtisItems = useCallback(() => {
    if (isUpdating.current) return;
    isUpdating.current = true;

    try {
      // Explicitly capture the current dimensions to avoid stale closures
      const currentDimensions = {
        kontiWidth: Number(dimensions.kontiWidth),
        kontiHeight: Number(dimensions.kontiHeight),
      };

      const updatedItems = JSON.parse(JSON.stringify(savedItems)).filter(
        (item) => !deletedItems.current.includes(item.id)
      );

      let hasChanges = false;

      // Check if we have both En and Boy items
      const enItems = updatedItems.filter(
        (item) =>
          !item.custom &&
          item.productId &&
          item.category.toLowerCase().includes("en")
      );

      const boyItems = updatedItems.filter(
        (item) =>
          !item.custom &&
          item.productId &&
          item.category.toLowerCase().includes("boy")
      );

      // Recalculate all dimension-dependent items with current dimensions
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId) continue;
        if (item.productId === "istemiyorum") continue;

        const categoryName = item.category;
        if (
          !categoryName.toLowerCase().includes("en") &&
          !categoryName.toLowerCase().includes("boy")
        ) {
          continue;
        }

        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category || category.priceFormat !== "artis") continue;

        const productData = products[categoryName]?.[item.productId];
        if (!productData) continue;

        // Use explicitly captured current dimensions
        const newPrice = calculateItemPrice(
          "artis",
          categoryName,
          productData,
          currentDimensions.kontiWidth, // Use explicit current value
          currentDimensions.kontiHeight, // Use explicit current value
          null // Don't pass original dimensions
        );

        if (Math.abs(newPrice - item.price) > 0.1) {
          console.log(
            `Recalculating ${categoryName} price: ${item.price} -> ${newPrice}, using dimensions: width=${currentDimensions.kontiWidth}, height=${currentDimensions.kontiHeight}`
          );
          updatedItems[i].price = newPrice;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        setSavedItems(updatedItems);
      }
    } catch (error) {
      console.error("Error recalculating prices:", error);
    } finally {
      setTimeout(() => {
        isUpdating.current = false;
      }, 100);
    }
  }, [
    categories,
    dimensions,
    products,
    savedItems,
    setSavedItems,
    calculateItemPrice,
  ]);

  // Category options for dropdown
  const categoryOptions = useMemo(() => {
    return Object.values(categories)
      .sort((a, b) => (a.order || 999) - (b.order || 999))
      .map((category) => ({
        value: category.propertyName,
        label: category.title || category.propertyName,
      }));
  }, [categories]);

  // Product options based on selected category
  const productOptions = useMemo(() => {
    const categoryName = newItem.category;
    if (!categoryName || !products[categoryName]) return [];

    const options = Object.entries(products[categoryName])
      .map(([id, product]) => ({
        id,
        name: product.title || product.name,
        price: product.price,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // İstemiyorum seçeneğini ekle
    if (options.length > 0) {
      options.unshift({
        id: "istemiyorum",
        name: "İstemiyorum",
        price: 0,
      });
    }

    return options;
  }, [newItem.category, products]);

  // Handle category change
  const handleCategoryChange = useCallback((e) => {
    const categoryName = e.target.value;
    setNewItem((prev) => ({
      ...prev,
      category: categoryName,
      product: "",
      productId: "",
      price: "",
      name: "",
    }));
  }, []);

  // Handle product change
  const handleProductChange = useCallback(
    (e) => {
      try {
        const value = e.target.value;

        // Handle custom product
        if (value === "custom") {
          setNewItem((prev) => ({
            ...prev,
            product: "",
            productId: "",
            price: "",
            custom: true,
            name: "",
          }));
          return;
        }

        const selectedProduct = JSON.parse(value);

        // İstemiyorum seçildiyse
        if (selectedProduct.id === "istemiyorum") {
          setNewItem((prev) => ({
            ...prev,
            product: "İstemiyorum",
            productId: "istemiyorum",
            price: 0,
            custom: false,
            name: "İstemiyorum",
          }));
          return;
        }

        const categoryName = newItem.category;
        const productData = products[categoryName]?.[selectedProduct.id];
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
        );

        // Calculate price based on dimensions and product
        if (productData && category?.priceFormat) {
          // Get the original dimensions for calculation
          const origDimensions = originalDimensions.current || dimensions;

          const price = calculateItemPrice(
            category.priceFormat,
            categoryName,
            productData,
            dimensions.kontiWidth,
            dimensions.kontiHeight,
            origDimensions
          );

          setNewItem((prev) => ({
            ...prev,
            product: selectedProduct.name,
            productId: selectedProduct.id,
            price: price,
            custom: false,
            name: selectedProduct.name,
          }));
        } else {
          // Use static price for non-dynamic categories
          setNewItem((prev) => ({
            ...prev,
            product: selectedProduct.name,
            productId: selectedProduct.id,
            price: Number(selectedProduct.price),
            custom: false,
            name: selectedProduct.name,
          }));
        }
      } catch (error) {
        console.error("Error handling product selection:", error);
      }
    },
    [newItem.category, products, categories, dimensions, calculateItemPrice]
  );

  // Handle price change
  const handlePriceChange = useCallback((e) => {
    setNewItem((prev) => ({
      ...prev,
      price: e.target.value,
    }));
  }, []);

  // Handle custom name change
  const handleNameChange = useCallback((e) => {
    setNewItem((prev) => ({
      ...prev,
      name: e.target.value,
    }));
  }, []);

  // Update konti dimensions when adding/removing artis products
  const updateKontiDimensions = useCallback(
    (item, action = "add") => {
      if (
        !item ||
        !item.productId ||
        item.custom ||
        item.productId === "istemiyorum"
      )
        return;

      const categoryName = item.category;
      const category = Object.values(categories).find(
        (cat) => cat.propertyName?.toLowerCase() === categoryName?.toLowerCase()
      );

      // Only update dimensions for artis category
      if (category?.priceFormat !== "artis") return;

      const productData = products[categoryName]?.[item.productId];
      if (!productData) return;

      const productWidth = Number(productData.width || 0);
      const productHeight = Number(productData.height || 0);
      const currentWidth = Number(dimensions.kontiWidth || 0);
      const currentHeight = Number(dimensions.kontiHeight || 0);

      console.log("Updating konti dimensions for:", {
        item,
        action,
        productWidth,
        productHeight,
      });

      // If it's an "En" category, adjust width
      if (categoryName.toLowerCase().includes("en")) {
        const newWidth =
          action === "add"
            ? currentWidth + productWidth
            : currentWidth - productWidth;

        if (newWidth > 0 && newWidth !== currentWidth) {
          console.log(`Updating konti width: ${currentWidth} -> ${newWidth}`);
          setDimensions((prev) => ({
            ...prev,
            kontiWidth: newWidth,
          }));
        }
      }
      // For "Boy" category products:
      else if (categoryName.toLowerCase().includes("boy")) {
        const newHeight =
          action === "add"
            ? currentHeight + productHeight
            : currentHeight - productHeight;

        if (newHeight > 0 && newHeight !== currentHeight) {
          console.log(
            `Updating konti height: ${currentHeight} -> ${newHeight}`
          );
          // Missing setDimensions call here!
          setDimensions((prev) => ({
            ...prev,
            kontiHeight: newHeight,
          }));
        }
      }
    },
    [categories, products, dimensions, setDimensions]
  );

  // Add new item to list
  // Add new item to list
  const handleAddItem = useCallback(() => {
    if (
      (newItem.custom && !newItem.name) ||
      !newItem.category ||
      !newItem.price
    ) {
      return; // Validation
    }

    const itemToAdd = {
      id: Date.now().toString(),
      category: newItem.category,
      product: newItem.custom ? newItem.name : newItem.product,
      productId: newItem.custom ? null : newItem.productId,
      price: Number(newItem.price),
      custom: newItem.custom,
    };

    // Update konti dimensions if needed
    if (!itemToAdd.custom && itemToAdd.productId) {
      updateKontiDimensions(itemToAdd, "add");

      // If adding an en/boy item, recalculate prices for all dimension-dependent items
      if (
        itemToAdd.category.toLowerCase().includes("en") ||
        itemToAdd.category.toLowerCase().includes("boy")
      ) {
        setTimeout(() => {
          recalculateAllArtisItems();
        }, 150);
      }
    }

    setSavedItems((prev) => [...prev, itemToAdd]);
    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
    });
    setAdding(false);
  }, [newItem, setSavedItems, updateKontiDimensions, recalculateAllArtisItems]);
  // Cancel adding new item
  const handleCancelAdd = useCallback(() => {
    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
    });
    setAdding(false);
  }, []);

  // Edit existing item
  const handleEditItem = useCallback((item, index) => {
    setEditingItem(index);
    setNewItem({
      category: item.category,
      product: item.product,
      productId: item.productId,
      price: item.price.toString(),
      custom: item.custom,
      name: item.custom ? item.product : "",
    });
  }, []);

  // Save edited item
  const handleSaveEdit = useCallback(() => {
    if (editingItem === null) return;

    if (
      (newItem.custom && !newItem.name) ||
      !newItem.category ||
      !newItem.price
    ) {
      return; // Validation
    }

    // Get the original item before update
    const originalItem = savedItems[editingItem];

    const updatedItem = {
      ...savedItems[editingItem],
      category: newItem.category,
      product: newItem.custom ? newItem.name : newItem.product,
      productId: newItem.custom ? null : newItem.productId,
      price: Number(newItem.price),
      custom: newItem.custom,
    };

    // Check if category or product changed
    const categoryChanged = originalItem.category !== updatedItem.category;
    const productChanged = originalItem.productId !== updatedItem.productId;

    // Adjust dimensions if category/product changed for artis items
    if (categoryChanged || productChanged) {
      // Remove effect of old item
      if (originalItem.productId && !originalItem.custom) {
        updateKontiDimensions(originalItem, "remove");
      }

      // Add effect of new item
      if (updatedItem.productId && !updatedItem.custom) {
        updateKontiDimensions(updatedItem, "add");
      }
    }

    setSavedItems((prev) => {
      const updated = [...prev];
      updated[editingItem] = updatedItem;
      return updated;
    });

    setNewItem({
      category: "",
      product: "",
      productId: "",
      price: "",
      custom: false,
      name: "",
    });
    setEditingItem(null);
  }, [editingItem, newItem, savedItems, setSavedItems, updateKontiDimensions]);

  // Delete item
  // Delete item
  const handleDeleteItem = useCallback(
    (index) => {
      const itemToDelete = savedItems[index];
      const itemId = itemToDelete.id;

      // First, update the saved items to remove the item
      setSavedItems((prev) => prev.filter((_, i) => i !== index));

      // Store the deleted item ID in a ref
      if (!deletedItems.current.includes(itemId)) {
        deletedItems.current.push(itemId);
      }

      if (itemToDelete.productId && !itemToDelete.custom) {
        // Capture old dimensions to detect the change
        const oldDimensions = {
          kontiWidth: dimensions.kontiWidth,
          kontiHeight: dimensions.kontiHeight,
        };

        // Update dimensions
        updateKontiDimensions(itemToDelete, "remove");

        if (
          itemToDelete.category.toLowerCase().includes("en") ||
          itemToDelete.category.toLowerCase().includes("boy")
        ) {
          // Explicitly pass the expected new dimensions to avoid closure issues
          setTimeout(() => {
            // Calculate new dimensions based on the item being removed
            const productData =
              products[itemToDelete.category]?.[itemToDelete.productId];
            if (productData) {
              const productWidth = Number(productData.width || 0);
              const productHeight = Number(productData.height || 0);

              const newDimensions = {
                kontiWidth: itemToDelete.category.toLowerCase().includes("en")
                  ? oldDimensions.kontiWidth - productWidth
                  : oldDimensions.kontiWidth,
                kontiHeight: itemToDelete.category.toLowerCase().includes("boy")
                  ? oldDimensions.kontiHeight - productHeight
                  : oldDimensions.kontiHeight,
              };

              console.log(
                "Forcing recalculation with calculated dimensions:",
                newDimensions
              );

              // Force recalculation with explicit dimensions
              forceRecalculateWithDimensions(newDimensions);
            }
          }, 200);
        }
      }
    },
    [setSavedItems, savedItems, updateKontiDimensions, products]
  );

  // New function to force recalculation with explicit dimensions
  const forceRecalculateWithDimensions = useCallback(
    (forcedDimensions) => {
      if (isUpdating.current) return;
      isUpdating.current = true;

      try {
        const updatedItems = JSON.parse(JSON.stringify(savedItems)).filter(
          (item) => !deletedItems.current.includes(item.id)
        );

        let hasChanges = false;

        for (let i = 0; i < updatedItems.length; i++) {
          const item = updatedItems[i];
          if (
            item.custom ||
            !item.productId ||
            item.productId === "istemiyorum"
          )
            continue;

          const categoryName = item.category;
          if (
            !categoryName.toLowerCase().includes("en") &&
            !categoryName.toLowerCase().includes("boy")
          )
            continue;

          const category = Object.values(categories).find(
            (cat) =>
              cat.propertyName?.toLowerCase() === categoryName.toLowerCase()
          );

          if (!category || category.priceFormat !== "artis") continue;

          const productData = products[categoryName]?.[item.productId];
          if (!productData) continue;

          // Use the forced dimensions to calculate price
          const newPrice = calculateItemPrice(
            "artis",
            categoryName,
            productData,
            forcedDimensions.kontiWidth,
            forcedDimensions.kontiHeight,
            null
          );

          if (Math.abs(newPrice - item.price) > 0.1) {
            console.log(
              `[Force] Recalculating ${categoryName} price: ${item.price} -> ${newPrice} using width=${forcedDimensions.kontiWidth}, height=${forcedDimensions.kontiHeight}`
            );
            updatedItems[i].price = newPrice;
            hasChanges = true;
          }
        }

        if (hasChanges) {
          setSavedItems(updatedItems);
        }
      } catch (error) {
        console.error("Error in forced recalculation:", error);
      } finally {
        setTimeout(() => {
          isUpdating.current = false;
        }, 100);
      }
    },
    [savedItems, categories, products, calculateItemPrice, setSavedItems]
  );
  return (
    <div className="space-y-3">
      {/* Item List */}
      {savedItems.length > 0 && (
        <div className="mb-4 space-y-1">
          {savedItems.map((item, index) => (
            <div
              key={item.id || index}
              className={`grid grid-cols-[2fr,2fr,1fr,auto] items-center bg-gray-700/30 px-2 py-1 ${
                editingItem === index ? "bg-gray-700/50" : ""
              }`}
            >
              {editingItem === index ? (
                <>
                  <div>
                    <select
                      value={newItem.category}
                      onChange={handleCategoryChange}
                      className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    >
                      <option value="">Kategori Seçin</option>
                      {categoryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    {newItem.custom ? (
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={handleNameChange}
                        placeholder="Ürün adı"
                        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                      />
                    ) : (
                      <select
                        value={
                          newItem.productId
                            ? JSON.stringify({
                                id: newItem.productId,
                                name: newItem.product,
                                price: newItem.price,
                              })
                            : ""
                        }
                        onChange={handleProductChange}
                        className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                      >
                        <option value="">Ürün Seçin</option>
                        {productOptions.map((product) => (
                          <option
                            key={product.id}
                            value={JSON.stringify({
                              id: product.id,
                              name: product.name,
                              price: product.price,
                            })}
                          >
                            {product.name} -{" "}
                            {Number(product.price).toLocaleString("tr-TR")}₺
                          </option>
                        ))}
                        <option value="custom">Diğer</option>
                      </select>
                    )}
                  </div>

                  <div>
                    <input
                      type="number"
                      value={newItem.price}
                      onChange={handlePriceChange}
                      placeholder="Fiyat"
                      className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
                    />
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={handleSaveEdit}
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
                    <button
                      onClick={() => setEditingItem(null)}
                      className="text-gray-400 hover:text-gray-300 p-1"
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
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-gray-400 text-xs truncate">
                    {categoryOptions.find((c) => c.value === item.category)
                      ?.label || item.category}
                  </span>
                  <span className="text-gray-300 text-xs truncate">
                    {item.product}
                  </span>
                  <span className="text-green-400 text-xs">
                    {Number(item.price)?.toLocaleString("tr-TR")}₺
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditItem(item, index)}
                      className="text-blue-400 hover:text-blue-300 p-1"
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
                    </button>
                    <button
                      onClick={() => handleDeleteItem(index)}
                      className="text-red-400 hover:text-red-300 p-1"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add New Item Form */}
      {adding ? (
        <div className="grid grid-cols-[2fr,2fr,1fr,auto] gap-2 items-center bg-gray-700/30 p-2 rounded">
          <div>
            <select
              value={newItem.category}
              onChange={handleCategoryChange}
              className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
            >
              <option value="">Kategori Seçin</option>
              {categoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            {newItem.custom ? (
              <input
                type="text"
                value={newItem.name}
                onChange={handleNameChange}
                placeholder="Ürün adı"
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
              />
            ) : (
              <select
                value={
                  newItem.productId
                    ? JSON.stringify({
                        id: newItem.productId,
                        name: newItem.product,
                        price: newItem.price,
                      })
                    : ""
                }
                onChange={handleProductChange}
                disabled={!newItem.category}
                className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full disabled:opacity-50"
              >
                <option value="">Ürün Seçin</option>
                {productOptions.map((product) => (
                  <option
                    key={product.id}
                    value={JSON.stringify({
                      id: product.id,
                      name: product.name,
                      price: product.price,
                    })}
                  >
                    {product.name} -{" "}
                    {Number(product.price).toLocaleString("tr-TR")}₺
                  </option>
                ))}
                <option value="custom">Diğer</option>
              </select>
            )}
          </div>

          <div>
            <input
              type="number"
              value={newItem.price}
              onChange={handlePriceChange}
              placeholder="Fiyat"
              className="bg-gray-600 text-xs text-gray-200 px-2 py-1.5 rounded outline-none w-full"
            />
          </div>

          <div className="flex gap-1">
            <button
              onClick={handleAddItem}
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
            <button
              onClick={handleCancelAdd}
              className="text-gray-400 hover:text-gray-300 p-1"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded hover:bg-gray-700/30"
        >
          <svg
            className="w-4 h-4 mr-1"
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
          <span className="text-xs">Bonus Ürün Ekle</span>
        </button>
      )}
    </div>
  );
};

BonusItems.propTypes = {
  categories: PropTypes.object.isRequired,
  products: PropTypes.object.isRequired,
  savedItems: PropTypes.array.isRequired,
  setSavedItems: PropTypes.func.isRequired,
  dimensions: PropTypes.shape({
    kontiWidth: PropTypes.number,
    kontiHeight: PropTypes.number,
    anaWidth: PropTypes.number,
    anaHeight: PropTypes.number,
    verandaWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    verandaHeight: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    length: PropTypes.number,
  }).isRequired,
  setDimensions: PropTypes.func.isRequired, // Yeni prop için PropType ekliyoruz
  shouldRecalc: PropTypes.bool,
};

export default BonusItems;
