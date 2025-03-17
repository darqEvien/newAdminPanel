import { useState, useEffect } from "react";
import { ref, onValue, set, update, remove, get } from "firebase/database";
import { database } from "../firebase/firebaseConfig";
import CategoryForm from "../components/CategoryForm";
import CategoryList from "../components/CategoryList";
import Sidebar from "../components/Sidebar";

const CategoryPage = () => {
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryCount, setCategoryCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    mainCategories: 0,
    subCategories: 0,
  });

  useEffect(() => {
    setLoading(true);
    const categoriesRef = ref(database, "categories");
    const unsubscribe = onValue(categoriesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const categoriesArray = Object.keys(data).map((key) => ({
          name: key,
          ...data[key],
        }));
        setCategories(categoriesArray);
        setCategoryCount(Object.keys(data).length);

        // İstatistikleri güncelle
        const mainCats = categoriesArray.filter(
          (cat) => !cat.parentCategory
        ).length;
        const subCats = categoriesArray.filter(
          (cat) => cat.parentCategory
        ).length;

        setStats({
          total: categoriesArray.length,
          mainCategories: mainCats,
          subCategories: subCats,
        });
      } else {
        setCategories([]);
        setCategoryCount(0);
        setStats({
          total: 0,
          mainCategories: 0,
          subCategories: 0,
        });
      }
      setLoading(false);
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
        name: categoryKey, // name alanını Firebase key'i ile aynı yap
      });
      setShowForm(false);
    } catch (error) {
      console.error("Error adding category:", error);
      throw error;
    }
  };

  const updateCategory = async (category) => {
    try {
      const categoryRef = ref(database, `categories/${category.name}`);

      const updateData = {
        accessibility: category.accessibility,
        order: category.order,
        parentCategory: category.parentCategory,
        priceFormat: category.priceFormat,
        propertyName: category.propertyName,
        select: category.select,
        tags: category.tags,
        title: category.title,
        name: category.name,
      };

      await update(categoryRef, updateData);
      setShowForm(false);
      setEditCategory(null);
    } catch (error) {
      console.error("Error updating category:", error);
      throw error;
    }
  };

  const handleEdit = (category) => {
    setEditCategory(category);
    setShowForm(true);
  };

  const handleDelete = async (categoryName) => {
    try {
      const categoryRef = ref(database, `categories/${categoryName}`);

      const snapshot = await get(categoryRef);

      if (!snapshot.exists()) {
        throw new Error("Silinecek kategori bulunamadı");
      }

      await remove(categoryRef);
      setShowDeleteConfirm(false);
      setCategoryToDelete(null);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditCategory(null);
  };

  const handleShowDeleteConfirm = (categoryName) => {
    if (!categoryName) return;

    const categoryExists = categories.some((cat) => cat.name === categoryName);
    if (!categoryExists) return;

    const hasChildren = categories.some(
      (cat) => cat.parentCategory === categoryName
    );
    if (hasChildren) {
      alert(
        "Bu kategorinin alt kategorileri var. Önce alt kategorileri silmelisiniz."
      );
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
      console.error("Error updating orders:", error);
    }
  };

  // Kategori arama fonksiyonu
  const filteredCategories = categories.filter(
    (category) =>
      category.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.propertyName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <main className="flex-1 p-0 ml-64">
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <div className="text-gray-700 dark:text-gray-300 font-medium">
                Kategoriler yükleniyor...
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Sidebar />

      <main className="flex-1 p-0 ml-64">
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-800 dark:to-indigo-900 text-white p-8 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <svg
                    className="w-8 h-8 text-blue-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Kategoriler
                </h1>
                <p className="mt-1.5 text-blue-100">
                  Ürünlerinizi organize edin ve yapılandırın.
                </p>
              </div>

              {/* İstatistik Kartları */}
              <div className="mt-6 md:mt-0 grid grid-cols-3 gap-4 transition-all duration-300">
                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Toplam</p>
                    <span className="bg-blue-500/30 text-xs px-2 py-0.5 rounded-full text-blue-100">
                      Kategori
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.total}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Ana</p>
                    <span className="bg-purple-500/30 text-xs px-2 py-0.5 rounded-full text-purple-100">
                      Kategori
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.mainCategories}
                  </p>
                </div>

                <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-blue-100">Alt</p>
                    <span className="bg-green-500/30 text-xs px-2 py-0.5 rounded-full text-green-100">
                      Kategori
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-white mt-1">
                    {stats.subCategories}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Search & Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Kategori ara... (başlık veya özellik adı)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 dark:text-gray-200 text-gray-900 placeholder-gray-500 dark:placeholder-gray-400 shadow-sm transition-colors duration-200"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setShowForm(true);
                setEditCategory(null);
              }}
              className="group relative px-5 py-2.5 font-medium bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-all duration-200 ease-out focus:outline-none"
            >
              <div className="absolute inset-0 w-3/5 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-[150%] transition-transform duration-700 ease-out"></div>
              <span className="relative flex items-center">
                <svg
                  className="w-5 h-5 mr-2"
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
                Yeni Kategori
              </span>
            </button>
          </div>

          {/* Categories Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            {filteredCategories.length === 0 ? (
              <div className="text-center p-12">
                <svg
                  className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kategori Bulunamadı
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {searchTerm
                    ? `"${searchTerm}" ile eşleşen kategori bulunamadı.`
                    : "Henüz kategori eklenmemiş. Yeni kategori eklemek için yukarıdaki butona tıklayın."}
                </p>
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="mt-4 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors"
                  >
                    Aramayı Temizle
                  </button>
                )}
              </div>
            ) : (
              <div className="p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 italic">
                  Kategorileri sürükle ve bırak ile yeniden sıralayabilirsiniz.
                </p>
                <CategoryList
                  categories={filteredCategories}
                  onEdit={handleEdit}
                  onDelete={handleShowDeleteConfirm}
                  onDragEnd={handleDragEnd}
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Category Form Modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {editCategory ? "Kategori Düzenle" : "Yeni Kategori"}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <svg
                  className="w-6 h-6"
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl max-w-md w-full border border-red-200 dark:border-red-900/50">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                <svg
                  className="h-10 w-10 text-red-600 dark:text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                Kategoriyi Sil
              </h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Bu kategori kalıcı olarak silinecektir. Bu işlemi geri
                alamazsınız.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCloseDeleteConfirm}
                className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(categoryToDelete)}
                className="px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-red-600 to-red-500 rounded-md hover:from-red-700 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all shadow-sm hover:shadow-md"
              >
                Kategoriyi Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
