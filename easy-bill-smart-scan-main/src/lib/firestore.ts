// src/lib/firestore.ts
import { 
  db,
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  onSnapshot,
  getDoc,
  setDoc,
  writeBatch
} from './firebase';

export const FirestoreService = {
  // ✅ FIXED: Add with better error handling
  // In firestore.ts, find the add function and add this:

async add(collectionName: string, data: any) {
  try {
    // ✅ Remove undefined values
    const cleanData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        cleanData[key] = value;
      }
    }
    
    console.log(`🔥 Adding to ${collectionName}:`, cleanData);
    const docRef = await addDoc(collection(db, collectionName), {
      ...cleanData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    console.log(`✅ Added to ${collectionName} with ID:`, docRef.id);
    return { id: docRef.id, ...cleanData };
  } catch (error: any) {
    console.error(`❌ Error adding to ${collectionName}:`, error);
    throw error;
  }
},

  async addWithId(collectionName: string, id: string, data: any) {
    try {
      const docRef = doc(db, collectionName, id);
      await setDoc(docRef, {
        ...data,
        id: id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { id, ...data };
    } catch (error) {
      console.error('Error adding document with ID:', error);
      throw error;
    }
  },

  async getAll(collectionName: string) {
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  },

  async getById(collectionName: string, id: string) {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  },

  async getWhere(collectionName: string, field: string, operator: any, value: any) {
    try {
      const q = query(collection(db, collectionName), where(field, operator, value));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error querying documents:', error);
      throw error;
    }
  },

  async update(collectionName: string, id: string, data: any) {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
      return { id, ...data };
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  async delete(collectionName: string, id: string) {
    try {
      await deleteDoc(doc(db, collectionName, id));
      return id;
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  },

  listen(collectionName: string, callback: (data: any[]) => void) {
    console.log(`👂 Listening to ${collectionName}...`);
    const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`📡 ${collectionName} updated:`, data.length, 'documents');
      callback(data);
    }, (error) => {
      console.error(`❌ Error listening to ${collectionName}:`, error);
    });
    return unsubscribe;
  },

  async batchWrite(operations: Array<{ type: 'add' | 'update' | 'delete', collection: string, id?: string, data?: any }>) {
    const batch = writeBatch(db);
    operations.forEach(op => {
      if (op.type === 'add') {
        const ref = doc(collection(db, op.collection));
        batch.set(ref, { ...op.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      } else if (op.type === 'update' && op.id) {
        const ref = doc(db, op.collection, op.id);
        batch.update(ref, { ...op.data, updatedAt: new Date().toISOString() });
      } else if (op.type === 'delete' && op.id) {
        const ref = doc(db, op.collection, op.id);
        batch.delete(ref);
      }
    });
    await batch.commit();
  }
};