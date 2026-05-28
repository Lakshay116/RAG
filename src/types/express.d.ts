import { UserRole } from "../models/types";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        tenantId: string;
        role: UserRole;
      };
    }
  }
}

export {};
