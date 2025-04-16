"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const TopNavBar = () => {

    const pathname = usePathname();


    const isActive = (path: string) => pathname === path;

    return (
        <>
            <div className="w-full h-12 bg-[#0f172a]  sticky top-0 z-50">
                <div className="container px-4 h-full">
                    <div className="flex  justify-around items-center h-full">
                        <ul className="flex gap-x-6 text-white">
                            {/* <li>
                                <Link href="/" className={isActive('/') ? 'font-bold' : ''}>
                                    <p>StarKey Connect</p>
                                </Link>
                            </li> */}
                            <li>
                                <Link href="/evm-dapp" className={isActive('/evm-dapp') ? 'font-bold' : ''}>
                                    <p>StarKey EVM dApp</p>
                                </Link>
                            </li>
                            <li>
                                <Link href="/supra-dapp" className={isActive('/supra-dapp') ? 'font-bold' : ''}>
                                    <p>StarKey Supra dApp</p>
                                </Link>
                            </li>
                            <li>
                                <Link href="https://starkey.app/dApps?url=https://app.dexlyn.com?wallet_connect=true" target={'_blank'}>
                                    <p>dApp Browser</p>
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </>
    );
};
export default TopNavBar;