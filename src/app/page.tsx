"use client";

import React, { useEffect, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IWalletAccount, IWalletBalance } from "@/lib/types";
import SendToken from "@/components/SendToken";
import { copyToClipBoard, shortenAddress } from "@/lib/utils";
import { useRouter } from "next/navigation";

const Home = () => {
  let starKeyWallet: any =
    typeof window !== "undefined" && (window as any)?.starKeyWallet;

  const [isExtensionInstalled, setIsExtensionInstalled] =
    useState<boolean>(!!starKeyWallet);
  const [walletAccount, setWalletAccount] = useState<IWalletAccount>();
  const [walletBalance, setWalletBalance] = useState<IWalletBalance>();
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedNetwork, setSelectedNetwork] = useState<string>("SUP");
  const router = useRouter();

  useEffect(() => {
    router.push("/supra-dapp");
  }, [router]);

  const checkIsExtensionInstalled = () => {
    const intervalId = setInterval(() => {
      // @ts-ignore
      if (window?.starKeyWallet) {
        // @ts-ignore
        starKeyWallet = window.starKeyWallet;
        updateWalletAccount();
        clearInterval(intervalId);
        setIsExtensionInstalled(true);
      }
    }, 500);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);
  };

  const updateWalletAccount = async () => {
    const currentAccount = await starKeyWallet.getCurrentAccount();
    if (currentAccount && currentAccount.length > 0) {
      const account = {
        username: currentAccount[0],
        address: currentAccount[0],
      };
      setWalletAccount(account);
    } else {
      setWalletAccount(undefined);
    }
    updateBalance();
  };

  const updateBalance = async () => {
    const data = await starKeyWallet.getBalance();
    setWalletBalance(data);
  };

  const connectWallet = async () => {
    setLoading(true);
    await starKeyWallet.connectWallet({ network: selectedNetwork });
  };
  const disconnectWallet = async () => {
    starKeyWallet.disconnectWallet();
    // updateWalletAccount();
    setWalletBalance(undefined);
    setWalletAccount(undefined);
  };

  const handleExtensionEvents = (event: any) => {
    if (event?.data?.name?.startsWith("starkey-")) {
      console.log("StarKey Event :: ", event.data);
      switch (event?.data?.name) {
        case "starkey-extension-installed":
          checkIsExtensionInstalled();
          break;
        case "starkey-wallet-connected":
        case "starkey-wallet-updated":
        case "starkey-wallet-disconnected":
          updateWalletAccount();
          setLoading(false);
          break;
        case "starkey-window-removed":
          setLoading(false);
          break;
      }
    }
  };

  useEffect(() => {
    checkIsExtensionInstalled();
    window.addEventListener("message", handleExtensionEvents);

    return () => {
      window.removeEventListener("message", handleExtensionEvents);
    };
  }, []);

  return (
    <main className="py-24 text-center">
      <div className="text-center relative z-10">
        <h1 className="text-4xl font-extrabold  ">StarKey Wallet</h1>

        <p className=" lg:text-2xl mt-4 mb-30">
          This demo page for test <b>StarKey</b> Wallet connect
        </p>

        <div className="mb-5 mt-5">
          {!isExtensionInstalled && (
            <Card className="w-[350px] m-auto">
              <CardHeader>
                <CardTitle>Download Starkey Wallet</CardTitle>
                <CardDescription>
                  Install the browser extension and create your wallet.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="inline-block">
                  <a
                    target="_blank"
                    href="https://chromewebstore.google.com/detail/star-key-wallet-nightly-t/chkgjfeacmiiflefonpeeojeknaiappe"
                  >
                    <Button color="danger">Install Chrome Extension</Button>
                  </a>
                </div>
              </CardContent>
            </Card>
          )}

          {isExtensionInstalled && !walletAccount && (
            <Card className="w-[350px] m-auto">
              <CardHeader>
                <CardTitle> Connect to your Wallet</CardTitle>
                <CardDescription>
                  {" "}
                  Click “Connect StarKey” to link your wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="inline-block mr-5">
                    <Select
                      onValueChange={(value) => {
                        setSelectedNetwork(value);
                      }}
                      defaultValue={selectedNetwork}
                    >
                      <SelectTrigger className="w-[90px]">
                        <SelectValue placeholder="SUP" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SUP">SUP</SelectItem>
                        <SelectItem value="ETH">ETH</SelectItem>
                        <SelectItem value="APT">APT</SelectItem>
                        <SelectItem value="SUI">SUI</SelectItem>
                        <SelectItem value="SOL">SOL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="inline-block">
                    <Button onClick={connectWallet} disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Connect StarKey{" "}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {walletAccount && (
            <div>
              <Card className="w-[350px] m-auto">
                <CardContent className="grid gap-4">
                  <div className="flex mt-5 text-center items-center">
                    {walletAccount?.avatar && (
                      <Avatar className="w-6 h-6 flex-none mr-3">
                        <AvatarImage src={walletAccount.avatar} alt="@shadcn" />
                      </Avatar>
                    )}

                    {walletBalance && (
                      <Badge variant="outline" className={"h-7"}>
                        {walletBalance.formattedBalance}{" "}
                        {walletBalance.displayUnit}
                      </Badge>
                    )}
                  </div>

                  <div className="flex text-center w-full mt-2">
                    <Button
                      className="rounded-tr-none rounded-br-none w-full"
                      variant="secondary"
                      size={"sm"}
                    >
                      {shortenAddress(walletAccount.address as string)}
                    </Button>
                    <Button
                      onClick={() => {
                        copyToClipBoard(walletAccount.address as string);
                      }}
                      className="border-l-1 rounded-tl-none rounded-bl-none"
                      color={"primary"}
                      size={"sm"}
                    >
                      Copy
                    </Button>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    size={"sm"}
                    className="w-full"
                    variant="destructive"
                    onClick={disconnectWallet}
                  >
                    Disconnect
                  </Button>
                </CardFooter>
              </Card>

              <SendToken
                walletAccount={walletAccount}
                starKeyWallet={starKeyWallet}
                walletBalance={walletBalance}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
export default Home;
