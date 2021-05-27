# Ximple

A simple, lightweight (100 lines) library for events, aimed to be compatible with a subset of Rxjs interfaces.

This library can be useful if you wish to create an event-driven architecture for your application, but need to limit your bundle size.

The selected subset of features currently supported has been carefully selected to maximize utility while limiting size. However, this selection is only based on my personal experience of working with RxJS, so you might find something you consider essential to be missing. If you do, please do not hesitate to submit a PR or open an issue!

## Currently supported data types from RxJS:

### Subject

IObservable supporting multiple subscribers.

Subscribe using the `subscribe` method. This method requires a callback function to be provided as a parameter. The `subscribe` method returns a function which, when called, will unsubscribe from the subject.

Notify subscribers of events by calling the `next` method. This method accepts an event object as an argument, which will be received by the subscribers' callback function.

Example usage:

```ts
const subject = new Subject<number>();

const unsubscribe = subject.subscribe((event: number) =>
  console.log(`Received number ${event}`)
);

setTimeout(() => subject.next(1), 100);
setTimeout(() => subject.next(2), 200);
setTimeout(() => subject.next(3), 300);

setTimeout(unsubscribe, 400);

/*
Output:

Received number 1
Received number 2
Received number 3

*/
```

### BehaviorSubject

Extends Subject and provides the following additional features:

- The latest event value is stored in the subject.
- New subscribers will, upon subscribing, be notified with the current stored event value.
- The stored event value is accessible via `subject.value`.

Example usage:

```ts
const subject = new BehaviorSubject<number>(0);

const unsubscribe = subject.subscribe((event: number) =>
  console.log(`Received number ${event}`)
);

setTimeout(() => subject.next(1), 100);
setTimeout(() => subject.next(2), 200);
setTimeout(() => subject.next(3), 300);

setTimeout(() => {
  console.log(`Current value ${subject.value}`);
  unsubscribe();
}, 400);

/*
Output:

Received number 0
Received number 1
Received number 2
Received number 3
Current value 3

*/
```

## Additional supported RxJS functions / operators:

### The pipe function

The `pipe` function allows you to apply operators to subjects / streams. The `pipe` function will not modify the existing subject, but rather it returns a new IObservable with the operators applied. This function is supported on all data types implementing the `IObservable` interface.

Supplying an operator as a parameter to the pipe function allows for e.g. filtering the events you subscribe to, or piping certain events into another subject / stream. The only operator currently supported is `filter`. In contrast to RxJS, Ximple currently only supports a single operator as a parameter to `pipe`. You can, however, chain `pipe` functions to achieve the same result.

See "The filter operator" for example usage.

#### The filter operator

Filters events and will only continue propagation if the event matches the predicate function passed as a parameter to the `filter` function.

Example usage:

```ts
type Event = { type: "keyboard" | "mouse" };
type KeyboardEvent = { type: "keyboard"; key: number };
type MouseEvent = {
  type: "mouse";
  x: number;
  y: number;
  button: "left" | "right";
};

const isKeyboardEvent = (obj: Event): obj is KeyboardEvent =>
  obj.type === "keyboard";
const isMouseEvent = (obj: Event): obj is MouseEvent => obj.type === "mouse";

const subject = new Subject<Event>();

const keyboardEventSubject = new Subject<KeyboardEvent>();
subject.pipe(filter(isKeyboardEvent)).subscribe(keyboardEventSubject.next);
keyboardEventSubject.subscribe((event) => console.log(`Key is ${event.key}`));

subject
  .pipe(filter(isMouseEvent))
  .subscribe((mouseEvent) =>
    console.log(`Mouse position is: (${mouseEvent.x}, ${mouseEvent.y})`)
  );

const event1: KeyboardEvent = { type: "keyboard", key: "Enter" };
const event2: MouseEvent = { type: "mouse", x: 200, y: 100, button: "left" };

subject.next(event1);
subject.next(event2);

/*
Output:

Key is Enter
Mouse position is: (200, 100)

*/
```
