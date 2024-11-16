import { expect } from "chai";

import { awaitAllDecryptionResults } from "../asyncDecrypt";
import { createInstances } from "../instance";
import { getSigners, initSigners } from "../signers";
import { waitNBlocks } from "../utils";
import { deployConfidentialERC20Fixture } from "./confidentialerc20.fixture";

describe("Confidential ERC20 tests", function () {
  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const contract = await deployConfidentialERC20Fixture();
    this.contractAddress = await contract.getAddress();
    this.erc20 = contract;
    this.instances = await createInstances(this.signers);
  });

  it.skip("should not transfer tokens between two users", async function () {
    const transaction = await this.erc20.mint(1000);
    await transaction.wait();

    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(1337);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    await tx.wait();

    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice.address);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );

    expect(balanceAlice).to.equal(1000);

    // Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob.address);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );

    expect(balanceBob).to.equal(0);
  });

  it.skip("should transfer tokens between two users", async function () {
    const transaction = await this.erc20.mint(10000);
    const t1 = await transaction.wait();
    expect(t1?.status).to.eq(1);

    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(1337);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20["transfer(address,bytes32,bytes)"](
      this.signers.bob.address,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    const t2 = await tx.wait();
    expect(t2?.status).to.eq(1);

    // Reencrypt Alice's balance
    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );

    expect(balanceAlice).to.equal(10000 - 1337);

    // Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );

    expect(balanceBob).to.equal(1337);

    // on the other hand, Bob should be unable to read Alice's balance
    try {
      await this.instances.bob.reencrypt(
        balanceHandleAlice,
        privateKeyBob,
        publicKeyBob,
        signatureBob.replace("0x", ""),
        this.contractAddress,
        this.signers.bob.address,
      );
      return expect.fail("Expected an error to be thrown - Bob should not be able to reencrypt Alice balance");
    } catch (error: unknown) {
      expect((error as Error).message).to.equal("User is not authorized to reencrypt this handle!");
    }
  });

  it.skip("should mint to alice", async function () {
    const transaction = await this.erc20.mint(1000);

    await transaction.wait();

    //Reencrypt Alice's balance
    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice.address);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(balanceAlice).to.equal(1000);

    const totalSupply = await this.erc20._totalSupply();
    expect(totalSupply).to.equal(1000);
  });

  it.skip("should mint tokens to Alice and decrypt her balance successfully", async function () {
    const transaction = await this.erc20.mint(1000);

    await transaction.wait();

    //Reencrypt Alice's balance
    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice.address);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(balanceAlice).to.equal(1000);

    const totalSupply = await this.erc20._totalSupply();
    expect(totalSupply).to.equal(1000);

    const decryptionTx = await this.erc20.requestUserBalanceDecryption(this.signers.alice.address);
    await decryptionTx.wait(1);
    await awaitAllDecryptionResults();
  });

  // This test mints the token to alice and alice starts the stream with receiver as bob.
  // Waits for 5 block to be mined
  // Alice (sender) cancels the streams by passing the stream ID and generated proof
  // Bob gets the amount 5 units of token since the streamedBalance is timeElapsed * ratePerSecond (5*1)
  // Bob balance is checked to confirm the balance via reencrypt

  it("should mint to alice and starts the stream to bob and cancel and check bob balance", async function () {
    const transaction = await this.erc20.mint(1000);

    await transaction.wait();

    const startStreamTransaction = await this.erc20.startStream(this.signers.bob.address);
    await startStreamTransaction.wait();

    waitNBlocks(5);

    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.alice.address);
    input.add64(5);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20["stopStream(uint64,bytes32,bytes)"](
      1,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    const t2 = await tx.wait();
    expect(t2?.status).to.eq(1);

    // Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );
    expect(balanceBob).to.equal(5);
  });

  // This time the timeElpased is 5 sec so the withdrawable amount is 5 sec *1 5units of tokens
  it("should mint to alice and starts the stream to bob and bob withdraws", async function () {
    const transaction = await this.erc20.mint(1000);

    await transaction.wait();
    const balanceHandleAlice = await this.erc20.balanceOf(this.signers.alice.address);
    const { publicKey: publicKeyAlice, privateKey: privateKeyAlice } = this.instances.alice.generateKeypair();
    const eip712 = this.instances.alice.createEIP712(publicKeyAlice, this.contractAddress);
    const signatureAlice = await this.signers.alice.signTypedData(
      eip712.domain,
      { Reencrypt: eip712.types.Reencrypt },
      eip712.message,
    );
    const balanceAlice = await this.instances.alice.reencrypt(
      balanceHandleAlice,
      privateKeyAlice,
      publicKeyAlice,
      signatureAlice.replace("0x", ""),
      this.contractAddress,
      this.signers.alice.address,
    );
    expect(balanceAlice).to.equal(1000);

    const totalSupply = await this.erc20._totalSupply();
    expect(totalSupply).to.equal(1000);

    const startStreamTransaction = await this.erc20.startStream(this.signers.bob.address);
    await startStreamTransaction.wait();
    // increase the time stamp
    waitNBlocks(5);
    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input.add64(5);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20
      .connect(this.signers.bob)
      ["WithdrawFromStream(uint64,bytes32,bytes)"](
        1,
        encryptedTransferAmount.handles[0],
        encryptedTransferAmount.inputProof,
      );
    const t2 = await tx.wait();
    expect(t2?.status).to.eq(1);

    // Reencrypt Bob's balance
    const balanceHandleBob = await this.erc20.balanceOf(this.signers.bob);

    const { publicKey: publicKeyBob, privateKey: privateKeyBob } = this.instances.bob.generateKeypair();
    const eip712Bob = this.instances.bob.createEIP712(publicKeyBob, this.contractAddress);
    const signatureBob = await this.signers.bob.signTypedData(
      eip712Bob.domain,
      { Reencrypt: eip712Bob.types.Reencrypt },
      eip712Bob.message,
    );
    const balanceBob = await this.instances.bob.reencrypt(
      balanceHandleBob,
      privateKeyBob,
      publicKeyBob,
      signatureBob.replace("0x", ""),
      this.contractAddress,
      this.signers.bob.address,
    );
    expect(balanceBob).to.equal(5);
  });

  it("should revert as neither sender nor receiver call", async function () {
    const transaction = await this.erc20.mint(1000);

    await transaction.wait();

    const startStreamTransaction = await this.erc20.startStream(this.signers.bob.address);
    await startStreamTransaction.wait();
    // increase the time stamp
    waitNBlocks(20);
    const checkStreamBalanceTx = await this.erc20.connect(this.signers.carol).viewAlreadyStreamedBalance(1);
    const alreadyStreamdBalance = await checkStreamBalanceTx.wait();
  });

  it("should fail as alice starts and attempts to withdraw too", async function () {
    const transaction = await this.erc20.mint(1000);

    await transaction.wait();

    const startStreamTransaction = await this.erc20.startStream(this.signers.bob.address);
    await startStreamTransaction.wait();
    // increase the time stamp
    waitNBlocks(10);
    const input = this.instances.alice.createEncryptedInput(this.contractAddress, this.signers.bob.address);
    input.add64(10);
    const encryptedTransferAmount = input.encrypt();
    const tx = await this.erc20["WithdrawFromStream(uint64,bytes32,bytes)"](
      1,
      encryptedTransferAmount.handles[0],
      encryptedTransferAmount.inputProof,
    );
    const t2 = await tx.wait();
    await expect(tx).to.be.revertedWith("Only stream receiver call");
  });
});
