import { UserRole } from "../../entities/User";
import { RoleName } from '../../users/entities/user.entity';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles: RoleName[];
        //role: UserRole;
      };
    }
  }
}

export {};
