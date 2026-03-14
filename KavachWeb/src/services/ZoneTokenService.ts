/* eslint-disable no-bitwise */
import nacl from 'tweetnacl';
import { MeshConfig, saveConfig } from '../config/meshConfig';
import { AdminAuthService } from './AdminAuthService';

const TOKEN_VERSION = 1;
const TOKEN_HEADER = 0x4D;

export class ZoneTokenManager {
  async generateZoneToken(config: MeshConfig, expiryHours: number): Promise<Uint8Array> {
    if (!AdminAuthService.isAdminMode()) throw new Error('Admin auth required');
    const secretKey = AdminAuthService.getAdminSecretKey();
    const publicKey = AdminAuthService.getAdminPublicKey();
    const zoneIdBytes = nacl.randomBytes(8);
    const expiresAt = expiryHours === 0 ? 0 : Math.floor(Date.now() / 1000) + (expiryHours * 3600);
    const builder = new Uint8Array(52 + 64);
    builder[0] = TOKEN_HEADER;
    builder[1] = TOKEN_VERSION;
    builder.set(zoneIdBytes, 2);
    const dv = new DataView(builder.buffer);
    dv.setUint32(10, expiresAt, false);
    builder[14] = Math.abs(config.rssiThreshold) & 0xFF;
    builder[15] = config.maxHops & 0xFF;
    dv.setUint32(16, config.messageTTL, false);
    builder.set(publicKey, 20);
    const signature = nacl.sign.detached(builder.slice(0, 52), secretKey);
    builder.set(signature, 52);
    return builder;
  }

  verifyAndApplyToken(tokenBase64: string): MeshConfig {
    const bin = atob(tokenBase64);
    const token = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) token[i] = bin.charCodeAt(i);
    if (token.length !== 116) throw new Error(`Invalid token length: ${token.length}`);
    if (token[0] !== TOKEN_HEADER || token[1] !== TOKEN_VERSION) throw new Error('Invalid token format');
    const payload = token.slice(0, 52);
    const signature = token.slice(52, 116);
    const adminPubKey = token.slice(20, 52);
    if (!nacl.sign.detached.verify(payload, signature, adminPubKey)) throw new Error('Invalid signature');
    const dv = new DataView(payload.buffer);
    const expiresAt = dv.getUint32(10, false);
    if (expiresAt > 0 && expiresAt < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
    const zoneIdHex = Array.from(payload.slice(2, 10)).map(b => b.toString(16).padStart(2, '0')).join('');
    const config: MeshConfig = {
      rssiThreshold: -(payload[14]),
      maxHops: payload[15],
      messageTTL: dv.getUint32(16, false),
      zoneId: zoneIdHex,
      tokenExpiresAt: expiresAt * 1000,
    };
    saveConfig(config);
    return config;
  }

  tokenToBase64(token: Uint8Array): string {
    return btoa(Array.from(token).map(b => String.fromCharCode(b)).join(''));
  }
}

export const ZoneTokenService = new ZoneTokenManager();
