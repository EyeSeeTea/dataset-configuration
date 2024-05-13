import { getJSONForProperties } from "d2/lib/model/helpers/json";
import { generateUid } from "d2/lib/uid";
import _ from "./lodash-mixins";

function collectionToArray(collectionOrArray) {
    const array =
        collectionOrArray && collectionOrArray.toArray
            ? collectionOrArray.toArray()
            : collectionOrArray || [];
    return _.compact(array);
}

const toArray = collectionToArray;

const accesses = {
    none: "--------",
    read: "r-------",
    write: "rw------",
};

function update(obj1, obj2) {
    const obj1c = obj1;
    _(obj2).each((value, key) => {
        obj1c[key] = value;
    });
    return obj1c;
}

function mapPromise(items, mapper) {
    const reducer = (promise, item) =>
        promise.then(mappedItems => mapper(item).then(res => mappedItems.concat([res])));
    return items.reduce(reducer, Promise.resolve([]));
}

function redirectToLogin(baseUrl) {
    const loginUrl = `${baseUrl}/dhis-web-commons/security/login.action`;
    window.location.assign(loginUrl);
}

function getCategoryCombos(d2, { cocFields, filterIds } = {}) {
    return d2.models.categoryCombos.list({
        fields: _([
            "id,name,displayName,isDefault",
            "categories[id,name,displayName,categoryOptions[id,name,displayName],translations]",
            cocFields ? `categoryOptionCombos[${cocFields}]` : null,
        ])
            .compact()
            .join(","),
        filter: _.compact([
            "dataDimensionType:eq:DISAGGREGATION",
            filterIds ? `id:in:[${filterIds.join(",")}]` : null,
        ]),
        paging: false,
    });
}

function getCountryCode(orgUnit) {
    return orgUnit && orgUnit.code ? orgUnit.code.split("_")[0] : null;
}

function getOrgUnitsForLevel(d2, levelId) {
    return d2.models.organisationUnitLevels.get(levelId, { fields: "id,level" }).then(ouLevel => {
        return d2.models.organisationUnits
            .list({
                fields: "id,displayName,code,level,children::isNotEmpty",
                filter: "level:eq:" + ouLevel.level,
                order: "displayName:asc",
                paging: false,
            })
            .then(collection => toArray(collection).filter(ou => ou.children));
    });
}

// Keep track of the created categoryCombos so objects are reused
let cachedCategoryCombos = {};

function getDisaggregationForCategories(d2, dataElement, categoryCombos, categories) {
    const categoriesById = _(categoryCombos)
        .flatMap(cc => toArray(cc.categories))
        .uniqBy("id")
        .keyBy("id")
        .value();
    const getCategoryIds = categories =>
        _(collectionToArray(categories))
            .map("id")
            .uniqBy()
            .value();
    const deCategories = _.at(
        categoriesById,
        collectionToArray(dataElement.categoryCombo.categories).map(c => c.id)
    );
    const allCategories = _(deCategories)
        .concat(collectionToArray(categories))
        .uniqBy("id")
        .value();

    // Special category <default> should be used only when no other category is present, remove otherwise
    const allValidCategories =
        allCategories.length > 1
            ? allCategories.filter(category => categoriesById[category.id].name !== "default")
            : allCategories;
    const combinedCategoriesIds = getCategoryIds(allValidCategories);

    // Get an existing categoryCombo (with the shortest name, if there are duplicates)
    // with matching categories (in any order).
    const existingCategoryCombo = _(categoryCombos)
        .sortBy(categoryCombo => categoryCombo.name.length)
        .find(categoryCombo =>
            _(getCategoryIds(categoryCombo.categories))
                .sortBy()
                .isEqual(_.sortBy(combinedCategoriesIds))
        );
    const cacheKey = combinedCategoriesIds.join(".");
    const cachedCategoryCombo = cachedCategoryCombos[cacheKey];

    if (existingCategoryCombo) {
        return existingCategoryCombo;
    } else if (cachedCategoryCombo) {
        return cachedCategoryCombo;
    } else {
        const newCategoryComboId = generateUid();
        const categories = _.at(categoriesById, combinedCategoriesIds);
        const categoryOptions = categories.map(c => toArray(c.categoryOptions));
        const categoryOptionCombos = _.cartesianProduct(...categoryOptions).map(cos => ({
            id: generateUid(),
            name: cos.map(co => co.name).join(", "),
            displayName: cos.map(co => co.displayName).join(", "),
            categoryCombo: { id: newCategoryComboId },
            categoryOptions: cos,
        }));
        const ccName = categories.map(cc => cc.name).join("/");
        const newCategoryCombo = d2.models.categoryCombo.create({
            id: newCategoryComboId,
            dataDimensionType: "DISAGGREGATION",
            name: ccName,
            displayName: ccName,
            categories: categories,
            categoryOptionCombos: categoryOptionCombos,
            translations: getCategoryComboTranslations(categories),
        });
        cachedCategoryCombos[cacheKey] = newCategoryCombo;
        return newCategoryCombo;
    }
}

