/* eslint-disable no-bitwise */

class BitArray {
  private array: Uint32Array;
  constructor(public lengthBits: number) {
    const intCount = ((lengthBits - 1) >>> 5) + 1;
    this.array = new Uint32Array(intCount);
  }
  set(index: number) {
    this.array[index >>> 5] |= (1 << (index & 31));
  }
  get(index: number): boolean {
    return (this.array[index >>> 5] & (1 << (index & 31))) !== 0;
  }
  clear() { this.array.fill(0); }
}

export class MessageBloomFilter {
  private bitArray: BitArray;
  private size: number;
  private hashCount: number;
  private lastResetDate: number;
  private resetIntervalMs = 30 * 60 * 1000;

  constructor(expectedItems = 10000, falsePositiveProbability = 0.01) {
    this.size = Math.ceil(-(expectedItems * Math.log(falsePositiveProbability)) / Math.pow(Math.log(2), 2));
    this.hashCount = Math.max(1, Math.round((this.size / expectedItems) * Math.log(2)));
    this.bitArray = new BitArray(this.size);
    this.lastResetDate = Date.now();
  }

  private checkAndReset() {
    if (Date.now() - this.lastResetDate > this.resetIntervalMs) {
      this.bitArray.clear();
      this.lastResetDate = Date.now();
    }
  }

  private getIndices(messageIdBytes: Uint8Array): number[] {
    const indices: number[] = [];
    for (let i = 0; i < this.hashCount; i++) {
      const offset = (i * 4) % (messageIdBytes.length - 3);
      let hashInt = (messageIdBytes[offset] << 24) |
                    (messageIdBytes[offset + 1] << 16) |
                    (messageIdBytes[offset + 2] << 8) |
                    (messageIdBytes[offset + 3]);
      let index = hashInt % this.size;
      if (index < 0) index += this.size;
      indices.push(index);
    }
    return indices;
  }

  add(messageIdBytes: Uint8Array) {
    this.checkAndReset();
    for (const idx of this.getIndices(messageIdBytes)) this.bitArray.set(idx);
  }

  has(messageIdBytes: Uint8Array): boolean {
    this.checkAndReset();
    for (const idx of this.getIndices(messageIdBytes)) {
      if (!this.bitArray.get(idx)) return false;
    }
    return true;
  }
}

export const GlobalBloomFilter = new MessageBloomFilter(10000, 0.001);
