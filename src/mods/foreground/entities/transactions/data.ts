import { Errors } from "@/libs/errors/errors"
import { useWait } from "@/libs/glacier/hooks"
import { BgTransaction, BgTransactionReceipt, BgTransactionTrial, TransactionRef } from "@/mods/background/service_worker/entities/transactions/data"
import { ZeroHexString } from "@hazae41/cubane"
import { Data, States, createQuery, useError, useQuery } from "@hazae41/glacier"
import { RpcRequestPreinit } from "@hazae41/jsonrpc"
import { None, Nullable, Some } from "@hazae41/option"
import { useSubscribe } from "../../storage/storage"
import { UserStorage, useUserStorageContext } from "../../storage/user"
import { FgEthereumContext, fetchOrFail2 } from "../wallets/data"

export namespace FgTransaction {

  export type Key = BgTransaction.Key
  export type Data = BgTransaction.Data
  export type Fail = BgTransaction.Fail

  export const key = BgTransaction.key

  export function schema(uuid: Nullable<string>, storage: UserStorage) {
    if (uuid == null)
      return

    const indexer = async (states: States<Data, Fail>) => {
      const { current, previous } = states

      const previousData = previous?.real?.data?.get()
      const currentData = current.real?.data?.get()

      /**
       * Reindex transactions
       */
      if (previousData?.uuid !== currentData?.uuid) {
        if (previousData != null) {
          await FgTransactionTrial.schema(previousData.trial.uuid, storage)?.mutate(s => {
            const current = s.real?.current

            if (current == null)
              return new None()
            if (current.isErr())
              return new None()

            return new Some(current.mapSync(d => ({ ...d, transactions: d.transactions.filter(t => t.uuid !== uuid) })))
          })
        }

        if (currentData != null) {
          await FgTransactionTrial.schema(currentData.trial.uuid, storage)?.mutate(s => {
            const current = s.real?.current

            /**
             * Create a new trial
             */
            if (current == null) {
              const uuid = currentData.trial.uuid
              const nonce = currentData.params.nonce
              const transactions = [TransactionRef.from(currentData)]

              const inner = { type: "draft", uuid, nonce, transactions } as const

              return new Some(new Data(inner))
            }

            if (current.isErr())
              return new None()

            return new Some(current.mapSync(d => ({ ...d, transactions: [...d.transactions, TransactionRef.from(currentData)] })))
          })
        }
      }

      if (currentData?.type === "executed") {
        await FgTransactionTrial.schema(currentData.trial.uuid, storage)?.mutate(s => {
          const current = s.real?.current

          if (current == null)
            return new None()
          if (current.isErr())
            return new None()

          return new Some(current.mapSync(d => ({ ...d, transaction: TransactionRef.from(currentData) })))
        })
      }
    }

    return createQuery<Key, Data, Fail>({
      key: key(uuid),
      storage,
      indexer
    })
  }

}

export function useTransactionWithReceipt(uuid: Nullable<string>, context: Nullable<FgEthereumContext>) {
  const storage = useUserStorageContext().unwrap()

  const transactionQuery = useQuery(FgTransaction.schema, [uuid, storage])
  const maybeTransaction = transactionQuery.current?.ok().get()
  useSubscribe(transactionQuery, storage)

  const receiptQuery = useQuery(FgTransactionReceipt.schema, [uuid, maybeTransaction?.hash, context, storage])
  useWait(receiptQuery, 1000)
  useSubscribe(receiptQuery, storage)
  useError(receiptQuery, Errors.onQueryError)

  return transactionQuery
}

export namespace FgTransactionTrial {

  export type Key = BgTransactionTrial.Key
  export type Data = BgTransactionTrial.Data
  export type Fail = BgTransactionTrial.Fail

  export const key = BgTransactionTrial.key

  export function schema(uuid: Nullable<string>, storage: UserStorage) {
    if (uuid == null)
      return

    return createQuery<Key, Data, Fail>({
      key: key(uuid),
      storage
    })
  }

}

export function useTransactionTrial(uuid: Nullable<string>) {
  const storage = useUserStorageContext().unwrap()
  const query = useQuery(FgTransactionTrial.schema, [uuid, storage])
  useSubscribe(query, storage)
  return query
}

export namespace FgTransactionReceipt {

  export type Key = BgTransactionReceipt.Key
  export type Data = BgTransactionReceipt.Data
  export type Fail = BgTransactionReceipt.Fail

  export const key = BgTransactionReceipt.key

  export function schema(uuid: Nullable<string>, hash: Nullable<ZeroHexString>, context: Nullable<FgEthereumContext>, storage: UserStorage) {
    if (context == null)
      return
    if (hash == null)
      return

    const fetcher = async (request: RpcRequestPreinit<unknown>) =>
      await fetchOrFail2<Data>(request, context)

    const indexer = async (states: States<Data, Fail>) => {
      const { current, previous } = states

      const previousData = previous?.real?.current.ok()?.get()
      const currentData = current.real?.current.ok()?.get()

      if (previousData == null && currentData != null) {
        await FgTransaction.schema(uuid, storage)?.mutate(s => {
          const current = s.real?.current

          if (current == null)
            return new None()
          if (current.isErr())
            return new None()

          return new Some(current.mapSync(d => ({ ...d, type: "executed", receipt: currentData }) as const))
        })
      }
    }

    return createQuery<Key, Data, Fail>({
      key: key(hash, context.chain),
      fetcher,
      indexer,
      storage
    })
  }

}