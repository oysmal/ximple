import { useCallback, useEffect, useState } from "react";
import { BehaviorSubject } from "./core";

export type Atom<T, S = T> = {
  subject: BehaviorSubject<T>;
  update: (value: S) => Promise<void>;
};

export function atom<T, S = T, U = T>({
  initialValue,
  persistKey,
  update,
  appVersion,
  transformOnDeserialize,
  transformOnSerialize,
  equalityCompareFn,
  concurrency = "queue",
  concurrencyTime = Number.MAX_SAFE_INTEGER,
}: {
  initialValue: T;
  persistKey?: string;
  update?: (state: T, value: S) => Promise<T> | T;
  appVersion?: string;
  transformOnSerialize?: (obj: T) => U;
  transformOnDeserialize?: (obj: U) => T;
  equalityCompareFn?: (newValue: T, oldValue?: T) => boolean;
  concurrency?: "queue" | "throttle" | "debounce";
  concurrencyTime?: number;
}): Atom<T, S> {
  let persistedValue: T | undefined = undefined;

  if (persistKey) {
    const storedJson = JSON.parse(localStorage.getItem(persistKey) ?? "{}");

    // Remove from storage if version has been updated
    if (storedJson.version !== appVersion) {
      localStorage.removeItem(persistKey);
    } else {
      persistedValue = storedJson.data;
      if (transformOnDeserialize && storedJson.data) {
        persistedValue = transformOnDeserialize(storedJson.data);
      }
    }
  }

  const subject = new BehaviorSubject<T>(persistedValue ?? initialValue, {
    equalityCompareFn,
  });

  if (persistKey) {
    subject.pipe((value: T) => {
      let data: T | U = value;
      if (transformOnSerialize) {
        data = transformOnSerialize(value);
      }

      localStorage.setItem(
        persistKey,
        JSON.stringify({ data, version: appVersion })
      );
      return { value, stopPropagation: true };
    });
  }

  let idgen = 0;
  // Handle updates to the atom, taking in to account concurrency rules
  // Default is queue, which means all updates are processed in order
  // First means only the first update is processed, and the rest are ignored
  // Last means only the last update is processed, and the rest are ignored
  const updateFunction = async (value: S) => {
    if (
      updateFunction.queue.length > 0 &&
      concurrency === "throttle" &&
      Date.now() - updateFunction.queue[0].timestamp <= concurrencyTime
    ) {
      return;
    }

    let resolver = (a: any) => a;
    const updatePromise = new Promise<any>((res) => {
      resolver = res;
    });

    if (concurrency === "debounce") {
      updateFunction.queue.forEach((x) => {
        if (Date.now() - x.timestamp < concurrencyTime) x.skip = true;
      });
      updateFunction.queue = [];
    }

    const id = idgen++;
    const queueItem = {
      id,
      updatePromise,
      skip: false,
      timestamp: Date.now(),
    };
    updateFunction.queue.push(queueItem);

    if (concurrency === "queue") {
      await Promise.all(
        updateFunction.queue.slice(0, -1).map((x) => x.updatePromise)
      );
    }

    const newValue = update
      ? await update(subject.value, value)
      : (value as unknown as T);

    if (concurrency === "debounce" && queueItem.skip) {
      return;
    }

    subject.next(newValue);

    updateFunction.queue.splice(
      updateFunction.queue.findIndex((x) => x.id === id),
      1
    );
    resolver(newValue);
  };

  updateFunction.queue = [] as {
    id: number;
    updatePromise: Promise<T>;
    skip?: boolean;
    timestamp: number;
  }[];

  return { subject, update: updateFunction };
}

export function useAtom<T, S = T>(atom: Atom<T, S>): [T, (value: S) => void] {
  const [data, setData] = useState<T>(atom.subject.value);

  const update = useCallback((value: S) => atom.update(value), [atom]);

  useEffect(() => {
    return atom.subject.subscribe(setData);
  }, []);

  return [data, update];
}
