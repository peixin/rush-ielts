import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { getAllWords, getMistakeWords, recordMistake, clearMistake, type WordRecord } from "~/utils/db";
import { getUserSettings, saveUserSettings } from "~/utils/user";

// Types
type Mode = "recognition" | "spelling";
type Source = "all" | "mistakes";

// Shuffle helper
function shuffleArray<T>(array: T[]): T[] {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export default function Study() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Settings for Mode
  const [mode, setMode] = useState<Mode>("recognition");

  const source = (searchParams.get("source") as Source) || "all";
  const collectionIdParam = searchParams.get("collectionId");
  const collectionId = collectionIdParam ? parseInt(collectionIdParam) : undefined;

  const [queue, setQueue] = useState<WordRecord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Card State
  const [isRevealed, setIsRevealed] = useState(false);
  const [spellingInput, setSpellingInput] = useState("");
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Load Data
  useEffect(() => {
    async function load() {
      setLoading(true);
      const settings = getUserSettings();

      // Determine Mode: URL override > Settings > Default
      let activeMode: Mode = "recognition";
      if (searchParams.get("mode")) {
        activeMode = searchParams.get("mode") as Mode;
      } else if (settings?.reviewMode) {
        activeMode = settings.reviewMode;
      }
      setMode(activeMode);


      // Save last collection if present
      if (collectionId && settings) {
        saveUserSettings({ ...settings, lastCollectionId: collectionId });
      }

      let words: WordRecord[] = [];

      if (source === "mistakes") {
        words = await getMistakeWords(collectionId);
        setQueue(shuffleArray(words));
      } else {
        const allWords = await getAllWords(collectionId);
        // Ensure sequential order
        allWords.sort((a, b) => (a.id || 0) - (b.id || 0));

        const lastId = settings?.lastStudiedWordId || 0;
        // Filter words after the last studied one IF we are studying generally (no specific collection or same collection context)
        // NOTE: For now, if a collection is selected, we might want to start from beginning or find last progress within THAT collection.
        // Simplified approach: If global study, use lastId. If collection, maybe we just show all unreviewed?
        // Let's stick to the existing "Last Studied ID" logic globally for simplicity, it acts as a global bookmark.
        // OR better: if studying a collection, we can filter for unviewed?
        // Requirement decision: Stick to global bookmark for simplicity for now, but filter by collection.

        words = allWords.filter(w => (w.id || 0) > lastId);

        setQueue(words);
      }

      setLoading(false);
    }
    load();
  }, [source, collectionId, searchParams]);

  // Reset card state when moving to next word
  useEffect(() => {
    setIsRevealed(false);
    setSpellingInput("");
    setFeedback(null);
    // Focus input in spelling mode
    if (mode === "spelling" && !loading && queue.length > 0 && currentIndex < queue.length) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [currentIndex, mode, loading, queue.length]);

  const currentWord = queue[currentIndex];
  const isComplete = !loading && currentIndex >= queue.length;
  const progress = loading ? 0 : Math.round((currentIndex / queue.length) * 100);

  // Audio Player
  const playAudio = (url: string) => {
    if (!url) return;
    let validUrl = url;
    if (!url.startsWith("http")) {
      validUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(url)}`;
    }
    validUrl = validUrl.replace("http://", "https://");
    new Audio(validUrl).play().catch(() => { });
  };

  // Update Progress Helper
  const updateProgress = () => {
    if (source === "all" && currentWord?.id) {
      const settings = getUserSettings();
      if (settings) {
        saveUserSettings({ ...settings, lastStudiedWordId: currentWord.id });
      }
    }
  };

  // Handlers
  const handleNext = () => {
    updateProgress();
    setCurrentIndex((prev) => prev + 1);
  };

  const handleRecognition = async (known: boolean) => {
    if (known) {
      if (source === "mistakes") {
        await clearMistake(currentWord.word);
      }
    } else {
      await recordMistake(currentWord.word, "recognition");
    }
    handleNext();
  };

  const handleSpellingCheck = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (feedback) return;

    const isCorrect = spellingInput.trim().toLowerCase() === currentWord.word.toLowerCase();

    if (isCorrect) {
      setFeedback("correct");
      if (source === "mistakes") {
        await clearMistake(currentWord.word);
      }
      setTimeout(() => handleNext(), 1000);
    } else {
      setFeedback("incorrect");
      await recordMistake(currentWord.word, "spelling");
    }
  };

  if (loading) {
    return <div className="flex-grow flex items-center justify-center text-gray-500">Loading...</div>;
  }

  if (queue.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {source === "mistakes" ? "No Mistakes Found" : "All Caught Up!"}
        </h2>
        <p className="text-gray-500 mb-8">
          {source === "mistakes"
            ? "Great job! You have no pending mistakes in this set."
            : `You have reviewed all available vocabulary${collectionId ? " in this collection" : ""} up to your checkpoint.`}
        </p>
        <div className="flex gap-4">
          <Link to={collectionId ? `/vocabulary?collectionId=${collectionId}` : "/collections"} className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg font-semibold transition-colors">
            Back to List
          </Link>
          {source === "all" && (
            <button
              onClick={() => {
                const s = getUserSettings();
                if (s) saveUserSettings({ ...s, lastStudiedWordId: 0 }); // This resets global progress, might be too aggressive if per-collection is desired later.
                window.location.reload();
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Restart From Beginning
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-6 text-center bg-green-50 dark:bg-green-900/20">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-4">Session Complete!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">You've reviewed all {queue.length} words.</p>
        <Link to={collectionId ? `/vocabulary?collectionId=${collectionId}` : "/collections"} className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95">
          Done
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-grow bg-gray-100 dark:bg-gray-950 flex flex-col font-sans">
      {/* Header / Progress */}
      <div className="h-1 bg-gray-200 dark:bg-gray-800">
        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="p-4 flex justify-between items-center text-sm text-gray-500">
        <Link to={collectionId ? `/vocabulary?collectionId=${collectionId}` : "/collections"} className="hover:text-gray-900 dark:hover:text-gray-300">✕ Exit</Link>
        <span>{currentIndex + 1} / {queue.length}</span>
      </div>

      {/* Main Card Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 w-full max-w-2xl mx-auto">

        {/* RECOGNITION MODE */}
        {mode === "recognition" && (
          <div className="w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col min-h-[450px]">
            {/* Front: Word */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 mb-6">
                <h1 className="text-5xl md:text-6xl font-black text-gray-900 dark:text-white tracking-tight">
                  {currentWord.word}
                </h1>
                <button
                  onClick={(e) => { e.stopPropagation(); playAudio(currentWord.audio); }}
                  className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                  title="Play Audio"
                >
                  🔊
                </button>
              </div>

              {isRevealed && (
                <div className="flex items-center gap-2 text-gray-500 text-xl font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  <span>{currentWord.phonetic}</span>
                </div>
              )}
            </div>

            {/* Back: Details (Only if Revealed) */}
            {isRevealed ? (
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-8 space-y-6 text-left">
                {/* Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRecognition(false)}
                    className="py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 active:scale-95 transition-all"
                  >
                    Don't Know
                  </button>
                  <button
                    onClick={() => handleRecognition(true)}
                    className="py-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 font-bold rounded-xl hover:bg-green-200 dark:hover:bg-green-900/50 active:scale-95 transition-all"
                  >
                    Know It
                  </button>
                </div>

                {/* Definition */}
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Definition</h3>
                  <div className="text-lg text-gray-800 dark:text-gray-200 leading-relaxed">
                    {currentWord.definition.map((def, i) => (
                      <p key={i} className="mb-1">{def}</p>
                    ))}
                  </div>
                </div>

                {/* Examples */}
                {currentWord.examples && currentWord.examples.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Examples</h3>
                    <div className="space-y-3">
                      {currentWord.examples.map((ex, i) => (
                        <div key={i} className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          <div className="flex items-start gap-2">
                            <button
                              onClick={() => playAudio(ex.audio)}
                              className="mt-0.5 text-blue-500 hover:text-blue-600 shrink-0"
                              title="Play Example"
                            >
                              🔊
                            </button>
                            <div>
                              <p className="text-gray-800 dark:text-gray-200">{ex.en}</p>
                              <p className="opacity-75 text-xs">{ex.cn}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" onClick={() => setIsRevealed(true)}>
                <span className="text-gray-400 font-semibold">Tap to Reveal</span>
              </div>
            )}

            {/* Actions */}
            {!isRevealed && (
              <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                <button
                  onClick={() => setIsRevealed(true)}
                  className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all"
                >
                  Show Answer
                </button>
              </div>
            )}
          </div>
        )}

        {/* SPELLING MODE */}
        {mode === "spelling" && (
          <div className="w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col min-h-[450px]">

            {/* Definition Area */}
            <div className="flex-1 p-8 flex flex-col justify-center items-center text-center space-y-8">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Definition</h3>
                <div className="text-2xl text-gray-900 dark:text-white font-medium leading-relaxed">
                  {currentWord.definition.map((def, i) => (
                    <p key={i} className="mb-2">{def}</p>
                  ))}
                </div>
              </div>

              {/* Feedback / Answer */}
              {feedback === "incorrect" && (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl w-full animate-in fade-in slide-in-from-bottom-2">
                  <p className="text-sm text-red-500 mb-1">Correct Spelling:</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{currentWord.word}</p>
                  <div className="mt-2 text-gray-500">{currentWord.phonetic}</div>
                </div>
              )}

              {feedback === "correct" && (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl w-full animate-in zoom-in">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">Correct!</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSpellingCheck} className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
              <input
                ref={inputRef}
                type="text"
                value={spellingInput}
                onChange={(e) => setSpellingInput(e.target.value)}
                disabled={!!feedback}
                placeholder="Type the word..."
                className="w-full text-center text-2xl p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none transition-colors"
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
              />

              {feedback === "incorrect" ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
                >
                  Next Word →
                </button>
              ) : !feedback && (
                <button
                  type="submit"
                  className="w-full mt-4 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-50"
                  disabled={!spellingInput}
                >
                  Check
                </button>
              )}
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
