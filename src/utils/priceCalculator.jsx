// Mevcut calculatePrice fonksiyonunun altına ekleyin
export const calculateArtisPrice = ({
  categoryName,
  productWidth,
  productHeight,
  kontiWidth,
  kontiHeight,
  basePrice,
  // Add a parameter to track if we've already added both dimensions
  hasAddedBothDimensions = false,
  alanPrice = 0,
}) => {
  // En kategorisi için
  if (categoryName.toLowerCase().includes("en")) {
    const calculatedPrice = kontiHeight * productWidth * basePrice;
    return calculatedPrice;
  }
  // Boy kategorisi için
  else if (categoryName.toLowerCase().includes("boy")) {
    const calculatedPrice = kontiWidth * productHeight * basePrice;
    return calculatedPrice;
  }
  // Diğer artis kategorileri için (currently not used, but kept for completeness)
  else {
    // Burada normal artis hesaplamasını yapabiliriz veya null döndürebiliriz
    return null;
  }
};

export const calculatePrice = ({
  priceFormat,
  basePrice,
  alanPrice,
  width = 0,
  height = 0,
  kontiWidth = 0,
  kontiHeight = 0,
  anaWidth = 0,
  anaHeight = 0,
  categoryName = "",
  // Add a parameter to track if we've already added both dimensions
  hasAddedBothDimensions = false,
}) => {
  // Move all declarations outside switch
  let area = 0;
  let perimeter = 0;
  let kontiArea = 0;
  let newWidth = 0;
  let newHeight = 0;
  let newArea = 0;
  let artisArea = 0;
  let kontiTotalArea = 0;
  let ratio = 0;

  switch (priceFormat) {
    case "tekil":
      return Number(basePrice);

    case "metrekare":
      area = width * height;
      return area * Number(basePrice);

    case "cevre":
      perimeter = 2 * (Number(kontiWidth) + Number(kontiHeight));
      return perimeter * Number(basePrice);

    case "artis":
      if (categoryName && categoryName.includes("en")) {
        // Width change calculation - use current kontiHeight
        return Number(width) * Number(kontiHeight) * Number(basePrice);
      } else if (categoryName && categoryName.includes("boy")) {
        // Height change calculation - use current kontiWidth
        return Number(height) * Number(kontiWidth) * Number(basePrice);
      } else {
        // Standard calculation (area difference)
        kontiArea = kontiWidth * kontiHeight;
        newWidth = Number(kontiWidth) + Number(width);
        newHeight = Number(kontiHeight) + Number(height);
        newArea = newWidth * newHeight;

        // For area difference calculation, account for corner overlaps
        if (hasAddedBothDimensions && width > 0 && height > 0) {
          // Don't double count the corner area when both dimensions are added
          return (newArea - kontiArea - width * height) * Number(basePrice);
        } else {
          return (newArea - kontiArea) * Number(basePrice);
        }
      }

    case "tasDuvar": {
      const area = kontiHeight * kontiWidth;
      const cevre = 2 * (kontiHeight + kontiWidth);
      const alanFiyat = area * alanPrice;
      const cevreFiyat = cevre * basePrice;

      return Number(alanFiyat) + Number(cevreFiyat);
    }

    case "konti":
      return Number(basePrice);

    case "veranda":
      return Number(basePrice);

    case "onYuzey":
      return Number(basePrice) * kontiHeight;

    case "extra":
      return Number(basePrice);

    case "bugOnleme":
      return (
        Number(basePrice) *
        Number(anaHeight + anaWidth + artisArea + kontiTotalArea + ratio)
      );

    default:
      return Number(basePrice);
  }
};

export const needsDimensionCalculation = (priceFormat) => {
  return ["metrekare", "cevre", "artis", "konti"].includes(priceFormat);
};

/**
 * Konti kategorisi kontrolü
 */
export const isKontiCategory = (category) => {
  return (
    category?.propertyName === "konti" || category?.priceFormat === "konti"
  );
};

/**
 * Check if both width and height dimensions have been added
 * This helps prevent double-counting corner areas
 */
export const checkBothDimensionsAdded = (orderData) => {
  let hasEnArtis = false;
  let hasBoyArtis = false;

  // Check both main order and bonus items
  for (const categoryName in orderData) {
    if (typeof orderData[categoryName] !== "object") continue;

    if (
      categoryName.toLowerCase().includes("en") &&
      orderData[categoryName].some((item) => item.productId !== "istemiyorum")
    ) {
      hasEnArtis = true;
    }

    if (
      categoryName.toLowerCase().includes("boy") &&
      orderData[categoryName].some((item) => item.productId !== "istemiyorum")
    ) {
      hasBoyArtis = true;
    }
  }

  return hasEnArtis && hasBoyArtis;
};
