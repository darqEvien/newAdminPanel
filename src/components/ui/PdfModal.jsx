import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "./dialogForCustomers";
import PropTypes from "prop-types";
import PdfGenerator from "./PdfGenerator";
import { ref, get } from "firebase/database";
import { database } from "../../firebase/firebaseConfig";

const PdfModal = ({ isOpen, onClose, customer, orderKey, isMainOrder }) => {
  const [orderData, setOrderData] = useState(null);
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      const fetchData = async () => {
        try {
          setLoading(true);

          // Fetch categories
          const categoriesRef = ref(database, "categories");
          const categoriesSnapshot = await get(categoriesRef);

          if (categoriesSnapshot.exists()) {
            setCategories(categoriesSnapshot.val());
          }

          // Fetch order data
          const orderPath = isMainOrder
            ? `customers/${customer.id}/products/0`
            : `customers/${customer.id}/otherOrders/${orderKey}/products`;

          const dimensionsPath = isMainOrder
            ? `customers/${customer.id}/dimensions`
            : `customers/${customer.id}/otherOrders/${orderKey}/dimensions`;

          const bonusPath = isMainOrder
            ? `customers/${customer.id}/bonus`
            : `customers/${customer.id}/otherOrders/${orderKey}/bonus`;

          const notesPath = isMainOrder
            ? `customers/${customer.id}/notes`
            : `customers/${customer.id}/otherOrders/${orderKey}/notes`;

          const [
            orderSnapshot,
            dimensionsSnapshot,
            bonusSnapshot,
            notesSnapshot,
          ] = await Promise.all([
            get(ref(database, orderPath)),
            get(ref(database, dimensionsPath)),
            get(ref(database, bonusPath)),
            get(ref(database, notesPath)),
          ]);

          const orderDataObj = orderSnapshot.exists()
            ? orderSnapshot.val()
            : {};
          const dimensions = dimensionsSnapshot.exists()
            ? dimensionsSnapshot.val()
            : {};
          const bonus = bonusSnapshot.exists() ? bonusSnapshot.val() : [];
          const notes = notesSnapshot.exists() ? notesSnapshot.val() : "";

          setOrderData({
            ...orderDataObj,
            dimensions,
            bonus,
            notes,
          });
        } catch (error) {
          console.error("Error fetching data for PDF:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }
  }, [isOpen, customer, orderKey, isMainOrder]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-blue-500"></div>
        <div className="p-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-100">
              PDF Yönetimi
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-300 p-1.5 rounded-md hover:bg-gray-700/50 transition-colors"
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
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <svg
                className="animate-spin h-10 w-10 text-blue-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </div>
          ) : orderData ? (
            <PdfGenerator
              customer={customer}
              orderData={orderData}
              isMainOrder={isMainOrder}
              orderKey={orderKey || customer.id}
              categories={categories}
            />
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Sipariş verisi yüklenemedi</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

PdfModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  customer: PropTypes.object.isRequired,
  orderKey: PropTypes.string,
  isMainOrder: PropTypes.bool,
};

PdfModal.defaultProps = {
  isMainOrder: true,
};

export default PdfModal;
