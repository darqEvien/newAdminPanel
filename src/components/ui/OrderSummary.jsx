import PropTypes from "prop-types";

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