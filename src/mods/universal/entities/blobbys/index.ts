import { createQuery, QueryStorage } from "@hazae41/glacier"
import { Nullable } from "@hazae41/option"

export type Blobby =
  | BlobbyData
  | BlobbyRef

export interface BlobbyRef {
  readonly ref: true
  readonly id: string
}

export namespace BlobbyRef {

  export function create(id: string): BlobbyRef {
    return { ref: true, id }
  }

  export function from(blobby: Blobby): BlobbyRef {
    return create(blobby.id)
  }

}

export interface BlobbyData {
  readonly id: string,
  readonly data: string
}

export namespace BlobbyQuery {

  export type K = string
  export type D = BlobbyData
  export type F = never

  export function key(id: string) {
    return `blobby/${id}`
  }

  export function route(cacheKey: string, storage: QueryStorage) {
    if (!cacheKey.startsWith("blobby/"))
      return
    const [id] = cacheKey.split("/").slice(1)

    return create(id, storage)
  }

  export function create(id: Nullable<string>, storage: QueryStorage) {
    if (id == null)
      return
    return createQuery<K, D, F>({ key: key(id), storage })
  }

}