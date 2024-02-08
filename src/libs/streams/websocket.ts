import { Opaque, Writable } from "@hazae41/binary"
import { SuperReadableStream, SuperWritableStream } from "@hazae41/cascade"

async function closeOrThrow(websocket: WebSocket) {
  if (websocket.readyState !== WebSocket.OPEN)
    return

  await new Promise<void>((ok, err) => {
    const onClose = (e: CloseEvent) => {
      if (e.wasClean)
        ok()
      else
        err(e)
    }

    websocket.addEventListener("close", onClose, { passive: true, once: true })
    websocket.close()
  })
}

export type WebSocketStreamParams =
  & WebSocketSourceParams
  & WebSocketSinkParams

export class WebSocketStream {
  readonly reader: SuperReadableStream<Opaque>
  readonly writer: SuperWritableStream<Writable>

  readonly outer: ReadableWritablePair<Opaque, Writable>

  /**
   * A WebSocket stream
   * @description https://streams.spec.whatwg.org/#example-both
   */
  private constructor(
    readonly socket: WebSocket,
    readonly params: WebSocketStreamParams = {}
  ) {
    this.reader = new SuperReadableStream(new WebSocketSource(socket, params))
    this.writer = new SuperWritableStream(new WebSocketSink(socket, params))

    this.outer = {
      readable: this.reader.start(),
      writable: this.writer.start()
    }
  }

  static fromOrThrow(socket: WebSocket, params?: WebSocketStreamParams) {
    if (socket.readyState !== WebSocket.OPEN)
      throw new Error(`WebSocket is not open`)
    if (socket.binaryType !== "arraybuffer")
      throw new Error(`WebSocket binaryType is not arraybuffer`)

    return new WebSocketStream(socket, params)
  }

}

export interface WebSocketSourceParams {
  /**
   * Whether the socket should be closed when the stream is cancelled
   * @description You don't want to reuse the socket
   */
  readonly shouldCloseOnCancel?: boolean
}

export class WebSocketSource implements UnderlyingDefaultSource<Opaque> {

  constructor(
    readonly websocket: WebSocket,
    readonly params: WebSocketSourceParams = {}
  ) { }

  #onMessage?: (e: MessageEvent<ArrayBuffer>) => void
  #onClose?: (e: CloseEvent) => void
  #onError?: (e: Event) => void

  #onClean() {
    this.websocket.removeEventListener("message", this.#onMessage!)
    this.websocket.removeEventListener("close", this.#onClose!)
    this.websocket.removeEventListener("error", this.#onError!)
  }

  async start(controller: ReadableStreamDefaultController<Opaque>) {

    this.#onMessage = (msgEvent: MessageEvent<ArrayBuffer>) => {
      const bytes = new Uint8Array(msgEvent.data)
      // console.debug("ws <-", bytes, Bytes.toUtf8(bytes))

      try {
        controller.enqueue(new Opaque(bytes))
      } catch (e: unknown) { }
    }

    this.#onError = (event: Event) => {
      const error = new Error(`Errored`, { cause: event })

      try {
        controller.error(error)
      } catch (e: unknown) { }

      this.#onClean()
    }

    this.#onClose = (event: CloseEvent) => {
      try {
        controller.close()
      } catch (e: unknown) { }

      this.#onClean()
    }

    this.websocket.addEventListener("message", this.#onMessage, { passive: true })

    this.websocket.addEventListener("error", this.#onError, { passive: true, once: true })
    this.websocket.addEventListener("close", this.#onClose, { passive: true, once: true })
  }

  async cancel() {
    if (this.params.shouldCloseOnCancel)
      await closeOrThrow(this.websocket)

    this.#onClean()
  }

}

export interface WebSocketSinkParams {
  /**
   * Whether the socket should be closed when the stream is closed
   * @description You don't want to reuse the socket
   * @description You're not using request-response
   */
  readonly shouldCloseOnClose?: boolean

  /**
   * Whether the socket should be closed when the stream is aborted
   * @description You don't want to reuse the socket
   */
  readonly shouldCloseOnAbort?: boolean
}

export class WebSocketSink implements UnderlyingSink<Writable> {

  constructor(
    readonly websocket: WebSocket,
    readonly params: WebSocketSinkParams = {}
  ) { }

  #onClose?: (e: CloseEvent) => void
  #onError?: (e: Event) => void

  #onClean() {
    this.websocket.removeEventListener("close", this.#onClose!)
    this.websocket.removeEventListener("error", this.#onError!)
  }

  async start(controller: WritableStreamDefaultController) {

    this.#onClose = (closeEvent: CloseEvent) => {
      const error = new Error(`Closed`, { cause: closeEvent })

      try {
        controller.error(error)
      } catch (e: unknown) { }

      this.#onClean()
    }

    this.#onError = (event: Event) => {
      const error = new Error(`Errored`, { cause: event })

      try {
        controller.error(error)
      } catch (e: unknown) { }

      this.#onClean()
    }

    this.websocket.addEventListener("error", this.#onError, { passive: true, once: true })
    this.websocket.addEventListener("close", this.#onClose, { passive: true, once: true })
  }

  async write(chunk: Writable) {
    const bytes = Writable.writeToBytesOrThrow(chunk)
    // console.debug("ws ->", bytes, Bytes.toUtf8(bytes))
    this.websocket.send(bytes)
  }

  async abort(reason?: unknown) {
    if (this.params.shouldCloseOnAbort)
      await closeOrThrow(this.websocket)

    this.#onClean()
  }

  async close() {
    if (this.params.shouldCloseOnClose)
      await closeOrThrow(this.websocket)

    this.#onClean()
  }

}