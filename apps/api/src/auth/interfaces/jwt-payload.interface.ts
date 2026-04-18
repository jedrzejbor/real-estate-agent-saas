/** Shape of the JWT payload stored in the token. */
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}
