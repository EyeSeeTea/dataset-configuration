import { DataSetD2Repository } from "$/data/repositories/DataSetD2Repository";
import { DataSetTestRepository } from "$/data/repositories/DataSetTestRepository";
import { LogD2Repository } from "$/data/repositories/LogD2Repository";
import { LogTestRepository } from "$/data/repositories/LogTestRepository";
import { OrgUnitD2Repository } from "$/data/repositories/OrgUnitD2Repository";
import { OrgUnitTestRepository } from "$/data/repositories/OrgUnitTestRepository";
import { ProjectD2Repository } from "$/data/repositories/ProjectD2Repository";
import { ProjectTestRepository } from "$/data/repositories/ProjectTestRepository";
import { SharingD2Repository } from "$/data/repositories/SharingD2Repository";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { SharingTestRepository } from "$/data/repositories/SharingTestRepository";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";
import { GetAllProjectsUseCase } from "$/domain/usecases/GetAllProjectsUseCase";
import { GetDataSetsByIdsUseCase } from "$/domain/usecases/GetDataSetsByIdsUseCase";
import { GetDataSetsUseCase } from "$/domain/usecases/GetDataSetsUseCase";
import { GetLogsUseCase } from "$/domain/usecases/GetLogsUseCase";
import { GetOrgUnitsByIdsUseCase } from "$/domain/usecases/GetOrgUnitsByIdsUseCase";
import { GetProjectsUseCase } from "$/domain/usecases/GetProjectsUseCase";
import { MigrateDataSetProjectsUseCase } from "$/domain/usecases/MigrateDataSetProjectsUseCase";
import { RemoveDataSetsUseCase } from "$/domain/usecases/RemoveDataSetsUseCase";
import { SaveDataSetUseCase } from "$/domain/usecases/SaveDataSetUseCase";
import { SaveOrgUnitDataSetUseCase } from "$/domain/usecases/SaveOrgUnitDataSetUseCase";
import { SaveSharingDataSetsUseCase } from "$/domain/usecases/SaveSharingDataSetsUseCase";
import { SearchSharingUseCase } from "$/domain/usecases/SearchSharingUseCase";
import { ValidateNameUseCase } from "$/domain/usecases/ValidateNameUseCase";
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
    orgUnitRepository: OrgUnitRepository;
};

function getCompositionRoot(repositories: Repositories) {
    return {
        dataSets: {
            getByIds: new GetDataSetsByIdsUseCase(repositories.dataSetsRepository),
            getAll: new GetDataSetsUseCase(repositories.dataSetsRepository),
            remove: new RemoveDataSetsUseCase(repositories.dataSetsRepository),
            saveSharing: new SaveSharingDataSetsUseCase(repositories.dataSetsRepository),
            saveOrgUnits: new SaveOrgUnitDataSetUseCase(repositories.dataSetsRepository),
            migrateProjects: new MigrateDataSetProjectsUseCase(
                repositories.dataSetsRepository,
                repositories.projectRepository
            ),
            validateName: new ValidateNameUseCase(repositories.dataSetsRepository),
            save: new SaveDataSetUseCase(repositories.dataSetsRepository),
        },
        logs: {
            getByDataSets: new GetLogsUseCase(
                repositories.dataSetsRepository,
                repositories.logRepository
            ),
        },
        projects: {
            get: new GetProjectsUseCase(repositories.projectRepository),
            getAll: new GetAllProjectsUseCase(repositories.projectRepository),
        },
        sharing: {
            search: new SearchSharingUseCase(repositories.sharingRepository),
        },
        users: { getCurrent: new GetCurrentUserUseCase(repositories.usersRepository) },
        orgUnits: {
            getByIds: new GetOrgUnitsByIdsUseCase(repositories.orgUnitRepository),
        },
    };
}

export function getWebappCompositionRoot(api: D2Api) {
    const repositories: Repositories = {
        usersRepository: new UserD2Repository(api),
        dataSetsRepository: new DataSetD2Repository(api),
        sharingRepository: new SharingD2Repository(api),
        logRepository: new LogD2Repository(api),
        projectRepository: new ProjectD2Repository(api),
        orgUnitRepository: new OrgUnitD2Repository(api),
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
        orgUnitRepository: new OrgUnitTestRepository(),
    };

    return getCompositionRoot(repositories);
}
