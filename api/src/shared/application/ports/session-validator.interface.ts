export const SESSION_VALIDATOR_TOKEN = Symbol('SESSION_VALIDATOR_TOKEN');

export interface ISessionValidator {
  validateToken(token: string): Promise<string | null>;
}
