import nacl from 'tweetnacl';

export type KeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

const KEY_STORAGE = 'kavach_identity_key';

class KeyManagerService {
  private keyPair: KeyPair | null = null;
  private isInitialized = false;

  init(): void {
    if (this.isInitialized) return;

    const stored = localStorage.getItem(KEY_STORAGE);
    if (stored) {
      const secretBytes = new Uint8Array(stored.length / 2);
      for (let i = 0; i < stored.length; i += 2) {
        secretBytes[i / 2] = parseInt(stored.substring(i, i + 2), 16);
      }
      const keypair = nacl.box.keyPair.fromSecretKey(secretBytes);
      this.keyPair = { publicKey: keypair.publicKey, secretKey: keypair.secretKey };
    } else {
      const keypair = nacl.box.keyPair();
      const secretHex = Array.from(keypair.secretKey)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      localStorage.setItem(KEY_STORAGE, secretHex);
      this.keyPair = { publicKey: keypair.publicKey, secretKey: keypair.secretKey };
    }

    this.isInitialized = true;
  }

  getPublicKey(): Uint8Array {
    this.ensureInit();
    return this.keyPair!.publicKey;
  }

  getPeerId(): string {
    return Array.from(this.getPublicKey())
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  getPrivateKey(): Uint8Array {
    this.ensureInit();
    return this.keyPair!.secretKey;
  }

  getKeyPair(): KeyPair {
    this.ensureInit();
    return this.keyPair!;
  }

  private ensureInit() {
    if (!this.isInitialized || !this.keyPair) {
      throw new Error('KeyManager not initialized. Call init() first.');
    }
  }
}

export const KeyManager = new KeyManagerService();
