import _ from "../utils/lodash-mixins";
import { getExistingUserRoleByName } from "../utils/Dhis2Helpers";
import camelCaseToUnderscores from "d2-utilizr/lib/camelCaseToUnderscores";

export default class Settings {
    dataStoreNamespace = "dataset-configuration";

    dataStoreSettingsKey = "settings";

    adminRoleAttributes = {
        name: "DataSet Configuration admin",
        description: "Can change settings of the DataSet Configuration app",
        authorities: ["See DataSet Configuration", "M_dhis-web-maintenance-appmanager"],
    };

    fieldDefinitions = [
        {
            name: "categoryProjectsId",
            type: "d2-object",
            model: "category",
            defaultFilter: "code:eq:GL_Project",
        },
        {
            name: "categoryComboId",
            type: "d2-object",
            model: "categoryCombo",
            defaultFilter: "code:eq:GL_CATBOMBO_ProjectCCTarAct",
        },
        {
            name: "dataElementGroupSetCoreCompetencyId",
            type: "d2-object",
            model: "dataElementGroupSet",
            defaultFilter: "code:eq:GL_CoreComp_DEGROUPSET",
        },
        {
            name: "expiryDays",
            type: "value",
            defaultValue: 0,
        },
        {
            name: "outputEndDate",
            type: "yearlyDate",
            defaultValue: { month: 4, day: 1 },
        },
        {
            name: "outcomeEndDate",
            type: "yearlyDate",
            defaultValue: { month: 5, day: 1 },
        },
        {
            name: "outputLastYearEndDate",
            type: "timePeriod",
            defaultValue: { units: "month", value: 0 },
        },
        {
            name: "outcomeLastYearEndDate",
            type: "timePeriod",
            defaultValue: { units: "month", value: 0 },
        },
        {
            name: "dataElementGroupOutputId",
            type: "d2-object",
            model: "dataElementGroup",
            defaultFilter: "code:eq:GL_Output_DEGROUP",
        },
        {
            name: "dataElementGroupGlobalIndicatorMandatoryId",
            type: "d2-object",
            model: "dataElementGroup",
            defaultFilter: "code:eq:GL_MAND_DEGROUP",
        },
        {
            name: "indicatorGroupGlobalIndicatorMandatoryId",
            type: "d2-object",
            model: "indicatorGroup",
            defaultFilter: "name:eq:Global Indicators (Mandatory)",
        },
        {
            name: "dataElementGroupSetThemeId",
            type: "d2-object",
            model: "dataElementGroupSet",
            defaultFilter: "code:eq:GL_DETHEME_DEGROUPSET",
        },
        {
            name: "indicatorGroupSetThemeId",
            type: "d2-object",
            model: "indicatorGroupSet",
            defaultFilter: "name:eq:Theme",
        },
        {
            name: "dataElementGroupSetOriginId",
            type: "d2-object",
            model: "dataElementGroupSet",
            defaultFilter: "code:eq:GL_DEORIGIN_DEGROUPSET",
        },
        {
            name: "indicatorGroupSetOriginId",
            type: "d2-object",
            model: "indicatorGroupSet",
            defaultFilter: "name:eq:Indicator Origin",
        },
        {
            name: "dataElementGroupSetStatusId",
            type: "d2-object",
            model: "dataElementGroupSet",
            defaultFilter: "code:eq:GL_DESTATUS_DEGROUPSET",
        },
        {
            name: "indicatorGroupSetStatusId",
            type: "d2-object",
            model: "indicatorGroupSet",
            defaultFilter: "name:eq:Status",
        },
        {
            name: "attributeGroupId",
            type: "d2-object",
            model: "attribute",
            defaultFilter: "code:eq:DE_IND_GROUP",
        },
        {
            name: "organisationUnitLevelForCountriesId",
            type: "d2-object",
            model: "organisationUnitLevel",
            defaultFilter: "name:eq:Country",
        },
        {
            name: "hideInDataSetAppAttributeId",
            type: "d2-object",
            model: "attributes",
            defaultFilter: "code:eq:Hide in data set app",
        },
        {
            name: "createdByDataSetConfigurationAttributeId",
            type: "d2-object",
            model: "attributes",
            defaultFilter: "code:eq:GL_CREATED_BY_DATASET_CONFIGURATION",
        },
        {
            name: "dataPeriodOutputDatesAttributeId",
            type: "d2-object",
            model: "attributes",
            defaultFilter: "code:eq:GL_OUTPUT_DATES",
        },
        {
            name: "dataPeriodOutcomeDatesAttributeId",
            type: "d2-object",
            model: "attributes",
            defaultFilter: "code:eq:GL_OUTCOME_DATES",
        },
        {
            name: "dataPeriodIntervalDatesAttributeId",
            type: "d2-object",
            model: "attributes",
            defaultFilter: "code:eq:GL_INTERVAL_DATES",
        },
        {
            name: "exclusionRuleCoreUserGroupId",
            type: "d2-object",
            model: "userGroup",
            defaultFilter: "name:eq:GL_AllAdmins",
        },
    ];

