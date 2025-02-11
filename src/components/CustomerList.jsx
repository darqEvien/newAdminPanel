import  { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';
import CustomerCard from './ui/CustomerCard';

const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center">
          <img src="/loading.gif" alt="Loading..." className="w-16 h-16" />
          <p className="mt-4 text-gray-700 dark:text-gray-200">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {customers.map((customer) => (
        <CustomerCard key={customer.id} customer={customer} />
      ))}
    </div>
  );
};

export default CustomerList;