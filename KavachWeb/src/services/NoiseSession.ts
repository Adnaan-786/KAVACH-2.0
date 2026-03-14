/* eslint-disable no-bitwise */
import nacl from 'tweetnacl';

enum HandshakeState {
  INIT = 'INIT',
  MSG1_SENT = 'MSG1_SENT',
  MSG2_SENT = 'MSG2_SENT',
  ESTABLISHED = 'ESTABLISHED',
  FAILED = 'FAILED',
}

export class NoiseSession {
  public state: string = HandshakeState.INIT;
  public remotePeerId: Uint8Array | null = null;
  public isInitiator: boolean;

  private localStaticPriv: Uint8Array;
  private localStaticPub: Uint8Array;
  private localEphKeys: nacl.BoxKeyPair;
  private remoteEphPub: Uint8Array | null = null;
  private txKey: Uint8Array | null = null;
  private rxKey: Uint8Array | null = null;
  private txNonce = 0;
  private rxNonce = 0;

  constructor(localStaticPub: Uint8Array, localStaticPriv: Uint8Array, isInitiator: boolean) {
    this.localStaticPub = localStaticPub;
    this.localStaticPriv = localStaticPriv;
    this.isInitiator = isInitiator;
    this.localEphKeys = nacl.box.keyPair();
  }

  startHandshake(remotePeerId: Uint8Array): Uint8Array {
    if (!this.isInitiator) throw new Error('Only initiator can start');
    this.remotePeerId = remotePeerId;
    this.state = HandshakeState.MSG1_SENT;
    return this.localEphKeys.publicKey;
  }

  processMessage2(msg2: Uint8Array): Uint8Array {
    if (this.state !== HandshakeState.MSG1_SENT) throw new Error('Invalid state');
    this.remoteEphPub = msg2.slice(0, 32);
    const encrypted = msg2.slice(32);
    const nonce = new Uint8Array(nacl.box.nonceLength);
    const decrypted = nacl.box.open(encrypted, nonce, this.remoteEphPub, this.localEphKeys.secretKey);
    if (!decrypted) { this.state = HandshakeState.FAILED; throw new Error('Msg2 decryption failed'); }
    const myEncrypted = nacl.box(this.localStaticPub, nonce, this.remoteEphPub, this.localEphKeys.secretKey);
    this.deriveSessionKeys();
    this.state = HandshakeState.ESTABLISHED;
    return myEncrypted;
  }

  processMessage1(msg1: Uint8Array): Uint8Array {
    if (this.isInitiator) throw new Error('Initiator cannot process Msg1');
    if (msg1.length !== 32) throw new Error('Msg1 must be 32 bytes');
    this.remoteEphPub = msg1;
    const nonce = new Uint8Array(nacl.box.nonceLength);
    const encrypted = nacl.box(this.localStaticPub, nonce, this.remoteEphPub, this.localEphKeys.secretKey);
    const out = new Uint8Array(32 + encrypted.length);
    out.set(this.localEphKeys.publicKey, 0);
    out.set(encrypted, 32);
    this.state = HandshakeState.MSG2_SENT;
    return out;
  }

  processMessage3(msg3: Uint8Array): void {
    if (this.state !== HandshakeState.MSG2_SENT) throw new Error('Invalid state');
    if (!this.remoteEphPub) throw new Error('Missing remote eph key');
    const nonce = new Uint8Array(nacl.box.nonceLength);
    const decrypted = nacl.box.open(msg3, nonce, this.remoteEphPub, this.localEphKeys.secretKey);
    if (!decrypted) { this.state = HandshakeState.FAILED; throw new Error('Msg3 decryption failed'); }
    this.remotePeerId = decrypted;
    this.deriveSessionKeys();
    this.state = HandshakeState.ESTABLISHED;
  }

  private deriveSessionKeys() {
    if (!this.remoteEphPub) throw new Error('No remote eph key');
    const shared = nacl.scalarMult(this.localEphKeys.secretKey, this.remoteEphPub);
    const hash = nacl.hash(shared);
    const k1 = hash.slice(0, 32);
    const k2 = hash.slice(32, 64);
    if (this.isInitiator) { this.txKey = k1; this.rxKey = k2; }
    else { this.txKey = k2; this.rxKey = k1; }
  }

  encrypt(plaintext: Uint8Array): Uint8Array {
    if (this.state !== 'ESTABLISHED' || !this.txKey) throw new Error('Session not established');
    return nacl.secretbox(plaintext, this.getNonce('tx'), this.txKey);
  }

  decrypt(ciphertext: Uint8Array): Uint8Array {
    if (this.state !== 'ESTABLISHED' || !this.rxKey) throw new Error('Session not established');
    const plaintext = nacl.secretbox.open(ciphertext, this.getNonce('rx'), this.rxKey);
    if (!plaintext) throw new Error('Decrypt failed (MAC mismatch)');
    return plaintext;
  }

  private getNonce(dir: 'tx' | 'rx'): Uint8Array {
    const nonce = new Uint8Array(nacl.secretbox.nonceLength);
    const val = dir === 'tx' ? this.txNonce++ : this.rxNonce++;
    nonce[0] = (val >>> 24) & 0xff;
    nonce[1] = (val >>> 16) & 0xff;
    nonce[2] = (val >>> 8) & 0xff;
    nonce[3] = val & 0xff;
    return nonce;
  }
}