function getCategoryComboTranslations(categories) {
    //  category.translations[] -> {property: 'NAME', locale: 'fr', value: 'Âge'}
    const locales = _(categories)
        .flatMap(category => category.translations)
        .map(category => category.locale)
        .uniq()
        .value();

    return locales.map(locale => {
        const names = categories.map(category => {
            const translation = (category.translations || []).find(
                translation => translation.property === "NAME" && translation.locale === locale
            );
            return translation ? translation.value : category.name;
        });

        return { property: "NAME", locale: locale, value: names.join("/") };
    });
}

function getAsyncUniqueValidator(model, field, uid = null) {
    return value => {
        if (!value || !value.trim()) {
            return Promise.resolve(true);
        } else {
            const baseFilteredModel = model
                .filter()
                .on(field)
                .equals(value);
            const filteredModel = !uid
                ? baseFilteredModel
                : baseFilteredModel
                      .filter()
                      .on("id")
                      .notEqual(uid);

            return filteredModel.list().then(collection => {
                if (collection.size > 0) {
                    return Promise.reject("value_not_unique");
                } else {
                    return Promise.resolve(true);
                }
            });
        }
    };
}

function getExistingUserRoleByName(d2, name) {
    return d2.models.userRoles
        .filter()
        .on("name")
        .equals(name)
        .list({ fields: "*" })
        .then(collection => toArray(collection)[0]);
}

function getUserGroups(d2, names) {
    return d2.models.userGroups.list({
        filter: "name:in:[" + names.join(",") + "]",
        paging: false,
    });
}

function getSharing(d2, object) {
    const api = d2.Api.getApi();
    const fields = [
        "id",
        "name",
        "publicAccess",
        "userAccesses",
        "userGroupAccesses",
        "externalAccess",
    ].join(",");

    return api
        .get(`${object.modelDefinition.plural}/${object.id}?fields=${fields}`)
        .then(object => ({ object }));
}

function getKey(s) {
    return s.toLocaleLowerCase();
}

function buildSharingFromUserGroupNames(baseSharing, userGroups, userGroupSharingByName) {
    const userGroupsByName = _.keyBy(userGroups, userGroup => getKey(userGroup.name));
    const userGroupAccesses = _(userGroupSharingByName)
        .map((sharing, name) => {
            const userGroup = userGroupsByName[getKey(name)];
            if (userGroup) {
                return _.imerge(sharing, { id: userGroup.id });
            } else {
                console.log(`User has no access to user group: ${name}`);
                return null;
            }
        })
        .compact()
        .value();

    return buildSharing(deepMerge(baseSharing, { object: { userGroupAccesses } }));
}

function buildSharing(sharing) {
    const base = {
        meta: {
            allowPublicAccess: true,
            allowExternalAccess: false,
        },
        object: {
            userGroupAccesses: [],
            publicAccess: "r-------",
            externalAccess: false,
        },
    };
    return deepMerge(base, sharing);
}

