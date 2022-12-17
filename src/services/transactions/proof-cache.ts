import { PopulatedTransaction } from '@ethersproject/contracts';
import {
  NetworkName,
  ProofType,
  RailgunNFTAmountRecipient,
  RailgunWalletTokenAmount,
  RailgunWalletTokenAmountRecipient,
  TransactionGasDetailsSerialized,
  ValidateCachedProvedTransactionResponse,
} from '@railgun-community/shared-models';
import { sendErrorMessage } from '../../utils/logger';
import { compareStringArrays } from '../../utils/utils';
import { setGasDetailsForPopulatedTransaction } from './tx-gas-details';
import {
  compareTokenAmountRecipients,
  compareTokenAmountRecipientArrays,
  compareTokenAmountArrays,
  compareNFTAmountRecipientArrays,
} from './tx-notes';

export type ProvedTransaction = {
  proofType: ProofType;
  populatedTransaction: PopulatedTransaction;
  railgunWalletID: string;
  showSenderAddressToRecipient: boolean;
  memoText: Optional<string>;
  tokenAmountRecipients: RailgunWalletTokenAmountRecipient[];
  nftAmountRecipients: RailgunNFTAmountRecipient[];
  relayAdaptUnshieldTokenAmounts: Optional<RailgunWalletTokenAmount[]>;
  relayAdaptShieldTokenAddresses: Optional<string[]>;
  crossContractCallsSerialized: Optional<string[]>;
  relayerFeeTokenAmountRecipient: Optional<RailgunWalletTokenAmountRecipient>;
  sendWithPublicWallet: boolean;
  overallBatchMinGasPrice: Optional<string>;
};

let cachedProvedTransaction: Optional<ProvedTransaction>;

export const populateProvedTransaction = async (
  networkName: NetworkName,
  proofType: ProofType,
  railgunWalletID: string,
  showSenderAddressToRecipient: boolean,
  memoText: Optional<string>,
  tokenAmountRecipients: RailgunWalletTokenAmountRecipient[],
  nftAmountRecipients: RailgunNFTAmountRecipient[],
  relayAdaptUnshieldTokenAmounts: Optional<RailgunWalletTokenAmount[]>,
  relayAdaptShieldTokenAddresses: Optional<string[]>,
  crossContractCallsSerialized: Optional<string[]>,
  relayerFeeTokenAmountRecipient: Optional<RailgunWalletTokenAmountRecipient>,
  sendWithPublicWallet: boolean,
  overallBatchMinGasPrice: Optional<string>,
  gasDetailsSerialized: TransactionGasDetailsSerialized,
): Promise<PopulatedTransaction> => {
  const validation = validateCachedProvedTransaction(
    proofType,
    railgunWalletID,
    showSenderAddressToRecipient,
    memoText,
    tokenAmountRecipients,
    nftAmountRecipients,
    relayAdaptUnshieldTokenAmounts,
    relayAdaptShieldTokenAddresses,
    crossContractCallsSerialized,
    relayerFeeTokenAmountRecipient,
    sendWithPublicWallet,
    overallBatchMinGasPrice,
  );
  if (!validation.isValid) {
    throw new Error(`Invalid proof for this transaction. ${validation.error}`);
  }

  const { populatedTransaction } = getCachedProvedTransaction();

  setGasDetailsForPopulatedTransaction(
    networkName,
    populatedTransaction,
    gasDetailsSerialized,
    sendWithPublicWallet,
  );

  return populatedTransaction;
};

export const setCachedProvedTransaction = (tx?: ProvedTransaction) => {
  if (tx?.populatedTransaction?.from) {
    throw new Error(`Cannot cache a transaction with a 'from' address.`);
  }
  cachedProvedTransaction = tx;
};

export const getCachedProvedTransaction = (): ProvedTransaction => {
  return cachedProvedTransaction as ProvedTransaction;
};

