import { FutureData } from "$/domain/entities/generic/Future";
import { User } from "$/domain/entities/User";

export interface UserRepository {
    getCurrent(): FutureData<User>;
}
