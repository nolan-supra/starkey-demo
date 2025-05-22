"use client";

import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "@/components/ui/card";
import {useEffect, useState} from "react";

import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage,} from "@/components/ui/form";
import {Input} from "@/components/ui/input";
import {ISupraTransaction} from "@/lib/types";
import {copyToClipBoard, shortenAddress} from "@/lib/utils";
import {yupResolver} from "@hookform/resolvers/yup";
import {ethers} from "ethers";
import {Copy, ExternalLink, Loader2,} from "lucide-react";
import {useForm} from "react-hook-form";
import * as yup from "yup";

import {Checkbox} from "@/components/ui/checkbox";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";
import {Textarea} from "@/components/ui/textarea";
import Link from "next/link";
import nacl from "tweetnacl";
import {useSearchParams} from "next/navigation";
// @ts-ignore
import {BCS, HexString, SupraAccount, SupraClient, TxnBuilderTypes} from "supra-l1-sdk";

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
        .default(0)
        .test("maxDecimalPlaces", "Must have 6 decimal or less", (number) =>
            /^\d+(\.\d{1,6})?$/.test(String(number))
        )
        .typeError("Invalid amount")
        .moreThan(0, "Enter valid amount")
        .required("Amount is required"),
    isRawTx: yup.boolean()
});

interface SignMessageResponse {
    address: string;
    publicKey: string;
    signature: string;
    verified: boolean
}

