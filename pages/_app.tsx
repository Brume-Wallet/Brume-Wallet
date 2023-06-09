import { Catcher } from "@/libs/react/error"
import { ErrorProps } from "@/libs/react/props/error"
import { UserProvider } from "@/mods/foreground/entities/users/context"
import { Overlay } from "@/mods/foreground/overlay/overlay"
import { registerServiceWorker } from "@/mods/foreground/service_worker/service_worker"
import { GlobalStorageProvider } from "@/mods/foreground/storage/global/context"
import { UserStorageProvider } from "@/mods/foreground/storage/user/context"
import { CircuitsProvider } from "@/mods/foreground/tor/circuits/context"
import { TorPoolProvider } from "@/mods/foreground/tor/context"
import { SessionsProvider } from "@/mods/foreground/tor/sessions/context"
import '@/styles/globals.css'
import { CoreProvider } from "@hazae41/xswr"
import type { AppProps } from 'next/app'
import Head from "next/head"
import { useEffect } from "react"

export function Fallback(props: ErrorProps) {
  const { error } = props

  return <div>
    An error occured: {JSON.stringify(error)}
  </div>
}

export default function App({ Component, pageProps }: AppProps) {

  useEffect(() => {
    registerServiceWorker()
  }, [])

  return <Overlay>
    <Head>
      <title>Brume Wallet</title>
      <meta key="application-name" name="application-name" content="Brume Wallet" />
      <meta key="description" name="description" content="The private wallet" />
      <meta key="color-scheme" name="color-scheme" content="dark light" />
      <meta key="theme-color-light" name="theme-color" content="#ffffff" />
      <meta key="theme-color-dark" name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
      <meta key="viewport" name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
      <meta key="apple-mobile-web-app-capable" name="apple-mobile-web-app-capable" content="yes" />
      <meta key="apple-mobile-web-app-status-bar-style" name="apple-mobile-web-app-status-bar-style" content="white" />
      <link rel="icon" href="/favicon.ico" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="apple-touch-icon" href="/square.png" />
      <link rel="apple-touch-startup-image" href="/round.png" />
    </Head>
    <Catcher fallback={Fallback}>
      <CoreProvider>
        <GlobalStorageProvider>
          <UserProvider>
            <UserStorageProvider>
              <TorPoolProvider>
                <CircuitsProvider>
                  <SessionsProvider>
                    <Component {...pageProps} />
                  </SessionsProvider>
                </CircuitsProvider>
              </TorPoolProvider>
            </UserStorageProvider>
          </UserProvider>
        </GlobalStorageProvider>
      </CoreProvider>
    </Catcher>
  </Overlay>
}
