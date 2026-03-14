import bcrypt from 'bcryptjs';
import nacl from 'tweetnacl';

export type AdminKeyPair = {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

const ADMIN_KEY_STORAGE = 'kavach_admin_key';
const ADMIN_PIN_STORAGE = 'kavach_admin_pin';

class AdminAuth {
  private keyPair: AdminKeyPair | null = null;
  private sessionExpiry = 0;
  private SESSION_DURATION = 30 * 60 * 1000;
  private authStateListeners: ((isAuth: boolean) => void)[] = [];

  init() { this.loadAdminKeys(); }

  isAdminSetupComplete(): boolean {
    return !!localStorage.getItem(ADMIN_PIN_STORAGE) && !!localStorage.getItem(ADMIN_KEY_STORAGE);
  }

  async setupAdmin(pin: string): Promise<void> {
    if (pin.length < 6) throw new Error('PIN must be at least 6 characters');
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);
    localStorage.setItem(ADMIN_PIN_STORAGE, pinHash);

    const keypair = nacl.sign.keyPair();
    const secretHex = Array.from(keypair.secretKey).map(b => b.toString(16).padStart(2, '0')).join('');
    localStorage.setItem(ADMIN_KEY_STORAGE, secretHex);
    this.keyPair = { publicKey: keypair.publicKey, secretKey: keypair.secretKey };
    this.sessionExpiry = Date.now() + this.SESSION_DURATION;
    this.notify();
  }

  async login(pin: string): Promise<boolean> {
    const hash = localStorage.getItem(ADMIN_PIN_STORAGE);
    if (!hash) throw new Error('Admin not setup');
    const valid = await bcrypt.compare(pin, hash);
    if (valid) {
      this.sessionExpiry = Date.now() + this.SESSION_DURATION;
      this.loadAdminKeys();
      this.notify();
      return true;
    }
    return false;
  }

  logout() { this.sessionExpiry = 0; this.notify(); }

  isAdminMode(): boolean {
    const valid = Date.now() < this.sessionExpiry;
    if (!valid && this.sessionExpiry > 0) { this.sessionExpiry = 0; this.notify(); }
    else if (valid) { this.sessionExpiry = Date.now() + this.SESSION_DURATION; }
    return valid;
  }

  getAdminSecretKey(): Uint8Array {
    if (!this.isAdminMode() || !this.keyPair) throw new Error('Admin not authenticated');
    return this.keyPair.secretKey;
  }

  getAdminPublicKey(): Uint8Array {
    if (!this.keyPair) throw new Error('Admin keys not loaded');
    return this.keyPair.publicKey;
  }

  private loadAdminKeys() {
    if (this.keyPair) return;
    const hex = localStorage.getItem(ADMIN_KEY_STORAGE);
    if (hex) {
      const bytes = new Uint8Array(hex.length / 2);
      for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
      const kp = nacl.sign.keyPair.fromSecretKey(bytes);
      this.keyPair = { publicKey: kp.publicKey, secretKey: kp.secretKey };
    }
  }

  addStateListener(l: (a: boolean) => void) { this.authStateListeners.push(l); }
  removeStateListener(l: (a: boolean) => void) { this.authStateListeners = this.authStateListeners.filter(x => x !== l); }
  private notify() { const a = this.isAdminMode(); this.authStateListeners.forEach(l => l(a)); }
}

export const AdminAuthService = new AdminAuth();
