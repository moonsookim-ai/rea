// Minimal tagged Result used across the CDX core. Expected format failures
// are values, not exceptions, so callers can keep partial facts.

export type CdxErrorCode =
  | "not-cdx" // magic is not "VjCD0100"
  | "truncated" // data ended inside a header, tag, length or payload
  | "unterminated" // data ended with objects still open
  | "too-deep" // nesting exceeded MAX_DEPTH
  | "not-base64" // base64 wrapper could not be decoded
  | "not-xml" // CDXML text is not well-formed XML
  | "not-cdxml" // well-formed XML whose root is not <CDXML>
  | "not-zip" // PPTX/DOCX container could not be read
  | "not-cfb"; // OLE compound file could not be read

export interface CdxError {
  readonly code: CdxErrorCode;
  readonly message: string;
  /** Byte offset in the (decoded) CDX stream where the problem was found. */
  readonly offset: number;
}

export type Result<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: CdxError };

export const ok = <T>(value: T): Result<T> => ({ ok: true, value });

export const fail = <T>(
  code: CdxErrorCode,
  message: string,
  offset: number,
): Result<T> => ({ ok: false, error: { code, message, offset } });
