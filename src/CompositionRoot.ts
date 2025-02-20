import { CoreCompetencyD2Repository } from "$/data/repositories/CoreCompetencyD2Repository";
import { DataElementD2Repository } from "$/data/repositories/DataElementD2Repository";
import { DataSetD2Repository } from "$/data/repositories/DataSetD2Repository";
import { DataSetTestRepository } from "$/data/repositories/DataSetTestRepository";
import { IndicatorD2Repository } from "$/data/repositories/IndicatorD2Repository";
import { LogD2Repository } from "$/data/repositories/LogD2Repository";
import { LogTestRepository } from "$/data/repositories/LogTestRepository";
import { OrgUnitD2Repository } from "$/data/repositories/OrgUnitD2Repository";
import { OrgUnitTestRepository } from "$/data/repositories/OrgUnitTestRepository";
import { ProjectD2Repository } from "$/data/repositories/ProjectD2Repository";
import { ProjectTestRepository } from "$/data/repositories/ProjectTestRepository";
import { SharingD2Repository } from "$/data/repositories/SharingD2Repository";
import { SharingRepository } from "$/data/repositories/SharingRepository";
import { SharingTestRepository } from "$/data/repositories/SharingTestRepository";
import { Config } from "$/domain/entities/Config";
import { CoreCompetencyRepository } from "$/domain/repositories/CoreCompetencyRepository";
import { DataElementRepository } from "$/domain/repositories/DataElementRepository";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { IndicatorRepository } from "$/domain/repositories/IndicatorRepository";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { OrgUnitRepository } from "$/domain/repositories/OrgUnitRepository";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";
import { GetAllProjectsUseCase } from "$/domain/usecases/GetAllProjectsUseCase";
import { GetDataSetSettingsUseCase } from "$/domain/usecases/GetDataSetSettingsUseCase";
import { GetDataSetsByIdsUseCase } from "$/domain/usecases/GetDataSetsByIdsUseCase";
import { GetDataSetsUseCase } from "$/domain/usecases/GetDataSetsUseCase";
import { GetIndicatorsUseCase } from "$/domain/usecases/GetIndicatorsUseCase";
import { GetLogsUseCase } from "$/domain/usecases/GetLogsUseCase";
import { GetOrgUnitsByIdsUseCase } from "$/domain/usecases/GetOrgUnitsByIdsUseCase";
import { GetProjectsUseCase } from "$/domain/usecases/GetProjectsUseCase";
import { GetRelatedDataElementsUseCase } from "$/domain/usecases/GetRelatedDataElementsUseCase";
import { MigrateDataSetProjectsUseCase } from "$/domain/usecases/MigrateDataSetProjectsUseCase";
import { RemoveDataSetsUseCase } from "$/domain/usecases/RemoveDataSetsUseCase";
import { SaveDataSetUseCase } from "$/domain/usecases/SaveDataSetUseCase";
import { SaveOrgUnitDataSetUseCase } from "$/domain/usecases/SaveOrgUnitDataSetUseCase";
import { SaveSharingDataSetsUseCase } from "$/domain/usecases/SaveSharingDataSetsUseCase";
import { SearchSharingUseCase } from "$/domain/usecases/SearchSharingUseCase";
import { ValidateDataSetNameUseCase } from "$/domain/usecases/ValidateDataSetNameUseCase";
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
    coreCompetencyRepository: CoreCompetencyRepository;
    indicatorRepository: IndicatorRepository;
    dataElementRepository: DataElementRepository;
};

function getCompositionRoot(repositories: Repositories, config: Config) {
    return {
        dataSets: {
            getByIds: new GetDataSetsByIdsUseCase(repositories.dataSetsRepository),
            getAll: new GetDataSetsUseCase(repositories.dataSetsRepository),
            remove: new RemoveDataSetsUseCase(
                repositories.dataSetsRepository,
                repositories.usersRepository,
                repositories.logRepository
            ),
            saveSharing: new SaveSharingDataSetsUseCase(
                repositories.dataSetsRepository,
                repositories.logRepository,
                repositories.usersRepository
            ),
            saveOrgUnits: new SaveOrgUnitDataSetUseCase(
                repositories.dataSetsRepository,
                repositories.usersRepository,
                repositories.logRepository
            ),
            migrateProjects: new MigrateDataSetProjectsUseCase(
                repositories.dataSetsRepository,
                repositories.projectRepository
            ),
            validateName: new ValidateDataSetNameUseCase(repositories.dataSetsRepository),
            save: new SaveDataSetUseCase(repositories.dataSetsRepository),
            getSettings: new GetDataSetSettingsUseCase(
                repositories.coreCompetencyRepository,
                repositories.indicatorRepository,
                repositories.dataSetsRepository,
                config
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
            getAll: new GetAllProjectsUseCase(repositories.projectRepository),
        },
        sharing: {
            search: new SearchSharingUseCase(repositories.sharingRepository),
        },
        users: { getCurrent: new GetCurrentUserUseCase(repositories.usersRepository) },
        orgUnits: {
            getByIds: new GetOrgUnitsByIdsUseCase(repositories.orgUnitRepository),
        },
        indicators: {
            get: new GetIndicatorsUseCase(repositories.indicatorRepository),
            getRelated: new GetRelatedDataElementsUseCase(repositories.dataElementRepository),
        },
    };
}

export function getWebappCompositionRoot(api: D2Api, config: Config) {
    const repositories: Repositories = {
        usersRepository: new UserD2Repository(api),
        dataSetsRepository: new DataSetD2Repository(api, config),
        sharingRepository: new SharingD2Repository(api),
        logRepository: new LogD2Repository(api),
        projectRepository: new ProjectD2Repository(api, config),
        orgUnitRepository: new OrgUnitD2Repository(api),
        coreCompetencyRepository: new CoreCompetencyD2Repository(api),
        indicatorRepository: new IndicatorD2Repository(api, config),
        dataElementRepository: new DataElementD2Repository(api),
    };

    return getCompositionRoot(repositories, config);
}

export function getTestCompositionRoot() {
    const repositories: Repositories = {
        usersRepository: new UserTestRepository(),
        dataSetsRepository: new DataSetTestRepository(),
        sharingRepository: new SharingTestRepository(),
        logRepository: new LogTestRepository(),
        projectRepository: new ProjectTestRepository(),
        orgUnitRepository: new OrgUnitTestRepository(),
        coreCompetencyRepository: new CoreCompetencyD2Repository({} as D2Api),
        indicatorRepository: new IndicatorD2Repository({} as D2Api, {} as Config),
        dataElementRepository: new DataElementD2Repository({} as D2Api),
    };

    return getCompositionRoot(repositories, {} as Config);
}
