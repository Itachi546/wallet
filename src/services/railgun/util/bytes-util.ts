import { bytes } from '@railgun-community/lepton/dist/utils';
import { trim, randomHex } from '@railgun-community/lepton/dist/utils/bytes';

export const parseRailgunBalanceAddress = (tokenAddress: string): string => {
  return `0x${trim(tokenAddress, 20)}`;
};

export const getRandomBytes = (length: number): string => {
  return randomHex(length);
};

export const bytesWrapper = bytes;
