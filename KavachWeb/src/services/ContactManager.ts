export interface Contact {
  name: string;
  meshId: string; // hex pubkey
  addedAt: number;
}

const CONTACTS_KEY = 'kavach_contacts';

class ContactManagerService {
  private contacts: Contact[] = [];
  private listeners: ((contacts: Contact[]) => void)[] = [];

  init() {
    const raw = localStorage.getItem(CONTACTS_KEY);
    if (raw) {
      try { this.contacts = JSON.parse(raw); } catch { this.contacts = []; }
    }
  }

  getContacts(): Contact[] { return [...this.contacts]; }

  addContact(name: string, meshId: string): Contact {
    const existing = this.contacts.find(c => c.meshId === meshId);
    if (existing) throw new Error('Contact already exists');
    const contact: Contact = { name, meshId, addedAt: Date.now() };
    this.contacts.push(contact);
    this.save();
    this.notify();
    return contact;
  }

  removeContact(meshId: string) {
    this.contacts = this.contacts.filter(c => c.meshId !== meshId);
    this.save();
    this.notify();
  }

  getContactName(meshId: string): string | null {
    return this.contacts.find(c => c.meshId === meshId)?.name ?? null;
  }

  private save() {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify(this.contacts));
  }

  onChange(l: (contacts: Contact[]) => void) { this.listeners.push(l); }
  offChange(l: (contacts: Contact[]) => void) { this.listeners = this.listeners.filter(x => x !== l); }
  private notify() { const c = this.getContacts(); this.listeners.forEach(l => l(c)); }
}

export const ContactManager = new ContactManagerService();
