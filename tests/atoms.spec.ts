import { atom } from '../dist/atoms.js';
import { expect, describe, it } from 'vitest';

describe('Atom basics', () => {
  it('should be possible to update state', async () => {
    const a = atom({ initialValue: 0 });
    expect(a.subject.value).toBe(0);
    await a.update(1);
    expect(a.subject.value).toBe(1);
  });

  it('should be possible to update state with an update function', async () => {
    const a = atom({ initialValue: 0, update: (a, b) => a + b });
    expect(a.subject.value).toBe(0);
    await a.update(1);
    expect(a.subject.value).toBe(1);
    await a.update(2);
    expect(a.subject.value).toBe(3);
  });
});

describe('Atom concurrency', () => {
  it("should be possible to update atom with concurrency 'throttle'", async () => {
    const a = atom({
      initialValue: 0,
      concurrency: 'throttle',
      update: async (state, action) => {
        await new Promise((res) => setTimeout(res, 100));
        return state + action;
      },
    });

    const p1 = a.update(1);
    const p2 = a.update(2);
    const p3 = a.update(3);
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toBe(1);
  });

  it("should be possible use 'throttle' with concurrencyTime", async () => {
    const a = atom({
      initialValue: 0,
      concurrency: 'throttle',
      concurrencyTime: 200,
      update: async (state, action) => {
        await new Promise((res) => setTimeout(res, 200));
        return state + action;
      },
    });

    const p1 = a.update(1);
    const p2 = a.update(2);
    const p3 = a.update(3);
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toBe(1);

    const p4 = a.update(4);
    const p5 = a.update(5);
    await new Promise((res) => setTimeout(res, 250));
    const p6 = a.update(6);
    await Promise.all([p4, p5, p6]);
    expect(a.subject.value).toBe(11);
  });

  it("should be possible to update atom with concurrency 'debounce'", async () => {
    const a = atom({
      initialValue: 0,
      concurrency: 'debounce',
      update: async (state, action) => {
        await new Promise((res) => setTimeout(res, 100));
        return state + action;
      },
    });

    const p1 = a.update(1);
    const p2 = a.update(2);
    const p3 = a.update(3);
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toBe(3);
  });

  it("should be possible to use 'debounce' with concurrencyTime", async () => {
    const a = atom({
      initialValue: 0,
      concurrency: 'debounce',
      concurrencyTime: 200,
      update: async (state, action) => {
        await new Promise((res) => setTimeout(res, 100));
        return state + action;
      },
    });

    const p1 = a.update(1);
    const p2 = a.update(2);
    const p3 = a.update(3);
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toBe(3);

    const p4 = a.update(4);
    const p5 = a.update(5);
    await new Promise((res) => setTimeout(res, 110));
    const p6 = a.update(6);
    await Promise.all([p4, p5, p6]);
    expect(a.subject.value).toBe(14);
  });

  it("should be possible to update atom with concurrency 'queue'", async () => {
    const a = atom({
      initialValue: 0,
      concurrency: 'queue',
      update: async (state, action) => {
        await new Promise((res) => setTimeout(res, 100));
        return state + action;
      },
    });

    const p1 = a.update(1);
    const p2 = a.update(2);
    const p3 = a.update(3);
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toBe(6);
  });

  it('should respect queue order even if the last promises resolves first', async () => {
    const a = atom({
      initialValue: [] as number[],
      concurrency: 'queue',
      update: async (state, action: { val: number; timeout: number }) => {
        await new Promise((res) => setTimeout(res, action.timeout));
        return [...state, action.val];
      },
    });

    const p1 = a.update({ val: 1, timeout: 500 });
    const p2 = a.update({ val: 2, timeout: 100 });
    const p3 = a.update({ val: 3, timeout: 1 });
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toStrictEqual([1, 2, 3]);
  });

  it('should respect throttle concurrency even if the last promises resolves first', async () => {
    const a = atom({
      initialValue: [] as number[],
      concurrency: 'throttle',
      update: async (state, action: { val: number; timeout: number }) => {
        await new Promise((res) => setTimeout(res, action.timeout));
        return [...state, action.val];
      },
    });

    const p1 = a.update({ val: 1, timeout: 500 });
    const p2 = a.update({ val: 2, timeout: 100 });
    const p3 = a.update({ val: 3, timeout: 1 });
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toStrictEqual([1]);

    const p4 = a.update({ val: 4, timeout: 10 });
    const p5 = a.update({ val: 5, timeout: 100 });
    const p6 = a.update({ val: 6, timeout: 100 });
    await Promise.all([p4, p5, p6]);
    expect(a.subject.value).toStrictEqual([1, 4]);
  });

  it('should respect debounce concurrency even if the last promises resolves first', async () => {
    const a = atom({
      initialValue: [] as number[],
      concurrency: 'debounce',
      update: async (state, action: { val: number; timeout: number }) => {
        await new Promise((res) => setTimeout(res, action.timeout));
        return [...state, action.val];
      },
    });

    const p1 = a.update({ val: 1, timeout: 500 });
    const p2 = a.update({ val: 2, timeout: 100 });
    const p3 = a.update({ val: 3, timeout: 1 });
    await Promise.all([p1, p2, p3]);
    expect(a.subject.value).toStrictEqual([3]);

    const p4 = a.update({ val: 4, timeout: 10 });
    const p5 = a.update({ val: 5, timeout: 100 });
    const p6 = a.update({ val: 6, timeout: 100 });
    await Promise.all([p4, p5, p6]);
    expect(a.subject.value).toStrictEqual([3, 6]);
  });
});

describe('Async transformOnDeserialize', () => {
  it('should be possible to run ascynchronous version of transformOnDeserialize', async () => {
    const localStorageMap = new Map<string, string>();
    localStorageMap.set('test', JSON.stringify({ data: [{ val: 1 }, { val: 2 }, { val: 3 }], version: '1.0.0' }));
    globalThis.localStorage = {
      getItem: (key: string) => localStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => localStorageMap.set(key, value),
      length: 0,
      clear: () => localStorageMap.clear(),
      key: () => '',
      removeItem: (key: string) => localStorageMap.delete(key),
    };

    const a = atom({
      initialValue: [] as { val: number }[],
      persistKey: 'test',
      appVersion: '1.0.0',
      transformOnDeserialize: async (value) => {
        await new Promise((res) => setTimeout(res, 100));
        return value;
      },
    });

    expect(a.subject.value).toStrictEqual([]);

    await new Promise((res) => setTimeout(res, 200));

    expect(a.subject.value).toStrictEqual([{ val: 1 }, { val: 2 }, { val: 3 }]);
  });
});
