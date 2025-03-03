export const calculatePrice = ({
  priceFormat,
  basePrice,
  width = 0,
  height = 0,
  kontiWidth = 0,
  kontiHeight = 0,
  anaWidth = 0,
  anaHeight = 0,
  categoryName = "",
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
      perimeter = 2 * (Number(width) + Number(height));
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
        return (newArea - kontiArea) * Number(basePrice);
      }
    case "tasDuvar":
      return Number(basePrice);

    case "konti":
      return Number(basePrice);

    case "veranda":
      return Number(basePrice);

    case "onYuzey":
      return Number(basePrice);

    case "extra":
      return Number(basePrice);

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
