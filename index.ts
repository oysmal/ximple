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
    pipe<S>(processFn: (value: any) => IProcessEvent<S>): IObservable<S>;
}

export class Subject<T> implements IObservable<T>{
    protected static idgen = 0;
    protected readonly subscribers: ISubscriber<T>[];
    public _unsubscribeFromParent?: () => void = undefined;

    constructor() {
        this.subscribers = [];
    }

    protected _next(value: T) {
        this.subscribers.forEach((s) => s.notify(value));
    }

    public next = (value: T) => {
        this._next(value);
    }

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
    }

    public pipe = <S>(processFn: (value: any) => IProcessEvent<S>): IObservable<S> => {
        const subj = new Subject<S>();

        subj._unsubscribeFromParent = this.subscribe((event) => {
            const processedEvent = processFn(event);
            if (processedEvent.stopPropagation) {
                return;
            } else {
                subj.next(processedEvent.value);
            }
        });

        return subj;
    }

    protected unsubscribe(sub: ISubscriber<T>) {
        const index = this.subscribers.indexOf(sub);
        if (index > 0) {
            this.subscribers.splice(index, 1);
        }
    }
}

export class BehaviorSubject<T> extends Subject<T> {
    private _value: T;

    constructor(initialValue: T) {
        super();
        this._value = initialValue;
    }

    public get value() {
        return this._value;
    }

    public next = (value: T) => {
        this._value = value;
        this._next(value);
    }

    public subscribe = (notify: (event: T) => void) => {
        notify(this._value);
        return this._subscribe(notify);
    }
}

export function filter<T, S extends T>(
    predicate: (value: T) => value is S,
): (value: T) => IProcessEvent<S> {
    return (value: T) => ({
        value: value as S,
        stopPropagation: !predicate(value),
    });
}
