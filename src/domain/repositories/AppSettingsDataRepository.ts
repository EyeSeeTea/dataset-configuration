import { AppSettingsData } from "$/domain/entities/AppSettingsData";
import { FutureData } from "$/domain/entities/generic/Future";

export interface AppSettingsDataRepository {
    get(): FutureData<AppSettingsData>;
}
