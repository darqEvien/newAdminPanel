import { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import CustomerCard from '../components/ui/CustomerCard';
import CustomerForm from '../components/CustomerForm';

const CustomerPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  useEffect(() => {
    const customersRef = ref(database, 'customers');
    
    const unsubscribe = onValue(customersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const customersArray = Object.entries(data).map(([id, values]) => ({
          id,
          ...values,
        }));
        setCustomers(customersArray);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleAddCustomer = () => {
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };
  if (loading) {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] ml-64 bg-gray-900">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-300">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] ml-64 bg-gray-900 text-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-100">Müşteriler</h1>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={(handleAddCustomer)}
          >
            Yeni Müşteri Ekle
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <CustomerCard 
              key={customer.id} 
              customer={{
                ...customer,
                name: customer.fullname || customer.name || 'İsimsiz Müşteri',
                email: customer.email || ''
              }} 
            />
          ))}
        </div>
        {isFormOpen && (
          <CustomerForm onClose={handleCloseForm} />
        )}
      </div>
    </div>
  );
};

export default CustomerPage;