function setSharings(d2, objects, userGroupAccessByName) {
    const api = d2.Api.getApi();
    let userGroupAccesses$;

    if (_.isEmpty(userGroupAccessByName)) {
        userGroupAccesses$ = Promise.resolve([]);
    } else {
        const [userGroupNames, userGroupAccesses] = _.zip(...userGroupAccessByName);
        userGroupAccesses$ = getUserGroups(d2, userGroupNames).then(userGroupsCollection =>
            _(toArray(userGroupsCollection))
                .keyBy(userGroup => userGroup.name)
                .at(userGroupNames)
                .zip(userGroupAccesses)
                .map(([userGroup, access]) => (userGroup ? { id: userGroup.id, access } : null))
                .compact()
                .value()
        );
    }

    return userGroupAccesses$.then(userGroupAccesses =>
        mapPromise(objects, object =>
            api.post(
                `sharing?type=${object.modelDefinition.name}&id=${object.id}&mergeMode=MERGE`,
                {
                    meta: {
                        allowPublicAccess: true,
                        allowExternalAccess: false,
                    },
                    object: {
                        userGroupAccesses: userGroupAccesses,
                        publicAccess: "r-------",
                        externalAccess: false,
                    },
                }
            )
        )
    );
}

function sendMessage(d2, subject, text, recipients) {
    const api = d2.Api.getApi();
    const recipientsByModel = _(recipients)
        .groupBy(recipient => recipient.modelDefinition.name)
        .mapValues(models => models.map(model => ({ id: model.id })))
        .value();
    const message = {
        subject: subject,
        text: text,
        users: recipientsByModel.user,
        userGroups: recipientsByModel.userGroup,
        organisationUnits: recipientsByModel.organisationUnit,
    };

    if (_.isEmpty(recipients)) {
        return Promise.resolve();
    } else {
        return api.post("/messageConversations", message);
    }
}

const validStrategies = new Set(["create_and_update", "create", "update", "delete"]);

function deepMerge(obj1, obj2) {
    const isModel = obj => obj && obj.modelDefinition;
    const cloneCustomizer = value => (isModel(value) ? value : undefined);
    const mergeCustomizer = (objValue, srcValue, _key, _object, _source, _stack) => {
        if (isModel(srcValue)) {
            return srcValue;
        } else if (_(objValue).isArray()) {
            return objValue.concat(srcValue);
        } else {
            return undefined;
        }
    };
    const clonedObj1 = _.cloneDeepWith(obj1, cloneCustomizer);

    return _.mergeWith(clonedObj1, obj2, mergeCustomizer);
}

function postMetadata(d2, metadata) {
    const api = d2.Api.getApi();

    const sendRequest = payloadWithStrategy => {
        const { strategy, payload } = payloadWithStrategy;
        // Payload values may be d2 models or plain objects, get JSON only for models.
        const jsonPayload = _(payload)
            .mapValues(objs =>
                objs.map(obj => (obj.modelDefinition ? getOwnedPropertyJSON(obj) : obj))
            )
            .value();
        const path = `metadata?mergeMode=REPLACE&importStrategy=${strategy.toUpperCase()}`;

        return api.post(path, jsonPayload).then(response => {
            if (response.status !== "OK") {
                const msg = [
                    `POST ${api.baseUrl}/${path}`,
                    "Request: " + JSON.stringify(jsonPayload, null, 4),
                    "Response: " + JSON.stringify(response, null, 4),
                ].join("\n\n");
                throw new Error(msg);
            } else {
                return response;
            }
        });
    };

    // When saving simultaneously a new dataset and its sections, the server responds with a
    // <500 ERROR at index 0> whenever greyedFields are sent. However, perfoming this same call
    // to sections *after* the dataset has been created raises no error, so it seems a dhis2
    // bug. We have no option but to make the calls for sections in another, separate call.
    const payloadsWithStrategy = _(metadata)
        .flatMap((payload, strategy) => {
            if (!validStrategies.has(strategy)) {
                console.error("Invalid strategy: " + strategy);
                return [];
            } else if (_(payload).isEmpty()) {
                return [];
            } else {
                return _(payload)
                    .toPairs()
                    .partition(([modelName, _objs]) => modelName !== "sections")
                    .map(pairs =>
                        _(pairs).isEmpty() ? null : { strategy, payload: _.fromPairs(pairs) }
                    )
                    .compact()
                    .value();
            }
        })
        .value();

    return mapPromise(payloadsWithStrategy, sendRequest);
}

function getUids(d2, length) {
    if (length <= 0) {
        return Promise.resolve([]);
    } else {
        const api = d2.Api.getApi();
        return api.get("system/uid", { limit: length }).then(res => res.codes);
    }
}

