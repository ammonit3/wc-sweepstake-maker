import { randomBytes } from "crypto";
export const newId = () => randomBytes(6).toString("base64url");      // ~8-char public id
export const newToken = () => randomBytes(24).toString("base64url");  // private admin token
