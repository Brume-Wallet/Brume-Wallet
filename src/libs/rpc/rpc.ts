import { Bytes } from "@hazae41/bytes"
import { Circuit, CircuitOpenParams } from "@hazae41/echalote"
import { fetch } from "@hazae41/fleche"
import { Future } from "@hazae41/future"
import { Guard } from "@hazae41/gardien"
import { RpcRequest, RpcRequestInit, RpcResponse, RpcResponseInit } from "@hazae41/jsonrpc"
import { RpcResponseGuard } from "../jsonrpc"
import { Circuits } from "../tor/circuits/circuits"

export namespace TorRpc {

  export async function fetchWithCircuitOrThrow<T>(input: RequestInfo | URL, init: RequestInit & RpcRequestInit<unknown> & { circuit: Circuit } & CircuitOpenParams) {
    const { id, method, params, circuit, ...rest } = init

    const request = new RpcRequest(id, method, params)
    const body = Bytes.fromUtf8(JSON.stringify(request))

    const headers = new Headers(rest.headers)
    headers.set("Content-Type", "application/json")
    headers.set("Content-Length", `${body.length}`)

    using stream = await Circuits.openAsOrThrow(circuit, input)

    const res = await fetch(input, { ...rest, method: "POST", headers, body, stream: stream.inner })

    if (!res.ok)
      throw new Error(await res.text())

    const json = await res.json()
    const response = RpcResponse.from<T>(json)

    if (response.id !== request.id)
      console.warn(`Invalid response ID`, response.id, "expected", request.id)

    return response
  }

  export async function fetchWithSocketOrThrow<T>(socket: WebSocket, request: RpcRequestInit<unknown>, signal: AbortSignal) {
    const { id, method, params = [] } = request
    const future = new Future<RpcResponse<T>>()

    const onMessage = async (event: MessageEvent<unknown>) => {
      if (typeof event.data !== "string")
        return

      const guarded = Guard.asOrNull(RpcResponseGuard, JSON.parse(event.data) as unknown)

      if (guarded == null)
        return

      const response = RpcResponse.from<T>(guarded as RpcResponseInit<T>)

      if (response.id !== request.id)
        return
      future.resolve(response)
    }

    const onError = (cause: unknown) => future.reject(new Error("Errored", { cause }))
    const onClose = (cause: unknown) => future.reject(new Error("Closed", { cause }))
    const onAbort = () => future.reject(new Error("Aborted", { cause: signal.reason }))

    try {
      socket.addEventListener("message", onMessage, { passive: true })
      socket.addEventListener("close", onClose, { passive: true })
      socket.addEventListener("error", onError, { passive: true })
      signal.addEventListener("abort", onAbort, { passive: true })

      socket.send(JSON.stringify(new RpcRequest(id, method, params)))

      return await future.promise
    } finally {
      socket.removeEventListener("message", onMessage)
      socket.removeEventListener("close", onClose)
      socket.removeEventListener("error", onError)
      signal.removeEventListener("abort", onAbort)
    }
  }

}