import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import PropTypes from "prop-types";
import { useDimensionsStore } from "../../store/dimensionsStore"; // Import as named export

const BonusItems = ({
  categories,
  products,
  savedItems,
  setSavedItems,
  shouldRecalc = false,
  setShouldRecalcPrices = () => {},
  skipInitialCalc = false, // Yeni prop
  isFirstLoad = false, // Yeni prop
}) => {
  // Use individual selectors for better performance
  const kontiWidth = useDimensionsStore((state) => state.kontiWidth);
  const kontiHeight = useDimensionsStore((state) => state.kontiHeight);
  const anaWidth = useDimensionsStore((state) => state.anaWidth);
  const anaHeight = useDimensionsStore((state) => state.anaHeight);
  const updateDimension = useDimensionsStore((state) => state.updateDimension);
  const initializeDimensions = useDimensionsStore(
    (state) => state.initializeDimensions
  );
  const needsRecalculation = useDimensionsStore(
    (state) => state.needsRecalculation
  );
  const resetRecalculationFlag = useDimensionsStore(
    (state) => state.resetRecalculationFlag
  );

  // Create dimensions object using useMemo to prevent re-creation on every render
  const dimensions = useMemo(
    () => ({
      kontiWidth,
      kontiHeight,
      anaWidth,
      anaHeight,
    }),
    [kontiWidth, kontiHeight, anaWidth, anaHeight]
  );

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
  const calculateItemPrice = useCallback(
    (
      priceFormat,
      categoryName,
      productData,
      kontiWidth,
      kontiHeight,
      itemOriginalDimensions = null
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
          // DÜZELTME: EN ürünü için boy yüksekliğini kullan
          const heightToUse = kontiHeight; // Zorlanmış veya güncel yükseklik
          calculatedPrice = productWidth * heightToUse * basePrice;
          console.log(
            `En hesaplama (using height=${heightToUse}): ${productWidth} * ${heightToUse} * ${basePrice} = ${calculatedPrice}`
          );
        } else if (categoryName.toLowerCase().includes("boy")) {
          // DÜZELTME: BOY ürünü için en genişliğini kullan
          const widthToUse = kontiWidth; // Zorlanmış veya güncel genişlik
          calculatedPrice = productHeight * widthToUse * basePrice;
          console.log(
            `Boy hesaplama (using width=${widthToUse}): ${widthToUse} * ${productHeight} * ${basePrice} = ${calculatedPrice}`
          );
        } else {
          // diğer artis durumları için standard hesaplama...
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

      // Process all items with dynamic pricing
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId) continue;
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

        // For artis categories, use the item's original dimensions
        if (category.priceFormat === "artis") {
          updatedItems[i].price = calculateItemPrice(
            category.priceFormat,
            categoryName,
            productData,
            dimensions.kontiWidth,
            dimensions.kontiHeight,
            // Use this item's original dimensions
            item.originalDimensions
          );
        } else {
          // For other formats, use current dimensions
          updatedItems[i].price = calculateItemPrice(
            category.priceFormat,
            categoryName,
            productData,
            dimensions.kontiWidth,
            dimensions.kontiHeight,
            null
          );
        }
      }

      // Only update if prices actually changed
      const hasChanges = updatedItems.some((item, index) => {
        return Math.abs(savedItems[index]?.price - item.price) > 0.1;
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
    calculateItemPrice,
  ]);
  // Function to calculate item price based on format
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
          const category = Object.values(categories).find(
            (cat) =>
              cat.propertyName?.toLowerCase() === categoryName?.toLowerCase()
          );

          // Include all dynamic price formats
          const dynamicPriceFormats = [
            "artis",
            "metrekare",
            "cevre",
            "onYuzey",
            "tasDuvar",
          ];
          if (!category || !dynamicPriceFormats.includes(category.priceFormat))
            continue;

          const productData = products[categoryName]?.[item.productId];
          if (!productData) continue;

          // ÖNEMLİ DEĞİŞİKLİK: Zorla geçirilen boyutları kullan, orjinal boyutları değil
          // En/Boy örüntülerinin birbiriyle etkileşimini doğru işlemek için
          let newPrice;

          if (category.priceFormat === "artis") {
            if (categoryName.toLowerCase().includes("en")) {
              // En için boy yüksekliğini kullan
              const productWidth = Number(productData.width || 0);
              newPrice =
                productWidth *
                forcedDimensions.kontiHeight *
                Number(productData.price || 0);
            } else if (categoryName.toLowerCase().includes("boy")) {
              // Boy için en genişliğini kullan
              const productHeight = Number(productData.height || 0);
              newPrice =
                productHeight *
                forcedDimensions.kontiWidth *
                Number(productData.price || 0);
            } else {
              // Diğer artis formatları için normal hesaplama
              newPrice = calculateItemPrice(
                category.priceFormat,
                categoryName,
                productData,
                forcedDimensions.kontiWidth,
                forcedDimensions.kontiHeight,
                null // Orjinal boyutları kullanma - zorlanan boyutları kullan
              );
            }
          } else {
            // Diğer dinamik fiyat formatları için - zorlanan boyutları kullan
            newPrice = calculateItemPrice(
              category.priceFormat,
              categoryName,
              productData,
              forcedDimensions.kontiWidth,
              forcedDimensions.kontiHeight,
              null // Orjinal boyutları kullanma
            );
          }

          if (Math.abs(newPrice - item.price) > 0.1) {
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

  const recalculateAllDynamicItems = useCallback(() => {
    if (isUpdating.current) return;
    isUpdating.current = true;

    try {
      const updatedItems = JSON.parse(JSON.stringify(savedItems)).filter(
        (item) => !deletedItems.current.includes(item.id)
      );

      let hasChanges = false;

      // Process all items with any dynamic pricing format
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId || item.productId === "istemiyorum")
          continue;

        const categoryName = item.category;
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() === categoryName?.toLowerCase()
        );

        // Check all dynamic price formats
        const dynamicPriceFormats = [
          "artis",
          "metrekare",
          "cevre",
          "onYuzey",
          "tasDuvar",
        ];

        if (!category || !dynamicPriceFormats.includes(category.priceFormat))
          continue;

        const productData = products[categoryName]?.[item.productId];
        if (!productData) continue;

        // CRITICAL CHANGE: For artis categories, use each item's ORIGINAL dimensions
        // This prevents recalculation of existing items when new dimensions are added
        if (category.priceFormat === "artis") {
          // Get dimensions that existed when this item was added
          const originalDimensions =
            item.originalDimensions || originalDimensions.current;
          if (!originalDimensions) {
            console.warn(
              `No original dimensions found for item ${item.id}. Using current dimensions.`
            );
          }

          // Calculate price using original dimensions for this specific item
          const newPrice = calculateItemPrice(
            "artis",
            categoryName,
            productData,
            dimensions.kontiWidth, // We still pass current width
            dimensions.kontiHeight, // We still pass current height
            originalDimensions // But the calculation will use these for en/boy
          );

          if (Math.abs(newPrice - item.price) > 0.1) {
            updatedItems[i].price = newPrice;
            hasChanges = true;
          }
        }
        // For non-artis dynamic formats, always use current dimensions
        else {
          const newPrice = calculateItemPrice(
            category.priceFormat,
            categoryName,
            productData,
            dimensions.kontiWidth,
            dimensions.kontiHeight,
            null // No need for original dimensions here
          );

          if (Math.abs(newPrice - item.price) > 0.1) {
            updatedItems[i].price = newPrice;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        setSavedItems(updatedItems);
      }
    } catch (error) {
      console.error("Error recalculating dynamic item prices:", error);
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
    originalDimensions,
  ]);
  // Handle dimension changes and recalculate prices
  useEffect(() => {
    // Skip if dimensions aren't defined
    if (!dimensions.kontiWidth || !dimensions.kontiHeight) {
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

    // Only recalculate if dimensions changed and we have saved items
    if (dimensionsChanged && savedItems.length > 0) {
      // Force a recalculation with a slight delay to ensure all state updates are processed
      setTimeout(() => {
        if (!isUpdating.current) {
          // Call the comprehensive function
          recalculateAllDynamicItems();
        }
      }, 150);
    }
  }, [
    dimensions.kontiWidth,
    dimensions.kontiHeight,
    savedItems.length,
    recalculateAllDynamicItems,
  ]);

  // Function to handle recalculation of prices after dimension changes
  const recalculateAllArtisItems = useCallback(() => {
    if (isUpdating.current) return;
    isUpdating.current = true;

    try {
      // DOĞRUDAN STORE'DAN EN GÜNCEL BOYUTLARI AL
      const storeValues = useDimensionsStore.getState();
      const storeWidth = storeValues.kontiWidth;
      const storeHeight = storeValues.kontiHeight;

      console.log("📐 recalculateAllArtisItems - Store Boyutları:", {
        width: storeWidth,
        height: storeHeight,
      });

      const updatedItems = JSON.parse(JSON.stringify(savedItems)).filter(
        (item) => !deletedItems.current.includes(item.id)
      );

      let hasChanges = false;

      // Recalculate all artis items with their own original dimensions
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        if (item.custom || !item.productId || item.productId === "istemiyorum")
          continue;

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

        const isEnItem = categoryName.toLowerCase().includes("en");
        const isBoyItem = categoryName.toLowerCase().includes("boy");

        // HER ZAMAN STORE'DAN ALDIĞIMIZ GÜNCEL BOYUTLARI KULLAN
        const newPrice = calculateItemPrice(
          "artis",
          categoryName,
          productData,
          storeWidth,
          storeHeight,
          null // originalDimensions kullanmıyoruz artık
        );

        if (Math.abs(newPrice - item.price) > 0.1) {
          console.log(
            `${categoryName} ürünü fiyatı güncellendi: ${item.price} -> ${newPrice}`
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
  }, [categories, products, savedItems, setSavedItems, calculateItemPrice]);

  // Add this function to recalculate all dimension-dependent items

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
          // Use originalDimensions directly instead of creating an unused variable
          const price = calculateItemPrice(
            category.priceFormat,
            categoryName,
            productData,
            dimensions.kontiWidth,
            dimensions.kontiHeight,
            originalDimensions.current || dimensions
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

  // updateKontiDimensions fonksiyonunu güncelleyin
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

      let dimensionChanged = false;

      // If it's an "En" category, adjust width
      if (categoryName.toLowerCase().includes("en")) {
        const newWidth =
          action === "add"
            ? currentWidth + productWidth
            : currentWidth - productWidth;

        if (newWidth > 0 && newWidth !== currentWidth) {
          // Use Zustand to update width
          updateDimension("kontiWidth", newWidth);
          updateDimension("anaWidth", newWidth); // Ana width'i de güncelle
          dimensionChanged = true;
        }
      }
      // For "Boy" category products:
      else if (categoryName.toLowerCase().includes("boy")) {
        const newHeight =
          action === "add"
            ? currentHeight + productHeight
            : currentHeight - productHeight;

        if (newHeight > 0 && newHeight !== currentHeight) {
          // Use Zustand to update height
          updateDimension("kontiHeight", newHeight);
          updateDimension("anaHeight", newHeight); // Ana height'i de güncelle
          dimensionChanged = true;
        }
      }

      // Boyutlar değiştiyse ve recalcPrices tetiklenmeli
      if (dimensionChanged) {
        // setShouldRecalcPrices prop'una gerekirse true değer gönder
        // Bu hem OrderDetails hem de BonusItems'daki fiyatları günceller
        setShouldRecalcPrices(true);
        setTimeout(() => setShouldRecalcPrices(false), 100);
      }
    },
    [categories, products, dimensions, updateDimension, setShouldRecalcPrices]
  );
  // Eski updateKontiDimensions fonksiyonunu güncelleyin

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

    // Get the current dimensions BEFORE any changes
    const currentDimensions = {
      kontiWidth: dimensions.kontiWidth,
      kontiHeight: dimensions.kontiHeight,
    };

    const itemToAdd = {
      id: Date.now().toString(),
      category: newItem.category,
      product: newItem.custom ? newItem.name : newItem.product,
      productId: newItem.custom ? null : newItem.productId,
      price: Number(newItem.price),
      custom: newItem.custom,
      // Store current dimensions with each item when added - VERY IMPORTANT
      // This is like "freezing" the dimensions at the moment of addition
      originalDimensions: currentDimensions,
    };

    // Update konti dimensions if needed
    if (
      !itemToAdd.custom &&
      itemToAdd.productId &&
      itemToAdd.productId !== "istemiyorum"
    ) {
      // Update dimensions in the store - this will trigger recalculation
      updateKontiDimensions(itemToAdd, "add");
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
  }, [newItem, dimensions, setSavedItems, updateKontiDimensions]);

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
  const handleDeleteItem = useCallback(
    (index) => {
      const itemToDelete = savedItems[index];
      const itemId = itemToDelete.id;

      // First, update the saved items to remove the item
      const updatedSavedItems = savedItems.filter((_, i) => i !== index);

      if (itemToDelete.productId && !itemToDelete.custom) {
        // Capture old dimensions to detect the change
        const oldDimensions = {
          kontiWidth: dimensions.kontiWidth,
          kontiHeight: dimensions.kontiHeight,
        };

        // Kategori bilgisini al
        const category = Object.values(categories).find(
          (cat) =>
            cat.propertyName?.toLowerCase() ===
            itemToDelete.category?.toLowerCase()
        );

        // Tüm dinamik kategoriler için fiyat hesaplaması yapılması gereken durum
        const isDynamicCategory =
          category &&
          ["artis", "metrekare", "cevre", "onYuzey", "tasDuvar"].includes(
            category.priceFormat
          );

        if (isDynamicCategory) {
          // Silinmekte olan ürünün türünü belirle (en/boy)
          const isEnItem = itemToDelete.category.toLowerCase().includes("en");
          const isBoyItem = itemToDelete.category.toLowerCase().includes("boy");

          // Silinen ürünün boyut değişikliğini hesapla
          const productData =
            products[itemToDelete.category]?.[itemToDelete.productId];

          if (productData) {
            const productWidth = Number(productData.width || 0);
            const productHeight = Number(productData.height || 0);

            // Yeni boyutları hesapla (konti'den ürün boyutlarını çıkar)
            let newWidth = oldDimensions.kontiWidth;
            let newHeight = oldDimensions.kontiHeight;

            if (isEnItem && productWidth > 0) {
              newWidth = Math.max(0, oldDimensions.kontiWidth - productWidth);
            }

            if (isBoyItem && productHeight > 0) {
              newHeight = Math.max(
                0,
                oldDimensions.kontiHeight - productHeight
              );
            }

            // ÖNEMLİ: En/Boy ürünlerinin original dimensions değerlerini güncelle
            // Önce mevcut state'e uygulanacak değişiklikleri hesapla
            const updatedItems = updatedSavedItems.map((item) => {
              if (isEnItem && item.category.toLowerCase().includes("boy")) {
                return {
                  ...item,
                  originalDimensions: {
                    ...item.originalDimensions,
                    kontiWidth: newWidth, // Buradaki kritik değişiklik
                  },
                };
              } else if (
                isBoyItem &&
                item.category.toLowerCase().includes("en")
              ) {
                return {
                  ...item,
                  originalDimensions: {
                    ...item.originalDimensions,
                    kontiHeight: newHeight, // Buradaki kritik değişiklik
                  },
                };
              }
              return item;
            });

            // Önce state'i güncelle, SONRA boyutları değiştir
            setSavedItems(updatedItems);

            // Doğrudan store'u güncelle, initializeDimensions kullanarak
            initializeDimensions({
              kontiWidth: newWidth,
              kontiHeight: newHeight,
              anaWidth: newWidth,
              anaHeight: newHeight,
            });

            // Kısa bir gecikme ile fiyatları yeniden hesapla
            setTimeout(() => {
              try {
                // Zorla fiyat hesaplamalarını yap
                forceRecalculateWithDimensions({
                  kontiWidth: newWidth,
                  kontiHeight: newHeight,
                });

                // ÖNEMLİ DEĞİŞİKLİK: Artis kategorileri için yeniden hesaplama
                if (category.priceFormat === "artis") {
                  recalculateAllArtisItems();
                }

                // Tüm dinamik kategorili ürünleri yeniden hesapla
                recalculateAllDynamicItems();

                // Fiyat hesaplamaları için sinyal gönder
                setShouldRecalcPrices(true);
                setTimeout(() => setShouldRecalcPrices(false), 200);
              } catch (error) {
                console.error("Ürün silme işleminde hata:", error);
              }
            }, 100);
          }
        } else {
          // Dinamik olmayan kategoriler için sadece silme işlemi yap
          setSavedItems(updatedSavedItems);
        }
      } else {
        // Özel ürünler için sadece silme işlemi yap
        setSavedItems(updatedSavedItems);
      }

      // Store the deleted item ID in a ref
      if (!deletedItems.current.includes(itemId)) {
        deletedItems.current.push(itemId);
      }
    },
    [
      savedItems,
      setSavedItems,
      categories,
      products,
      dimensions,
      setShouldRecalcPrices,
      forceRecalculateWithDimensions,
      recalculateAllArtisItems,
      recalculateAllDynamicItems,
      initializeDimensions,
    ]
  );

  // New function to force recalculation with explicit dimensions - without circular dependency

  // OrderDetails gibi store'un needsRecalculation flag'ini dinleyin
  useEffect(() => {
    if (needsRecalculation && savedItems.length > 0 && !isUpdating.current) {
      isUpdating.current = true;

      try {
        // Store'dan en güncel değerleri al
        const storeState = useDimensionsStore.getState();
        // DİREKT OLARAK ZUSTAND STORE'DAKİ GÜNCEL BOYUTLARLA HESAPLA
        forceRecalculateWithDimensions({
          kontiWidth: storeState.kontiWidth,
          kontiHeight: storeState.kontiHeight,
          anaWidth: storeState.anaWidth,
          anaHeight: storeState.anaHeight,
        });

        // Flag'i sıfırla
        resetRecalculationFlag();

        // Daha güçlü senkronizasyon için ana bileşene sinyal gönder
        setShouldRecalcPrices(true);
        setTimeout(() => {
          setShouldRecalcPrices(false);
          isUpdating.current = false;
        }, 100);
      } catch (error) {
        console.error("BonusItems recalculation error:", error);
        isUpdating.current = false;
        resetRecalculationFlag();
      }
    }
  }, [
    needsRecalculation,
    savedItems,
    setSavedItems,
    forceRecalculateWithDimensions,
    resetRecalculationFlag,
    setShouldRecalcPrices,
  ]);

  // shouldRecalc prop'u değişince fiyatları güncelle (OrderDetails'dan gönderilen sinyal)
  useEffect(() => {
    if (shouldRecalc && savedItems.length > 0 && !isUpdating.current) {
      // Her iki hesaplama fonksiyonunu çağır
      forceRecalculateWithDimensions({
        kontiWidth,
        kontiHeight,
        anaWidth,
        anaHeight,
      });

      // En/Boy ürünlerinde son konti durumuna göre güncelleme için
      recalculateAllArtisItems();
    }
  }, [
    shouldRecalc,
    savedItems.length,
    forceRecalculateWithDimensions,
    recalculateAllArtisItems,
    kontiWidth,
    kontiHeight,
  ]);

  // Kritik useEffect: konti boyutları değiştiğinde originalDimensions güncelle
  useEffect(() => {
    // Boyut değişikliklerini izle
    if (
      lastDimensions.current?.kontiWidth !== dimensions.kontiWidth ||
      lastDimensions.current?.kontiHeight !== dimensions.kontiHeight
    ) {
      // OrderDetails'da EN veya BOY değiştiği için originalDimensions güncellenmeli
      // Kalan öğelerin original dimensions değerlerini güncelle
      const updatedItems = savedItems.map((item) => {
        if (
          !item.custom &&
          item.productId &&
          item.productId !== "istemiyorum"
        ) {
          // EN ürününde BOY değişmişse
          if (
            item.category.toLowerCase().includes("en") &&
            lastDimensions.current?.kontiHeight !== dimensions.kontiHeight
          ) {
            return {
              ...item,
              originalDimensions: {
                ...item.originalDimensions,
                kontiHeight: dimensions.kontiHeight, // Boy kategorisindeki değişikliği EN'e yansıt
              },
            };
          }
          // BOY ürününde EN değişmişse
          else if (
            item.category.toLowerCase().includes("boy") &&
            lastDimensions.current?.kontiWidth !== dimensions.kontiWidth
          ) {
            return {
              ...item,
              originalDimensions: {
                ...item.originalDimensions,
                kontiWidth: dimensions.kontiWidth, // EN kategorisindeki değişikliği BOY'a yansıt
              },
            };
          }
        }
        return item;
      });

      // Eğer değişiklik olduysa state'i güncelle
      if (JSON.stringify(updatedItems) !== JSON.stringify(savedItems)) {
        setSavedItems(updatedItems);
        // Kısa bir gecikmeyle fiyatları zorla yeniden hesapla
        setTimeout(() => {
          if (!isUpdating.current) {
            forceRecalculateWithDimensions({
              kontiWidth: dimensions.kontiWidth,
              kontiHeight: dimensions.kontiHeight,
              anaWidth: dimensions.anaWidth,
              anaHeight: dimensions.anaHeight,
            });
          }
        }, 100);
      }

      // Son boyutları kaydet
      lastDimensions.current = {
        kontiWidth: dimensions.kontiWidth,
        kontiHeight: dimensions.kontiHeight,
      };
    }
  }, [
    dimensions.kontiWidth,
    dimensions.kontiHeight,
    savedItems,
    setSavedItems,
    forceRecalculateWithDimensions,
  ]);

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
  shouldRecalc: PropTypes.bool,
  setShouldRecalcPrices: PropTypes.func,
  skipInitialCalc: PropTypes.bool, // Eksik prop tanımı
  isFirstLoad: PropTypes.bool, // Eksik prop tanımı
};

export default BonusItems;
