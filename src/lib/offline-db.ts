import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface MuniNowOfflineDB extends DBSchema {
  tasks: {
    key: string; // inspection_id
    value: {
      inspectionId: string;
      permitId: string;
      address: string;
      type: string;
      scheduledDate: string;
      details: any;
      templateId: string;
      status: 'pending' | 'in_progress' | 'completed';
    };
  };
  templates: {
    key: string; // template_id
    value: {
      id: string;
      name: string;
      schema: any;
      version: number;
    };
  };
  form_data: {
    key: string; // inspection_id
    value: {
      inspectionId: string;
      data: any; // The form answers
      lastUpdated: number;
    };
  };
  media_queue: {
    key: string; // photo_id (uuid)
    value: {
      id: string;
      inspectionId: string;
      itemId: string; // "visual" id in the form
      blob: Blob;
      mimeType: string;
      caption?: string;
      status: 'pending' | 'uploading' | 'error';
      retryCount: number;
      createdAt: number;
    };
    indexes: { 'by-inspection': string };
  };
  sync_queue: {
    key: string; // inspection_id
    value: {
      inspectionId: string;
      payload: any;
      timestamp: number;
      retryCount: number;
    };
  };
}

const DB_NAME = 'muninow_offline_v1';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<MuniNowOfflineDB>> | null = null;

export const getDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<MuniNowOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Store 1: Tasks (The assignments)
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'inspectionId' });
        }
        
        // Store 1b: Templates (The form definitions)
        if (!db.objectStoreNames.contains('templates')) {
          db.createObjectStore('templates', { keyPath: 'id' });
        }

        // Store 2: Form Data (Drafts)
        if (!db.objectStoreNames.contains('form_data')) {
          db.createObjectStore('form_data', { keyPath: 'inspectionId' });
        }

        // Store 3: Media Queue (Photos/Signatures)
        if (!db.objectStoreNames.contains('media_queue')) {
          const store = db.createObjectStore('media_queue', { keyPath: 'id' });
          store.createIndex('by-inspection', 'inspectionId');
        }

        // Store 4: Sync Queue (Final Submissions)
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'inspectionId' });
        }
      },
    });
  }
  return dbPromise;
};

// --- Helper Functions ---

export const saveDraft = async (inspectionId: string, data: any) => {
  const db = await getDB();
  await db.put('form_data', {
    inspectionId,
    data,
    lastUpdated: Date.now(),
  });
};

export const getDraft = async (inspectionId: string) => {
  const db = await getDB();
  return db.get('form_data', inspectionId);
};

export const queueMedia = async (mediaItem: MuniNowOfflineDB['media_queue']['value']) => {
  const db = await getDB();
  await db.put('media_queue', mediaItem);
};

export const getPendingMedia = async (inspectionId: string) => {
  const db = await getDB();
  return db.getAllFromIndex('media_queue', 'by-inspection', inspectionId);
};

export const saveInspection = async (inspection: any) => {
  const db = await getDB();
  const task = {
    ...inspection,
    inspectionId: inspection.id || inspection.inspectionId
  };
  await db.put('tasks', task);
};

export const saveTemplate = async (template: any) => {
  const db = await getDB();
  await db.put('templates', template);
};
