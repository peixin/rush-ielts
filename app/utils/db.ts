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
  collectionId?: number; // New field
}

export interface Collection {
  id?: number;
  name: string;
  createdAt: number;
}

const DB_NAME = 'rush_db';
const VOCAB_STORE = 'vocabulary';
const COLLECTIONS_STORE = 'collections';
const DB_VERSION = 1;

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

      // Create Collections Store
      if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
        const colStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id', autoIncrement: true });
        // Create Default Collection
        colStore.add({ name: "Default Collection", createdAt: Date.now() });
      }


      // Removed historical data migration logic as per user request.
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

// --- Collection Operations ---

export async function getCollections(): Promise<Collection[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([COLLECTIONS_STORE], 'readonly');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addCollection(name: string): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([COLLECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    const request = store.add({ name, createdAt: Date.now() });
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteCollection(id: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([COLLECTIONS_STORE, VOCAB_STORE], 'readwrite');

    // 1. Delete Collection
    transaction.objectStore(COLLECTIONS_STORE).delete(id);

    // 2. Cascade Delete Words in this collection
    const vocabStore = transaction.objectStore(VOCAB_STORE);
    const cursorRequest = vocabStore.openCursor();

    cursorRequest.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.collectionId === id) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
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
        // Word exists, SKIP (do nothing or updated?)
        // If we want to allow updating "collectionId" we could do it here, but requirement says import -> choose collection
        // Let's UPDATE the definition/audio but preserve stats? 
        // Or just Skip. Let's just resolve.
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
          mistakeTypes: [],
          collectionId: data.collectionId || 1 // Fallback to default
        };
        store.put(record);
      };
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getAllWords(collectionId?: number): Promise<WordRecord[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readonly');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      let results: WordRecord[] = request.result;
      if (collectionId !== undefined) {
        results = results.filter(w => w.collectionId === collectionId);
      }
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getMistakeWords(collectionId?: number): Promise<WordRecord[]> {
  const all = await getAllWords(collectionId);
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
  const transaction = db.transaction([VOCAB_STORE, COLLECTIONS_STORE], 'readwrite');
  transaction.objectStore(VOCAB_STORE).clear();
  transaction.objectStore(COLLECTIONS_STORE).clear();
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}