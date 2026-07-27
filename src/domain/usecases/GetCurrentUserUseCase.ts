import { FutureData } from "$/domain/entities/generic/Future";
import { User } from "$/domain/entities/User";
import { UserRepository } from "$/domain/repositories/UserRepository";

export class GetCurrentUserUseCase {
    constructor(private usersRepository: UserRepository) {}

    public execute(): FutureData<User> {
        return this.usersRepository.getCurrent();
    }
}
