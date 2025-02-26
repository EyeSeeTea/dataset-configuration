import { AppSettingsData } from "$/domain/entities/AppSettingsData";
import { User } from "$/domain/entities/User";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsDataRepository } from "$/domain/repositories/AppSettingsDataRepository";
import { throwUserNotAdminError } from "$/domain/usecases/common/UserUtils";

export class GetAppSettingsDataUseCase {
    constructor(private appSettingsRepository: AppSettingsDataRepository) {}

    execute(user: User): FutureData<AppSettingsData> {
        return user.isAdmin() ? this.appSettingsRepository.get() : throwUserNotAdminError();
    }
}
