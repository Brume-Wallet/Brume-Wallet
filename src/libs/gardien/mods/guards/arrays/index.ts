import { Guard } from "../../guard"
import { Super } from "../../super"

export class ArrayGuard {

  constructor() { }

  static asOrThrow<X extends unknown[]>(value: X): X

  static asOrThrow<X>(value: Super<X, unknown[]>): unknown[];

  static asOrThrow(value: unknown): unknown[] {
    if (!Array.isArray(value))
      throw new Error()
    return value
  }

  asOrThrow<X extends unknown[]>(value: X): X

  asOrThrow<X>(value: Super<X, unknown[]>): unknown[]

  asOrThrow(value: unknown): unknown[] {
    if (!Array.isArray(value))
      throw new Error()
    return value
  }

}

export class ElementsGuard<T extends Guard<any, any>> {

  constructor(
    readonly subguard: T
  ) { }

  asOrThrow(value: Guard.Input<T>[]): Guard.Output<T>[] {
    if (!value.every(x => this.subguard.asOrThrow(x)))
      throw new Error()
    return value as Guard.Output<T>[]
  }

}

export class ArrayAndElementsGuard<T extends Guard<any, any>> {

  constructor(
    readonly subguard: T
  ) { }

  asOrThrow<X>(value: Coerced<X, unknown, Guard.Output<T>[]>): X & Guard.Output<T>[] {
    if (!Array.isArray(value))
      throw new Error()
    if (!value.every(x => this.subguard.asOrThrow(x)))
      throw new Error()
    return value as X & Guard.Output<T>[]
  }

}

export class TupleGuard<T extends readonly Guard<unknown, unknown>[]> {

  constructor(
    readonly subguards: T
  ) { }

  asOrThrow(value: { [K in keyof T]: Guard.Input<T[K]> }): { [K in keyof T]: Guard.Input<T[K]> } & { [K in keyof T]: Guard.Output<T[K]> } {
    if (value.length !== this.subguards.length)
      throw new Error()
    if (!value.every((x, i) => this.subguards[i].asOrThrow(x)))
      throw new Error()
    return value as { [K in keyof T]: Guard.Input<T[K]> } & { [K in keyof T]: Guard.Output<T[K]> }
  }

}