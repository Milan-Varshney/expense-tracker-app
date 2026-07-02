import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SEED_DATA from '../data/seedData';

const STORAGE_KEY = '@hisabkitab/transactions';

const TransactionsContext = createContext(null);

export function TransactionsProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setTransactions(JSON.parse(raw));
        } else {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_DATA));
          setTransactions(SEED_DATA);
        }
      } catch (e) {
        setTransactions(SEED_DATA);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const addTransaction = useCallback(async (transaction) => {
    setTransactions((prev) => {
      const next = [
        {
          id: `txn-${prev.length + 1}-${Math.floor(Math.random() * 1e6)}`,
          isRecurring: false,
          needsReview: false,
          direction: 'debit',
          ...transaction,
        },
        ...prev,
      ];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <TransactionsContext.Provider value={{ transactions, loading, addTransaction }}>
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionsContext);
  if (!ctx) throw new Error('useTransactions must be used within a TransactionsProvider');
  return ctx;
}
