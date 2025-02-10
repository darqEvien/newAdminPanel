import CategoryForm from '../components/CategoryForm';
import CategoryList from '../components/CategoryList';
import Sidebar from '../components/Sidebar';
import { useState, useEffect } from 'react';
import { ref, onValue, set, update, remove, get } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryCount, setCategoryCount] = useState(0);
  
  useEffect(() => {
    const categoriesRef = ref(database, 'categories');
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesArray = Object.keys(data).map(key => ({
          name: key,
          ...data[key]
        }));
        setCategories(categoriesArray);
        setCategoryCount(Object.keys(data).length); // Kategori sayısını hesapla
      } else {
        setCategories([]);
        setCategoryCount(0);
        console.error("No data available");
      }
    });

    return () => unsubscribe();
  }, []);
  
  const addCategory = async (category) => {
    const time = new Date().getTime();
    // Kategori adını doğru formatta oluştur
    const categoryKey = `category-${categoryCount + 1}-${time}`;
    const categoryRef = ref(database, `categories/${categoryKey}`);
    try {
      await set(categoryRef, {
        ...category,
        name: categoryKey // name alanını Firebase key'i ile aynı yap
      });
      setShowForm(false);
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  };
  
  const updateCategory = async (category) => {
    try {
      // Kategori referansını doğru şekilde al
      const categoryRef = ref(database, `categories/${category.name}`);
      
      // Güncellenecek veriyi hazırla
      const updateData = {
        accessibility: category.accessibility,
        order: category.order,
        parentCategory: category.parentCategory,
        priceFormat: category.priceFormat,
        propertyName: category.propertyName,
        select: category.select,
        tags: category.tags,
        title: category.title,
        name: category.name // name değişmeyecek
      };
  
      // Güncelleme işlemini gerçekleştir
      await update(categoryRef, updateData);
      setShowForm(false);
      setEditCategory(null); // Düzenleme modundan çık
    } catch (error) {
      console.error('Error updating category:', error);
      // Daha detaylı hata mesajı göster
      alert(`Güncelleme hatası: ${error.message}`);
      throw error;
    }
  };

  const handleEdit = (category) => {
    setEditCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (categoryName) => {
    try {
      // Doğru kategori referansını oluştur
      const categoryRef = ref(database, `categories/${categoryName}`);
      
      // Debug için konsola yazdıralım
      console.log('Silinecek kategori yolu:', `categories/${categoryName}`);
      
      // Kategorinin var olup olmadığını kontrol et
      const snapshot = await get(categoryRef);
      
      if (!snapshot.exists()) {
        console.error('Kategori bulunamadı:', categoryName);
        throw new Error('Silinecek kategori bulunamadı');
      }
  
      // Kategoriyi sil
      await remove(categoryRef);
      
      
      // Modal'ı kapat
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error('Delete error:', error);
      // Daha detaylı hata mesajı
      alert(`Silme işlemi başarısız: ${error.message}\nKategori adı: ${categoryName}`);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditCategory(null);
  };

  const handleShowDeleteConfirm = (categoryName) => {
    console.log('Silinmeye çalışılan kategori:', categoryName); // Debug için
  
    if (!categoryName) {
      alert('Geçersiz kategori');
      return;
    }
    
    // Kategorinin gerçekten var olduğunu kontrol et
    const categoryExists = categories.some(cat => cat.name === categoryName);
    if (!categoryExists) {
      alert('Kategori bulunamadı');
      return;
    }
    
    // Alt kategori kontrolü
    const hasChildren = categories.some(cat => cat.parentCategory === categoryName);
    if (hasChildren) {
      alert('Bu kategorinin alt kategorileri var. Önce alt kategorileri silmelisiniz.');
      return;
    }
  
    setCategoryToDelete(categoryName);
    setShowDeleteConfirm(true);
  };
  
  const handleCloseDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setCategoryToDelete(null);
  };

  const handleDragEnd = async ({ oldIndex, newIndex }) => {
    const newCategories = Array.from(categories);
    const [movedCategory] = newCategories.splice(oldIndex, 1);
    newCategories.splice(newIndex, 0, movedCategory);

    try {
      const updates = {};
      newCategories.forEach((category, index) => {
        category.order = index + 1;
        updates[`categories/${category.name}`] = category;
      });
      await update(ref(database), updates);
      setCategories(newCategories);
    } catch (error) {
      console.error('Error updating orders:', error);
      alert('Sıralama güncellenirken bir hata oluştu');
    }
  };

  
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-5 bg-white dark:bg-gray-800 text-black dark:text-white ml-64">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Kategoriler</h1>
          <button
            onClick={() => { setShowForm(true); setEditCategory(null); }}
            className="bg-green-500 text-white px-4 py-2 rounded"
          >
            Kategori Ekle
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
              <CategoryForm
                addCategory={addCategory}
                updateCategory={updateCategory}
                existingCategories={categories}
                editCategory={editCategory}
                onCancel={handleCloseForm}
              />
            </div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg border-2 border-red-500">
              <p className="text-white mb-4">Bu kategoriyi silmek istediğinizden emin misiniz?</p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={handleCloseDeleteConfirm}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Hayır
                </button>
                <button
                  onClick={() => handleDelete(categoryToDelete)}
                  className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Evet
                </button>
              </div>
            </div>
          </div>
        )}

           <CategoryList 
      categories={categories} 
      onEdit={handleEdit} 
      onDelete={handleShowDeleteConfirm}
      onDragEnd={handleDragEnd}
    />
      </div>
    </div>
  );
};

export default CategoryPage;