import isEqual from "lodash/isEqual";
import _ from "$/domain/entities/generic/Collection";
import { DataSet } from "$/domain/entities/DataSet";
import { Future, FutureData } from "$/domain/entities/generic/Future";
import { DataSetRepository } from "$/domain/repositories/DataSetRepository";
import { getErrors } from "$/domain/entities/generic/Error";
import { DataSetUtils } from "$/domain/usecases/common/DataSetUtils";
import i18n from "$/utils/i18n";
import { NotificationRepository } from "$/domain/repositories/NotificationRepository";
import { User } from "$/domain/entities/User";
import { Config } from "$/domain/entities/Config";
import { UserGroupRepository } from "$/domain/repositories/UserGroupRepository";
import { UserGroup } from "$/domain/entities/UserGroup";
import { ProjectRepository } from "$/domain/repositories/ProjectRepository";
import { Stats } from "$/domain/entities/Stats";
import { Project } from "$/domain/entities/Project";
import { UserUtils } from "$/domain/usecases/common/UserUtils";
import { UserRepository } from "$/domain/repositories/UserRepository";
import { LogRepository } from "$/domain/repositories/LogRepository";
import { DataSetRegisterAction } from "$/webapp/components/dataset-wizard/DataSetWizard";

export class SaveDataSetUseCase {
    private dataSetUtils: DataSetUtils;
    private userUtils: UserUtils;

    constructor(
        private dataSetRepository: DataSetRepository,
        private notificationRepository: NotificationRepository,
        private userGroupRepository: UserGroupRepository,
        private projectRepository: ProjectRepository,
        private userRepository: UserRepository,
        private logRepository: LogRepository,
        private config: Config
    ) {
        this.dataSetUtils = new DataSetUtils(this.dataSetRepository);
        this.userUtils = new UserUtils(this.userRepository, this.logRepository);
    }

    execute(options: SaveDataSetOptions): FutureData<void> {
        return this.userUtils.checkDataSetAccess([options.dataSet]).flatMap(() => {
            const { dataSet } = options;
            return this.validateDataSet(dataSet)
                .flatMap(() => {
                    return this.validateDataSetName(dataSet);
                })
                .flatMap(() => {
                    const dataSetToSave = dataSet.updateShortName();
                    return this.dataSetRepository
                        .save([dataSetToSave])
                        .flatMap(() => {
                            return this.saveProject(dataSet).flatMap(stats => {
                                return this.sendNotification(options, stats.errorMessage);
                            });
                        })
                        .flatMapError(error => {
                            return this.sendNotificationError(options, error.message);
                        });
                });
        });
    }

    private validateDataSet(dataSet: DataSet): FutureData<void> {
        const result = dataSet.validate();
        if (result.length > 0) {
            const errors = getErrors(result);
            return Future.error(new Error(errors.join("\n")));
        } else {
            return Future.void();
        }
    }

    private saveProject(dataSet: DataSet): FutureData<Stats> {
        if (!dataSet.project) return Future.success(Stats.empty());
        return this.projectRepository.getById(dataSet.project.id).flatMap(project => {
            const orgUnitsAreEqual = this.compareOrgUnits(project, dataSet);
            if (orgUnitsAreEqual) return Future.success(Stats.empty());
            return this.projectRepository.save(project.setOrgUnits(dataSet.orgUnits))
                .flatMapError(error => {
                    console.warn("Error saving project, ignoring updates. \n", String(error))
                    return Future.success(Stats.empty());
                });
        });
    }

    private compareOrgUnits(project: Project, dataSet: DataSet): boolean {
        const projectOrgUnits = _(project.orgsUnits)
            .map(orgUnit => orgUnit.id)
            .sort()
            .value();

        const dataSetOrgUnits = _(dataSet.orgUnits)
            .map(orgUnit => orgUnit.id)
            .sort()
            .value();

        return isEqual(projectOrgUnits, dataSetOrgUnits);
    }

    private getUsersGroups(options: SaveDataSetOptions): FutureData<UserGroup[]> {
        const { dataSet } = options;
        const userGroupsCodes = dataSet.getRegionCodesFromAccess();
        const userGroupsNames = userGroupsCodes.map(code => `${code}_M&EDatasetCompletion`);
        return this.userGroupRepository.getByNames(userGroupsNames);
    }

    private sendNotification(
        options: SaveDataSetOptions,
        errorMessageProject: string
    ): FutureData<void> {
        const { dataSet, action, user } = options;

        return this.getUsersGroups(options).flatMap(userGroups => {
            const actionDescription = action === "edit" ? "edited" : "created";

            const { warningTitle, warningBody } = this.getWarningMessages(errorMessageProject);

            const title = `Dataset ${actionDescription}: ${dataSet.name} ${warningTitle}`;
            const body = `Dataset ${actionDescription}: ${dataSet.name} by ${user.name}.${warningBody}`;

            return this.buildUserGroupsAndSendNotification(userGroups, title, body);
        });
    }

    private buildUserGroupsAndSendNotification(
        userGroups: UserGroup[],
        title: string,
        body: string
    ) {
        const userGroupIds = userGroups.map(userGroup => userGroup.id);
        const allRecipientsIds = [this.config.notificationUserGroup?.id].concat(userGroupIds);
        const recipientsIds = _(allRecipientsIds).compact().value();
        return this.notificationRepository.send({
            title,
            body,
            recipients: userGroupIds.concat(recipientsIds),
        });
    }

    private sendNotificationError(
        options: SaveDataSetOptions,
        errorMessage: string
    ): FutureData<void> {
        const { dataSet, user } = options;

        return this.getUsersGroups(options)
            .flatMap(userGroups => {
                const title = i18n.t(
                    "There has been an error when dataset '{{dataSetName}}' was being saved.",
                    {
                        dataSetName: dataSet.name,
                    }
                );
                const currentUserInfo = i18n.t("User: {{username}} ({{userId}})", {
                    username: user.name,
                    userId: user.id,
                    nsSeparator: false,
                });
                const body = [title, currentUserInfo, errorMessage].join("\n\n");

                return this.buildUserGroupsAndSendNotification(userGroups, title, body);
            })
            .flatMap(() => {
                return Future.error(new Error(errorMessage));
            });
    }

    private getWarningMessages(errorMessage: string): {
        warningTitle: string;
        warningBody: string;
    } {
        const warningLabel = i18n.t("with warnings");
        const warningLabelBody = i18n.t("Warnings");
        const includeWarnings = errorMessage.length > 0;
        const warningTitle = includeWarnings ? warningLabel : "";
        const warningBody = includeWarnings ? `\n\n ${warningLabelBody}: \n\n${errorMessage}` : "";
        return { warningTitle, warningBody };
    }

    private validateDataSetName(dataSet: DataSet): FutureData<void> {
        return this.dataSetUtils
            .isDataSetNameDuplicate({
                name: dataSet.name,
                dataSetId: dataSet.id,
            })
            .flatMap(dataSetAlreadyExists => {
                return dataSetAlreadyExists
                    ? Future.error(
                          new Error(
                              i18n.t("Data set name already exists: {{dataSetName}}", {
                                  nsSeparator: false,
                                  dataSetName: dataSet.name,
                              })
                          )
                      )
                    : Future.success(undefined);
            });
    }
}

type SaveDataSetOptions = {
    dataSet: DataSet;
    action: DataSetRegisterAction;
    user: User;
};
