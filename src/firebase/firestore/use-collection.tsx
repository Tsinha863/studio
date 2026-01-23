'use client';

import { useState, useEffect } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | null; // Error object, or null.
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * It requires a memoized query object to prevent infinite re-renders.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference | Query | null | undefined} query - The memoized Firestore query, created with React.useMemo.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    query: CollectionReference<DocumentData> | Query<DocumentData> | null | undefined,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      setIsLoading(true);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null); // Clear previous data on new query

    const unsubscribe = onSnapshot(
      query,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = snapshot.docs.map(doc => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (serverError: FirestoreError) => {
        setError(serverError);
        setData(null);
        setIsLoading(false);
        
        if (serverError.code === 'permission-denied') {
          let path = 'unknown-collection (from a query)';
          if (query instanceof CollectionReference) {
              path = query.path;
          }
          
          try {
            const permissionError = new FirestorePermissionError({
              path: path,
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
          } catch(e) {
            // This failsafe prevents a crash in the error constructor itself,
            // e.g., if getAuth() isn't ready. The original error remains in state.
          }
        }
      }
    );

    return () => unsubscribe();
  }, [query]); 
  
  return { data, isLoading, error };
}
