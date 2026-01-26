import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { clearDatabase } from "~/utils/db";
import { getUserSettings, saveUserSettings, type UserSettings } from "~/utils/user";

export default function Settings() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<UserSettings>({
    name: "",
    examDate: "",
    targetScore: ""
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = getUserSettings();
    if (settings) {
      setFormData(settings);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveUserSettings(formData);
    setSaved(true);
    // Redirect to home after save
    setTimeout(() => {
        navigate("/");
    }, 500);
  };

  const handleResetData = async () => {
    if (confirm("DANGER: This will delete ALL imported words and progress. Are you sure?")) {
      await clearDatabase();
      alert("All data has been cleared.");
      window.location.href = "/";
    }
  };

  return (
    <div className="flex-grow flex flex-col p-6 font-sans">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">← Back</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>

        {/* User Profile Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
             <h3 className="font-semibold text-gray-900 dark:text-white">User Profile</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name / Nickname
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="Your Name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Exam Date (Optional)
              </label>
              <input
                type="date"
                name="examDate"
                value={formData.examDate || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Score (Optional)
              </label>
              <select
                name="targetScore"
                value={formData.targetScore || ""}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="">Select Score</option>
                <option value="5.0">5.0</option>
                <option value="5.5">5.5</option>
                <option value="6.0">6.0</option>
                <option value="6.5">6.5</option>
                <option value="7.0">7.0</option>
                <option value="7.5">7.5</option>
                <option value="8.0+">8.0+</option>
              </select>
            </div>

            {/* Display Preferences */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
               <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Vocabulary List Display</h4>
               <div className="space-y-3">
                 <label className="flex items-center gap-3 cursor-pointer">
                   <input 
                      type="checkbox"
                      name="showDefinition"
                      checked={!!formData.showDefinition}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, showDefinition: e.target.checked }));
                        setSaved(false);
                      }}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                   />
                   <span className="text-sm text-gray-700 dark:text-gray-300">Show Definitions by Default</span>
                 </label>

                 <label className="flex items-center gap-3 cursor-pointer">
                   <input 
                      type="checkbox"
                      name="showPhonetic"
                      checked={!!formData.showPhonetic}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, showPhonetic: e.target.checked }));
                        setSaved(false);
                      }}
                      className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                   />
                   <span className="text-sm text-gray-700 dark:text-gray-300">Show Phonetics by Default</span>
                 </label>
               </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-center shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            >
              {saved ? "Saved!" : "Save Profile"}
            </button>
          </form>
        </div>

        {/* Data Management Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
             <h3 className="font-semibold text-gray-900 dark:text-white">Data Management</h3>
          </div>
          <div className="p-4 space-y-4">
            <Link 
              to="/import"
              className="block w-full py-3 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold rounded-xl text-center hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Import Words
            </Link>

            <button 
              onClick={handleResetData}
              className="w-full py-3 px-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold rounded-xl text-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Reset Everything (Clear All Data)
            </button>
            <p className="text-xs text-gray-500 text-center">
              This will permanently delete all your vocabulary and progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
