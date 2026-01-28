import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { getAllWords, getMistakeWords } from "~/utils/db";
import { getUserSettings, hasUserSettings, type UserSettings } from "~/utils/user";

export default function Home() {
  const navigate = useNavigate();
  const [mistakeCount, setMistakeCount] = useState<number>(0);
  const [totalWords, setTotalWords] = useState<number>(0);
  const [user, setUser] = useState<UserSettings | null>(null);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    // Check user settings
    if (!hasUserSettings()) {
      navigate("/settings");
      return;
    }
    const settings = getUserSettings();
    setUser(settings);

    if (settings?.examDate) {
      const today = new Date();
      const exam = new Date(settings.examDate);
      const diffTime = exam.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setDaysLeft(diffDays > 0 ? diffDays : 0);
    }

    // Load counts from DB
    getAllWords().then(words => setTotalWords(words.length));
    getMistakeWords().then(mistakes => setMistakeCount(mistakes.length));
  }, [navigate]);

  if (!user) return null; // Or a loading spinner

  return (
    <div className="flex-grow flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md space-y-8">

        {/* Header / User Info */}
        <div className="text-center space-y-4">
          <div className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-900/30 inline-block px-3 py-1 rounded-full">
            Hi, {user.name}
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">RUSH</span> <span className="text-gray-900 dark:text-white">IELTS</span>
          </h1>
          <div className="flex justify-center items-center gap-3 text-lg">
            {user.targetScore && (
              <span className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-1.5 rounded-full text-sm font-bold border border-gray-200 dark:border-gray-700">
                Target: {user.targetScore}
              </span>
            )}
            {daysLeft !== null && (
              <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${daysLeft < 30 ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800' : 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800'}`}>
                ⏳ {daysLeft} Days Left
              </span>
            )}
          </div>
        </div>

        {/* Stats Grid - Clickable */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <Link to="/vocabulary?tab=all" className="block bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 hover:-translate-y-1 transition-all active:scale-95 cursor-pointer group">
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">📚</div>
            <div className="text-3xl font-extrabold text-gray-900 dark:text-white">
              {totalWords}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mt-1">
              Total Words
            </div>
          </Link>
          <Link to="/vocabulary?tab=mistakes" className="block bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-red-200 dark:hover:border-red-800 hover:-translate-y-1 transition-all active:scale-95 cursor-pointer group">
            <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">🎯</div>
            <div className="text-3xl font-extrabold text-red-500 dark:text-red-400">
              {mistakeCount}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-red-400 dark:text-red-500/70 mt-1">
              Mistakes
            </div>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">

          {totalWords === 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900 text-center space-y-4">
              <div>
                <div className="text-4xl mb-2">📚</div>
                <h3 className="font-bold text-gray-900 dark:text-white">Start Your Journey</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  You haven't added any words yet. Create a collection to begin.
                </p>
              </div>
              <Link
                to="/collections"
                className="block w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                Go to Collections
              </Link>
            </div>
          )}

          {totalWords > 0 && (
            <div className="space-y-3">
              {/* Continue Button (if progress exists) */}
              {/* Note: We rely on the user to pick a collection now, but we could make a smart 'Continue Last' later. 
                   For now, the requirement says "Continue / Start Review". 
                   "Start Review" -> Collections List
               */}

              <Link
                to="/collections"
                className="block w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold rounded-xl text-center shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🚀</span> Start / Continue Review
              </Link>

              <p className="text-xs text-center text-gray-400">
                Select a collection to study
              </p>
            </div>
          )}

          {mistakeCount > 0 && (
            <div className="space-y-2 mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                Quick Actions
              </h2>
              <Link
                to="/study?source=mistakes"
                className="block w-full py-3 px-4 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-semibold rounded-xl text-center hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors active:scale-95 flex items-center justify-center gap-2"
              >
                <span>🎯</span> Review All Mistakes
              </Link>
            </div>
          )}
        </div>

        <div className="pt-8 text-center">
          <Link to="/settings" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 underline text-sm">Settings</Link>
        </div>
      </div>
    </div>
  );
}