function sendMessageToGroups(d2, userGroupNames, title, body) {
    return getUserGroups(d2, userGroupNames)
        .then(userGroups => sendMessage(d2, title, body, toArray(userGroups)))
        .catch(_err => {
            alert("Could not send DHIS2 message");
        });
}

function collectionString(d2, objects, field, maxShown) {
    const array = collectionToArray(objects);
    const base = _(array)
        .take(maxShown)
        .map(field)
        .join(", ");

    if (array.length <= maxShown) {
        return base;
    } else {
        return d2.i18n.getTranslation("this_and_n_others", {
            this: base,
            n: array.length - maxShown,
        });
    }
}

function currentUserHasAdminRole(d2) {
    return (
        _(d2.currentUser.userGroups).some(userGroup => userGroup.name === "GL_AllAdmins") ||
        currentUserIsSuperuser(d2)
    );
}

function currentUserIsSuperuser(d2) {
    return d2.currentUser.authorities.has("ALL");
}

const requiredAuthorities = ["F_SECTION_DELETE", "F_SECTION_ADD"];

function hasAuthorities(d2, authorities) {
    return authorities.every(authority => d2.currentUser.authorities.has(authority));
}

function hasRequiredAuthorities(d2) {
    return hasAuthorities(d2, requiredAuthorities);
}

function canManage(d2, datasets) {
    return datasets.every(dataset => dataset.access.manage);
}

function canCreate(d2) {
    return d2.currentUser.canCreatePrivate(d2.models.dataSets) && hasRequiredAuthorities(d2);
}

function canDelete(d2, datasets) {
    const userHasRequiredAuthorities =
        currentUserIsSuperuser(d2) ||
        hasAuthorities(d2, [
            "F_DATASET_DELETE",
            "F_SECTION_DELETE",
            // DHIS2 asks for indicator update permissions to remove dataSet references
            "F_INDICATOR_PUBLIC_ADD",
            "F_INDICATOR_PRIVATE_ADD",
        ]);

    const userCanDeleteDataSetsAndUpdateTheirIndicators = _(datasets).every(dataset => {
        return (
            dataset.access.delete &&
            dataset.indicators.toArray().every(indicator => indicator.access.update)
        );
    });

    return userHasRequiredAuthorities && userCanDeleteDataSetsAndUpdateTheirIndicators;
}

function canUpdate(d2, datasets) {
    const publicDatasetsSelected = _(datasets).some(dataset => dataset.publicAccess.match(/^r/));
    const privateDatasetsSelected = _(datasets).some(dataset => dataset.publicAccess.match(/^-/));
    const datasetsUpdatable = _(datasets).every(dataset => dataset.access.update);
    const privateCondition =
        !privateDatasetsSelected || d2.currentUser.canCreatePrivate(d2.models.dataSets);
    const publicCondition =
        !publicDatasetsSelected || d2.currentUser.canCreatePublic(d2.models.dataSets);

    return hasRequiredAuthorities(d2) && privateCondition && publicCondition && datasetsUpdatable;
}

async function getFilteredDatasets(d2, config, page, sorting, filters) {
    const { searchValue, showOnlyCreatedByApp } = filters;
    const model = d2.models.dataSets;
    const attributeByAppId = config.createdByDataSetConfigurationAttributeId;

    const filterByAppId = attributeByAppId && showOnlyCreatedByApp;
    const order = sorting ? sorting.join(":") : "";
    const fields =
        "id,name,displayName,displayDescription,shortName,created,lastUpdated,externalAccess," +
        "publicAccess,userAccesses,userGroupAccesses,user,access,attributeValues," +
        "periodType,sections[id,code,name],dataInputPeriods~paging(1;1),indicators[id,access[update]]";
    const cleanOptions = options =>
        _.omitBy(options, value => _.isArray(value) && _.isEmpty(value));
    const baseFilters = _.compact([searchValue ? `displayName:ilike:${searchValue}` : null]);

    if (filterByAppId) {
        // The API does not allow to simultaneously filter by attributeValue.attribute.id AND attributeValue.value,
        // so we need to make a double request: first get non-paginated datasets, filter manually by the attribute,
        // and finally make a query on paginated datasets filtering by those datasets.
        const attributeFields = "id,attributeValues[value,attribute[id]]";
        const options = cleanOptions({ order, fields, filter: filters, page });
        const paramsSize = _(options)
            .map((value, key) => `${key}=${encodeURIComponent(value)}`)
            .join("&").length;

        const dataSetsCollectionNoPaging = await model.list({
            fields: attributeFields,
            paging: false,
            order: "lastUpdated:desc",
        });
        const datasetsByApp = toArray(dataSetsCollectionNoPaging).filter(dataset =>
            _(dataset.attributeValues).some(
                av => av.attribute.id === attributeByAppId && av.value.toString() === "true"
            )
        );
        // Truncate IDs to avoid 413 URL too large
        const maxUids = (8192 - paramsSize - 1000) / (11 + 3);
        const fullFilters = [
            ...baseFilters,
            `id:in:[${_(datasetsByApp)
                .take(maxUids)
                .map("id")
                .join(",")}]`,
        ];
        return model.list(cleanOptions({ order, fields, filter: fullFilters, page }));
    } else {
        return model.list(cleanOptions({ order, fields, filter: baseFilters, page }));
    }
}

