Deployed contract address on Inco Rivest Testnet `0x93436463ce84dbE473ff4b2C9Ab732A43C0354f3`

#### Description

Private streaming protocol on top of INCO network. Users would be
able to stream any amount via the open-ended stream created from
`startStream` function by providing just `to`. The protocol uses the confidentiality features via **TFHE** lib to keep the stream amount private. Only the sender and receiver is exposed but the amount and isActive of stream remains private. 

##### Functions and Usage of TFHE

The contract `ConfidentaialStreamERC20.sol` gets extended with new
functions such as `startStream`, `stopStream`, `WithdrawFromStream` and `viewAlreadyStreamedBalance` 

Users can mint the token(SUSD/Stream USD) both private and public via versions of `mint`. 

**Stream Creation**
- Sender calls the `startStream` with just the `to` 
- Stream gets started with ratePerSecond of 1 unit i.e. in 10 seconds 10 units of tokens would be streamed to `to`.
- Only sender can cancel the stream via `stopStream` 

**Withdraw From Stream**
- `to` set by the sender can call this function
- must provide the amount in `encryptedAmount` and `inputProof`
- The amount is retrived in the form of `euint64` using `TFHE.le` and checked if the amount intended to withdraw falls below or equal to amount already streamed and transfer is made.
- block.timestamp is updated in mapping to be consistent with withdraw amount and time calculation

**CalculateStreamedBalance**
- It's the `mul` of `timeElapsed(startTimestamp-now) * ratePerSecond`

**Stop Stream**
- Only sender can call and it transfers the already streamed balance and clears the mapping of streams.
- must provide the amount in `encryptedAmount` and `inputProof`
- The amount is retrived in the form of `euint64` using `TFHE.le` and checked if the amount intended to withdraw falls below or equal to amount already streamed and transfer is made.

**Stream Balance**
- Only can be called by sender or receiver (`from` or `to`)
- Returns the amount from `calculateStreamedBalance`


**Run the Demo via tests**
- A test file `ConfidentialERC20.ts` is there inside the test folder where the the test case `should mint to alice and starts the stream to bob and cancel and check bob balance` is present.
    - This test mints the token to alice and alice starts the stream with receiver as bob.
    - Waits for 5 block to be mined
    - Alice (sender) cancels the streams by passing the stream ID and generated proof
    - Bob gets the amount 5 units of token since the streamedBalance is timeElapsed * ratePerSecond (5*1)
    - Bob balance is checked to confirm the balance via reencrypt

- Clone the Repo
- Inside the cloned `dir`. Run the command

```
pnpm test:rivest
```