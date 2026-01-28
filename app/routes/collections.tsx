import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import {
    getCollections,
    addCollection,
    updateCollection,
    deleteCollection,
    getAllWords,
    getMistakeWords,
    type Collection,
    type WordRecord
} from "~/utils/db";

interface CollectionStats {
    total: number;
    mistakes: number;
    progress: number; // Percentage
}

interface CollectionWithStats extends Collection {
    stats: CollectionStats;
}

export default function Collections() {
    const navigate = useNavigate();
    const [collections, setCollections] = useState<CollectionWithStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [collectionNameInput, setCollectionNameInput] = useState("");

    const loadData = async () => {
        setLoading(true);
        try {
            const cols = await getCollections();
            const allWords = await getAllWords();

            // Calculate stats for each collection
            const colsWithStats = cols.map(c => {
                const words = allWords.filter(w => w.collectionId === c.id);
                const mistakes = words.filter(w => w.mistakeCount > 0);
                const reviewed = words.filter(w => w.lastReviewed > 0);

                return {
                    ...c,
                    stats: {
                        total: words.length,
                        mistakes: mistakes.length,
                        progress: words.length > 0
                            ? Math.round((reviewed.length / words.length) * 100)
                            : 0
                    }
                };
            });

            setCollections(colsWithStats);
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collectionNameInput.trim()) return;

        await addCollection(collectionNameInput.trim());
        setCollectionNameInput("");
        setIsCreating(false);
        loadData();
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!collectionNameInput.trim() || editingId === null) return;

        await updateCollection(editingId, collectionNameInput.trim());
        setCollectionNameInput("");
        setEditingId(null);
        loadData();
    };

    const openEdit = (id: number, currentName: string) => {
        setEditingId(id);
        setCollectionNameInput(currentName);
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete "${name}"? All words inside will be deleted.`)) return;
        await deleteCollection(id);
        loadData();
    };

    return (
        <div className="grow flex flex-col p-6 font-sans">
            <div className="max-w-2xl mx-auto w-full space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">← Back</Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Collections</h1>
                    </div>
                    <button
                        onClick={() => { setIsCreating(true); setCollectionNameInput(""); }}
                        className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
                    >
                        + New
                    </button>
                </div>

                {/* Create/Edit Modal */}
                {(isCreating || editingId !== null) && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md p-6 shadow-xl animate-in zoom-in-95">
                            <h2 className="text-lg font-bold mb-4 dark:text-white">
                                {isCreating ? "New Collection" : "Rename Collection"}
                            </h2>
                            <form onSubmit={isCreating ? handleCreate : handleUpdate}>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Collection Name"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-white mb-4 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={collectionNameInput}
                                    onChange={e => setCollectionNameInput(e.target.value)}
                                />
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsCreating(false); setEditingId(null); setCollectionNameInput(""); }}
                                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!collectionNameInput.trim()}
                                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isCreating ? "Create" : "Save"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="text-center py-10 text-gray-400">Loading...</div>
                    ) : collections.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <p className="text-gray-500 mb-4">No collections yet.</p>
                            <button
                                onClick={() => { setIsCreating(true); setCollectionNameInput(""); }}
                                className="text-blue-600 font-bold hover:underline"
                            >
                                Create your first collection
                            </button>
                        </div>
                    ) : (
                        collections.map(col => (
                            <div key={col.id} className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 transition-colors group relative">
                                <div className="flex justify-between items-start mb-3">
                                    <Link to={`/vocabulary?collectionId=${col.id}`} className="flex-1">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                                            {col.name}
                                        </h3>
                                        <p className="text-xs text-gray-400 mt-0.5">
                                            {new Date(col.createdAt).toLocaleDateString()}
                                        </p>
                                    </Link>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => openEdit(col.id!, col.name)}
                                            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                            title="Rename Collection"
                                        >
                                            <span className="sr-only">Rename</span>
                                            ✏️
                                        </button>
                                        <button
                                            onClick={() => handleDelete(col.id!, col.name)}
                                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete Collection"
                                        >
                                            <span className="sr-only">Delete</span>
                                            🗑️
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    <div className="bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg text-center">
                                        <div className="text-xl font-bold text-gray-900 dark:text-white">{col.stats.total}</div>
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">Words</div>
                                    </div>
                                    <div className="bg-red-50 dark:bg-red-900/10 p-2 rounded-lg text-center">
                                        <div className="text-xl font-bold text-red-500">{col.stats.mistakes}</div>
                                        <div className="text-[10px] text-red-400 uppercase tracking-wider">Mistakes</div>
                                    </div>
                                    <div className="bg-green-50 dark:bg-green-900/10 p-2 rounded-lg text-center">
                                        <div className="text-xl font-bold text-green-600 dark:text-green-400">{col.stats.progress}%</div>
                                        <div className="text-[10px] text-green-600 dark:text-green-400/70 uppercase tracking-wider">Done</div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Link
                                        to={`/study?collectionId=${col.id}&source=all`}
                                        onClick={(e) => {
                                            if (col.stats.total === 0) {
                                                e.preventDefault();
                                                alert("Add some words first!");
                                            }
                                        }}
                                        className={`flex-1 py-2.5 text-center rounded-xl font-bold text-sm transition-all ${col.stats.total > 0
                                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/20 active:scale-95"
                                                : "bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                                            }`}
                                    >
                                        Start Review
                                    </Link>
                                    <Link
                                        to={`/vocabulary?collectionId=${col.id}`}
                                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        List
                                    </Link>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
