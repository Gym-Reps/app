import * as Crypto from 'expo-crypto';

/**
 * Client-side id generation. Every offline record (trainment, exercise, set) is
 * assigned an id **up front** so `POST /trainments/sync` is idempotent across
 * offline → online retries (the server keys on this id). See specs/05_REGISTER_TRAINMENT.md.
 *
 * `Crypto.randomUUID()` is synchronous, cryptographically random, RFC4122 v4, and
 * available on every platform (Android/iOS/web).
 */
export function newId(): string {
  return Crypto.randomUUID();
}
