import { useCallback, useEffect, useState } from "react";
import { BehaviorSubject } from "./core";

export type Atom<T, S = T> = {
  subject: BehaviorSubject<T>;
  update: (value: S) => void;
};

export function atom<T, S = T>({
  initialValue,
  persistKey,
  update,
  appVersion,
}: {
  initialValue: T;
  persistKey?: string;
  update?: (state: T, value: S) => T;
  appVersion?: string;
}): Atom<T, S> {
  let persistedValue: T | undefined = undefined;

  if (persistKey) {
    const storedJson = JSON.parse(localStorage.getItem(persistKey) ?? "{}");

    // Remove from storage if version has been updated
    if (storedJson.version !== appVersion) {
      localStorage.removeItem(persistKey);
    } else {
      persistedValue = storedJson.data;
    }
  }

  const subject = new BehaviorSubject<T>(persistedValue ?? initialValue);

  if (persistKey) {
    subject.pipe((value: T) => {
      localStorage.setItem(
        persistKey,
        JSON.stringify({ data: value, version: appVersion })
      );
      return { value, stopPropagation: true };
    });
  }

  const updateFunction = (value: S) =>
    update
      ? subject.next(update(subject.value, value))
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
