import { Link, useNavigate } from "react-router";
import { useEffect, useState, useRef } from "react";
import { clearDatabase, exportDatabase, importDatabase, type BackupData } from "~/utils/db";
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

  const handleExport = async () => {
    try {
      const data = await exportDatabase();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rush-ielts-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Failed to export data.");
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: Restoring a backup will MERGE all current data. This cannot be undone. Are you sure?")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const json = ev.target?.result as string;
        const data = JSON.parse(json) as BackupData;
        
        if (!data.collections || !data.vocabulary) {
          throw new Error("Invalid backup format");
        }

        await importDatabase(data);
        alert("Database restored successfully!");
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert("Failed to restore backup. Invalid file format.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grow flex flex-col p-6 font-sans">
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
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Study Preferences</h4>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Review Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${formData.reviewMode === 'recognition' || !formData.reviewMode ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <input
                      type="radio"
                      name="reviewMode"
                      value="recognition"
                      checked={formData.reviewMode === 'recognition' || !formData.reviewMode}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, reviewMode: 'recognition' }));
                        setSaved(false);
                      }}
                      className="hidden"
                    />
                    <span className="text-2xl">👀</span>
                    <span className="text-sm font-semibold">Recognition</span>
                  </label>

                  <label className={`cursor-pointer border rounded-xl p-3 flex flex-col items-center gap-2 transition-all ${formData.reviewMode === 'spelling' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
                    <input
                      type="radio"
                      name="reviewMode"
                      value="spelling"
                      checked={formData.reviewMode === 'spelling'}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, reviewMode: 'spelling' }));
                        setSaved(false);
                      }}
                      className="hidden"
                    />
                    <span className="text-2xl">✍️</span>
                    <span className="text-sm font-semibold">Spelling</span>
                  </label>
                </div>
              </div>

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
              to={formData.lastCollectionId ? `/import?collectionId=${formData.lastCollectionId}` : "/import"}
              className="block w-full py-3 px-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-semibold rounded-xl text-center hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Import Words
            </Link>

            <button
              onClick={handleExport}
              className="w-full py-3 px-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-semibold rounded-xl text-center hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors"
            >
              Export Backup (JSON)
            </button>

            <button
              onClick={handleImportClick}
              className="w-full py-3 px-4 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 font-semibold rounded-xl text-center hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-colors"
            >
              Restore Backup (JSON)
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImportFile} 
              className="hidden" 
              accept=".json" 
            />

            <div className="border-t border-gray-100 dark:border-gray-700 my-2"></div>

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
