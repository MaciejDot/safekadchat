import XORValue from "../types/XORValue";

function bitCount(n: any) {
    n = n - ((n >> 1) & 0x55555555);
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
    return (((n + (n >> 4)) & 0xf0f0f0f) * 0x1010101) >> 24;
  }

export default function xor(hashA: Uint8Array, hashB: Uint8Array) {
    let xorCount = 0;
    if (hashA.byteLength !== 32 || hashB.byteLength !== 32) {
      throw '';
    }
    for (let i = 0; i < 32; i += 1) {
      xorCount += bitCount(hashA[i] ^ hashB[i]);
    }
    return xorCount as XORValue;
  }
  