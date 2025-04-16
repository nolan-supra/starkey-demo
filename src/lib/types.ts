export interface IWalletAccount {
  id?: string;
  username: string;
  avatar?: string;
  isAccountImported?: string;
  address: string;
  networkEnvironment?: string;
  currentNetwork?: {
    walletAddress: string;
    networkName: string;
    rpcNetworkName: string;
    chainId: string;
  };
}
export interface IWalletBalance {
  formattedBalance: string;
  displayUnit: string;
}
export interface ISendTokenProps {
  walletAccount: IWalletAccount;
  starKeyWallet: any;
  walletBalance?: IWalletBalance;
}


export interface ISupraTransaction {
  hash: string;
  status?: string;
  from?: string;
  to?: string;
  value?: string;
}
export interface IConnectedWalletProps {
  isConnected: boolean;
  wallet: any;
  accounts: string[];
  chainId: string;
  balance?: bigint;
}