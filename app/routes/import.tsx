import { useState } from "react";
import { Link } from "react-router";
import { addWordToVocab } from "~/utils/db";

export default function Import() {
  const [text, setText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [failedWords, setFailedWords] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const processImport = async () => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setLogs([]);
    setFailedWords([]);
    setSuccessCount(0);
    setProgress(0);
    
    // Split by newline, comma (English), or comma (Chinese)
    const separator = new RegExp("[\n,\uFF0C]+");
    const rawWords = text.split(separator).map(w => w.trim()).filter(w => w.length > 0);
    const uniqueWords = [...new Set(rawWords)];
    
    if (uniqueWords.length === 0) {
      setIsProcessing(false);
      return;
    }

    setLogs(prev => [...prev, `Found ${uniqueWords.length} unique words to process.`]);
    
    let processed = 0;
    let success = 0;
    const failed: string[] = [];
    let lastLongBreak = Date.now();
    
    for (const word of uniqueWords) {
      try {
         const res = await fetch(`/api/dict?q=${encodeURIComponent(word)}`);
         if (res.ok) {
           const data = await res.json();
           if (data.error) {
             failed.push(word);
           } else {
             // Save to DB
             await addWordToVocab(data);
             success++;
           }
         } else {
           failed.push(word);
         }
      } catch (e) {
         failed.push(word);
      }

      processed++;
      setSuccessCount(success);
      setProgress(Math.round((processed / uniqueWords.length) * 100));

      // Rate limiting and delays
      if (processed < uniqueWords.length) {
          const now = Date.now();
          if (now - lastLongBreak > 10000) { // Every 10 seconds approx
               // Random pause 1-5 seconds
               const longDelay = 1000 + Math.random() * 4000;
               await new Promise(r => setTimeout(r, longDelay));
               lastLongBreak = Date.now();
          } else {
               // Standard delay 0.5-1 second
               const shortDelay = 500 + Math.random() * 500;
               await new Promise(r => setTimeout(r, shortDelay));
          }
      }
    }

    setFailedWords(failed);
    setIsProcessing(false);
    setLogs(prev => [...prev, `Import complete. Success: ${success}, Failed: ${failed.length}`]);
    if (failed.length > 0) {
        setText(failed.join('\n')); // Put failed words back for easy editing
    } else {
        setText("");
    }
  };

  return (
    <div className="flex-grow flex flex-col p-6 font-sans">
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-4">
            <Link to="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">← Back</Link>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Words</h1>
           </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
          
          {/* File Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import from File (.txt)
            </label>
            <input 
              type="file" 
              accept=".txt"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          <div className="relative">
             <div className="absolute inset-0 flex items-center" aria-hidden="true">
               <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
             </div>
             <div className="relative flex justify-center">
               <span className="bg-white dark:bg-gray-800 px-2 text-sm text-gray-500">OR PASTE TEXT</span>
             </div>
          </div>

          {/* Text Area */}
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste words here (separated by newlines or commas)..."
              className="w-full h-48 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
            <p className="mt-2 text-xs text-gray-500">
               If words fail to import (e.g. typos), they will remain in the box for you to fix.
            </p>
          </div>

          {/* Action Button */}
          <button
            onClick={processImport}
            disabled={isProcessing || !text.trim()}
            className="w-full py-4 bg-blue-600 disabled:bg-gray-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            {isProcessing ? (
                <>
                   <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                   </svg>
                   Processing... {progress}%
                </>
            ) : "Start Import"}
          </button>
          
          {/* Progress Bar (Visible when processing) */}
          {isProcessing && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mt-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}
        </div>

        {/* Status Area */}
        {(successCount > 0 || failedWords.length > 0) && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-in fade-in slide-in-from-bottom-4">
             <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Import Status</h3>
             
             <div className="grid grid-cols-2 gap-4 mb-4">
               <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                 <div className="text-2xl font-bold text-green-600 dark:text-green-400">{successCount}</div>
                 <div className="text-sm text-green-700 dark:text-green-300">Imported</div>
               </div>
               <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl text-center">
                 <div className="text-2xl font-bold text-red-600 dark:text-red-400">{failedWords.length}</div>
                 <div className="text-sm text-red-700 dark:text-red-300">Failed / Not Found</div>
               </div>
             </div>
             
             {!isProcessing && (
               <div className="mb-6">
                  <Link 
                    to="/"
                    className="block w-full py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-bold rounded-xl text-center transition-colors"
                  >
                    Back to Home
                  </Link>
               </div>
             )}

             {failedWords.length > 0 && (
               <div>
                 <p className="text-sm text-red-500 mb-2">The following words could not be found:</p>
                 <div className="flex flex-wrap gap-2">
                   {failedWords.map((w, i) => (
                     <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs rounded-md">
                       {w}
                     </span>
                   ))}
                 </div>
               </div>
             )}
          </div>
        )}

      </div>
    </div>
  );
}