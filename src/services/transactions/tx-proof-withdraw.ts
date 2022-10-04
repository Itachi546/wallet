import {
  RailgunProveTransactionResponse,
  RailgunWalletTokenAmount,
  NetworkName,
  ProofType,
  sanitizeError,
} from '@railgun-community/shared-models';
import {
  generateDummyProofTransactions,
  generateProofTransactions,
  generateTransact,
  generateWithdrawBaseToken,
} from './tx-generator';
import { sendErrorMessage } from '../../utils/logger';
import {
  assertValidEthAddress,
  assertValidRailgunAddress,
} from '../railgun/wallets/wallets';
import { setCachedProvedTransaction } from './proof-cache';
import { getRelayAdaptContractForNetwork } from '../railgun/core/providers';
import { AdaptID , ProverProgressCallback , randomHex } from '@railgun-community/engine';
import { assertNotBlockedAddress } from '../../utils/blocked-address';

export const generateWithdrawProof = async (
  networkName: NetworkName,
  toWalletAddress: string,
  railgunWalletID: string,
  encryptionKey: string,
  tokenAmounts: RailgunWalletTokenAmount[],
  relayerRailgunAddress: Optional<string>,
  relayerFeeTokenAmount: Optional<RailgunWalletTokenAmount>,
  sendWithPublicWallet: boolean,
  progressCallback: ProverProgressCallback,
): Promise<RailgunProveTransactionResponse> => {
  try {
    assertNotBlockedAddress(toWalletAddress);
    assertValidEthAddress(toWalletAddress);
    if (relayerRailgunAddress) {
      assertValidRailgunAddress(relayerRailgunAddress);
    }
    const publicWalletAddress = toWalletAddress;

    setCachedProvedTransaction(undefined);

    const txs = await generateProofTransactions(
      ProofType.Withdraw,
      networkName,
      railgunWalletID,
      publicWalletAddress,
      encryptionKey,
      undefined, // memoText
      tokenAmounts,
      relayerRailgunAddress,
      relayerFeeTokenAmount,
      sendWithPublicWallet,
      progressCallback,
    );
    const populatedTransaction = await generateTransact(txs, networkName);

    setCachedProvedTransaction({
      proofType: ProofType.Withdraw,
      toWalletAddress: publicWalletAddress,
      railgunWalletID,
      memoText: undefined,
      tokenAmounts,
      relayerRailgunAddress,
      relayerFeeTokenAmount,
      populatedTransaction,
      sendWithPublicWallet,
    });
    return {};
  } catch (err) {
    sendErrorMessage(err.stack);
    const railResponse: RailgunProveTransactionResponse = {
      error: sanitizeError(err).message,
    };
    return railResponse;
  }
};

export const generateWithdrawBaseTokenProof = async (
  networkName: NetworkName,
  toWalletAddress: string,
  railgunWalletID: string,
  encryptionKey: string,
  wrappedTokenAmount: RailgunWalletTokenAmount,
  relayerRailgunAddress: Optional<string>,
  relayerFeeTokenAmount: Optional<RailgunWalletTokenAmount>,
  sendWithPublicWallet: boolean,
  progressCallback: ProverProgressCallback,
): Promise<RailgunProveTransactionResponse> => {
  try {
    assertNotBlockedAddress(toWalletAddress);
    assertValidEthAddress(toWalletAddress);
    if (relayerRailgunAddress) {
      assertValidRailgunAddress(relayerRailgunAddress);
    }
    const publicWalletAddress = toWalletAddress;

    setCachedProvedTransaction(undefined);

    const tokenAmounts = [wrappedTokenAmount];

    const relayAdaptContract = getRelayAdaptContractForNetwork(networkName);

    // Generate dummy txs for relay adapt params.
    const dummyTxs = await generateDummyProofTransactions(
      ProofType.WithdrawBaseToken,
      networkName,
      railgunWalletID,
      relayAdaptContract.address,
      encryptionKey,
      undefined, // memoText
      tokenAmounts,
      relayerFeeTokenAmount,
      sendWithPublicWallet,
    );

    const relayAdaptParamsRandom = randomHex(16);
    const relayAdaptParams =
      await relayAdaptContract.getRelayAdaptParamsWithdrawBaseToken(
        dummyTxs,
        toWalletAddress,
        relayAdaptParamsRandom,
      );
    const relayAdaptID: AdaptID = {
      contract: relayAdaptContract.address,
      parameters: relayAdaptParams,
    };

    // Generate final txs with relay adapt ID.
    const txs = await generateProofTransactions(
      ProofType.WithdrawBaseToken,
      networkName,
      railgunWalletID,
      relayAdaptContract.address, // Withdraw to relay contract.
      encryptionKey,
      undefined, // memoText
      tokenAmounts,
      relayerRailgunAddress,
      relayerFeeTokenAmount,
      sendWithPublicWallet,
      progressCallback,
      relayAdaptID,
      false, // useDummyProof
    );

    const populatedTransaction = await generateWithdrawBaseToken(
      txs,
      networkName,
      publicWalletAddress,
      relayAdaptParamsRandom,
      false, // useDummyProof
    );

    setCachedProvedTransaction({
      proofType: ProofType.WithdrawBaseToken,
      toWalletAddress: publicWalletAddress,
      railgunWalletID,
      memoText: undefined,
      tokenAmounts,
      relayerRailgunAddress,
      relayerFeeTokenAmount,
      sendWithPublicWallet,
      populatedTransaction,
    });
    return {};
  } catch (err) {
    sendErrorMessage(err.stack);
    const railResponse: RailgunProveTransactionResponse = {
      error: sanitizeError(err).message,
    };
    return railResponse;
  }
};
