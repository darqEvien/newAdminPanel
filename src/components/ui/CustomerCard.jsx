
import PropTypes from 'prop-types';
import { ref, remove } from 'firebase/database';
import { database } from '../../firebase/firebaseConfig';
import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from './dialog';
import CustomerDetailModal from './CustomerDetailModal';


const CustomerCard = ({ customer }) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  
    const handleDelete = async () => {
      try {
        const customerRef = ref(database, `customers/${customer.id}`);
        await remove(customerRef);
        setIsDeleteDialogOpen(false);
      } catch (error) {
        console.error('Error deleting customer:', error);
      }
    };

    const getConditionStyles = (condition) => {
        switch (condition) {
          case 'verified':
            return 'bg-green-900 text-green-200';
          case 'beklemede':
            return 'bg-yellow-900 text-yellow-200';
          case 'iptal':
            return 'bg-red-900 text-red-200';
          default:
            return 'bg-gray-900 text-gray-200';
        }
      };
      
      const getConditionText = (condition) => {
        switch (condition) {
          case 'verified':
            return 'Onaylandı';
          case 'beklemede':
            return 'Beklemede';
          case 'iptal':
            return 'İptal';
          default:
            return condition;
        }
      };
    return (
        <>
        <div className="bg-gray-800 rounded-xl shadow-lg p-6 space-y-4 border border-gray-700 min-w-[300px]">
          {/* Customer Name */}
          <h3 className="text-xl font-semibold text-gray-100 break-words">
            {customer.fullName}
          </h3>
          
          {/* Contact Info */}
          <div className="flex flex-col space-y-3">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="text-sm text-gray-300 break-all">{customer.phone}</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm text-gray-300 break-all">{customer.email}</span>
            </div>
          </div>
    
          {/* Status */}
          <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm ${getConditionStyles(customer.condition)}`}>
  {getConditionText(customer.condition)}
</span>
          </div>
    
          {/* Action Icons */}
          <div className="flex justify-between pt-4 border-t border-gray-700">
        {/* Check/Approve Icon */}
        <button className="p-2 text-green-400 hover:text-green-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </button>

        {/* View Details Icon */}
        <button 
          className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
          onClick={() => setIsDetailModalOpen(true)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>

        {/* Edit Icon */}
        <button className="p-2 text-yellow-400 hover:text-yellow-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* Delete Icon */}
        <button 
              className="p-2 text-red-400 hover:text-red-300 transition-colors"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

 <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Müşteriyi Sil</DialogTitle>
              <DialogDescription>
                {`${customer.fullName} isimli müşteriyi silmek istediğinizden emin misiniz?`}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="px-4 py-2 text-gray-300 border border-gray-600 rounded hover:bg-gray-700"
                >
                  İptal
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Sil
                </button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <CustomerDetailModal 
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        customer={customer}
      />
    </>
  );
};

CustomerCard.propTypes = {
  customer: PropTypes.shape({
    id: PropTypes.string.isRequired,
    fullName: PropTypes.string.isRequired,
    email: PropTypes.string.isRequired,
    phone: PropTypes.string.isRequired,
    condition: PropTypes.string.isRequired,
  }).isRequired,
};

export default CustomerCard;