const shouldValidateTokenAmountRecipients = (proofType: ProofType) => {
  switch (proofType) {
    case ProofType.CrossContractCalls:
      // Skip validation for tokenAmountRecipients, which is not used
      // in this transaction type.
      return false;
    case ProofType.Transfer:
    case ProofType.Unshield:
    case ProofType.UnshieldBaseToken:
      return true;
  }
};

export const validateCachedProvedTransaction = (
  proofType: ProofType,
  railgunWalletID: string,
  showSenderAddressToRecipient: boolean,
  memoText: Optional<string>,
  tokenAmountRecipients: RailgunWalletTokenAmountRecipient[],
  nftAmountRecipients: RailgunNFTAmountRecipient[],
  relayAdaptUnshieldTokenAmounts: Optional<RailgunWalletTokenAmount[]>,
  relayAdaptShieldTokenAddresses: Optional<string[]>,
  crossContractCallsSerialized: Optional<string[]>,
  relayerFeeTokenAmountRecipient: Optional<RailgunWalletTokenAmountRecipient>,
  sendWithPublicWallet: boolean,
  overallBatchMinGasPrice: Optional<string>,
): ValidateCachedProvedTransactionResponse => {
  let error: Optional<string>;
  if (!cachedProvedTransaction) {
    error = 'No proof found.';
  } else if (cachedProvedTransaction.proofType !== proofType) {
    error = 'Mismatch: proofType.';
  } else if (cachedProvedTransaction.railgunWalletID !== railgunWalletID) {
    error = 'Mismatch: railgunWalletID.';
  } else if (
    proofType === ProofType.Transfer &&
    cachedProvedTransaction.showSenderAddressToRecipient !==
      showSenderAddressToRecipient
  ) {
    error = 'Mismatch: showSenderAddressToRecipient.';
  } else if (
    proofType === ProofType.Transfer &&
    cachedProvedTransaction.memoText !== memoText
  ) {
    error = 'Mismatch: memoText.';
  } else if (
    shouldValidateTokenAmountRecipients(proofType) &&
    !compareTokenAmountRecipientArrays(
      tokenAmountRecipients,
      cachedProvedTransaction.tokenAmountRecipients,
    )
  ) {
    error = 'Mismatch: tokenAmountRecipients.';
  } else if (
    !compareNFTAmountRecipientArrays(
      nftAmountRecipients,
      cachedProvedTransaction.nftAmountRecipients,
    )
  ) {
    error = 'Mismatch: nftAmountRecipients.';
  } else if (
    !compareTokenAmountArrays(
      relayAdaptUnshieldTokenAmounts,
      cachedProvedTransaction.relayAdaptUnshieldTokenAmounts,
    )
  ) {
    error = 'Mismatch: relayAdaptUnshieldTokenAmounts.';
  } else if (
    !compareStringArrays(
      relayAdaptShieldTokenAddresses,
      cachedProvedTransaction.relayAdaptShieldTokenAddresses,
    )
  ) {
    error = 'Mismatch: relayAdaptShieldTokenAddresses.';
  } else if (
    !compareStringArrays(
      crossContractCallsSerialized,
      cachedProvedTransaction.crossContractCallsSerialized,
    )
  ) {
    error = 'Mismatch: crossContractCallsSerialized.';
  } else if (
    !compareTokenAmountRecipients(
      cachedProvedTransaction.relayerFeeTokenAmountRecipient,
      relayerFeeTokenAmountRecipient,
    )
  ) {
    error = 'Mismatch: relayerFeeTokenAmountRecipient.';
  } else if (
    sendWithPublicWallet !== cachedProvedTransaction.sendWithPublicWallet
  ) {
    error = 'Mismatch: sendWithPublicWallet.';
  } else if (
    overallBatchMinGasPrice !== cachedProvedTransaction.overallBatchMinGasPrice
  ) {
    error = 'Mismatch: overallBatchMinGasPrice.';
  }

  if (error) {
    sendErrorMessage(error);
    return {
      error,
      isValid: false,
    };
  }

  return {
    isValid: true,
  };
};
