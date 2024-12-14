"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";

const TopNavBar = () => {

    const pathname = usePathname();


    const isActive = (path: string) => pathname === path;

    return (
        <>
            <div className="w-full h-12 bg-[#0f172a]  sticky top-0 z-10">
                <div className="container px-4 h-full">
                    <div className="flex  justify-around items-center h-full">
                        <ul className="flex gap-x-6 text-white">
                            {/* <li>
                                <Link href="/" className={isActive('/') ? 'font-bold' : ''}>
                                    <p>StarKey Connect</p>
                                </Link>
                            </li> */}
                            <li>
                                <Link href="/starkey" className={isActive('/starkey') ? 'font-bold' : ''}>
                                    <p>StarKey EVM dApp</p>
                                </Link>
                            </li>
                            <li>
                                <Link href="/supra-dapp" className={isActive('/supra-dapp') ? 'font-bold' : ''}>
                                    <p>StarKey Supra dApp</p>
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