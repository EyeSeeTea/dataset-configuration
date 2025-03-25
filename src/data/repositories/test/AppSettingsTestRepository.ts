import { AppSettings } from "$/domain/entities/AppSettings";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsRepository } from "$/domain/repositories/AppSettingsRepository";

export class AppSettingsTestRepository implements AppSettingsRepository {
    get(): FutureData<AppSettings> {
        throw new Error("Method not implemented.");
    }
    save(_appSettings: AppSettings): FutureData<void> {
        throw new Error("Method not implemented.");
    }
}
