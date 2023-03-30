import { writable } from 'svelte/store';

export function localStorageStore(key, value) {
  const storedValue = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
  const data = storedValue ? JSON.parse(storedValue) : value;
  const store = writable(data);

  if (typeof window !== 'undefined') {
    store.subscribe(($data) => {
      localStorage.setItem(key, JSON.stringify($data));
    });
  }

  return store;
}
