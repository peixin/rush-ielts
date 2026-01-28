import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  getAllWords,
  deleteWord,
  addWordToVocab,
  getCollections,
  type WordRecord,
  type Collection
} from "~/utils/db";
import { getUserSettings, saveUserSettings } from "~/utils/user";

type Tab = "all" | "mistakes";

export default function Vocabulary() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Get collectionId from URL (default to 1, but we wait for collections to load to be sure)
  const collectionIdParam = searchParams.get("collectionId");
  const [activeCollectionId, setActiveCollectionId] = useState<number>(collectionIdParam ? parseInt(collectionIdParam) : 1);
  const [collections, setCollections] = useState<Collection[]>([]);

  const [words, setWords] = useState<WordRecord[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>(searchParams.get("tab") === "mistakes" ? "mistakes" : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showDefinition, setShowDefinition] = useState(false);
  const [showPhonetic, setShowPhonetic] = useState(false);
  const [currentProgressId, setCurrentProgressId] = useState<number | undefined>(undefined);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [editingWord, setEditingWord] = useState<Partial<WordRecord> | null>(null);
  const [viewingWord, setViewingWord] = useState<WordRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setActiveTab(searchParams.get("tab") === "mistakes" ? "mistakes" : "all");
  }, [searchParams]);

  // Sync state with URL if it changes externally
  useEffect(() => {
    if (collectionIdParam) {
      setActiveCollectionId(parseInt(collectionIdParam));
    }
  }, [collectionIdParam]);

  useEffect(() => {
    loadData();
    const settings = getUserSettings();
    if (settings) {
      setShowDefinition(!!settings.showDefinition);
      setShowPhonetic(!!settings.showPhonetic);
      setCurrentProgressId(settings.lastStudiedWordId);
    }
  }, []);

  // Reload words when collection changes
  useEffect(() => {
    loadWords();
  }, [activeCollectionId]);

  const loadData = async () => {
    const cols = await getCollections();
    setCollections(cols);
    // If no valid collection selected, default to first or 1
    if (!cols.find(c => c.id === activeCollectionId) && cols.length > 0) {
      handleSwitchCollection(cols[0].id!);
    } else {
      loadWords();
    }
  };

  const loadWords = async () => {
    const all = await getAllWords(activeCollectionId);
    // Sort by ID ascending (Import order)
    all.sort((a, b) => {
      if (a.id !== undefined && b.id !== undefined) return a.id - b.id;
      return a.addedAt - b.addedAt;
    });
    setWords(all);
  };

  const handleSwitchCollection = (id: number) => {
    setActiveCollectionId(id);
    // Update URL without reloading
    const newParams = new URLSearchParams(searchParams);
    newParams.set("collectionId", id.toString());
    setSearchParams(newParams);
  };

  const handleSetProgress = (id?: number) => {
    if (id === undefined) return;
    const settings = getUserSettings();
    if (settings) {
      const newSettings = { ...settings, lastStudiedWordId: id };
      saveUserSettings(newSettings);
      setCurrentProgressId(id);
    }
  };

  const handleDelete = async (word: string) => {
    if (confirm(`Are you sure you want to delete "${word}"?`)) {
      await deleteWord(word);
      await loadWords();
    }
  };

  const handleEdit = (word: WordRecord) => {
    setEditingWord({ ...word });
    setIsEditModalOpen(true);
  };

  const handleView = (word: WordRecord) => {
    setViewingWord(word);
    setIsDetailModalOpen(true);
  };

  const handleAdd = () => {
    setEditingWord({
      word: "",
      definition: [],
      examples: [],
      phonetic: "",
      // Default to current collection
      collectionId: activeCollectionId
    });
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWord || !editingWord.word) return;

    const wordToSave: any = {
      word: editingWord.word,
      phonetic: editingWord.phonetic || "",
      definition: editingWord.definition || [],
      examples: editingWord.examples || [],
      audio: editingWord.audio || "",
      collectionId: editingWord.collectionId || activeCollectionId
    };

    await addWordToVocab(wordToSave);
    setIsEditModalOpen(false);
    setEditingWord(null);
    await loadWords();
  };

  const toggleDefinitionVisibility = () => {
    const newVal = !showDefinition;
    setShowDefinition(newVal);
    const settings = getUserSettings();
    if (settings) {
      saveUserSettings({ ...settings, showDefinition: newVal });
    }
  };

  const handleFetchApi = async () => {
    if (!editingWord?.word) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/dict?q=${encodeURIComponent(editingWord.word)}`);
      const data = await res.json();

      if (data.error) {
        alert("Word not found in dictionary.");
      } else {
        setEditingWord(prev => ({
          ...prev,
          phonetic: data.phonetic,
          definition: data.definition,
          examples: data.examples,
          audio: data.audio
        }));
      }
    } catch (e) {
      console.error(e);
      alert("Failed to fetch data.");
    } finally {
      setIsLoading(false);
    }
  };

  // Filter logic
  const filteredWords = words.filter(w => {
    const matchesTab = activeTab === "all" || (activeTab === "mistakes" && w.mistakeCount > 0);
    const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.definition.some(d => d.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex-grow font-sans pb-20">

      {/* Top Bar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 px-4 py-3">
        <div className="max-w-3xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link to="/collections" className="text-gray-500 hover:text-gray-900 dark:hover:text-white font-bold text-xl">
                ←
              </Link>

              {/* Collection Switcher */}
              <div className="relative group">
                <select
                  value={activeCollectionId}
                  onChange={(e) => handleSwitchCollection(parseInt(e.target.value))}
                  className="appearance-none bg-transparent font-bold text-xl text-blue-600 dark:text-blue-500 pr-6 cursor-pointer outline-none hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                >
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-xs text-gray-500">▼</span>
              </div>
            </div>

            <div className="flex gap-2">

              <Link
                to="/import"
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                Import
              </Link>
              <button
                onClick={handleAdd}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-bold transition-colors shadow-sm"
              >
                + Add
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 -mb-3.5">
            <div className="flex gap-6">
              <button
                onClick={() => setActiveTab("all")}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "all" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400"}`}
              >
                All ({words.length})
              </button>
              <button
                onClick={() => setActiveTab("mistakes")}
                className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "mistakes" ? "border-red-600 text-red-600 dark:text-red-400" : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400"}`}
              >
                Mistakes ({words.filter(w => w.mistakeCount > 0).length})
              </button>
            </div>

            {/* Start Review Button for current list */}
            {/* Actions: Hide Defs + Start Review */}
            <div className="flex items-center gap-4 pb-3 mb-0.5">
              <button
                onClick={toggleDefinitionVisibility}
                className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                title={showDefinition ? "Hide Definitions" : "Show Definitions"}
              >
                {showDefinition ? "🙈 Hide" : "👁️ Show"}
              </button>
              {words.length > 0 && (
                <Link
                  to={`/study?collectionId=${activeCollectionId}&source=${activeTab}`}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <span>▶</span> Start Review
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Simplified List */}
      <div className="max-w-3xl mx-auto p-4 space-y-2">
        {filteredWords.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            {activeTab === 'mistakes' ? "No mistakes in this collection." : "No words found logic."}
          </div>
        ) : (
          filteredWords.map((word) => (
            <div key={word.word} className="mb-3">
              <div className="bg-white dark:bg-gray-800 rounded-xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all flex items-center justify-between group gap-4">

                {/* Word Info - Click to View */}
                <div
                  className="flex-1 cursor-pointer min-w-0"
                  onClick={() => handleView(word)}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-900 dark:text-white text-lg truncate">{word.word}</span>
                    {showPhonetic && word.phonetic && <span className="text-xs text-gray-500 font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{word.phonetic}</span>}
                    {word.mistakeCount > 0 && (
                      <span className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                        {word.mistakeCount} err
                      </span>
                    )}
                  </div>
                  {showDefinition && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate w-full">
                      {word.definition.join("; ")}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (word.audio) {
                        let audioUrl = word.audio;
                        if (!audioUrl.startsWith("http")) {
                          audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(audioUrl)}`;
                        }
                        audioUrl = audioUrl.replace("http://", "https://");
                        new Audio(audioUrl).play();
                      }
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Play Audio"
                  >
                    <span className="sr-only">Play</span>
                    🔊
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleEdit(word); }}
                    className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Edit"
                  >
                    <span className="sr-only">Edit</span>
                    ✏️
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(word.word); }}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Delete"
                  >
                    <span className="sr-only">Delete</span>
                    🗑️
                  </button>
                </div>
              </div>

              {/* Progress Divider */}
              {word.id !== undefined && currentProgressId === word.id && (
                <div className="relative py-4 text-center">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t-2 border-blue-500 border-dashed opacity-50"></div>
                  </div>
                  <div className="relative inline-block px-2 bg-gray-50 dark:bg-gray-900">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest border border-blue-200 dark:border-blue-800 rounded-full px-3 py-1 bg-blue-50 dark:bg-blue-900/30">
                      Current Progress
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Edit/Add Modal */}

      {isEditModalOpen && editingWord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingWord.word ? "Edit Word" : "Add New Word"}
              </h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-500 text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              {/* Collection Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Collection</label>
                <select
                  value={editingWord.collectionId || activeCollectionId}
                  onChange={e => setEditingWord(p => ({ ...p!, collectionId: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Word</label>
                  <input
                    type="text"
                    required
                    value={editingWord.word || ""}
                    onChange={e => setEditingWord(p => ({ ...p!, word: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleFetchApi}
                  disabled={isLoading || !editingWord.word}
                  className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-lg font-bold text-sm mb-0.5 hover:bg-indigo-200 disabled:opacity-50"
                >
                  {isLoading ? "..." : "Fetch Info"}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phonetic</label>
                <input
                  type="text"
                  value={editingWord.phonetic || ""}
                  onChange={e => setEditingWord(p => ({ ...p!, phonetic: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Definitions (One per line)</label>
                <textarea
                  rows={4}
                  value={editingWord.definition?.join("\n") || ""}
                  onChange={e => setEditingWord(p => ({ ...p!, definition: e.target.value.split("\n").filter(x => x.trim()) }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30"
                >
                  Save Word
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail View Modal */}
      {isDetailModalOpen && viewingWord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative">
            <button
              onClick={() => setIsDetailModalOpen(false)}
              className="absolute top-4 right-4 bg-gray-100 dark:bg-gray-700 rounded-full p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{viewingWord.word}</h2>
                {viewingWord.phonetic && (
                  <div className="text-lg text-gray-500 font-mono">{viewingWord.phonetic}</div>
                )}
                {viewingWord.audio && (
                  <button
                    onClick={() => {
                      let audioUrl = viewingWord.audio;
                      if (!audioUrl.startsWith("http")) {
                        audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(audioUrl)}`;
                      }
                      audioUrl = audioUrl.replace("http://", "https://");
                      new Audio(audioUrl).play();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full text-sm font-semibold hover:bg-blue-100 transition-colors"
                  >
                    🔊 Play Audio
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Definitions</h3>
                  <ul className="list-disc pl-5 space-y-1 text-gray-800 dark:text-gray-200">
                    {viewingWord.definition.map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>

                {viewingWord.examples && viewingWord.examples.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Examples</h3>
                    <div className="space-y-3">
                      {viewingWord.examples.map((ex, i) => (
                        <div key={i} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg flex gap-3">
                          {ex.audio && (
                            <button
                              onClick={() => {
                                let audioUrl = ex.audio;
                                if (!audioUrl.startsWith("http")) {
                                  audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(audioUrl)}`;
                                }
                                audioUrl = audioUrl.replace("http://", "https://");
                                new Audio(audioUrl).play();
                              }}
                              className="mt-1 flex-shrink-0 text-blue-500 hover:text-blue-600 bg-white dark:bg-gray-800 w-8 h-8 flex items-center justify-center rounded-full shadow-sm"
                              title="Play Example"
                            >
                              🔊
                            </button>
                          )}
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">{ex.en}</p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{ex.cn}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Mistakes</div>
                    <div className={`text-xl font-bold ${viewingWord.mistakeCount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {viewingWord.mistakeCount}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Added</div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-1">
                      {new Date(viewingWord.addedAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex flex-col gap-3">
              <button
                onClick={() => { setIsDetailModalOpen(false); handleSetProgress(viewingWord.id); }}
                className={`w-full py-3 rounded-lg font-bold shadow-sm transition-all ${currentProgressId === viewingWord.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
              >
                {currentProgressId === viewingWord.id ? "✓ Current Progress" : "Set as Current Progress"}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setIsDetailModalOpen(false); handleEdit(viewingWord); }}
                  className="flex-1 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => { if (confirm("Delete word?")) { setIsDetailModalOpen(false); handleDelete(viewingWord.word); } }}
                  className="flex-1 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg font-bold hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}