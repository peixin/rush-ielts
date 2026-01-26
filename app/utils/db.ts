export interface WordRecord {
  id?: number;
  word: string;
  phonetic: string;
  definition: string[];
  examples: { en: string; cn: string; audio: string }[];
  audio: string;
  addedAt: number;
  // Progress tracking
  mistakeCount: number;
  lastReviewed: number;
  mistakeTypes: ('recognition' | 'spelling')[];
}

const DB_NAME = 'rush_db';
const VOCAB_STORE = 'vocabulary';
const DB_VERSION = 2; // Incrementing version

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create Vocabulary Store if not exists
      if (!db.objectStoreNames.contains(VOCAB_STORE)) {
        db.createObjectStore(VOCAB_STORE, { keyPath: 'word' });
      }

      // We can optionally migrate old 'mistakes' store data here if we wanted to be fancy,
      // but since we are rebuilding the architecture, we might just start fresh or let the user re-import.
      // For now, we will just support the new store.
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// --- Vocabulary Operations ---

export async function addWordToVocab(data: Omit<WordRecord, 'addedAt' | 'mistakeCount' | 'lastReviewed' | 'mistakeTypes'>) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    
    // Check if exists to preserve stats
    const request = store.get(data.word);
    
    request.onsuccess = () => {
      if (request.result) {
        // Word exists, SKIP (do nothing)
        resolve();
        return;
      }

      // New word, assign ID
      const countReq = store.count();
      countReq.onsuccess = () => {
          const count = countReq.result;
          const record: WordRecord = {
          ...data,
          id: count + 1,
          addedAt: Date.now(),
          mistakeCount: 0,
          lastReviewed: 0,
          mistakeTypes: []
          };
          store.put(record);
      };
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllWords(): Promise<WordRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readonly');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMistakeWords(): Promise<WordRecord[]> {
  const all = await getAllWords();
  return all.filter(w => w.mistakeCount > 0);
}

// --- Progress Operations ---

export async function recordMistake(word: string, type: 'recognition' | 'spelling') {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.get(word);

    request.onsuccess = () => {
      if (!request.result) return; // Should not happen if word is in vocab
      
      const record: WordRecord = request.result;
      record.mistakeCount += 1;
      record.lastReviewed = Date.now();
      if (!record.mistakeTypes.includes(type)) {
        record.mistakeTypes.push(type);
      }
      store.put(record);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearMistake(word: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.get(word);

    request.onsuccess = () => {
      if (!request.result) return;
      const record: WordRecord = request.result;
      // We don't delete the word, just reset stats
      record.mistakeCount = 0;
      record.mistakeTypes = [];
      record.lastReviewed = Date.now();
      store.put(record);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function deleteWord(word: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.delete(word);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearDatabase() {
    const db = await openDB();
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    transaction.objectStore(VOCAB_STORE).clear();
    return new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
    });
}