    constructor(d2) {
        this.d2 = d2;
    }

    init() {
        if (this.currentUserIsSuperAdmin()) {
            return this._createOrUpdateAdminRole().then(this._saveInitialConfig.bind(this));
        } else {
            return Promise.resolve(true);
        }
    }

    get() {
        return this._getStoreNamespace().then(ns => ns.get(this.dataStoreSettingsKey));
    }

    save(config) {
        return this._save(saved => _.imerge(saved, config));
    }

    currentUserIsSuperAdmin() {
        return this.d2.currentUser.authorities.has("ALL");
    }

    getFields() {
        const models = _(this.fieldDefinitions)
            .filter(fd => fd.type === "d2-object")
            .map("model")
            .uniq();
        const optionsForModelPairs$ = models.map(model =>
            this.d2.models[model]
                .list({ paging: false, fields: "id,displayName" })
                .then(collection => collection.toArray())
                .then(objects => objects.map(obj => ({ text: obj.displayName, value: obj.id })))
                .then(options => [model, options])
        );

        return Promise.all(optionsForModelPairs$)
            .then(_.fromPairs)
            .then(optionsForModel =>
                this.fieldDefinitions.map(fd => this._getField(fd, optionsForModel))
            );
    }

    _getStoreNamespace() {
        return this.d2.dataStore.get(this.dataStoreNamespace);
    }

    _save(merger) {
        const names = this.fieldDefinitions.map(fd => fd.name);

        return this._getStoreNamespace().then(namespace => {
            return namespace
                .get(this.dataStoreSettingsKey)
                .catch(() => ({}))
                .then(saved => {
                    const newConfig = _.pick(merger(saved), names);
                    if (_.isEqual(saved, newConfig)) {
                        return true;
                    } else {
                        return namespace.set(this.dataStoreSettingsKey, newConfig);
                    }
                });
        });
    }

    _saveInitialConfig() {
        return this._getDefaultValues().then(defaults =>
            this._save(saved => _.imerge(defaults, saved))
        );
    }

    _getDefaultValue(fieldDefinition) {
        switch (fieldDefinition.type) {
            case "d2-object":
                return this.d2.models[fieldDefinition.model]
                    .list({ filter: fieldDefinition.defaultFilter, fields: "id" })
                    .then(collection => collection.toArray().map(obj => obj.id)[0]);
            case "value":
            case "yearlyDate":
            case "timePeriod":
                return Promise.resolve(fieldDefinition.defaultValue);
            default:
                throw new Error(`Unknown field type: ${fieldDefinition.type}`);
        }
    }

    _getField(fieldDefinition, optionsForModel) {
        const base = _.imerge(fieldDefinition, {
            i18n_key: "setting_" + camelCaseToUnderscores(fieldDefinition.name),
        });

        switch (fieldDefinition.type) {
            case "d2-object":
                return _.imerge(base, { options: optionsForModel[fieldDefinition.model] });
            case "value":
            case "yearlyDate":
            case "timePeriod":
                return base;
            default:
                throw new Error(`Unknown field type: ${fieldDefinition.type}`);
        }
    }

    _getDefaultValues() {
        const defaultValuesPairs$ = this.fieldDefinitions.map(field =>
            this._getDefaultValue(field).then(defaultValue => [field.name, defaultValue])
        );
        return Promise.all(defaultValuesPairs$).then(_.fromPairs);
    }

    _createOrUpdateAdminRole() {
        const attrs = this.adminRoleAttributes;

        return getExistingUserRoleByName(this.d2, attrs.name).then(existingUserRole => {
            if (existingUserRole) {
                const existingUserRoleHasRequiredAuthorities = _(attrs.authorities)
                    .difference(existingUserRole.authorities)
                    .isEmpty();
                if (existingUserRoleHasRequiredAuthorities) {
                    return true;
                } else {
                    existingUserRole.authorities = _.union(
                        existingUserRole.authorities,
                        attrs.authorities
                    );
                    existingUserRole.dirty = true;
                    return existingUserRole.save();
                }
            } else {
                const adminRole = this.d2.models.userRoles.create(attrs);
                return adminRole.create();
            }
        });
    }
}
