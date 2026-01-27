// src/lib/api-error.ts

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "SERVER_ERROR";


export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
