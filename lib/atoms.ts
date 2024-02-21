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
}: {
  initialValue: T;
  persistKey?: string;
  update?: (state: T, value: S) => T;
  appVersion?: string;
  transformOnSerialize?: (obj: T) => U;
  transformOnDeserialize?: (obj: U) => T;
  equalityCompareFn?: (newValue: T, oldValue?: T) => boolean;
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

  const updateFunction = async (value: S) =>
    update
      ? subject.next(await update(subject.value, value))
      : subject.next(value as unknown as T);

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
