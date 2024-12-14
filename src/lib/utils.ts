import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const shortenAddress = (
  address: string,
  prefixLength: number = 6,
  suffixLength: number = 4,
) => {
  if (!address){
    return address
  }
  if (address.length < prefixLength + suffixLength + 2) {
    return address;
  }
  return (
    address.slice(0, prefixLength + 2) + "..." + address.slice(-suffixLength)
  );
};

export const copyToClipBoard = (address: string) => {
  void navigator.clipboard.writeText(address);
};
