import Action from "d2-ui/lib/action/Action";
import detailsStore from "./details.store";
import deleteStore from "./delete.store";
import orgUnitsStore from "./orgUnits.store";
import logsStore from "./logs.store";
import sharingStore from "./sharing.store";
import { goToRoute } from "../router";
import {
    currentUserHasAdminRole,
    canManage,
    canCreate,
    canDelete,
    canUpdate,
} from "../utils/Dhis2Helpers";
import _ from "lodash";
import periodsStore from "./periods.store";
import Store from "d2-ui/lib/store/Store";

export const endDateForYearStore = Store.create();

const setupActions = actions => {
    const actionsByName = _.keyBy(actions, "name");
    const contextActions = Action.createActionsFromNames(actions.map(a => a.name));
    const contextMenuIcons = _(actions)
        .map(a => [a.name, a.icon || a.name])
        .fromPairs()
        .value();

    const isContextActionAllowed = function(d2, selection, actionName) {
        const action = actionsByName[actionName];
        const arg = action && !action.multiple && _.isArray(selection) ? selection[0] : selection;

        if (!action || !selection || selection.length === 0) {
            return false;
        } else if (!action.multiple && selection.length !== 1) {
            return false;
        } else if (action.isActive && !action.isActive(d2, arg)) {
            return false;
        } else {
            return true;
        }
    };

    actions
        .filter(a => a.onClick)
        .forEach(action => {
            contextActions[action.name].subscribe(({ data }) => {
                const { selected, options } = data;

                let arg;
                if (action.multiple) {
                    arg = _.isArray(selected) ? selected : [selected];
                } else {
                    arg = _.isArray(selected) ? selected[0] : selected;
                }

                if (arg) action.onClick(arg, options);
            });
        });

    return { contextActions, contextMenuIcons, isContextActionAllowed, actions: actionsByName };
};

const currentYear = new Date().getFullYear();

const { contextActions, contextMenuIcons, isContextActionAllowed, actions } = setupActions([
    {
        name: "edit",
        multiple: false,
        icon: "edit",
        isActive: (d2, dataset) => canUpdate(d2, [dataset]),
        onClick: dataset => goToRoute(`/datasets/edit/${dataset.id}`),
    },
    {
        name: "share",
        multiple: true,
        icon: "share",
        isActive: canManage,
        onClick: datasets => sharingStore.setState({ datasets }),
    },
    {
        name: "define_associations",
        multiple: true,
        icon: "business",
        isActive: canUpdate,
        onClick: datasets => orgUnitsStore.setState({ datasets }),
    },
    {
        name: "period_dates",
        multiple: true,
        icon: "timeline",
        isActive: canUpdate,
        onClick: datasets => periodsStore.setState({ datasets }),
    },
    {
        name: "end_date_for_year",
        multiple: true,
        icon: "timeline",
        isActive: canUpdate,
        onClick: (datasets, options) => endDateForYearStore.setState({ datasets, options }),
        options: [currentYear - 1, currentYear, currentYear + 1],
    },
    {
        name: "details",
        multiple: false,
        icon: "details",
        onClick: dataset => detailsStore.setState(dataset),
    },
    {
        name: "clone",
        multiple: false,
        icon: "content_copy",
        isActive: canCreate,
        onClick: dataset => goToRoute(`/datasets/clone/${dataset.id}`),
    },
    {
        name: "delete",
        multiple: true,
        icon: "delete",
        isActive: canDelete,
        onClick: datasets => deleteStore.delete(datasets),
    },
    {
        name: "logs",
        multiple: true,
        icon: "list",
        isActive: currentUserHasAdminRole,
        onClick: datasets => logsStore.setState(datasets),
    },
]);

exports.contextActions = contextActions;
exports.contextMenuIcons = contextMenuIcons;
exports.isContextActionAllowed = isContextActionAllowed;
exports.actions = actions;
