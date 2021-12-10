import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import fp from "lodash/fp";
import _ from "lodash";

import Translate from "d2-ui/lib/i18n/Translate.mixin";
import ObserverRegistry from "../utils/ObserverRegistry.mixin";
import LoadingStatus from "../LoadingStatus/LoadingStatus.component";
import ListActionBar from "../ListActionBar/ListActionBar.component";
import SearchBox from "../SearchBox/SearchBox.component";
import Pagination from "d2-ui/lib/pagination/Pagination.component";
import OrgUnitsDialog from "d2-ui/lib/org-unit-dialog/OrgUnitsDialog.component";
import SharingDialogMultiple from "../components/sharing-dialog/SharingDialogMultiple";
import "../Pagination/Pagination.scss";
import snackActions from "../Snackbar/snack.actions";

// import DataTable from 'd2-ui/lib/data-table/DataTable.component';
import MultipleDataTable from "../MultipleDataTable/MultipleDataTable.component";

import DetailsBoxWithScroll from "./DetailsBoxWithScroll.component";
import listActions from "./list.actions";
import {
    contextActions,
    contextMenuIcons,
    endDateForYearStore,
    isContextActionAllowed,
    actions,
} from "./context.actions";
import detailsStore from "./details.store";
import logsStore from "./logs.store";
import deleteStore from "./delete.store";
import orgUnitsStore from "./orgUnits.store";
import sharingStore from "./sharing.store";
import "d2-ui/scss/DataTable.scss";
import { log, getLogs, LogEntry } from "./log";

import SettingsDialog from "../Settings/Settings.component";
import IconButton from "material-ui/IconButton";
import SettingsIcon from "material-ui/svg-icons/action/settings";
import Checkbox from "material-ui/Checkbox/Checkbox";
import Dialog from "material-ui/Dialog/Dialog";
import FlatButton from "material-ui/FlatButton/FlatButton";
import HelpOutlineIcon from "material-ui/svg-icons/action/help-outline";
import ListIcon from "material-ui/svg-icons/action/list";
import FormHelpers from "../forms/FormHelpers";
import { currentUserHasAdminRole, canCreate, getFilteredDatasets } from "../utils/Dhis2Helpers";
import * as sharing from "../models/Sharing";
import Settings from "../models/Settings";
import periodsStore from "./periods.store";
import PeriodsDialog from "./PeriodsDialog";
import { save } from "../components/sharing-dialog/utils";

const { SimpleCheckBox } = FormHelpers;

export function calculatePageValue(pager) {
    const pageSize = 50; // TODO: Make the page size dynamic
    const { total, pageCount, page } = pager;
    const pageCalculationValue = total - (total - (pageCount - (pageCount - page)) * pageSize);
    const startItem = 1 + pageCalculationValue - pageSize;
    const endItem = pageCalculationValue;

    return `${startItem} - ${endItem > total ? total : endItem}`;
}

const sharingMeta = { allowPublicAccess: true, allowExternalAccess: false };

