import { atom } from "../dist/atoms.js";
import { expect, describe, it } from "vitest";

describe("Atom basics", () => {
  it("should be possible to update state", async () => {
    const a = atom({ initialValue: 0 });
    expect(a.subject.value).toBe(0);
    await a.update(1);
    expect(a.subject.value).toBe(1);
  });

  it("should be possible to update state with an update function", async () => {
    const a = atom({ initialValue: 0, update: (a, b) => a + b });
    expect(a.subject.value).toBe(0);
    await a.update(1);
    expect(a.subject.value).toBe(1);
    await a.update(2);
    expect(a.subject.value).toBe(3);
  });
});

describe("Atom concurrency", () => {
  it("should be possible to update atom with concurrency 'throttle'", async () => {
    const a = atom({
      initialValue: 0,
      concurrency: "throttle",
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
      concurrency: "throttle",
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
      concurrency: "debounce",
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
      concurrency: "debounce",
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
      concurrency: "queue",
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

  it("should respect queue order even if the last promises resolves first", async () => {
    const a = atom({
      initialValue: [] as number[],
      concurrency: "queue",
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

  it("should respect throttle concurrency even if the last promises resolves first", async () => {
    const a = atom({
      initialValue: [] as number[],
      concurrency: "throttle",
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

  it("should respect debounce concurrency even if the last promises resolves first", async () => {
    const a = atom({
      initialValue: [] as number[],
      concurrency: "debounce",
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

describe("Async transformOnDeserialize", () => {
  it("Should handle null / undefined values for potential promises", async () => {
    const localStorageMap = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => localStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => localStorageMap.set(key, value),
      length: 0,
      clear: () => localStorageMap.clear(),
      key: () => "",
      removeItem: (key: string) => localStorageMap.delete(key),
    };
    const a = atom({
      initialValue: null as null | { val: number }[],
      persistKey: "test",
      appVersion: "1.0.0",
      transformOnDeserialize: (value) => value,
      transformOnSerialize: (value) => value,
    });

    await new Promise((res) => setTimeout(res, 100));
    expect(a.subject.value).toStrictEqual(null);
    await a.update([{ val: 2 }]);
    expect(a.subject.value).toStrictEqual([{ val: 2 }]);
    await a.update(null);
    expect(a.subject.value).toBe(null);
  });

  it("Initial value should be persisted to local storage immediately", async () => {
    const localStorageMap = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => localStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => localStorageMap.set(key, value),
      length: 0,
      clear: () => localStorageMap.clear(),
      key: () => "",
      removeItem: (key: string) => localStorageMap.delete(key),
    };
    const a = atom({
      initialValue: [{ val: 1 }] as { val: number }[],
      persistKey: "test",
      appVersion: "1.0.0",
    });

    await new Promise((res) => setTimeout(res, 100));

    expect(JSON.parse(localStorageMap.get("test") ?? "").data).toEqual([
      { val: 1 },
    ]);
  });

  it("Should be possible to run synchronous version of transformOnDeserialize", async () => {
    const localStorageMap = new Map<string, string>();
    localStorageMap.set(
      "test",
      JSON.stringify({
        data: [{ val: 1 }, { val: 2 }, { val: 3 }],
        version: "1.0.0",
      }),
    );
    globalThis.localStorage = {
      getItem: (key: string) => localStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => localStorageMap.set(key, value),
      length: 0,
      clear: () => localStorageMap.clear(),
      key: () => "",
      removeItem: (key: string) => localStorageMap.delete(key),
    };
    const a = atom({
      initialValue: [] as { val: number }[],
      persistKey: "test",
      appVersion: "1.0.0",
      transformOnDeserialize: (value) =>
        value.map((v: { val: number }) => ({ val: v.val + 1 })),
    });

    expect(a.subject.value).toStrictEqual([{ val: 2 }, { val: 3 }, { val: 4 }]);
  });

  it("should be possible to run ascynchronous version of transformOnDeserialize", async () => {
    const localStorageMap = new Map<string, string>();
    localStorageMap.set(
      "test",
      JSON.stringify({
        data: [{ val: 1 }, { val: 2 }, { val: 3 }],
        version: "1.0.0",
      }),
    );
    globalThis.localStorage = {
      getItem: (key: string) => localStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => localStorageMap.set(key, value),
      length: 0,
      clear: () => localStorageMap.clear(),
      key: () => "",
      removeItem: (key: string) => localStorageMap.delete(key),
    };

    const a = atom({
      initialValue: [] as { val: number }[],
      persistKey: "test",
      appVersion: "1.0.0",
      transformOnDeserialize: async (value) => {
        await new Promise((res) => setTimeout(res, 100));
        return value;
      },
    });

    expect(a.subject.value).toStrictEqual([]);

    await new Promise((res) => setTimeout(res, 200));

    expect(a.subject.value).toStrictEqual([{ val: 1 }, { val: 2 }, { val: 3 }]);
  });

  it("Should handle localStorage initialization and updates correctly", async () => {
    const localStorageMap = new Map<string, string>();
    // Set initial stored value
    localStorageMap.set(
      "test",
      JSON.stringify({
        data: [{ val: 1 }],
        version: "1.0.0",
      }),
    );

    let setItemCalls: string[] = [];
    globalThis.localStorage = {
      getItem: (key: string) => localStorageMap.get(key) ?? null,
      setItem: (key: string, value: string) => {
        setItemCalls.push(value);
        localStorageMap.set(key, value);
      },
      length: 0,
      clear: () => localStorageMap.clear(),
      key: () => "",
      removeItem: (key: string) => localStorageMap.delete(key),
    };

    const a = atom({
      initialValue: [{ val: 100 }] as { val: number }[], // Different from stored value
      persistKey: "test",
      appVersion: "1.0.0",
      transformOnDeserialize: async (value) => {
        await new Promise((res) => setTimeout(res, 100));
        return value.map((v: { val: number }) => ({ val: 2 }));
      },
    });

    // Should not have saved initialValue to localStorage
    expect(setItemCalls.length).toBe(0);

    // Initial value should be used until deserialization completes
    expect(a.subject.value).toEqual([{ val: 100 }]);

    // Update while deserializing is still in progress. This should be queued and be stored after deserialization
    await a.update([{ val: 3 }]);

    // Should not have saved to localStorage yet (still deserializing)
    expect(setItemCalls.length).toBe(0);

    // Wait for deserialization to complete
    await new Promise((res) => setTimeout(res, 400));

    // Now the update should be saved (first localStorage write)
    expect(setItemCalls.length).toBe(1);
    expect(JSON.parse(setItemCalls[0])).toEqual({
      data: [{ val: 3 }],
      version: "1.0.0",
    });

    // New updates should save immediately
    await a.update([{ val: 4 }]);
    expect(setItemCalls.length).toBe(2);
    expect(JSON.parse(setItemCalls[1])).toEqual({
      data: [{ val: 4 }],
      version: "1.0.0",
    });
  });
});
