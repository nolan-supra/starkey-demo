# Star Key Web Wallet Connect Demo

This demo site for test **StarKey** Wallet connect


## Run Locally

Clone the project

```bash
  git clone git@github.com:Entropy-Foundation/frontend-web-wallet-connect-demo.git
```

Go to the project directory

```bash
  cd frontend-web-wallet-connect-demo
```

Install dependencies

```bash
  yarn install
```

Start the development server

```bash
  yarn dev
```

Start the production server

```bash
  yarn build
  yarn start
```

## API for connect StarKey Wallet with website

- [Check extension is installed or not](#check-extension-is-installed-or-not)
- [Connect wallet](#connect-wallet)
- [Get current connected account](#get-current-connected-account)
- [Get token balance](#get-token-balance)
- [Send-token](#send-token)
- [Subscribe extension event](#subscribe-extension-event)
- [All events](#all-events)


#### Check extension is installed or not
```javascript
if (window?.starKeyWallet || window?.starKey) {
  console.log('Extension installed');
}else{
  console.log('Extension not installed');
}
```

#### Connect wallet

```javascript
window.starKeyWallet.connectWallet();

OR

window.starKeyWallet.connectWallet({
	multiple: false,
	network: 'ETH'
})

```


####  Get current connected account
```javascript
const currentAccount = await window.starKeyWallet.getCurrentAccount();
```


####  Get token balance
```javascript
const balance = await window.starKeyWallet.getBalance();
```


####  Send token
```javascript
 const tx = {
      toAddress: '0x8d8313ac41a47908ea3cc4497d68f864472f1b792c6855eba20d206324702e0e',
      amount: 0.0001,
      token: 'SUPRA',
    };

    const sendTX = await starKeyWallet.sendTokenAmount(tx);
    console.log({ sendTX });
```

####  Subscribe extension event
```javascript
window?.starKeyWallet?.onMessage((message) => {
    console.log('~~~Message received:~~~', message);   
})
```

####  All events

| Event name                      | Type         | Description      |
|:--------------------------------|--------------|------------------|
| `starkey-window-open`           | Connection   |                  |
| `starkey-window-remove`         | Connection   |                  | 
| `starkey-wallet-connected`      | Connection   |                  |
| `starkey-wallet-disconnected`   | Connection   |                  |
| `starkey-wallet-updated`        | Account Info |                  |
| `starkey-transaction-initiated` | Transaction  |                  |
| `starkey-transaction-decline`   | Transaction  |                  |
| `starkey-transaction-failed`    | Transaction  |                  |
| `starkey-transaction-success`   | Transaction  |                  | 
