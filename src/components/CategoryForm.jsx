import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';



const CategoryForm = ({ existingCategories = [], addCategory, editCategory, updateCategory, onCancel }) => {
  const [formData, setFormData] = useState({
    accessibility: false,
    parentCategory: '',
    priceFormat: '',
    propertyName: '',
    select: 'singleSelect',
    tags: [],
    title: '',
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Add these functions before return statement
  const handleTagInput = (e) => {
    setTagInput(e.target.value);
  };
  
  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };
  
  const addTag = () => {
    const newTag = tagInput.trim();
    if (newTag && !formData.tags.includes(newTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag]
      }));
      setTagInput('');
    }
  };
  useEffect(() => {
    if (editCategory) {
      setFormData({
        accessibility: editCategory.accessibility || false,
        parentCategory: editCategory.parentCategory || '',
        priceFormat: editCategory.priceFormat || '',
        propertyName: editCategory.propertyName || '',
        select: editCategory.select || 'singleSelect',
        tags: editCategory.tags || [],
        title: editCategory.title || '',
      });
    }
  }, [editCategory]);

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const newCategory = {
      ...formData,
      order: editCategory ? editCategory.order : 
        existingCategories.length > 0 ? existingCategories.length - 1 : 0,
      name: editCategory ? editCategory.name : formData.title.toLowerCase().replace(/\s+/g, '_').replace(/[^\w-]+/g, ''),
    };

    try {
      if (editCategory) {
        await updateCategory(newCategory);
      } else {
        await addCategory(newCategory);
      }
      onCancel();
    } catch (error) {
      console.error('Error:', error);
      alert(`İşlem hatası: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {editCategory ? 'Kategoriyi Güncelle' : 'Yeni Kategori Ekle'}
          </h2>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.accessibility}
                  onChange={(e) => setFormData(prev => ({...prev, accessibility: e.target.checked}))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-600 
                             peer-checked:after:translate-x-full peer-checked:bg-blue-600
                             after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                             after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                             peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800">
                </div>
              </label>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Aktif
              </span>
            </div>
            
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Kategori Başlığı
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
                required
              />
            </div>

            {/* Property Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Kısaltma Adı
              </label>
              <input
                type="text"
                value={formData.propertyName}
                onChange={(e) => setFormData(prev => ({...prev, propertyName: e.target.value}))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            {/* Parent Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Ana Kategori
              </label>
              <select
                value={formData.parentCategory}
                onChange={(e) => setFormData(prev => ({...prev, parentCategory: e.target.value}))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              >
                <option value="">Seçiniz</option>
                {existingCategories.map((category) => (
                  <option key={category.propertyName} value={category.propertyName}>
                    {category.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Select Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Seçim Tipi
              </label>
              <select
                value={formData.select}
                onChange={(e) => setFormData(prev => ({...prev, select: e.target.value}))}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
              >
                <option value="singleSelect">Tekli Seçim</option>
                <option value="multiSelect">Çoklu Seçim</option>
              </select>
            </div>

            {/* Price Format */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Fiyat Biçimi
              </label>
              <div className="grid grid-cols-3 gap-4">
                {['tekil', 'metrekare', 'cevre', 'artis', 'tasDuvar', 'konti', 'veranda', 'onYuzey', 'extra'].map((format) => (
                  <label key={format} className="inline-flex items-center">
                    <input
                      type="radio"
                      value={format}
                      checked={formData.priceFormat === format}
                      onChange={(e) => setFormData(prev => ({...prev, priceFormat: e.target.value}))}
                      className="form-radio text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{format}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Tags */}
       <div>
  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
    Etiketler
  </label>
  <div className="space-y-2">
    <div className="flex flex-wrap gap-2">
      {formData.tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center px-3 py-1 rounded-full text-sm
                   bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
          >
            ×
          </button>
        </span>
      ))}
    </div>
    <div className="flex gap-2">
      <input
        type="text"
        value={tagInput}
        onChange={handleTagInput}
        onKeyDown={handleTagKeyDown}
        placeholder="Yeni etiket ekleyin"
        className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 
                 bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent"
      />
      <button
        type="button"
        onClick={addTag}
        className="px-4 py-2 text-sm font-medium rounded-lg
                 text-white bg-blue-600 hover:bg-blue-700
                 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                 disabled:opacity-50 transition-colors duration-200"
      >
        Ekle
      </button>
    </div>
  </div>
</div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg
                       text-gray-700 dark:text-gray-200 
                       bg-gray-100 dark:bg-gray-700
                       hover:bg-gray-200 dark:hover:bg-gray-600
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium rounded-lg
                       text-white bg-blue-600 
                       hover:bg-blue-700 
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-200"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Yükleniyor...
                </div>
              ) : editCategory ? (
                'Güncelle'
              ) : (
                'Kaydet'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



CategoryForm.propTypes = {
  existingCategories: PropTypes.array,
  addCategory: PropTypes.func.isRequired,
  editCategory: PropTypes.object,
  updateCategory: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};

export default CategoryForm;