export default function SupraDAppPage() {
    const searchParams = useSearchParams()
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
    const [rawAutoTxLoading, setAutoRawTxLoading] = useState<boolean>(false);
    const [signMsgLoading, setSignMsgLoading] = useState<boolean>(false);
    const [signMessage, setSignMessage] = useState<string>('');
    const [isHexMessage, setIsHexMessage] = useState<boolean>(false);
    const [signatureResp, setSignatureResp] = useState<SignMessageResponse | undefined>(undefined);
    const [transactions, setTransactions] = useState<ISupraTransaction[]>([]);
    const [isSponsorTx, setIsSponsorTx] = useState<boolean>(false);
    const [waitForTransaction, setWaitForTransaction] = useState<boolean>(true);
    const [sponsorPrivateKey, setSponsorPrivateKey] = useState<string>('');
    const [rpcUrl, setRpcUrl] = useState<string>('');


    const [deviceType, setDeviceType] = useState('loading')
    const [autoWalletConnectChecked, setAutoWalletConnectChecked] = useState(false)
    useEffect(() => {
        const userAgent = navigator.userAgent || navigator.vendor
        if (/android/i.test(userAgent)) {
            setDeviceType('mobile') //Android
        } else if (/iPad|iPhone|iPod/.test(userAgent)) {
            setDeviceType('mobile') //iOS
        } else if (/windows|macintosh|linux/i.test(userAgent)) {
            setDeviceType('desktop') //Desktop
        } else {
            setDeviceType('unknown')
        }
    }, [])


    const form = useForm({
        resolver: yupResolver(formSchema),
        defaultValues: {
            address: "",
            amount: undefined,
            isRawTx: false
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
                console.log({data})
                setNetworkData(data)
                setRpcUrl(data.chainId === '8' ? 'https://rpc-wallet-mainnet.supra.com' : 'https://rpc-testnet.supra.com/')
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

    useEffect(() => {
        if (accounts.length === 0) return;
        const intervalId = setInterval(() => {
            updateBalance().then()
        }, 5000);
        return () => {
            clearInterval(intervalId);
        };
    }, [accounts]);


    const connectWallet = async () => {
        setLoading(true)
        const response = await supraProvider.connect();
        console.log({response});
        updateAccounts().then();
        setLoading(false);
    };

    const switchToChain = async () => {
        if (selectedChainId && supraProvider) {
            await supraProvider.changeNetwork({chainId: selectedChainId});
            await getNetworkData()
        }
    };

    const resetWalletWalletData = () => {
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


        /**
         Create serialized raw transaction for entry_function_payload type tx Under the hood the method utilizes createRawTxObject method to create a raw transaction and then it serializes using bcs serializer
         rawTxPayload:
         senderAddr – Sender account address
         senderSequenceNumber – Sender account sequence number
         moduleAddr – Target module address
         moduleName – Target module name
         functionName – Target function name
         functionTypeArgs – Target function type args
         functionArgs – Target function args
         optionalTransactionPayloadArgs – Optional arguments for transaction payload
         Returns:
         Serialized raw transaction object
         */

        const rawTxPayload = [
            accounts[0],
            0,
            "0x8943a2c0dc9b08597cbde5d806bf86c69beb7007a4ac401a7f5b520f994e145c",
            "slot_prediction",
            "create_prediction",
            [],
            [
                BCS.bcsSerializeU256(slot_id),
                BCS.bcsSerializeUint64(coins),
                BCS.bcsSerializeUint64(reference_price),
            ],
            optionalTransactionPayloadArgs
        ];
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
                options: {
                    waitForTransaction
                }
            }
            const txHash = await supraProvider.sendTransaction(params);
            console.log("txHash :: ", txHash);
            addTransactions(txHash || "failed");
        }
        setRawTxLoading(false);
    };
    const sendAutomationTransaction = async () => {
        console.log("~~ sendAutomationTransaction ~~~");
        setAutoRawTxLoading(true);
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


        /**
         Create serialized raw transaction for entry_function_payload type tx Under the hood the method utilizes createRawTxObject method to create a raw transaction and then it serializes using bcs serializer
         rawTxPayload:
         senderAddr – Sender account address
         senderSequenceNumber – Sender account sequence number
         moduleAddr – Target module address
         moduleName – Target module name
         functionName – Target function name
         functionTypeArgs – Target function type args
         functionArgs – Target function args
         optionalTransactionPayloadArgs – Optional arguments for transaction payload
         Returns:
         Serialized raw transaction object
         */

        const rawTxPayload = [
            accounts[0],
            0,
            "0x8943a2c0dc9b08597cbde5d806bf86c69beb7007a4ac401a7f5b520f994e145c",
            "slot_prediction",
            "create_prediction",
            [],
            [
                BCS.bcsSerializeU256(slot_id),
                BCS.bcsSerializeUint64(coins),
                BCS.bcsSerializeUint64(reference_price),
            ],
            optionalTransactionPayloadArgs
        ];

        console.log("rawTxPayload ::  Automation :: ", rawTxPayload);
        // const data = await supraProvider.createRawTransactionData(rawTxPayload);
        const externalTxdata = 'afc610ec88bed022732ecf6ff7b0f3b06954e5e1e6627099361fa80275681fcc05000000000000000400d4e92056cb0acf11f792ae143f74bc8a2bbbffd4af5d850e18c9da0b30bf1c0e0a6175746f5f746f7075700a6175746f5f746f707570010700000000000000000000000000000000000000000000000000000000000000010a73757072615f636f696e095375707261436f696e0003201095c452baf9c08be68cd920b69601504c584653ec85c337d0fb40514fb74c2e0800e1f505000000000800c2eb0b00000000e803000000000000640000000000000000e1f505000000005078b867000000000020a10700000000006400000000000000f565b86700000000ff';
        console.log("raw Automation Data :: ", externalTxdata);

        console.log("rawTxPayload :: ", rawTxPayload);
        const decodedMessage = Buffer.from(externalTxdata, 'hex').toString('hex')
        const data = new Uint8Array(Buffer.from(decodedMessage, 'hex'))

        if (data) {
            const params = {
                data: data,
                from: accounts[0],
                to: "0xd4e92056cb0acf11f792ae143f74bc8a2bbbffd4af5d850e18c9da0b30bf1c0e",
                chainId: networkData?.chainId,
                value: "",
            };
            console.log("sendAutomationTransaction Data :: ", params);
            const txHash = await supraProvider.sendAutomationTransaction(params);
            console.log("txHash :: ", txHash);
            addTransactions(txHash || "failed");
        }
        setAutoRawTxLoading(false);
    };

    const remove0xPrefix = (hexString: string) => {
        return hexString.startsWith("0x") ? hexString.slice(2) : hexString;
    }
    const handleSignMessage = async () => {
        setSignMsgLoading(true);
        setSignatureResp(undefined)

        const haxString = '0x' + Buffer.from(signMessage, 'utf8').toString('hex')
        let response;
        if (isHexMessage) {
            response = await supraProvider.signHexMessage({message: signMessage})
        } else {
            response = await supraProvider.signMessage({message: haxString})
        }
        console.log('signMessage response :: ', response)
        if (response) {
            const {publicKey, signature, address} = response
            const sign = remove0xPrefix(signature)
            const key = remove0xPrefix(publicKey)
            const verified = nacl.sign.detached.verify(
                isHexMessage ? Uint8Array.from(Buffer.from(signMessage, 'hex')) : new TextEncoder().encode(signMessage),
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

    const onSubmit = async (data: { address: string; amount: number; isRawTx?: boolean }) => {
        try {
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
            if (data.isRawTx) {
                const amountInBigInt = BigInt(amount)
                const receiverAccount = HexString.ensure(data.address)
                const optionalTransactionPayloadArgs = {}
                const rawTxPayload = [
                    accounts[0],
                    0,
                    "0x0000000000000000000000000000000000000000000000000000000000000001",
                    "supra_account",
                    "transfer",
                    [],
                    [receiverAccount.toUint8Array(), BCS.bcsSerializeUint64(amountInBigInt)],
                    optionalTransactionPayloadArgs
                ];
                console.log("rawTxPayload :: ", rawTxPayload, receiverAccount);
                const rawTxData = await supraProvider.createRawTransactionData(rawTxPayload);
                console.log("rawTxData :: ", rawTxData);
                tx.data = rawTxData
            }

            if (isSponsorTx) {
                const supraClient = await SupraClient.init(rpcUrl)
                let feePayerAccount = new SupraAccount(
                    Uint8Array.from(
                        Buffer.from(
                            remove0xPrefix(sponsorPrivateKey),
                            "hex"
                        )
                    )
                );
                const receiverAddress = HexString.ensure(data.address)
                const amountInBigInt = BigInt(amount)
                // Creating RawTransaction for sponsor transaction
                let sponsorTxSupraCoinTransferRawTransaction =
                    await supraClient.createRawTxObject(
                        HexString.ensure(accounts[0]),
                        (await supraClient.getAccountInfo(accounts[0])).sequence_number,
                        "0000000000000000000000000000000000000000000000000000000000000001",
                        "supra_account",
                        "transfer",
                        [],
                        [receiverAddress.toUint8Array(), BCS.bcsSerializeUint64(amountInBigInt)],
                    );

                // Creating Sponsor Transaction Payload
                let sponsorTransactionPayload = new TxnBuilderTypes.FeePayerRawTransaction(
                    sponsorTxSupraCoinTransferRawTransaction,
                    [],
                    new TxnBuilderTypes.AccountAddress(feePayerAccount.address().toUint8Array())
                );
                tx.data = BCS.bcsToBytes(sponsorTransactionPayload)

                // Generating sponsor authenticator
                let feePayerAuthenticator = SupraClient.signSupraMultiTransaction(
                    feePayerAccount,
                    sponsorTransactionPayload
                );

                const signerAuthenticator = await supraProvider.signTransaction(tx);
                if (signerAuthenticator) {
                    const sponsorTxSenderAuthenticator = new TxnBuilderTypes.AccountAuthenticatorEd25519(
                        new TxnBuilderTypes.Ed25519PublicKey(Buffer.from(signerAuthenticator.Ed25519.public_key, "hex")),
                        new TxnBuilderTypes.Ed25519Signature(Buffer.from(signerAuthenticator.Ed25519.signature, "hex"))
                    );
                    const sendSponsorTransaction =
                        await supraClient.sendSponsorTransaction(
                            feePayerAccount.address().toString(),
                            [],
                            sponsorTxSupraCoinTransferRawTransaction,
                            sponsorTxSenderAuthenticator,
                            feePayerAuthenticator,
                            [],
                            {
                                enableWaitForTransaction: true,
                                enableTransactionSimulation: true,
                            }
                        )
                    if (sendSponsorTransaction.result === 'Success') {
                        console.log("txHash :: ", sendSponsorTransaction.txHash);
                        addTransactions(sendSponsorTransaction.txHash);
                    }

                }
                setLoading(false);
                return null

            }
            console.log('sending tx :: ', tx);
            // setTransaction(undefined);
            // @ts-ignore
            const txHash = await supraProvider.sendTransaction({
                ...tx, options: {
                    waitForTransaction
                }
            });
            console.log("~~ txHash :: ", txHash);
            if (txHash) {
                addTransactions(txHash);
            }
            setLoading(false);

        } catch (e) {
            setLoading(false);

        }
    };

    const autoWalletConnect = searchParams.get('wallet_connect_onload') === 'true'
    useEffect(() => {
        if (!autoWalletConnectChecked && autoWalletConnect && supraProvider) {
            void connectWallet();
            setAutoWalletConnectChecked(true)
        }
    }, [autoWalletConnect, supraProvider, autoWalletConnectChecked]);
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

                                    {deviceType === 'mobile' ? (
                                        <>
                                            <p className="lg:text-2xl mt-4"> It looks like you&apos;re using a mobile
                                                browser. </p>
                                            <p className="lg:text-2xl mt-4 mb-4"> To connect, open this page in your
                                                wallet&apos;s dApp browser. </p>

                                            <Link
                                                href={`https://starkey.app/dApps?url=${encodeURIComponent(`${window.location.href}?wallet_connect_onload=true`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block bg-black text-white px-4 py-2 rounded-lg"
                                            >
                                                Open StarKey dApp Browser
                                            </Link>
                                        </>
                                    ) : (
                                        <>
                                            <p className="mb-4">Install the browser extension and create your wallet to
                                                continue.</p>
                                            <Link
                                                href="https://chromewebstore.google.com/detail/starkey-wallet-the-offici/hcjhpkgbmechpabifbggldplacolbkoh" // Replace with your extension link
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block bg-black text-white px-4 py-2 rounded-lg"
                                            >
                                                Download Wallet Extension
                                            </Link>
                                        </>
                                    )}
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
                                                <SelectItem value="8">Supra MainNet (8)</SelectItem>
                                                <SelectItem value="6">Supra TestNet (6)</SelectItem>
                                                <SelectItem value="255">AutoNet (255)</SelectItem>
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


                                <div className={'flex justify-between mt-4'}>
                                    <div>
                                        <div className="flex items-center space-x-2">

                                            <Select
                                                onValueChange={(value) => {
                                                    setIsHexMessage(value === 'hex')
                                                }}
                                                defaultValue={'utf8'}
                                            >
                                                <SelectTrigger className="w-full ">
                                                    <SelectValue placeholder="Select Network"/>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="utf8">UTF8 Message</SelectItem>
                                                    <SelectItem value="hex">Hex Message</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Button
                                            variant={"default"}
                                            disabled={signMsgLoading || signMessage.trim().length === 0}
                                            onClick={handleSignMessage}
                                        >
                                            {signMsgLoading && (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>)}
                                            Sign message
                                        </Button>
                                    </div>
                                </div>

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

                                        <FormField
                                            control={form.control}
                                            name="isRawTx"
                                            render={({field}) => (
                                                <FormItem className="flex items-center gap-2">
                                                    <FormControl>
                                                        <Checkbox checked={field.value}
                                                                  onCheckedChange={field.onChange}/>
                                                    </FormControl>
                                                    <FormLabel className={'!mt-0'}>Send as Raw Transaction</FormLabel>
                                                    <FormMessage/>
                                                </FormItem>
                                            )}
                                        />
                                        <Card className="w-full m-auto mt-4 bg-green-200">

                                            <CardContent className="grid gap-1 text-left  p-2 pt-0">
                                                <label className="inline-flex items-center gap-2 cursor-pointer mt-2">
                                                    <Checkbox
                                                        checked={isSponsorTx}
                                                        onCheckedChange={(value) => {
                                                            setIsSponsorTx(value as boolean);
                                                        }}
                                                    />
                                                    <span className="text-sm font-medium">Sponsor Transaction</span>
                                                </label>
                                                {isSponsorTx &&
                                                    <div className={'mt-4'}>
                                                        <label className="text-sm font-medium">Sponsor private
                                                            key</label>
                                                        <Input
                                                            placeholder="Sponsor private key"
                                                            value={sponsorPrivateKey}
                                                            className={'mt-0'}
                                                            onChange={(event) => {
                                                                setSponsorPrivateKey(event.target.value)
                                                            }}
                                                        />
                                                    </div>
                                                }

                                            </CardContent>
                                        </Card>

                                        <div className="text-center">

                                            <Button type="submit" disabled={loading}>
                                                {loading && (
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                                )}
                                                Send Token
                                            </Button>
                                        </div>
                                        <label className="inline-flex items-center gap-2 cursor-pointer mt-4">
                                            <Checkbox
                                                checked={waitForTransaction}
                                                onCheckedChange={(value) => {
                                                    setWaitForTransaction(value as boolean);
                                                }}
                                            />
                                            <span className="text-sm font-medium text-red-600">Wait for transaction completion</span>
                                        </label>
                                    </form>
                                </Form>

                                <div className={"border-t-2 mt-4"}>
                                    <Button
                                        variant="secondary"
                                        className={"mt-4 w-full"}
                                        disabled={rawAutoTxLoading}
                                        onClick={sendAutomationTransaction}
                                    >
                                        {rawAutoTxLoading && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        )}
                                        Test Automation Transaction
                                    </Button>
                                    <Button
                                        variant={"outline"}
                                        className={"mt-4 w-full"}
                                        disabled={rawTxLoading}
                                        onClick={sendRawTransaction}
                                    >
                                        {rawTxLoading && (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                                        )}
                                        Test Raw Transaction
                                    </Button>
                                </div>
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
