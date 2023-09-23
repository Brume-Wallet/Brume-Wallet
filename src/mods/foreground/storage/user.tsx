import { ChildrenProps } from "@/libs/react/props/children";
import { RpcRequestPreinit } from "@/libs/rpc";
import { Core, RawState, Storage, useCore } from "@hazae41/glacier";
import { Mutex } from "@hazae41/mutex";
import { None, Option, Optional, Some } from "@hazae41/option";
import { Ok, Result } from "@hazae41/result";
import { createContext, useContext, useMemo } from "react";
import { Background } from "../background/background";
import { useBackground } from "../background/context";

export const UserStorageContext =
  createContext<Optional<UserStorage>>(undefined)

export function useUserStorage() {
  return Option.wrap(useContext(UserStorageContext))
}

export function UserStorageProvider(props: ChildrenProps) {
  const { children } = props
  const core = useCore().unwrap()
  const background = useBackground().unwrap()

  const storage = useMemo(() => {
    return new UserStorage(core, background)
  }, [core, background])

  return <UserStorageContext.Provider value={storage}>
    {children}
  </UserStorageContext.Provider>
}

export class UserStorage implements Storage {
  readonly async: true = true

  readonly keys = new Mutex(new Set<string>())

  constructor(
    readonly core: Core,
    readonly background: Background
  ) {
    background.ports.events.on("created", e => {
      if (e.result.isErr())
        return new None()
      for (const key of this.keys.inner)
        this.#trySubscribe(key)
      return new None()
    })
  }

  async get(cacheKey: string) {
    return await this.tryGet(cacheKey).then(r => r.unwrap().unwrap())
  }

  async tryGet(cacheKey: string) {
    return await this.background.tryRequest<RawState>({ method: "brume_get_user", params: [cacheKey] })
  }

  async #trySubscribe(cacheKey: string): Promise<Result<void, Error>> {
    return await Result.unthrow(async t => {
      await this.background
        .tryRequest<void>({ method: "brume_subscribe", params: [cacheKey] })
        .then(r => r.throw(t).throw(t))

      this.background.events.on("request", async (request) => {
        if (request.method !== "brume_update")
          return new None()

        const [cacheKey2, stored] = (request as RpcRequestPreinit<[string, Optional<RawState>]>).params

        if (cacheKey2 !== cacheKey)
          return new None()

        const unstored = await this.core.unstore(stored, { key: cacheKey })
        this.core.update(cacheKey, () => unstored, { key: cacheKey })

        return new Some(Ok.void())
      })

      const stored = await this.tryGet(cacheKey).then(r => r.throw(t).throw(t))

      const unstored = await this.core.unstore(stored, { key: cacheKey })
      this.core.update(cacheKey, () => unstored, { key: cacheKey })

      return Ok.void()
    })
  }

  async trySubscribe(cacheKey: string): Promise<Result<void, Error>> {
    return await Result.unthrow(async t => {
      return this.keys.lock(async (keys) => {
        if (keys.has(cacheKey))
          return Ok.void()

        await this.#trySubscribe(cacheKey).then(r => r.throw(t))
        keys.add(cacheKey)

        return Ok.void()
      })
    })
  }

}