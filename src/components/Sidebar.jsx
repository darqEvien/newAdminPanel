import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/firebaseConfig';

const Sidebar = () => {
  const [mainCategories, setMainCategories] = useState([]);
  const [isProductsOpen, setIsProductsOpen] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesRef = ref(database, 'categories');
        const snapshot = await get(categoriesRef);
        
        if (snapshot.exists()) {
          const categories = [];
          snapshot.forEach((childSnapshot) => {
            categories.push({
              id: childSnapshot.key,
              ...childSnapshot.val()
            });
          });
          
          const mainCats = categories
          .filter(cat => !cat.parentCategory)
          .sort((a, b) => (a.order || 0) - (b.order || 0));
          setMainCategories(mainCats);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col">
    {/* Fixed Header */}
    <div className="flex-shrink-0 flex items-center justify-center h-16 bg-slate-900 border-b border-slate-700">
      <h1 className="text-2xl font-bold">Admin Panel</h1>
    </div>
      <nav className="flex-1 p-4">
        <ul>
          <li className="mb-4">
            <Link to="/" className="text-lg font-medium hover:text-gray-400">
              Ana Sayfa
            </Link>
          </li>
          <li className="mb-4">
            <Link to="/categories" className="text-lg font-medium hover:text-gray-400">
              Kategoriler
            </Link>
          </li>
          <li className="mb-4">
          <button 
  onClick={() => setIsProductsOpen(!isProductsOpen)}
  className="w-full flex items-center justify-between text-lg font-medium hover:text-gray-400"
>
  <span>Ürünler</span>
  <span className="transition-transform duration-200">
    {isProductsOpen ? '▽' : '▷'}
  </span>
</button>
<div className={`transition-all duration-200 overflow-hidden ${isProductsOpen ? 'max-h-[300px] mt-2' : 'max-h-0 opacity-0'}`}>
  <ul className="ml-4 space-y-2 max-h-[250px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800">
    {mainCategories.map((category) => (
      <li key={category.id}>
        <Link 
          to={`/products/${category.propertyName}`}
          className="block py-1 px-2 text-gray-300 hover:text-white hover:bg-slate-800 rounded"
        >
          {category.title}
        </Link>
      </li>
    ))}
  </ul>
</div>
          </li>
          <li className="mb-4">
          <Link 
    to="/orders" 
    className="text-lg font-medium hover:text-gray-400 flex items-center"
  >
    <span>Prefabric Crafter</span>
  </Link>
            
          </li>
          <li className="mb-4">
          <Link 
    to="/customers" 
    className="text-lg font-medium hover:text-gray-400 flex items-center"
  >
    <span> Müşteriler</span>
  </Link>
            
          </li>
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;