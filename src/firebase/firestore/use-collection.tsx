'use client';

import { useState, useEffect, useMemo } from 'react';
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
 * It encapsulates memoization to prevent infinite loops from unstable query objects.
 * 
 * @template T Optional type for document data. Defaults to any.
 * @param {() => CollectionReference | Query | null | undefined} queryFactory - A function that returns the Firestore query/reference.
 * @param {React.DependencyList} deps - Dependencies for the query factory, similar to `useMemo`.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    queryFactory: () => CollectionReference<DocumentData> | Query<DocumentData> | null | undefined,
    deps: React.DependencyList = []
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | null>(null);

  const memoizedQuery = useMemo(queryFactory, deps);

  useEffect(() => {
    if (!memoizedQuery) {
      setData(null);
      setIsLoading(false); 
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setData(null); // Clear previous data

    const unsubscribe = onSnapshot(
      memoizedQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (serverError: FirestoreError) => {
        setError(serverError);
        setData(null);
        setIsLoading(false);
        
        if (serverError.code === 'permission-denied' && memoizedQuery) {
          // Safely try to get the path for the error context.
          // This works for CollectionReferences but not for complex Queries,
          // which is a limitation of the Firebase JS SDK. For queries, we report a placeholder.
          let path = 'unknown-collection (from a query)';
          if ('path' in memoizedQuery && typeof (memoizedQuery as any).path === 'string') {
            path = (memoizedQuery as any).path;
          }
          
          try {
            const permissionError = new FirestorePermissionError({
              path: path,
              operation: 'list',
            });
            errorEmitter.emit('permission-error', permissionError);
          } catch(e) {
            // This catch block prevents a crash if the FirestorePermissionError constructor itself fails,
            // for example if getAuth() isn't ready. The original error will still be in the `error` state.
          }
        }
      }
    );

    return () => unsubscribe();
  }, [memoizedQuery]);
  
  return { data, isLoading, error };
}

    