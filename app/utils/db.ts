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
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const transaction = (event.target as IDBOpenDBRequest).transaction!;

      // Create Collections Store if not exists
      if (!db.objectStoreNames.contains(COLLECTIONS_STORE)) {
        const colStore = db.createObjectStore(COLLECTIONS_STORE, { keyPath: 'id', autoIncrement: true });
        colStore.add({ name: "Default Collection", createdAt: Date.now() });
      }


      if (!db.objectStoreNames.contains(VOCAB_STORE)) {
        const vocabStore = db.createObjectStore(VOCAB_STORE, { keyPath: 'id', autoIncrement: true });
        // Create indexes for querying
        vocabStore.createIndex('word', 'word', { unique: false });
        vocabStore.createIndex('collectionId', 'collectionId', { unique: false });
        // Uniqueness constraint: Word + Collection
        vocabStore.createIndex('word_collection', ['word', 'collectionId'], { unique: true });
      }
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
// (No changes needed for collections generally, but keeping them here)

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

export async function updateCollection(id: number, name: string) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([COLLECTIONS_STORE], 'readwrite');
    const store = transaction.objectStore(COLLECTIONS_STORE);
    const request = store.get(id);

    request.onsuccess = () => {
      const data = request.result;
      if (!data) {
        reject(new Error("Collection not found"));
        return;
      }
      data.name = name;
      const updateRequest = store.put(data);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };
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
    // Use index to find words in collection
    const index = vocabStore.index('collectionId');
    const request = index.openCursor(IDBKeyRange.only(id));

    request.onsuccess = (e: any) => {
      const cursor = e.target.result;
      if (cursor) {
        cursor.delete();
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
    const index = store.index('word_collection');

    // Check uniqueness in collection
    const checkReq = index.get([data.word, data.collectionId || 1]);

    checkReq.onsuccess = () => {
      if (checkReq.result) {
        // Exists in this collection, resolve (skip)
        resolve();
        return;
      }

      // Add new
      const record: WordRecord = {
        ...data,
        addedAt: Date.now(),
        mistakeCount: 0,
        lastReviewed: 0,
        mistakeTypes: [],
        collectionId: data.collectionId || 1
      };
      // No manual ID needed, autoIncrement handles it
      store.add(record);
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateWord(id: number, data: Partial<WordRecord>) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);

    const request = store.get(id);

    request.onsuccess = () => {
      const existingRecord: WordRecord = request.result;
      if (!existingRecord) {
        reject(new Error("Word not found"));
        return;
      }

      const newRecord = { ...existingRecord, ...data };
      store.put(newRecord);
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

    let request;
    if (collectionId !== undefined) {
      const index = store.index('collectionId');
      request = index.getAll(collectionId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getMistakeWords(collectionId?: number): Promise<WordRecord[]> {
  const all = await getAllWords(collectionId);
  return all.filter(w => w.mistakeCount > 0);
}

// --- Progress Operations ---

export async function recordMistake(id: number, type: 'recognition' | 'spelling') {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.get(id);

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

export async function clearMistake(id: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    const request = store.get(id);

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

export async function deleteWord(id: number) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([VOCAB_STORE], 'readwrite');
    const store = transaction.objectStore(VOCAB_STORE);
    store.delete(id);
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