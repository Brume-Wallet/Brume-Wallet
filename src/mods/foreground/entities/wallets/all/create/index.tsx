import { Outline } from "@/libs/icons/icons";
import { Button } from "@/libs/ui/button";
import { Dialog, useDialogContext } from "@/libs/ui/dialog/dialog";
import { useCallback, useState } from "react";
import { ReadonlyWalletCreatorDialog } from "./readonly";
import { StandaloneWalletCreatorDialog } from "./standalone";

export function WalletCreatorDialog(props: {}) {
  const { opened, close } = useDialogContext().unwrap()

  const [type, setType] = useState<"readonly" | "privateKey">()

  const onWatchonlyClick = useCallback(() => {
    setType("readonly")
  }, [])

  const onPrivateKeyClick = useCallback(() => {
    setType("privateKey")
  }, [])

  return <>
    <Dialog
      opened={opened && type === "readonly"}
      close={close}>
      <ReadonlyWalletCreatorDialog />
    </Dialog>
    <Dialog
      opened={opened && type === "privateKey"}
      close={close}>
      <StandaloneWalletCreatorDialog />
    </Dialog>
    <Dialog.Title close={close}>
      New wallet
    </Dialog.Title>
    <div className="h-2" />
    <div className="w-full flex items-center gap-2">
      <Button.Contrast className="flex-1 whitespace-nowrap p-4 rounded-xl"
        onClick={onWatchonlyClick}>
        <div className={`${Button.Shrinker.className} flex-col`}>
          <Outline.EyeIcon className="s-md" />
          <span>Watch-only</span>
        </div>
      </Button.Contrast>
      <Button.Contrast className="flex-1 whitespace-nowrap p-4 rounded-xl"
        onClick={onPrivateKeyClick}>
        <div className={`${Button.Shrinker.className} flex-col`}>
          <Outline.WalletIcon className="s-md" />
          <span>Private key</span>
        </div>
      </Button.Contrast>
    </div>
  </>
}
