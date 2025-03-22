import { createContext, useContext, useState, useRef } from "react";
import PropTypes from "prop-types";

const ChangelogContext = createContext();

export function ChangelogProvider({ children }) {
  const [changes, setChanges] = useState([]);
  const initialData = useRef(null);
  const initialBonus = useRef(null);

  // Set initial data to compare changes against
  const initializeData = (orderData, bonusItems) => {
    initialData.current = JSON.parse(JSON.stringify(orderData));
    initialBonus.current = JSON.parse(JSON.stringify(bonusItems));
    setChanges([]);
  };

  // Track product addition
  const trackAddition = (categoryName, product) => {
    setChanges((prev) => [
      ...prev,
      {
        type: "add",
        categoryName: categoryName,
        productName: product.name,
        timestamp: Date.now(),
        message: `"${categoryName}" kategorisinden "${product.name}" ürünü eklendi.`,
      },
    ]);
  };

  // Track product removal
  const trackRemoval = (categoryName, product) => {
    setChanges((prev) => [
      ...prev,
      {
        type: "remove",
        categoryName: categoryName,
        productName: product.name,
        timestamp: Date.now(),
        message: `"${categoryName}" kategorisinden "${product.name}" ürünü kaldırıldı.`,
      },
    ]);
  };

  // Track price update
  const trackPriceUpdate = (categoryName, productName, oldPrice, newPrice) => {
    setChanges((prev) => [
      ...prev,
      {
        type: "update",
        categoryName: categoryName,
        productName: productName,
        oldPrice: oldPrice,
        newPrice: newPrice,
        timestamp: Date.now(),
        message: `"${categoryName}" kategorisinin "${productName}" ürününün fiyatı güncellendi: ${oldPrice.toLocaleString(
          "tr-TR"
        )}₺ -> ${newPrice.toLocaleString("tr-TR")}₺`,
      },
    ]);
  };

  // Track total price change
  const trackTotalChange = (oldTotal, newTotal) => {
    setChanges((prev) => [
      ...prev,
      {
        type: "total",
        oldTotal: oldTotal,
        newTotal: newTotal,
        timestamp: Date.now(),
        message: `Toplam sipariş fiyatı güncellendi: ${oldTotal.toLocaleString(
          "tr-TR"
        )}₺ -> ${newTotal.toLocaleString("tr-TR")}₺`,
      },
    ]);
  };

  // Get all tracked changes
  const getChanges = () => changes;

  // Clear all changes
  const clearChanges = () => {
    setChanges([]);
  };

  return (
    <ChangelogContext.Provider
      value={{
        initializeData,
        trackAddition,
        trackRemoval,
        trackPriceUpdate,
        trackTotalChange,
        getChanges,
        clearChanges,
      }}
    >
      {children}
    </ChangelogContext.Provider>
  );
}

ChangelogProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export function useChangelog() {
  return useContext(ChangelogContext);
}
