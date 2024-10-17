import { DataSetD2Repository } from "$/data/repositories/DataSetD2Repository";
import { DataSetTestRepository } from "$/data/repositories/DataSetTestRepository";
import { LogD2Repository } from "$/data/repositories/LogD2Repository";
import { LogTestRepository } from "$/data/repositories/LogTestRepository";
import { MetadataD2Repository } from "$/data/repositories/MetadataD2Repository";
import { MetadataTestRepository } from "$/data/repositories/MetadataTestRepository";
import { ProjectD2Repository } from "$/data/repositories/ProjectD2Repository";
import { ProjectTestRepository } from "$/data/repositories/ProjectTestRepository";
import { SharingD2Repository } from "$/data/repositories/SharingD2Repository";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { SharingTestRepository } from "$/data/repositories/SharingTestRepository";
import { MetadataItem } from "$/domain/entities/MetadataItem";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { MetadataRepository } from "$/domain/repositories/MetadataRepository";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";
import { GetDataSetsByIdsUseCase } from "$/domain/usecases/GetDataSetsByIdsUseCase";
import { GetDataSetsUseCase } from "$/domain/usecases/GetDataSetsUseCase";
import { GetLogsUseCase } from "$/domain/usecases/GetLogsUseCase";
import { GetProjectsUseCase } from "$/domain/usecases/GetProjectsUseCase";
import { MigrateDataSetProjectsUseCase } from "$/domain/usecases/MigrateDataSetProjectsUseCase";
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
    projectRepository: ProjectRepository;
    metadataRepository: MetadataRepository;
};

function getCompositionRoot(repositories: Repositories) {
    return {
        dataSets: {
            getByIds: new GetDataSetsByIdsUseCase(repositories.dataSetsRepository),
            getAll: new GetDataSetsUseCase(repositories.dataSetsRepository),
            remove: new RemoveDataSetsUseCase(repositories.dataSetsRepository),
            save: new SaveSharingDataSetsUseCase(repositories.dataSetsRepository),
            saveOrgUnits: new SaveOrgUnitDataSetUseCase(repositories.dataSetsRepository),
            migrateProjects: new MigrateDataSetProjectsUseCase(
                repositories.dataSetsRepository,
                repositories.projectRepository
            ),
        },
        logs: {
            getByDataSets: new GetLogsUseCase(
                repositories.dataSetsRepository,
                repositories.logRepository
            ),
        },
        projects: {
            get: new GetProjectsUseCase(repositories.projectRepository),
        },
        sharing: {
            search: new SearchSharingUseCase(repositories.sharingRepository),
        },
        users: { getCurrent: new GetCurrentUserUseCase(repositories.usersRepository) },
    };
}

export function getWebappCompositionRoot(api: D2Api, metadata: MetadataItem) {
    const repositories: Repositories = {
        usersRepository: new UserD2Repository(api),
        dataSetsRepository: new DataSetD2Repository(api, metadata),
        sharingRepository: new SharingD2Repository(api),
        logRepository: new LogD2Repository(api),
        projectRepository: new ProjectD2Repository(api, metadata),
        metadataRepository: new MetadataD2Repository(api),
    };

    return getCompositionRoot(repositories);
}

export function getTestCompositionRoot() {
    const repositories: Repositories = {
        usersRepository: new UserTestRepository(),
        dataSetsRepository: new DataSetTestRepository(),
        sharingRepository: new SharingTestRepository(),
        logRepository: new LogTestRepository(),
        projectRepository: new ProjectTestRepository(),
        metadataRepository: new MetadataTestRepository(),
    };

    return getCompositionRoot(repositories);
}
