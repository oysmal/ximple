export interface ISubscriber<T> {
  id: number;
  notify: (event: T) => void;
}

export interface IProcessEvent<T> {
  value: T;
  stopPropagation?: boolean;
}

export interface IObservable<T> {
  subscribe(notify: (event: T) => void): () => void;
  pipe<S>(
    processFn: (newValue: T, oldValue: T | undefined) => IProcessEvent<S>
  ): IObservable<S>;
}

type SubjectConfig<T> = Partial<{
  equalityCompareFn: (newValue: T, oldValue?: T) => boolean;
}>;

export class Subject<T> implements IObservable<T> {
  protected static idgen = 0;
  protected readonly subscribers: ISubscriber<T>[];
  public _unsubscribeFromParent?: () => void = undefined;
  protected _previousValue: T | undefined = undefined;
  protected equalityCompareFn: (newValue: T, oldValue?: T) => boolean = (
    newValue,
    oldValue
  ) => newValue === oldValue;

  constructor(config?: SubjectConfig<T>) {
    this.subscribers = [];
    if (config?.equalityCompareFn) {
      this.equalityCompareFn = config.equalityCompareFn;
    }
  }

  protected _next(value: T) {
    if (!this.equalityCompareFn(value, this._previousValue)) {
      this.subscribers.forEach((s) => s.notify(value));
    }
    this._previousValue = value;
  }

  public next = (value: T) => {
    this._next(value);
  };

  protected _subscribe(notify: (event: T) => void) {
    const sub: ISubscriber<T> = {
      id: Subject.idgen++,
      notify,
    };
    this.subscribers.push(sub);
    return () => this.unsubscribe(sub);
  }

  public subscribe = (notify: (event: T) => void) => {
    return this._subscribe(notify);
  };

  public pipe = <S>(
    processFn: (newValue: T, oldValue: T | undefined) => IProcessEvent<S>
  ): IObservable<S> => {
    const subj = new Subject<S>();

    subj._unsubscribeFromParent = this.subscribe((event) => {
      const processedEvent = processFn(event, this._previousValue);
      if (processedEvent.stopPropagation) {
        return;
      } else {
        subj.next(processedEvent.value);
      }
    });

    return subj;
  };

  protected unsubscribe(sub: ISubscriber<T>) {
    const index = this.subscribers.indexOf(sub);
    if (index > 0) {
      this.subscribers.splice(index, 1);
    }
  }
}

export class BehaviorSubject<T> extends Subject<T> {
  private _value: T;

  constructor(
    initialValue: T,
    config?: Omit<SubjectConfig<T>, "previousValue">
  ) {
    super(config);
    this._value = initialValue;
    this._previousValue = initialValue;
  }

  public get value() {
    return this._value;
  }

  public override next = (value: T) => {
    this._value = value;
    this._next(value);
  };

  public override subscribe = (notify: (event: T) => void) => {
    notify(this._value);
    return this._subscribe(notify);
  };

  public override pipe = <S>(
    processFn: (newValue: T, oldValue: T | undefined) => IProcessEvent<S>
  ): IObservable<S> => {
    const defaultValue = processFn(this._value, undefined);
    const subj = defaultValue.stopPropagation
      ? new Subject<S>()
      : new BehaviorSubject<S>(defaultValue.value);

    subj._unsubscribeFromParent = this.subscribe((event) => {
      const processedEvent = processFn(event, this._previousValue);
      if (processedEvent.stopPropagation) {
        return;
      } else {
        subj.next(processedEvent.value);
      }
    });

    return subj;
  };
}

export function filter<T, S extends T>(
  predicate: (value: T) => value is S
): (value: T) => IProcessEvent<S> {
  return (value: T) => ({
    value: value as S,
    stopPropagation: !predicate(value),
  });
}

/**
 * Skips emitted values from source until provided expression is false.
 *
 * @param {booleanPredicateFn} predicate The predicate expression used for skipping emitted values.
 */
export function skipWhile<T>(
  predicate: (newValue: T, oldValue: T | undefined) => boolean
): (newValue: T, oldValue?: T) => IProcessEvent<T> {
  return (newValue: T, oldValue?: T) => ({
    value: newValue,
    stopPropagation: predicate(newValue, oldValue),
  });
}
