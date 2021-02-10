# Ximple

A simple, lightweight (100 lines) library for events, inspired by Rxjs, aimed to be (at least partially) compatible with Rxjs interfaces.

Currently the following features are supported:

- Subject
- BehaviorSubject
- pipe (and currently only the filter operator)

Subjects implement the IObservable interface. The pipe operator returns an IObservable.
