import { DataSetD2Repository } from "$/data/repositories/DataSetD2Repository";
import { DataSetTestRepository } from "$/data/repositories/DataSetTestRepository";
import { LogD2Repository } from "$/data/repositories/LogD2Repository";
import { LogTestRepository } from "$/data/repositories/LogTestRepository";
import { SharingD2Repository } from "$/data/repositories/SharingD2Repository";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { SharingTestRepository } from "$/data/repositories/SharingTestRepository";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { GetDataSetsByIdsUseCase } from "$/domain/usecases/GetDataSetsByIdsUseCase";
import { GetDataSetsUseCase } from "$/domain/usecases/GetDataSetsUseCase";
import { GetLogsUseCase } from "$/domain/usecases/GetLogsUseCase";
import { RemoveDataSetsUseCase } from "$/domain/usecases/RemoveDataSetsUseCase";
import { SaveOrgUnitDataSetUseCase } from "$/domain/usecases/SaveOrgUnitDataSetUseCase";
import { SaveSharingDataSetsUseCase } from "$/domain/usecases/SaveSharingDataSetsUseCase";
import { SearchSharingUseCase } from "$/domain/usecases/SearchSharingUseCase";
import { UserD2Repository } from "./data/repositories/UserD2Repository";
import { UserTestRepository } from "./data/repositories/UserTestRepository";
import { UserRepository } from "./domain/repositories/UserRepository";
import { GetCurrentUserUseCase } from "./domain/usecases/GetCurrentUserUseCase";
import { D2Api } from "./types/d2-api";

export type CompositionRoot = ReturnType<typeof getCompositionRoot>;

type Repositories = {
    sharingRepository: SharingRepository;
    usersRepository: UserRepository;
    dataSetsRepository: DataSetRepository;
    logRepository: LogRepository;
};

function getCompositionRoot(repositories: Repositories) {
    return {
        dataSets: {
            getByIds: new GetDataSetsByIdsUseCase(repositories.dataSetsRepository),
            getAll: new GetDataSetsUseCase(repositories.dataSetsRepository),
            remove: new RemoveDataSetsUseCase(repositories.dataSetsRepository),
            save: new SaveSharingDataSetsUseCase(repositories.dataSetsRepository),
            saveOrgUnits: new SaveOrgUnitDataSetUseCase(repositories.dataSetsRepository),
        },
        logs: {
            getByDataSets: new GetLogsUseCase(
                repositories.dataSetsRepository,
                repositories.logRepository
            ),
        },
        sharing: {
            search: new SearchSharingUseCase(repositories.sharingRepository),
        },
        users: { getCurrent: new GetCurrentUserUseCase(repositories.usersRepository) },
    };
}

export function getWebappCompositionRoot(api: D2Api) {
    const repositories: Repositories = {
        usersRepository: new UserD2Repository(api),
        dataSetsRepository: new DataSetD2Repository(api),
        sharingRepository: new SharingD2Repository(api),
        logRepository: new LogD2Repository(api),
    };

    return getCompositionRoot(repositories);
}

export function getTestCompositionRoot() {
    const repositories: Repositories = {
        usersRepository: new UserTestRepository(),
        dataSetsRepository: new DataSetTestRepository(),
        sharingRepository: new SharingTestRepository(),
        logRepository: new LogTestRepository(),
    };

    return getCompositionRoot(repositories);
}
