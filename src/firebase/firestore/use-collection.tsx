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
    // This is the critical guard. If the query is null or undefined,
    // we reset the state and wait. This prevents invalid queries
    // from executing while dependencies (like user auth) are loading.
    if (!query) {
      setData(null);
      setIsLoading(true); // Keep loading until a valid query is provided
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
          // This works for CollectionReferences. For complex Queries, the SDK does not expose the path.
          const path = 'path' in query && typeof (query as any).path === 'string'
            ? (query as any).path
            : 'unknown-collection (from a query)';
          
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

    // Unsubscribe from the listener when the component unmounts or the query changes.
    return () => unsubscribe();
  }, [query]); // The effect re-runs only when the memoized query object changes.
  
  return { data, isLoading, error };
}
