import PropTypes from "prop-types";
import CountUp from "react-countup";
import { useState, useEffect, useRef } from "react";

const OrderSummary = ({ orderData, savedItems, onSave, onCancel }) => {
  const [prevOrderTotal, setPrevOrderTotal] = useState(0);
  const [prevBonusTotal, setPrevBonusTotal] = useState(0);
  const [prevGrandTotal, setPrevGrandTotal] = useState(0);
  const firstRender = useRef(true);
  const valuesChanged = useRef(false);

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

  // Check if values have changed
  useEffect(() => {
    if (firstRender.current) {
      setPrevOrderTotal(orderTotal);
      setPrevBonusTotal(bonusTotal);
      setPrevGrandTotal(grandTotal);
      firstRender.current = false;
      return;
    }

    // If values have changed, mark for update but don't update immediately
    if (
      prevOrderTotal !== orderTotal ||
      prevBonusTotal !== bonusTotal ||
      prevGrandTotal !== grandTotal
    ) {
      valuesChanged.current = true;
    }
  }, [
    orderTotal,
    bonusTotal,
    grandTotal,
    prevOrderTotal,
    prevBonusTotal,
    prevGrandTotal,
  ]);

  // Update previous values after a delay to allow animation
  useEffect(() => {
    if (valuesChanged.current) {
      // Delay updating the previous values to allow animation to complete
      const timer = setTimeout(() => {
        setPrevOrderTotal(orderTotal);
        setPrevBonusTotal(bonusTotal);
        setPrevGrandTotal(grandTotal);
        valuesChanged.current = false;
      }, 1000); // Delay slightly longer than animation duration

      return () => clearTimeout(timer);
    }
  }, [orderTotal, bonusTotal, grandTotal]);

  return (
    <div className="bg-gradient-to-b from-gray-800/95 to-gray-800/90 border-t border-gray-700/50 shadow-lg px-4 py-3">
      <div className="flex justify-between items-center gap-x-6">
        {/* Price Summary Cards */}
        <div className="flex gap-3 flex-1 flex-wrap md:flex-nowrap">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/20 hover:border-gray-600/30 transition-colors duration-200 flex-1 min-w-[120px]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-green-500/10">
                <svg
                  className="w-3.5 h-3.5 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-gray-400 text-xs">Ürünler</span>
            </div>
            <span className="text-green-400 text-sm font-medium">
              <CountUp
                start={prevOrderTotal}
                end={orderTotal}
                duration={0.6}
                separator="."
                decimal=","
                suffix="₺"
                preserveValue={true}
                decimals={0}
                className="tabular-nums"
                key={`order-${orderTotal}`} // Force re-render with new key
              />
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-2 bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/20 hover:border-gray-600/30 transition-colors duration-200 flex-1 min-w-[120px]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-500/10">
                <svg
                  className="w-3.5 h-3.5 text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              </div>
              <span className="text-gray-400 text-xs">Bonus</span>
            </div>
            <span className="text-blue-400 text-sm font-medium">
              <CountUp
                start={prevBonusTotal}
                end={bonusTotal}
                duration={0.6}
                separator="."
                decimal=","
                suffix="₺"
                preserveValue={true}
                decimals={0}
                className="tabular-nums"
                key={`bonus-${bonusTotal}`} // Force re-render with new key
              />
            </span>
          </div>

          <div className="flex items-center justify-between px-4 py-2 bg-gray-700/30 backdrop-blur-sm rounded-lg border border-gray-600/20 hover:border-gray-600/30 transition-colors duration-200 flex-1 min-w-[120px]">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-md bg-indigo-500/10">
                <svg
                  className="w-3.5 h-3.5 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <span className="text-gray-400 text-xs">Toplam</span>
            </div>
            <span className="text-indigo-400 text-sm font-medium">
              <CountUp
                start={prevGrandTotal}
                end={grandTotal}
                duration={0.8}
                separator="."
                decimal=","
                suffix="₺"
                preserveValue={true}
                decimals={0}
                className="tabular-nums"
                key={`total-${grandTotal}`} // Force re-render with new key
              />
            </span>
          </div>
        </div>

        {/* Action Buttons - Icon Only Version */}
        <div className="flex gap-3 items-center ml-6">
          <button
            onClick={onCancel}
            className="flex items-center justify-center p-2.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-full transition-all duration-200 border border-red-500/20 hover:border-red-500/30"
            title="İptal"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              shapeRendering="geometricPrecision"
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
            className="group relative flex items-center justify-center p-2.5 text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/20 rounded-full transition-all duration-200 border border-green-500/20 hover:border-green-500/30 overflow-hidden"
            title="Kaydet"
          >
            {/* Subtle pulsing effect on hover */}
            <span className="absolute inset-0 bg-green-400/5 opacity-0 group-hover:opacity-100 group-hover:animate-pulse rounded-full"></span>

            <svg
              className="w-4 h-4 relative"
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
        </div>
      </div>
    </div>
  );
};

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

export default OrderSummary;
