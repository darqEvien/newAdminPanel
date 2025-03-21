import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProductPage from "./pages/ProductPage";

import OrdersPage from "./pages/OrdersPage";
import CategoryPage from "./pages/CategoryPage";
import Dashboard from "./pages/Dashboard";
import CustomerPage from "./pages/CustomerPage";

const App = () => {
  return (
    <div className="min-h-screen h-full bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Router>
        <div className="flex bg-slate-900 min-h-screen">
          <Sidebar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/categories" element={<CategoryPage />} />
              <Route
                path="/products/:categoryPropertyName"
                element={<ProductPage />}
              />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/customers" element={<CustomerPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </div>
  );
};

export default App;
