import { Circuit, Tor } from "@hazae41/echalote";
import fallbacks from "assets/fallbacks.json";
import { createContext, useContext, useEffect, useState } from "react";
import { randomOf } from "utils/array";
import { ChildrenProps } from "utils/react/props";
import { useTor } from "../tor/context";

export const CircuitContext =
  createContext<Circuit | undefined>(undefined)

export function useCircuit() {
  return useContext(CircuitContext)!
}

// const middles = [
//   "D89267FB10BF625D31FF7687AF7D12B03BBF757C",
//   "23BAB4A9B1B7F553599CD81AED553FACB7B35210",
//   "FD449127D30D8F5D124653D9EF736EDF4A12B4DC",
//   "D3A1B7DEF370CBC6055F3FC540A518C8576D7570",
// ]

// const exits = [
//   "4211FE6AA3991CFD9CD1CC897BD09C2CF73CF1F7",
//   "C8D207FE01D241F9AC86F2A2851CDC2E6998E51C",
//   "BC06A4AE847DDC23FD63082E388BB30924DAB4B6"
// ]

const middles = [
  "D89267FB10BF625D31FF7687AF7D12B03BBF757C",
  "23BAB4A9B1B7F553599CD81AED553FACB7B35210",
  "FD449127D30D8F5D124653D9EF736EDF4A12B4DC",
  "D3A1B7DEF370CBC6055F3FC540A518C8576D7570",
  "51374C8DA459C67329FFD5C7502CCAE4194910CC",
  "31832D42A1B47E90970704FE6D7210D25FA1E5E3",
  "8F9CD937D0177BE8AC9E27D18604F93216DFA6A9",
]

const exits = [
  "4211FE6AA3991CFD9CD1CC897BD09C2CF73CF1F7",
  "C8D207FE01D241F9AC86F2A2851CDC2E6998E51C",
  "4C3EF4B0C172F0C12891566E276F16D7DC07D049",
  "B2197C23A4FF5D1C49EE45BA7688BA8BCCD89A0B",
  "630F75D5AD741889C1BC46DC354A6320152A7B32",
]

async function extendMiddle(circuit: Circuit) {
  while (true)
    try {
      const middleid = randomOf(middles)!
      const middle = fallbacks.find(it => it.id === middleid)!

      // const middle = randomOf(fallbacks)!

      console.log("middle", middle.id)
      await circuit._extend(middle)

      break
    } catch (e: unknown) {
      console.warn(e)
    }
}

async function extendExit(circuit: Circuit) {
  while (true)
    try {
      const exitid = randomOf(exits)!
      const exit = fallbacks.find(it => it.id === exitid)!

      // const exit = randomOf(fallbacks.filter(it => it.exit))!

      console.log("exit", exit.id)
      await circuit._extend(exit)

      break
    } catch (e: unknown) {
      console.warn(e)
    }
}

async function createCircuit(tor: Tor) {
  if (!tor) return

  const circuit = await tor.create()
  await extendMiddle(circuit)
  await extendExit(circuit)
  return circuit
}

export function CircuitProvider(props: ChildrenProps) {
  const { children } = props

  const tor = useTor()

  const [circuit, setCircuit] = useState<Circuit>()

  useEffect(() => {
    if (tor) createCircuit(tor).then(setCircuit)
  }, [tor])

  if (!circuit)
    return <div className="p-md flex flex-col items-center">
      <div className="h-2" />
      <div className="flex items-center gap-4">
        <span className="text-3xl text-center text-colored">
          Brume Wallet
        </span>
      </div>
      <div className="h-[150px]" />
      <div className="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
      <div className="h-[100px]" />
      <span className="text-2xl text-center">
        Creating a Tor circuit...
      </span>
      <div className="h-[20px]" />
      <span className="text-center text-contrast">
        It may take a few seconds. If it freezes, close the extension window and open it again.
      </span>
    </div>

  return <CircuitContext.Provider value={circuit}>
    {children}
  </CircuitContext.Provider>
}