// src/lib/migrate.ts
import { FirestoreService } from './firestore';

export async function migrateLocalStorageToFirebase() {
  const keys = [
    'grocery.items.v1',
    'grocery.sales.v1',
    'grocery.stock.v1',
    'grocery.expenses.v1',
    'grocery.shop.v1'
  ];

  for (const key of keys) {
    const data = JSON.parse(localStorage.getItem(key) || '[]');
    const collectionName = key.replace('grocery.', '').replace('.v1', '');
    
    if (Array.isArray(data) && data.length > 0) {
      for (const item of data) {
        await FirestoreService.add(collectionName, item);
      }
    }
  }

  // Clear localStorage after migration
  keys.forEach(key => localStorage.removeItem(key));
  
  console.log('✅ Migration complete!');
}