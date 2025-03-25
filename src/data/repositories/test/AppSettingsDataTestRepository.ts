import { AppSettingsData } from "$/domain/entities/AppSettingsData";
import { FutureData } from "$/domain/entities/generic/Future";
import { AppSettingsDataRepository } from "$/domain/repositories/AppSettingsDataRepository";

export class AppSettingsDataTestRepository implements AppSettingsDataRepository {
    get(): FutureData<AppSettingsData> {
        throw new Error("Method not implemented.");
    }
}
