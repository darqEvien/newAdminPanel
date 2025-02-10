import Sidebar from "../components/Sidebar";
const Dashboard = () => {
    return (
        <div className="flex">
        <Sidebar />
        <div className="flex-1 p-5 bg-white dark:bg-gray-800 text-black dark:text-white ml-64">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p>Ero Agan Yapar Admin Panel!</p>
      </div>
      </div>
    );
  };
  
  export default Dashboard;