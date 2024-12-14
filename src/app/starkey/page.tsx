"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { IMetaMaskAccount, ISupraTransaction } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { copyToClipBoard, shortenAddress } from "@/lib/utils";
import { ethers } from "ethers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import * as yup from "yup";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {Avatar, AvatarImage} from "@/components/ui/avatar";

const formSchema = yup.object().shape({
  address: yup
    .string()
    .required("Address is required")
    .matches(/^0x[a-zA-Z0-9]{32,}$/, "Invalid address"),
  amount: yup
    .number()
    .test("maxDecimalPlaces", "Must have 6 decimal or less", (number) =>
      /^\d+(\.\d{1,6})?$/.test(String(number))
    )
    .typeError("Invalid amount")
    .moreThan(0, "Enter valid amount")
    .required("Amount is required"),
});

export default function MetaMaskPage() {
  let metaMaskWallet: any =
    typeof window !== "undefined" && (window as any)?.ethereum;

  const [isExtensionInstalled, setIsExtensionInstalled] =
    useState<boolean>(!!metaMaskWallet);
  const [walletAccount, setWalletAccount] = useState<IMetaMaskAccount>();
  const [walletBalance, setWalletBalance] = useState<string>("0");
  const [chainId, setChainId] = useState<string>("");
  const [selectedChainId, setSelectedChainId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [accounts, setAccounts] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<ISupraTransaction[]>([]);
  const [rawTxLoading, setRawTxLoading] = useState<boolean>(false);
  const [providers, setProviders] = useState([]);

  const form = useForm({
    resolver: yupResolver(formSchema),
    defaultValues: {
      address: "",
      amount: undefined,
    },
  });
  const {
    register,
    formState: { isDirty, isValid, errors },
  } = form;

  useEffect(() => {
    // Event listener function to handle new providers
    const handleAnnounceProvider = (event:any) => {
      const providerInfo = event.detail;
      console.log("============providerInfo",providerInfo);

      // Add provider only if it’s not already in the list
      setProviders((prevProviders : any) => {
        const isAlreadyAdded = prevProviders.some((provider:any) => provider.info.uuid === providerInfo.info.uuid);
        if (!isAlreadyAdded) {
          return [...prevProviders, providerInfo];
        }
        return prevProviders;
      });
    };

    // Add event listener for 'eip6963:announceProvider'
    window.addEventListener('eip6963:announceProvider', handleAnnounceProvider);

    // Clean up the event listener on component unmount
    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounceProvider);
    };
  }, []);

  console.log('providers :: ',providers)

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('eip6963:requestProvider', {}));
  }, []);


  const addTransactions = (hash: string) => {
    const newTx: ISupraTransaction = {
      hash,
    };
    setTransactions((prev) => [newTx, ...prev]);
  };

  const checkIsExtensionInstalled = () => {
    const intervalId = setInterval(() => {
      // @ts-ignore
      if (window?.ethereum) {
        // @ts-ignore
        metaMaskWallet = window.ethereum;
        clearInterval(intervalId);
        setIsExtensionInstalled(true);
        updateWalletAccount().then();
      }
    }, 500);

    setTimeout(() => {
      clearInterval(intervalId);
    }, 5000);
  };

  useEffect(() => {
    metaMaskWallet = typeof window !== "undefined" && (window as any)?.ethereum;
  }, [(window as any)?.ethereum]);

  useEffect(() => {
    updateBalance().then();
  }, [walletAccount,chainId]);

  const updateBalance = async () => {
    if (metaMaskWallet && walletAccount) {
      const balance = await (window as any)?.ethereum?.request({
        method: "eth_getBalance",
        params: [walletAccount.address, "latest"],
      });
      if(balance){
      setWalletBalance(ethers.formatUnits(balance.toString(),18));
      }
    } else {
      setWalletBalance("0");
    }
  };
  const updateWalletAccount = async () => {
    if (metaMaskWallet) {
      try {
        const accounts = await (window as any)?.ethereum?.request({
          method: "eth_accounts",
        });
        if (accounts.length !== 0) {
          const address = accounts[0];
          const currentAccount: IMetaMaskAccount = {
            id: address,
            username: address,
            address: address,
          };
          setWalletAccount(currentAccount);

          setAccounts(accounts);
          const eth_chainId = await (window as any)?.ethereum?.request({
            method: "eth_chainId",
          });
          setChainId(ethers.toNumber(eth_chainId).toString());
        } else {
          setWalletAccount(undefined);
          setAccounts([]);
        }
      } catch (e) {
        setWalletAccount(undefined);
        setAccounts([]);
      }
    }
    updateBalance().then();
  };

  const connectWallet = async (provider:any) => {
    // setLoading(true)
    if (provider){
      const accounts = await provider.provider.request({
        method: "eth_requestAccounts",
      });
      console.log({accounts});
    }else {
      const accounts = await (window as any)?.ethereum?.request({
        method: "eth_requestAccounts",
      });
      console.log({accounts});
    }
    updateWalletAccount().then();
    setLoading(false);
  };

  const switchToChain = async () => {
    // setLoading(true)
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [
        {
          chainId: selectedChainId,
        },
      ],
    });
    updateWalletAccount().then();
    setLoading(false);
  };
  const disconnectWallet = async () => {
    setWalletAccount(undefined);
    setWalletBalance("0");
    await (window as any)?.ethereum?.request({
      method: "wallet_revokePermissions",
      params: [
        {
          eth_accounts: {},
        },
      ],
    });
  };

  useEffect(() => {
    if (metaMaskWallet) {
      metaMaskWallet.on("accountsChanged", (acc: string[]) => {
        updateWalletAccount().then();
      });
      metaMaskWallet.on("chainChanged", (acc: string[]) => {
        updateWalletAccount().then();
      });
      metaMaskWallet.on("connect", (acc: string[]) => {
        updateWalletAccount().then();
      });
      metaMaskWallet.on("disconnect", (acc: string[]) => {
        updateWalletAccount().then();
      });
      /* metaMaskWallet.on("_initialized", (acc: string[]) => {
               updateWalletAccount().then();
             });*/
    }
  }, [metaMaskWallet]);

  /*  const handleExtensionEvents = (event: MessageEvent) => {
          // console.log("event :: ", event.data);
      };*/

  /* useEffect(() => {
       checkIsExtensionInstalled();
       window.addEventListener("message", handleExtensionEvents);
       return () => {
         window.removeEventListener("message", handleExtensionEvents);
       };
     }, []);*/

  const onSubmit = async (data: { address: string; amount: number }) => {
    console.log(data);
    setLoading(true);
    const amount = ethers.parseUnits(data.amount.toString(), 18).toString();
    const tx = {
      from: accounts[0],
      to: data.address,
      value: amount,
      gasLimit: "0x5028",
      maxPriorityFeePerGas: "0x3b9aca00",
      maxFeePerGas: "0x2540be400",
      chainId: chainId,
    };
    console.log(tx);
    const txHash = await (window as any)?.ethereum?.request({
      method: "eth_sendTransaction",
      params: [{ ...tx }],
    });
    console.log("txHash :: ", txHash);

    if (txHash) {
      addTransactions(txHash);
    }
    setLoading(false);
  };

  const sendRawTransaction = async () => {
    console.log("~~ sendRawTransaction ~~~");

    const params = {
      data: "0x2646478b000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000000000000000000000000009184e72a0000000000000000000000000003c499c542cef5e3811e1192ce70d8cc03d5c3359000000000000000000000000000000000000000000000000000000000000000300000000000000000000000054d88a2af62a98171b92170b42a1cad5cdfc50b700000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000700301ffff02016D9e8dbB2779853db00418D4DcF96F3987CFC9D20d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270040d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270006D9e8dbB2779853db00418D4DcF96F3987CFC9D20154D88a2aF62a98171b92170B42A1CAd5cdFC50B7000bb800000000000000000000000000000000",
      from: "0x54D88a2aF62a98171b92170B42A1CAd5cdFC50B7",
      gas: "0x2cb7a",
      to: "0xf2614A233c7C3e7f08b1F887Ba133a13f1eb2c55",
      value: "0x9184e72a000",
    };

    const txHash = await (window as any)?.ethereum?.request({
      method: "eth_sendTransaction",
      params: [params],
    });
    console.log("txHash :: ", txHash);
    addTransactions(txHash || "failed");
    setRawTxLoading(false);
  };

  return (
    <main className="py-24 text-center">
      <div className="text-center relative z-10">
        <h1 className="text-4xl font-extrabold  ">StarKey EVM dApp</h1>

        <p className=" lg:text-2xl mt-4 mb-30">
          This demo page for test <b>EVM</b> Wallet connect
        </p>

        <div className="mb-5 mt-5">
          {!isExtensionInstalled && (
            <Card className="w-[350px] m-auto">
              <CardHeader>
                <CardTitle>Download Wallet</CardTitle>
                <CardDescription>
                  Install the browser extension and create your wallet.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {isExtensionInstalled && !walletAccount && (
            <Card className="w-[350px] m-auto">
              <CardHeader>
                <CardTitle>Connect to your Wallet</CardTitle>
                <CardDescription>
                  Click Connect Wallet to link your wallet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <div className="inline-block">
                    <Button onClick={connectWallet} disabled={loading}>
                      {loading && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Browser Connect Wallet
                    </Button>
                  </div>

                  {providers.map((provider:any)=>{


                    return  <div className="mt-4" key={provider.uuid}>
                      <Button onClick={()=>{connectWallet(provider)}} disabled={loading} variant={"outline"}>
                        <Avatar className="w-6 h-6 flex-none mr-3">
                          <AvatarImage src={provider.info.icon} alt="@shadcn" />
                        </Avatar>
                        {provider.info.name}
                      </Button>
                    </div>

                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {walletAccount && (
            <Card className="w-[350px] m-auto">
              <CardContent className="grid gap-4">
                <div className="flex mt-5 text-center items-center justify-between">
                  <Badge variant="outline" className={"h-9"}>
                    Balance : {walletBalance}
                  </Badge>

                  <Badge variant="outline" className={"h-9 "}>
                    Chain: {chainId}
                  </Badge>
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

                <div className={"flex"}>
                  <div className="w-full">
                    <Select
                      onValueChange={(value) => {
                        setSelectedChainId(value);
                      }}
                      defaultValue={selectedChainId}
                    >
                      <SelectTrigger className="w-full rounded-tr-none rounded-br-none ">
                        <SelectValue placeholder="Select Network" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0x1">ETH MainNet</SelectItem>
                        <SelectItem value="0xE7">Supra EVM</SelectItem>
                        <SelectItem value="0xa4b1">Arbitrum One</SelectItem>
                        <SelectItem value="0x89">Polygon Mainnet</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Button
                      variant={"default"}
                      onClick={switchToChain}
                      className="rounded-tl-none rounded-bl-none"
                    >
                      Switch Network
                    </Button>
                  </div>
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
          )}

          {accounts.length > 0 && (
            <Card className="w-[350px] m-auto mt-4">
              <CardHeader>
                <CardTitle>Send Token</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-1 text-left">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-8"
                  >
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>To Address</FormLabel>
                          <FormControl>
                            <Input placeholder="Address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="0.00"
                              {...register("amount", {
                                valueAsNumber: true,
                                validate: (value) => value > 0,
                              })}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="text-center">
                      <Button type="submit" disabled={loading}>
                        {loading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Send
                      </Button>
                    </div>
                  </form>
                </Form>

                <Button
                  variant={"outline"}
                  className={"mt-4"}
                  disabled={rawTxLoading}
                  onClick={sendRawTransaction}
                >
                  {rawTxLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Test Raw Transaction
                </Button>
              </CardContent>
            </Card>
          )}

          {accounts.length > 0 && (
            <Card className="min-w-[350px] max-w-[650px]  m-auto mt-10">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-left">
                {transactions.map((tx: ISupraTransaction) => {
                  return (
                    <div
                      key={tx.hash}
                      className="border border-gray-300 m-[2px] p-2 rounded-2xl hover:bg-blue-100"
                    >
                      {tx.hash}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
