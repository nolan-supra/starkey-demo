"use client";

import React, {useEffect, useMemo, useState} from "react";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";

import {Button} from "@/components/ui/button";
import {Loader2} from "lucide-react";
import {IConnectedWalletProps, ISupraTransaction} from "@/lib/types";
import {Badge} from "@/components/ui/badge";
import {copyToClipBoard, shortenAddress} from "@/lib/utils";
import {ethers} from "ethers";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import * as yup from "yup";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
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

export default function Page() {
    let ethereumBrowserWallet: any =
        typeof window !== "undefined" && (window as any)?.ethereum;

    const [walletBalance, setWalletBalance] = useState<string>("0");
    const [selectedChainId, setSelectedChainId] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [transactions, setTransactions] = useState<ISupraTransaction[]>([]);
    const [rawTxLoading, setRawTxLoading] = useState<boolean>(false);

    const [providers, setProviders] = useState([]);
    const [preConnectChecked, setPreConnectChecked] = useState<string[]>([]);
    const [connectedEvmWallet, setConnectedEvmWallet] = useState<IConnectedWalletProps | null>(null);


    const form = useForm({
        resolver: yupResolver(formSchema),
        defaultValues: {
            address: "",
            amount: undefined,
        },
    });
    const {
        register,
        formState: {isDirty, isValid, errors},
    } = form;

    useEffect(() => {
        // Event listener function to handle new providers
        const handleAnnounceProvider = (event: any) => {
            const providerInfo = event.detail;
            // Add provider only if it’s not already in the list
            setProviders((prevProviders: any) => {
                const isAlreadyAdded = prevProviders.some(
                    (provider: any) => provider.info.uuid === providerInfo.info.uuid
                );
                if (!isAlreadyAdded) {
                    return [...prevProviders, providerInfo];
                }
                return prevProviders;
            });


        };

        // Add event listener for 'eip6963:announceProvider'
        window.addEventListener("eip6963:announceProvider", handleAnnounceProvider);

        // Clean up the event listener on component unmount
        return () => {
            window.removeEventListener(
                "eip6963:announceProvider",
                handleAnnounceProvider
            );
        };
    }, []);

    useEffect(() => {
        if (ethereumBrowserWallet) {
            const providerInfo: any = {
                info: {icon: '/browser-wallet.svg', name: 'Browser Wallet', rdns: '', uuid: 'browser_wallet'},
                provider: ethereumBrowserWallet
            };
            setProviders((prevProviders: any) => {
                const index = prevProviders.findIndex(
                    (provider: any) => provider.info.uuid === providerInfo?.info?.uuid
                );
                if (index >= 0) {
                    prevProviders[index] = {...prevProviders[index], provider: ethereumBrowserWallet}
                } else {
                    return [providerInfo, ...prevProviders];
                }
                return prevProviders;
            });
        }
    }, [ethereumBrowserWallet]);


    const checkProviderConnection = useMemo(() => {
        if (connectedEvmWallet && connectedEvmWallet.isConnected) {
            return null
        }
        return providers.find((provider: any) => !preConnectChecked.includes(provider.info.uuid))
    }, [preConnectChecked, providers, connectedEvmWallet])

    useEffect(() => {
        if (checkProviderConnection) {
            /** check if already connected **/
            void initConnectedEvmWallet(checkProviderConnection).finally(() => {
                setPreConnectChecked([...preConnectChecked, (checkProviderConnection as any)?.info?.uuid])
            })
        }

    }, [checkProviderConnection, preConnectChecked, setPreConnectChecked])

    useEffect(() => {
        window.dispatchEvent(new CustomEvent("eip6963:requestProvider", {}));
    }, []);

    const addTransactions = (hash: string) => {
        const newTx: ISupraTransaction = {
            hash,
        };
        setTransactions((prev) => [newTx, ...prev]);
    };


    useEffect(() => {
        ethereumBrowserWallet = typeof window !== "undefined" && (window as any)?.ethereum;
    }, [(window as any)?.ethereum]);


    const updateBalance = async () => {
        if (connectedEvmWallet && connectedEvmWallet.isConnected && connectedEvmWallet.accounts.length) {
            const balance = await connectedEvmWallet?.wallet?.provider?.request({
                method: "eth_getBalance",
                params: [connectedEvmWallet.accounts[0], "latest"],
            });
            if (balance) {
                setWalletBalance(ethers.formatUnits(balance.toString(), 18));
            }
        } else {
            setWalletBalance("0");
        }
    };

    useEffect(() => {
        const intervalId = setInterval(() => {
            updateBalance().then()
        }, 5000);
        return () => {
            clearInterval(intervalId);
        };
    }, [connectedEvmWallet]);

    const updateConnectedEvmWallet = (data?: any, initialSet = false) => {
        if (data) {
            setConnectedEvmWallet((prevState: any) => {
                const state = initialSet ? {...data} : {...prevState, ...data}
                // if (state.accounts.length > 0)
                return {...state, isConnected: state.accounts.length > 0};
            });
        } else {
            /** reset connected wallet */
            setConnectedEvmWallet(null)
            setWalletBalance('0')
        }
    }
    const initConnectedEvmWallet = async (provider: any, resetIfNotConnected = false) => {
        if (provider) {
            try {
                const accounts = await provider?.provider?.request({
                    method: "eth_accounts",
                });
                if (accounts.length) {
                    const chainId = await provider?.provider?.request({
                        method: "eth_chainId",
                    });
                    void updateConnectedEvmWallet({
                        wallet: provider,
                        isConnected: true,
                        accounts,
                        chainId
                    })
                    return true
                }
                if (resetIfNotConnected) {
                    void updateConnectedEvmWallet(null)
                }
            } catch (error) {
                console.log(error)
                if (resetIfNotConnected) {
                    void updateConnectedEvmWallet(null)
                }
            }
        }
        return false
    }
    const updateWalletAccount = async () => {
        if (connectedEvmWallet && connectedEvmWallet.isConnected) {
            void initConnectedEvmWallet(connectedEvmWallet.wallet, true)
        }
        updateBalance().then();
    };

    const connectWallet = async (provider: any) => {
        setLoading(true)
        updateConnectedEvmWallet({
            isConnected: false,
            wallet: provider,
            accounts: [],
            chainId: '',
        }, true)

        try {
            const accounts = await provider.provider.request({
                method: "eth_requestAccounts",
            });
            console.log('accounts :: ', accounts);
            if (accounts.length) {
                await initConnectedEvmWallet(provider);
            } else {
                void updateConnectedEvmWallet(null)
            }
        } catch (error) {
            console.error(error)
            void updateConnectedEvmWallet(null)
        }
        setLoading(false);
    }

    const switchToChain = async () => {
        // setLoading(true)
        if (connectedEvmWallet && connectedEvmWallet.isConnected) {
            await connectedEvmWallet.wallet?.provider?.request({
                method: "wallet_switchEthereumChain",
                params: [
                    {
                        chainId: selectedChainId,
                    },
                ],
            });
            updateWalletAccount().then();
        }
        setLoading(false);
    };
    const disconnectWallet = async () => {
        if (connectedEvmWallet && connectedEvmWallet.isConnected) {
            void updateConnectedEvmWallet(null)
            await connectedEvmWallet.wallet?.provider?.request({
                method: "wallet_revokePermissions",
                params: [
                    {
                        eth_accounts: {},
                    },
                ],
            });
        }

    };


    useEffect(() => {
        const {wallet, isConnected} = connectedEvmWallet || {};
        const provider = wallet?.provider;
        if (isConnected && provider) {
            const updateAccount = (data: any) => updateWalletAccount()
            const handleChainChanged = (data: any) => {
                void updateWalletAccount();
            }

            const handleDisconnect = () => void updateConnectedEvmWallet(null);

            // Add event listeners
            provider.on("accountsChanged", updateAccount);
            provider.on("chainChanged", handleChainChanged);
            // provider.on("connect", updateAccount);
            provider.on("disconnect", handleDisconnect);

            // Cleanup event listeners on unmount
            return () => {
                provider.removeListener("accountsChanged", updateAccount);
                provider.removeListener("chainChanged", handleChainChanged);
                // provider.removeListener("connect", updateAccount);
                provider.removeListener("disconnect", handleDisconnect);
            };
        }
    }, [connectedEvmWallet, updateWalletAccount, updateConnectedEvmWallet]);


    const onSubmit = async (data: { address: string; amount: number }) => {
        console.log(data);
        setLoading(true);
        if (connectedEvmWallet && connectedEvmWallet.isConnected) {
            const {accounts, chainId} = connectedEvmWallet
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
            const txHash = await connectedEvmWallet.wallet.provider?.request({
                method: "eth_sendTransaction",
                params: [{...tx}],
            });
            console.log("txHash :: ", txHash);

            if (txHash) {
                addTransactions(txHash);
            }
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

        const txHash = await connectedEvmWallet?.wallet?.provider?.request({
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
                    {providers.length === 0 && (
                        <Card className="w-[350px] m-auto">
                            <CardHeader>
                                <CardTitle>Download Wallet</CardTitle>
                                <CardDescription>
                                    Install the browser extension and create your wallet.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}

                    {providers.length && !connectedEvmWallet?.isConnected && (
                        <Card className="w-[350px] m-auto">
                            <CardHeader>
                                <CardTitle>Connect to your Wallet</CardTitle>
                                <CardDescription>
                                    Click Connect Wallet to link your wallet
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div key={"area"} className={"flex flex-col gap-2"}>


                                    {providers.map((provider: any) => {
                                        return (
                                            <Button
                                                key={provider?.info.uuid}
                                                onClick={() => {
                                                    void connectWallet(provider);
                                                }}
                                                disabled={loading}
                                                // variant={provider?.info.uuid === 'browser_wallet' ? "secondary" : "outline"}
                                                variant={"outline"}
                                                className={'flex w-full justify-start h-12 hover:shadow-sm'}
                                            >
                                                <Avatar className="w-8 h-8 flex-none mr-4 rounded-sm">
                                                    <AvatarImage src={provider.info.icon} alt="@shadcn"/>
                                                </Avatar>
                                                <div className={"flex-grow text-left"}> {provider.info.name}</div>
                                                <div>
                                                    {loading && connectedEvmWallet?.wallet?.info?.uuid === provider?.info.uuid &&
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                    }
                                                </div>

                                            </Button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {connectedEvmWallet && connectedEvmWallet.isConnected && (
                        <>
                            <Card className="w-[350px] m-auto">
                                <CardContent className="grid gap-4">
                                    <div className="flex text-center w-full mt-4">

                                        <Button
                                            className="border-r-0 rounded-br-none rounded-tr-none"
                                            variant="secondary" size="sm"
                                        >
                                            <Avatar className="w-6 h-6 flex-none rounded-sm">
                                                <AvatarImage src={connectedEvmWallet.wallet.info.icon} alt="@shadcn"/>
                                            </Avatar>
                                        </Button>
                                        <Button
                                            className="rounded-none w-full"
                                            variant="secondary"
                                            size={"sm"}
                                        >
                                            {shortenAddress(connectedEvmWallet.accounts[0] as string)}
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                copyToClipBoard(connectedEvmWallet.accounts[0] as string);
                                            }}
                                            className="border-l-1 rounded-tl-none rounded-bl-none"
                                            color={"primary"}
                                            size={"sm"}
                                        >
                                            Copy
                                        </Button>
                                    </div>

                                    <div className="flex mb-2 text-center items-center justify-between">
                                        <Badge variant="outline" className={"h-9"}>
                                            Balance : {walletBalance}
                                        </Badge>

                                        <Badge variant="outline" className={"h-9 "}>
                                            Chain: { connectedEvmWallet.chainId ? ethers.toNumber(connectedEvmWallet.chainId).toString() : ''}
                                        </Badge>
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
                                                    <SelectValue placeholder="Select Network"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0x1">ETH MainNet</SelectItem>
                                                    <SelectItem value="0xaa36a7">Sepolia TestNet</SelectItem>
                                                    <SelectItem value="0x14a34">Base Sepolia TestNet</SelectItem>
                                                    <SelectItem value="0xe8">Supra EVM TestNet</SelectItem>
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
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>To Address</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Address" {...field} />
                                                        </FormControl>
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="amount"
                                                render={({field}) => (
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
                                                        <FormMessage/>
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="text-center">
                                                <Button type="submit" disabled={loading}>
                                                    {loading && (
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
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
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        )}
                                        Test Raw Transaction
                                    </Button>
                                </CardContent>
                            </Card>


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
                        </>
                    )}

                </div>
            </div>
        </main>
    );
}
