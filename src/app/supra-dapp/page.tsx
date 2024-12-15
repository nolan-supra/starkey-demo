"use client";

import React, {useEffect, useState} from "react";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";

import {Button} from "@/components/ui/button";
import {Copy, ExternalLink, Loader2,} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {copyToClipBoard, shortenAddress} from "@/lib/utils";
import {ethers} from "ethers";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {useForm} from "react-hook-form";
import {yupResolver} from "@hookform/resolvers/yup";
import * as yup from "yup";
import {ISupraTransaction} from "@/lib/types";
import {BCS, TxnBuilderTypes, HexString} from "supra-l1-sdk";
import Link from "next/link";
import {Textarea} from "@/components/ui/textarea"
import nacl from "tweetnacl";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

declare global {
    interface Window {
        ethereum?: any;
        starkey?: any;
    }
}

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

interface SignMessageResponse {
    address: string;
    publicKey: string;
    signature: string;
    verified: boolean
}

export default function SupraDAppPage() {
    let supraProvider: any =
        typeof window !== "undefined" && (window as any)?.starkey?.supra;

    const [isExtensionInstalled, setIsExtensionInstalled] =
        useState<boolean>(!!supraProvider);
    const [accounts, setAccounts] = useState<string[]>([]);
    const [networkData, setNetworkData] = useState<any>();
    const [selectedChainId, setSelectedChainId] = useState<string>("");

    const [balance, setBalance] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false);
    const [rawTxLoading, setRawTxLoading] = useState<boolean>(false);
    const [signMsgLoading, setSignMsgLoading] = useState<boolean>(false);
    const [signMessage, setSignMessage] = useState<string>('');
    const [signatureResp, setSignatureResp] = useState<SignMessageResponse | undefined>(undefined);
    const [transactions, setTransactions] = useState<ISupraTransaction[]>([]);

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

    const addTransactions = (hash: string) => {
        const newTx: ISupraTransaction = {
            hash,
        };
        setTransactions((prev) => [newTx, ...prev]);
    };
    const checkIsExtensionInstalled = () => {
        const intervalId = setInterval(() => {
            if ((window as any)?.starkey) {
                supraProvider = (window as any)?.starkey.supra;
                clearInterval(intervalId);
                setIsExtensionInstalled(true);
                updateAccounts().then();
            }
        }, 500);

        setTimeout(() => {
            clearInterval(intervalId);
        }, 5000);
    };

    const getNetworkData = async () => {
        if (supraProvider) {
            const data = await supraProvider.getChainId();
            if (data) {
                setNetworkData(data)
            }
        }
    };

    const updateAccounts = async () => {
        if (supraProvider) {
            try {
                const response_acc = await supraProvider.account();
                if (response_acc.length > 0) {
                    setAccounts(response_acc);
                } else {
                    setAccounts([]);
                }
            } catch (e) {
                setAccounts([]);
            }
            updateBalance().then();
            getNetworkData().then();
        }
    };

    useEffect(() => {
        if (accounts) {
            updateBalance().then();
            getNetworkData().then();
        }
    }, [accounts]);
    const updateBalance = async () => {
        if (supraProvider && accounts.length) {
            const balance = await supraProvider.balance();
            if (balance) {
                setBalance(`${balance.formattedBalance} ${balance.displayUnit}`);
            }
        } else {
            setBalance("");
        }
    };


    const connectWallet = async () => {
        // setLoading(true)
        const response = await supraProvider.connect();
        console.log({response});
        updateAccounts().then();
        setLoading(false);
    };

    const switchToChain = async () => {
        if (selectedChainId && supraProvider) {
            await supraProvider.changeNetwork({chainId:selectedChainId});
            await getNetworkData()
        }
    };

    const resetWalletWalletData = ()=>{
        setAccounts([]);
        setBalance("");
        setNetworkData({});
    }
    const disconnectWallet = async () => {
        if (supraProvider) {
            await supraProvider.disconnect();
        }
        resetWalletWalletData()
    };

    const handleExtensionEvents = (event: MessageEvent) => {
        console.log("event :: ", event.data);
        // const eventData = event.data.data.data;
        // console.log(eventData)
    };

    useEffect(() => {
        checkIsExtensionInstalled();
        window.addEventListener("message", handleExtensionEvents);
        return () => {
            window.removeEventListener("message", handleExtensionEvents);
        };
    }, []);

    const sendRawTransaction = async () => {
        console.log("~~ sendRawTransaction ~~~");
        setRawTxLoading(true);
        let slot_id: bigint = BigInt(4);
        let coins: bigint = BigInt(0);
        let reference_price: bigint = BigInt(0);



        // Set expiration time for raw transaction to 30 seconds
        const txExpiryTime = (Math.ceil(Date.now() / 1000) + 30) //30 seconds

        /** OptionalTransactionPayloadArgs {
                maxGas?: bigint;
                gasUnitPrice?: bigint;
                txExpiryTime?: bigint;
              }*/

        const optionalTransactionPayloadArgs = {
            txExpiryTime
        }
        const rawTxPayload = [
            accounts[0],
            0,
            "0000000000000000000000000000000000000000000000000000000000000001",
            "supra_account",
            "transfer",
            [],
            [
                new HexString("0x8de4158b48633d853186d5fc790718e5821d7d3c4855e06bcd97b105389a7d0f").toUint8Array(),
                BCS.bcsSerializeUint64(100000000)
            ],
            optionalTransactionPayloadArgs
        ];
        /*const rawTxPayload1 = [
            accounts[0],
            0,
            '0xd25f78655f32e2534dfc26fc45391c5e3b3ccd82ce7f3992b76ef7d01b474a55',
            'gold_rush',
            'fund_reward',
            ['0x1::supra_coin::SupraCoin'],
            [
                BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex('0xd44b342397efd8e28c34312594818c8f4e609eedb055dc81c72a6dd61714edda')),
                BCS.bcsSerializeUint64(111)],
            networkData.chainId
        ]
        console.log(rawTxPayload1)*/

        console.log("rawTxPayload :: ", rawTxPayload);
        const data = await supraProvider.createRawTransactionData(rawTxPayload);
        console.log("raw Data :: ", data);
        if (data) {
            const params = {
                data: data,
                from: accounts[0],
                to: "0xd25f78655f32e2534dfc26fc45391c5e3b3ccd82ce7f3992b76ef7d01b474a55",
                chainId: networkData.chainId,
                value: "",
            };
            const txHash = await supraProvider.sendTransaction(params);
            console.log("txHash :: ", txHash);
            addTransactions(txHash || "failed");
        }
        setRawTxLoading(false);
    };

    const remove0xPrefix = (hexString: string) => {
        return hexString.startsWith("0x") ? hexString.slice(2) : hexString;
    }
    const handleSignMessage = async () => {
        setSignMsgLoading(true);
        setSignatureResp(undefined)

        const haxString = '0x' + Buffer.from(signMessage, 'utf8').toString('hex')
        const response = await supraProvider.signMessage({message: haxString, nonce: '123'})
        console.log('signMessage response :: ', response)
        if (response) {
            const {publicKey, signature, address} = response
            const sign = remove0xPrefix(signature)
            const key = remove0xPrefix(publicKey)
            const verified = nacl.sign.detached.verify(
                new TextEncoder().encode(signMessage),
                Uint8Array.from(Buffer.from(sign, 'hex')),
                Uint8Array.from(Buffer.from(key, 'hex')),
            );
            console.log('signature :: ', signature)
            console.log('verified :: ', verified)

            setSignatureResp({...response, verified})
        }
        setTimeout(() => {
            setSignMsgLoading(false);
        }, 1000)
    };


    /*supraProvider.on("accountChanged", (accounts: string[]) => {
        /!** [address0,address1,....] *!/
       console.log(accounts)
    });
    supraProvider.on("networkChanged", (data: any) => {
        /!**  {chainId:7} *!/
        console.log(data)
    });
    supraProvider.on("disconnect", () => {
        console.log('disconnected')
        disconnectWallet().then()
    });*/
    useEffect(() => {
        if (supraProvider) {
            supraProvider.on("accountChanged", (acc: string[]) => {
                setAccounts(acc);
            });
            supraProvider.on("networkChanged", (data: any) => {
                setNetworkData(data);
            });
            supraProvider.on("disconnect", () => {
                console.log("~~~~~~~disconnect  :::")
                 resetWalletWalletData()
            });
        }

    }, [supraProvider]);

    const onSubmit = async (data: { address: string; amount: number }) => {
        console.log(data);
        setLoading(true);
        const amount = ethers.parseUnits(data.amount.toString(), 8).toString();
        const tx = {
            data: "",
            from: accounts[0],
            to: data.address,
            value: amount,
            chainId: networkData.chainId
        };
        console.log(tx);
        // setTransaction(undefined);
        // @ts-ignore
        const txHash = await supraProvider.sendTransaction(tx);
        console.log("txHash :: ", txHash);
        if (txHash) {
            addTransactions(txHash);
        }
        setLoading(false);
    };

    return (
        <main className="py-24 text-center">
            <div className="text-center relative">
                <h1 className="text-4xl font-extrabold ">Supra dApp</h1>

                <p className=" lg:text-2xl mt-4 mb-10">
                    This demo page for test <b>StarKey</b> Wallet connect
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

                    {isExtensionInstalled && !accounts.length && (
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
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                            )}
                                            Connect Wallet{" "}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {accounts.length > 0 && (
                        <Card className="w-[350px] m-auto">
                            <CardContent className="grid gap-4">
                                <div className="flex mt-5 text-center items-center">
                                    <Badge variant="outline" className={"h-9"}>
                                        Balance : {balance}
                                    </Badge>
                                    <Badge variant="outline" className={"h-9 "}>
                                        Chain ID: {networkData?.chainId}
                                    </Badge>
                                </div>

                                <div className="flex text-center w-full mt-2">
                                    <Button
                                        className="rounded-tr-none rounded-br-none w-full"
                                        variant="secondary"
                                        size={"sm"}
                                    >
                                        {shortenAddress(accounts[0])}
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            copyToClipBoard(accounts[0]);
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
                                                <SelectValue placeholder="Select Network"/>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="7">Supra MainNet (7)</SelectItem>
                                                <SelectItem value="6">Supra TestNet (6)</SelectItem>
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
                                <CardTitle> Sign message</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-1 text-left">
                                <Textarea
                                    placeholder="Type your message here."
                                    onChange={(event) => {
                                        setSignMessage(event.target.value)
                                    }}/>
                                <Button
                                    variant={"default"}
                                    className={"mt-4"}
                                    disabled={signMsgLoading || signMessage.trim().length === 0}
                                    onClick={handleSignMessage}
                                >
                                    {signMsgLoading && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                    )}
                                    Sign message
                                </Button>
                                {
                                    signatureResp && (
                                        <div className={'my-2'}>
                                            <div className={"flex justify-between"}>
                                                <div>Signature :</div>
                                                <div>{signatureResp.verified &&
                                                    <Badge className={'bg-green-500'}>Verified</Badge>}</div>
                                            </div>
                                            <div
                                                className={'break-all mt-1 p-2 rounded-md border bg-blue-50 text-sm'}>{signatureResp.signature}</div>
                                        </div>
                                    )
                                }
                            </CardContent>
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
                                                Send Token
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
                    )}

                    {accounts.length > 0 && (
                        <Card className="w-[350px] m-auto mt-10">
                            <CardHeader>
                                <CardTitle>Recent Transactions</CardTitle>
                            </CardHeader>
                            <CardContent className="grid gap-4 text-left">
                                {transactions.map((tx: ISupraTransaction) => {
                                    return (
                                        <div
                                            key={tx.hash}
                                            className="border border-gray-300 m-[2px] p-2 rounded-2xl hover:bg-blue-100 flex justify-between"
                                        >
                                            <Button
                                                variant={"outline"}
                                                className={'flex-grow'}
                                            >
                                                {shortenAddress(tx.hash)}
                                            </Button>
                                            <Button
                                                onClick={() => {
                                                    copyToClipBoard(tx.hash);
                                                }}
                                                variant={"outline"}
                                                size={"icon"}
                                                className={'mr-2 ml-2'}
                                            >
                                                <Copy className="h-4 w-4"/>
                                            </Button>
                                            <Button
                                                variant={"outline"}
                                                size={"icon"}
                                            >
                                                <Link href={`https://testnet.suprascan.io/tx/${tx.hash}`}
                                                      target={'_blank'}>
                                                    <ExternalLink className="h-4 w-4"/>
                                                </Link>
                                            </Button>
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