const DataSets = createReactClass({
    propTypes: {
        name: PropTypes.string,
    },

    contextTypes: {
        d2: PropTypes.object.isRequired,
    },

    mixins: [ObserverRegistry, Translate],

    childContextTypes: {
        d2: PropTypes.object,
    },

    getChildContext() {
        return {
            d2: this.context.d2,
        };
    },

    tr(text, namespace = {}) {
        return this.getTranslation(text, namespace);
    },

    getInitialState() {
        return {
            config: null,
            isLoading: true,
            page: 1,
            pager: { total: 0 },
            dataRows: [],
            d2: this.context.d2,
            currentUserHasAdminRole: currentUserHasAdminRole(this.context.d2),
            settingsOpen: false,
            sorting: null,
            searchValue: null,
            orgUnits: null,
            periods: null,
            endDateForYear: null,
            helpOpen: false,
            logs: null,
            logsHasMore: null,
            logsFilter: _log => true,
            logsPageLast: 0,
            logsOldestDate: null,
            sharing: null,
            showOnlyCreatedByApp: true,
        };
    },

    componentDidMount() {
        const d2 = this.context.d2;

        new Settings(d2).get().then(config => {
            this.setState({ config }, this.getDataSets);
        });

        this.registerDisposable(
            detailsStore.subscribe(detailsObject => this.setState({ detailsObject }))
        );

        this.registerDisposable(deleteStore.subscribe(_deleteObjects => this.getDataSets()));
        this.registerDisposable(logsStore.subscribe(datasets => this.openLogs(datasets)));

        this.registerDisposable(this.subscribeToModelStore(sharingStore, "sharing"));
        this.registerDisposable(this.subscribeToModelStore(orgUnitsStore, "orgUnits"));
        this.registerDisposable(this.subscribeToModelStore(periodsStore, "periods"));
        this.registerDisposable(this.subscribeToModelStore(endDateForYearStore, "endDateForYear"));
    },

    subscribeToModelStore(store, modelName) {
        const d2 = this.context.d2;

        return store.subscribe(async data => {
            const { datasets, options } = data || {};

            if (datasets) {
                const d2Datasets = await getDataSetsWithOwnerFields(d2, datasets);
                this.setState({ [modelName]: { models: d2Datasets, options } });
            } else {
                this.setState({ [modelName]: null });
            }
        });
    },

    getDataSetsOnCurrentPage() {
        this.getDataSets({ clearPage: false });
    },

    async getDataSets({ clearPage = true } = {}) {
        const { page, sorting, searchValue, showOnlyCreatedByApp, config } = this.state;
        const newPage = clearPage ? 1 : page;
        const filters = { searchValue, showOnlyCreatedByApp };
        const dataSetsCollection = await getFilteredDatasets(
            this.context.d2,
            config,
            newPage,
            sorting,
            filters
        );
        const formatDate = isoDate => new Date(isoDate).toLocaleString();
        const dataRows = dataSetsCollection
            .toArray()
            .map(dr =>
                _.merge(dr, { selected: false, lastUpdatedHuman: formatDate(dr.lastUpdated) })
            );

        this.setState({
            isLoading: false,
            pager: dataSetsCollection.pager,
            dataRows: dataRows,
            page: newPage,
        });
    },

    searchListByName(searchObserver) {
        //bind key search listener
        const searchListByNameDisposable = searchObserver.subscribe(value => {
            this.setState(
                {
                    isLoading: true,
                    searchValue: value,
                },
                this.getDataSets
            );
        });

        this.registerDisposable(searchListByNameDisposable);
    },

    openSettings() {
        this.setState({ settingsOpen: true });
    },

    closeSettings() {
        this.setState({ settingsOpen: false });
    },

    openAllLogs() {
        const title = `${this.tr("logs")} (${this.tr("all")})`;
        this.setState({
            logsFilter: _log => true,
            logsObject: title,
            logs: null,
        });
        this.addLogs([0, 1]);
    },

    openLogs(datasets) {
        // Set this.state.logs to the logs that include any of the given
        // datasets, this.state.logsObject to a description of their contents
        // and this.state.logsFilter so it selects only the relevant logs.
        if (datasets === null) {
            this.setState({ logsObject: null });
        } else {
            const ids = datasets.map(ds => ds.id);
            const idsSet = new Set(ids);
            const title = `${this.tr("logs")} (${ids.join(", ")})`;
            const logsFilter = log => log.datasets.some(ds => idsSet.has(ds.id));

            this.setState({
                logsObject: title,
                logs: null,
                logsFilter,
            });
            this.addLogs([0, 1]); // load the last two log pages
        }
    },

    addNextLog() {
        return this.addLogs([this.state.logsPageLast + 1]);
    },

    addLogs(pages) {
        return getLogs(pages).then(res => {
            if (res === null) {
                this.setState({
                    logsPageLast: -1,
                    logs: this.state.logs || [],
                });
            } else {
                const { logs, hasMore: logsHasMore } = res;
                const logsOldestDate = logs.length > 0 ? logs[logs.length - 1].date : null;
                const filteredLogs = _(logs)
                    .filter(this.state.logsFilter)
                    .value();

                this.setState({
                    logsHasMore: logsHasMore,
                    logs: _([this.state.logs, filteredLogs])
                        .compact()
                        .flatten()
                        .value(),
                    logsPageLast: _.max(pages),
                    logsOldestDate: logsOldestDate,
                });
            }
        });
    },

    onSelectToggle(ev, dataset) {
        ev.preventDefault();
        ev.stopPropagation();
        this.setState({
            dataRows: this.state.dataRows.map(dr =>
                dr.id === dataset.id ? _.merge(dr, { selected: !dr.selected }) : dr
            ),
        });
    },

    onSelectAllToggle(value) {
        this.setState({
            dataRows: this.state.dataRows.map(dr => _.merge(dr, { selected: !value })),
        });
    },

    onActiveRowsChange(datasets) {
        const selectedIds = new Set(datasets.map(ds => ds.id));

        this.setState({
            dataRows: this.state.dataRows.map(dr =>
                _.merge(dr, { selected: selectedIds.has(dr.id) })
            ),
        });
    },

    _onColumnSort(sorting) {
        this.setState({ sorting }, this.getDataSets);
    },

    _openHelp() {
        this.setState({ helpOpen: true });
    },

    _closeHelp() {
        this.setState({ helpOpen: false });
    },

    _onSharingClose() {
        const { updated } = sharing.getChanges(this.state.dataRows, this.state.sharing.models);

        if (!_(updated).isEmpty()) {
            log("change sharing settings", "success", updated);
            this.getDataSets({ clearPage: false });
        }
        listActions.hideSharingBox();
    },

    _onSharingSearch(key) {
        return this.context.d2.Api.getApi().get("sharing/search", { key });
    },

    async _onSharingSave(attributes, strategy) {
        const { d2 } = this.context;
        const currentDataSets = this.state.sharing.models;
        const { status, dataSets } = await save(d2, currentDataSets, attributes, strategy);

        if (status) {
            this.setState({ sharing: { models: dataSets } });
        } else {
            snackActions.show({ message: "Error" });
        }
    },

    _onShowOnlyCreatedByAppCheck(ev) {
        this.setState({ showOnlyCreatedByApp: ev.target.checked }, this.getDataSets);
    },

    render() {
        if (!this.state.config) return null;

        const currentlyShown = calculatePageValue(this.state.pager);

        const paginationProps = {
            hasNextPage: () =>
                Boolean(this.state.pager.hasNextPage) && this.state.pager.hasNextPage(),
            hasPreviousPage: () =>
                Boolean(this.state.pager.hasPreviousPage) && this.state.pager.hasPreviousPage(),
            onNextPageClick: () => {
                this.setState(
                    { isLoading: true, page: this.state.pager.page + 1 },
                    this.getDataSetsOnCurrentPage
                );
            },
            onPreviousPageClick: () => {
                this.setState(
                    { isLoading: true, page: this.state.pager.page - 1 },
                    this.getDataSetsOnCurrentPage
                );
            },
            total: this.state.pager.total,
            currentlyShown,
        };

        const styles = {
            dataTableWrap: {
                display: "flex",
                flexDirection: "column",
                flex: 2,
            },

            detailsBoxWrap: {
                flex: 1,
                marginLeft: "1rem",
                marginRight: "1rem",
                opacity: 1,
                flexGrow: 0,
            },

            listDetailsWrap: {
                flex: 1,
                display: "flex",
                flexOrientation: "row",
            },
            dialogContentStyle: {
                width: "1150px",
                maxWidth: "none",
            },
            dialogBodyStyle: {
                minHeight: "440px",
                maxHeight: "600px",
            },
        };

        const rows = this.state.dataRows.map(dr =>
            fp.merge(dr, {
                selected: (
                    <SimpleCheckBox
                        onClick={ev => this.onSelectToggle(ev, dr)}
                        checked={dr.selected}
                    />
                ),
            })
        );
        const selectedHeaderChecked =
            !_.isEmpty(this.state.dataRows) && this.state.dataRows.every(row => row.selected);
        const selectedColumnContents = (
            <Checkbox
                checked={selectedHeaderChecked}
                onCheck={() => this.onSelectAllToggle(selectedHeaderChecked)}
                iconStyle={{ width: "auto" }}
            />
        );

        const columns = [
            {
                name: "selected",
                style: { width: 20 },
                text: "",
                sortable: false,
                contents: selectedColumnContents,
            },
            { name: "name", sortable: true },
            { name: "publicAccess", sortable: true },
            { name: "lastUpdated", sortable: true, value: "lastUpdatedHuman" },
        ];

        const activeRows = _(rows)
            .keyBy("id")
            .at(this.state.dataRows.filter(dr => dr.selected).map(dr => dr.id))
            .value();

        const renderSettingsButton = () => (
            <div style={{ float: "right" }}>
                <IconButton onClick={this.openSettings} tooltip={this.tr("settings")}>
                    <SettingsIcon />
                </IconButton>
            </div>
        );

        const renderLogsButton = () => (
            <div style={{ float: "right" }}>
                <IconButton tooltip={this.tr("logs")} onClick={this.openAllLogs}>
                    <ListIcon />
                </IconButton>
            </div>
        );

        const { d2 } = this.context;
        const {
            config,
            logsPageLast,
            logsOldestDate,
            logsHasMore,
            showOnlyCreatedByApp,
            periods,
            endDateForYear,
        } = this.state;

        const showCreatedByAppCheck = !!config.createdByDataSetConfigurationAttributeId;
        const olderLogLiteral = logsPageLast < 0 ? this.tr("logs_no_older") : this.tr("logs_older");
        const dateString = new Date(logsOldestDate || new Date()).toLocaleString();
        const label = olderLogLiteral + " " + dateString;

        const logLoadMoreButton = logsHasMore ? (
            <FlatButton label={label} onClick={this.addNextLog} />
        ) : null;

        const logActions = [<FlatButton label={this.tr("close")} onClick={listActions.hideLogs} />];

        const renderLogs = () => {
            const { logs } = this.state;

            if (!logs) return this.tr("logs_loading");
            else if (_(logs).isEmpty()) return this.tr("logs_none");
            else return logs.map(LogEntry);
        };

        const helpActions = [<FlatButton label={this.tr("close")} onClick={this._closeHelp} />];

        const renderHelp = () => (
            <div style={{ float: "right" }}>
                <IconButton tooltip={this.tr("help")} onClick={this._openHelp}>
                    <HelpOutlineIcon />
                </IconButton>
            </div>
        );

        const { detailsObject, dataRows } = this.state;
        const detailsObjectToShow = detailsObject
            ? dataRows.find(dataRow => dataRow.id === detailsObject.id) || detailsObject
            : null;

        return (
            <div>
                <Dialog
                    title={this.tr("help")}
                    actions={helpActions}
                    open={this.state.helpOpen}
                    onRequestClose={this._closeHelp}
                >
                    {this.tr("help_landing_page")}
                </Dialog>
                <SettingsDialog
                    open={this.state.settingsOpen}
                    onRequestClose={this.closeSettings}
                />
                {this.state.orgUnits ? (
                    <OrgUnitsDialog
                        objects={this.state.orgUnits.models}
                        open={true}
                        onSave={datasets => log("change organisation units", "success", datasets)}
                        onRequestClose={listActions.hideOrgUnitsBox}
                        contentStyle={styles.dialogContentStyle}
                        bodyStyle={styles.dialogBodyStyle}
                    />
                ) : null}

                {this.state.periods ? (
                    <PeriodsDialog
                        dataSets={periods.models}
                        onSave={datasets => log("set period dates", "success", datasets)}
                        onRequestClose={() => periodsStore.setState(null)}
                        contentStyle={styles.dialogContentStyle}
                        bodyStyle={styles.dialogBodyStyle}
                    />
                ) : null}

                {this.state.endDateForYear ? (
                    <PeriodsDialog
                        dataSets={endDateForYear.models}
                        endYear={endDateForYear.options.year}
                        onSave={datasets => log("set end date for year", "success", datasets)}
                        onRequestClose={() => endDateForYearStore.setState(null)}
                        contentStyle={styles.dialogContentStyle}
                        bodyStyle={styles.dialogBodyStyle}
                    />
                ) : null}

                {this.state.sharing ? (
                    <SharingDialogMultiple
                        isOpen={!!this.state.sharing}
                        isDataShareable={true}
                        objects={this.state.sharing.models}
                        meta={sharingMeta}
                        onCancel={this._onSharingClose}
                        onSharingChanged={this._onSharingSave}
                        onSearchRequest={this._onSharingSearch}
                    />
                ) : null}

                <div>
                    <div style={{ float: "left", width: "33%" }}>
                        <SearchBox searchObserverHandler={this.searchListByName} />
                    </div>

                    {showCreatedByAppCheck && (
                        <Checkbox
                            style={{ float: "left", width: "25%", paddingTop: 18, marginLeft: 30 }}
                            checked={showOnlyCreatedByApp}
                            label={this.getTranslation("display_only_datasets_created_by_app")}
                            onCheck={this._onShowOnlyCreatedByAppCheck}
                            iconStyle={{ marginRight: 8 }}
                        />
                    )}

                    {this.tr("help_landing_page") !== "" && renderHelp()}

                    {this.state.currentUserHasAdminRole && renderLogsButton()}

                    {this.state.currentUserHasAdminRole && renderSettingsButton()}

                    <div style={{ float: "right" }}>
                        <Pagination {...paginationProps} />
                    </div>

                    <div style={{ clear: "both" }} />
                </div>
                <LoadingStatus loadingText="Loading datasets" isLoading={this.state.isLoading} />
                <div style={styles.listDetailsWrap}>
                    <div style={styles.dataTableWrap}>
                        <MultipleDataTable
                            rows={rows}
                            columns={columns}
                            onColumnSort={this._onColumnSort}
                            actionsDefinition={actions}
                            contextMenuActions={contextActions}
                            contextMenuIcons={contextMenuIcons}
                            primaryAction={contextActions.details}
                            isContextActionAllowed={(...args) =>
                                isContextActionAllowed(d2, ...args)
                            }
                            activeRows={activeRows}
                            onActiveRowsChange={this.onActiveRowsChange}
                            isMultipleSelectionAllowed={true}
                        />
                        {this.state.dataRows.length || this.state.isLoading ? null : (
                            <div>No results found</div>
                        )}
                    </div>
                    {this.state.detailsObject ? (
                        <DetailsBoxWithScroll
                            style={styles.detailsBoxWrap}
                            detailsObject={detailsObjectToShow}
                            onClose={listActions.hideDetailsBox}
                            config={this.state.config}
                            scroll={false}
                        />
                    ) : null}
                    {this.state.logsObject ? (
                        <Dialog
                            title={this.state.logsObject}
                            actions={logActions}
                            open={true}
                            bodyStyle={{ padding: "20px" }}
                            onRequestClose={listActions.hideLogs}
                            autoScrollBodyContent={true}
                        >
                            {renderLogs()}
                            <div style={{ textAlign: "center" }}>{logLoadMoreButton}</div>
                        </Dialog>
                    ) : null}
                </div>

                {canCreate(d2) && <ListActionBar route="datasets/add" />}
            </div>
        );
    },
});

function getDataSetsWithOwnerFields(d2, dataSets) {
    const dataSetIds = dataSets.map(o => o.id).join(",");
    return (
        d2.models.dataSets
            // access fields are not in :owner anymore (2.36), ask for them explictly
            .list({
                fields: ":owner,publicAccess,userAccesses,userGroupAccesses",
                filter: `id:in:[${dataSetIds}]`,
            })
            .then(c => c.toArray())
    );
}

export default DataSets;
