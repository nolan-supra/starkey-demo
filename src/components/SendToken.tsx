"use client";

import * as React from "react";
import { ISendTokenProps } from "@/lib/types";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { yupResolver } from "@hookform/resolvers/yup";
import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { copyToClipBoard, shortenAddress } from "@/lib/utils";

const formSchema = yup.object().shape({
  address: yup
    .string()
    .required("Address is required")
    .matches(/^0x[a-zA-Z0-9]{32,}$/, "Invalid address"),
  amount: yup
    .number()
    .test("maxDecimalPlaces", "Must have 6 decimal or less", (number) =>
      /^\d+(\.\d{1,6})?$/.test(String(number)),
    )
    .typeError("Invalid amount")
    .moreThan(0, "Enter valid amount")
    .required("Amount is required"),
});

const SendToken = ({
  walletAccount,
  walletBalance,
  starKeyWallet,
}: ISendTokenProps) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<any>();

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

  const handleTransactionEvents = (event: any) => {
    if (event?.data?.name?.startsWith("starkey-transaction-")) {
      console.log(event?.data?.name);
      console.log(event?.data?.data?.tx);

      const status = event?.data?.name?.replace("starkey-transaction-", "");
      const tx = event?.data?.data?.tx;
      setTransaction({ ...tx, status });

      if (status === "decline" || status == "success") {
        setLoading(false);
      }
      if (status == "success") {
        form.reset();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("message", handleTransactionEvents);

    return () => {
      window.removeEventListener("message", handleTransactionEvents);
    };
  }, []);

  const onSubmit = async (data: { address: string; amount: number }) => {
    console.log(data);

    const tx = {
      toAddress: data.address,
      amount: data.amount,
      token: walletAccount?.currentNetwork?.networkName,
    };
    setTransaction(undefined);
    // @ts-ignore
    const sendTX = await starKeyWallet.sendTokenAmount(tx);
    console.log({ sendTX });
    // form.reset();
    setLoading(true);
  };

  return (
    <>
      <Card className="w-[350px] m-auto mt-10">
        <CardHeader>
          <CardTitle>Send Token</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-left">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      {transaction && (
        <Card className="w-[350px] m-auto mt-10">
          <CardContent className="py-6">
            <div className="flex justify-between">
              <Badge variant="outline" className={"h-7"}>
                {transaction?.amount}{" "}
                {walletBalance && walletBalance.displayUnit}
              </Badge>

              <Badge className="h-7 capitalize">{transaction?.status}</Badge>
            </div>

            {transaction?.transactionHash && (
              <div className="flex text-center w-full mt-6">
                <Button
                  className="rounded-tr-none rounded-br-none w-full"
                  variant="secondary"
                  size={"sm"}
                >
                  {shortenAddress(transaction?.transactionHash)}
                </Button>
                <Button
                  onClick={() => {
                    copyToClipBoard(transaction?.transactionHash as string);
                  }}
                  className="border-l-1 rounded-tl-none rounded-bl-none"
                  color={"primary"}
                  size={"sm"}
                >
                  Copy Hash
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default SendToken;
