/* eslint-disable @next/next/no-img-element */
import { Errors } from "@/libs/errors/errors"
import { Outline } from "@/libs/icons/icons"
import { isSafariExtension } from "@/libs/platform/platform"
import { useAsyncUniqueCallback } from "@/libs/react/callback"
import { OkProps } from "@/libs/react/props/promise"
import { UserRejectedError } from "@/libs/rpc/mods/errors"
import { PaddedRoundedClickableNakedButton } from "@/libs/ui/button"
import { ImageWithFallback } from "@/libs/ui/image"
import { PageBody, PageHeader } from "@/libs/ui/page/header"
import { UserPage } from "@/libs/ui/page/page"
import { pathOf, urlOf } from "@/libs/url/url"
import { AppRequest } from "@/mods/background/service_worker/entities/requests/data"
import { useBackgroundContext } from "@/mods/foreground/background/context"
import { BlobbyData } from "@/mods/universal/entities/blobbys"
import { RpcErr } from "@hazae41/jsonrpc"
import { Nullable } from "@hazae41/option"
import { Err } from "@hazae41/result"
import { Fragment, useCallback, useEffect, useState } from "react"
import { useBlobby } from "../../blobbys/data"
import { useOrigin } from "../../origins/data"
import { useAppRequest, useAppRequests } from "../data"

export function RequestsPage() {
  const background = useBackgroundContext().getOrThrow()

  const requestsQuery = useAppRequests()
  const maybeRequests = requestsQuery.data?.get()

  const rejectAllOrAlert = useAsyncUniqueCallback(() => Errors.runOrLogAndAlert(async () => {
    if (maybeRequests == null)
      return
    if (!isSafariExtension() && confirm(`Do you want to reject all requests?`) === false)
      return

    for (const { id } of maybeRequests)
      await background.requestOrThrow({
        method: "brume_respond",
        params: [RpcErr.rewrap(id, new Err(new UserRejectedError()))]
      }).then(r => r.getOrThrow())

    return
  }), [background, maybeRequests])

  const Body =
    <PageBody>
      <div className="flex flex-col gap-2">
        {maybeRequests?.map(request =>
          <Fragment key={request.id}>
            <RequestRow request={request} />
          </Fragment>)}
      </div>
    </PageBody>

  const Header = <>
    <PageHeader title="Requests">
      <PaddedRoundedClickableNakedButton
        disabled={rejectAllOrAlert.loading || !Boolean(maybeRequests?.length)}
        onClick={rejectAllOrAlert.run}>
        <Outline.TrashIcon className="size-5" />
      </PaddedRoundedClickableNakedButton>
    </PageHeader>
    <div className="po-md flex items-center">
      <div className="text-contrast">
        {`Request allow you to approve various actions such as transactions and signatures. These requests are sent by applications through sessions.`}
      </div>
    </div>
  </>

  return <UserPage>
    {Header}
    {Body}
  </UserPage>
}

export function RequestRow(props: { request: AppRequest }) {
  const requestQuery = useAppRequest(props.request.id)
  const maybeRequestData = requestQuery.data?.get()

  const originQuery = useOrigin(maybeRequestData?.origin)
  const maybeOriginData = originQuery.data?.get()

  const [iconDatas, setIconDatas] = useState<Nullable<BlobbyData>[]>([])

  const onIconData = useCallback(([index, data]: [number, Nullable<BlobbyData>]) => {
    setIconDatas(iconDatas => {
      iconDatas[index] = data
      return [...iconDatas]
    })
  }, [])

  if (maybeRequestData == null)
    return null
  if (maybeOriginData == null)
    return null

  const { id, method, params } = maybeRequestData

  return <a className="po-md rounded-xl flex items-center gap-4"
    href={`#${pathOf(urlOf(`/${method}?id=${id}`, params))}`}>
    {maybeOriginData.icons?.map((x, i) =>
      <Fragment key={x.id}>
        <IndexedBlobbyLoader
          index={i}
          id={x.id}
          ok={onIconData} />
      </Fragment>)}
    <div className="flex-none">
      <ImageWithFallback className="size-10"
        alt="icon"
        src={iconDatas.find(Boolean)?.data}>
        <Outline.CubeTransparentIcon className="size-10" />
      </ImageWithFallback>
    </div>
    <div className="grow">
      <div className="font-medium">
        {maybeOriginData.title}
      </div>
      <div className="text-contrast">
        {maybeOriginData.origin}
      </div>
    </div>
  </a>
}

function IndexedBlobbyLoader(props: OkProps<[number, Nullable<BlobbyData>]> & { id: string, index: number }) {
  const { index, id, ok } = props

  const { data } = useBlobby(id)

  useEffect(() => {
    ok([index, data?.inner])
  }, [index, data, ok])

  return null
}