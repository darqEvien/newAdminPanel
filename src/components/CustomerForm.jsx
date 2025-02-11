import  { useState } from 'react';
import PropTypes from 'prop-types';
import { ref, push } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';

const CustomerForm = ({ onClose }) => {
    const [formData, setFormData] = useState({
      fullName: '',
      email: '',
      phone: '',
      condition: 'verified',
      from: 'manuel' // Default value
    });
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const customersRef = ref(database, 'customers');
        const now = new Date().toISOString();
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        const customerData = {
          ...formData,
          orderId: `CS${timestamp}${random}`,
          createdAt: now,
          verifiedAt: now,
        };
  
        await push(customersRef, customerData);
        onClose();
      } catch (error) {
        console.error('Error adding customer:', error);
      }
    };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-gray-100">Yeni Müşteri Ekle</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Müşteri Adı
              </label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Telefon
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Durum
              </label>
              <select
              name="condition"
              value={formData.condition}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-gray-100"
            >
              <option value="onaylandı">Onaylandı</option>
              <option value="beklemede">Beklemede</option>
              <option value="iptal">İptal</option>
            </select>
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CustomerForm.propTypes = {
  onClose: PropTypes.func.isRequired,
};

export default CustomerForm;