async function subQuery(d2, objects, field, subfields) {
    const filter =
        "id:in:[" +
        _(objects)
            .map(obj => obj[field])
            .flatMap(obj => (obj.toArray ? toArray(obj).map(o => o.id) : [obj.id]))
            .uniq()
            .join(",") +
        "]";

    const subObjects = await d2.models[field]
        .list({
            paging: false,
            fields: subfields,
            filter: filter,
        })
        .then(collection => toArray(collection));

    const subObjectsById = _.keyBy(subObjects, "id");

    return objects.map(obj => {
        const value = obj[field];
        obj[field] = value.toArray
            ? { toArray: () => toArray(value).map(v => subObjectsById[v.id]) }
            : subObjectsById[value.id];
        return obj;
    });
}

function getCategoryCombo(dataSetElement) {
    const { dataElement, categoryCombo } = dataSetElement;

    if (categoryCombo) {
        return categoryCombo;
    } else if (dataElement && dataElement.categoryCombo) {
        return dataElement.categoryCombo;
    } else {
        throw new Error(
            `Cannot get category combo for dataSetElement: ${JSON.stringify(dataSetElement)}`
        );
    }
}

function setAttributes(initialAttributeValues, valuesByAttributeId) {
    return _(valuesByAttributeId)
        .toPairs()
        .reduce((attributeValues, [attributeId, value]) => {
            const attributeValueExists = _(attributeValues).some(
                av => av.attribute.id === attributeId
            );

            if (attributeValueExists) {
                return attributeValues.map(av =>
                    av.attribute.id === attributeId ? _.imerge(av, { value }) : av
                );
            } else {
                const newAttributeValue = { value, attribute: { id: attributeId } };
                return attributeValues.concat([newAttributeValue]);
            }
        }, initialAttributeValues);
}

function getDseId(dse) {
    const parts = [dse.dataSet, dse.dataElement, dse.categoryCombo];
    return _(parts)
        .compact()
        .map(obj => obj.id)
        .join(".");
}

function getOwnedPropertyJSON(model) {
    const ownedProperties = [
        ...model.modelDefinition.getOwnedPropertyNames(),
        "publicAccess",
        "userAccesses",
        "userGroupAccesses",
    ];

    return getJSONForProperties(model, ownedProperties);
}

export {
    getDseId,
    accesses,
    redirectToLogin,
    getCategoryCombos,
    collectionToArray,
    getExistingUserRoleByName,
    getDisaggregationForCategories,
    getAsyncUniqueValidator,
    setSharings,
    sendMessage,
    getUserGroups,
    mapPromise,
    getCountryCode,
    getOrgUnitsForLevel,
    getSharing,
    buildSharingFromUserGroupNames,
    postMetadata,
    buildSharing,
    getUids,
    deepMerge,
    update,
    sendMessageToGroups,
    collectionString,
    currentUserHasAdminRole,
    currentUserIsSuperuser,
    canManage,
    canCreate,
    canDelete,
    canUpdate,
    getFilteredDatasets,
    subQuery,
    getCategoryCombo,
    setAttributes,
    getOwnedPropertyJSON,
};
