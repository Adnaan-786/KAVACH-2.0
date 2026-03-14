export enum PacketType {
  HANDSHAKE_1 = 0x01,
  HANDSHAKE_2 = 0x02,
  HANDSHAKE_3 = 0x03,
  ENCRYPTED_MESSAGE = 0x10,
  RELAY = 0x20,
}

export interface Packet {
  type: PacketType;
  senderId: Uint8Array;    // 32 bytes (X25519 PubKey)
  recipientId: Uint8Array; // 32 bytes (X25519 PubKey)
  hopCount: number;        // 1 byte
  ttl: number;             // 1 byte
  payload: Uint8Array;     // Variable length
}

const HEADER_SIZE = 67;

export class PacketSerializer {
  static serialize(packet: Packet): Uint8Array {
    const payloadLen = packet.payload.length;
    const buffer = new Uint8Array(HEADER_SIZE + payloadLen);
    buffer[0] = packet.type;
    buffer.set(packet.senderId, 1);
    buffer.set(packet.recipientId, 33);
    buffer[65] = packet.hopCount;
    buffer[66] = packet.ttl;
    if (payloadLen > 0) buffer.set(packet.payload, HEADER_SIZE);
    return buffer;
  }

  static deserialize(buffer: Uint8Array): Packet {
    if (buffer.length < HEADER_SIZE) {
      throw new Error(`Packet too small: ${buffer.length} bytes`);
    }
    return {
      type: buffer[0] as PacketType,
      senderId: buffer.slice(1, 33),
      recipientId: buffer.slice(33, 65),
      hopCount: buffer[65],
      ttl: buffer[66],
      payload: buffer.slice(HEADER_SIZE),
    };
  }
}
