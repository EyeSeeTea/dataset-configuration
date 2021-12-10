import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import Translate from "d2-ui/lib/i18n/Translate.mixin";
import Menu from "material-ui/Menu";
import MenuItem from "material-ui/MenuItem";
import FontIcon from "material-ui/FontIcon";
import ArrowDropRight from "material-ui/svg-icons/navigation-arrow-drop-right";
import Popover from "./PopoverNoFlicker";
import Paper from "material-ui/Paper";

const actionDefinition = PropTypes.shape({
    name: PropTypes.string.isRequired,
    multiple: PropTypes.bool.isRequired,
    icon: PropTypes.string.isRequired,
    isActive: PropTypes.func,
    onClick: PropTypes.func,
    options: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
});

export const propTypesActionsDefinition = PropTypes.objectOf(actionDefinition);

const MultipleDataTableContextMenu = createReactClass({
    propTypes: {
        actionsDefinition: propTypesActionsDefinition.isRequired,
        actions: PropTypes.objectOf(PropTypes.func),
        showContextMenu: PropTypes.bool,
        activeItems: PropTypes.array,
        icons: PropTypes.object,
        target: PropTypes.object,
    },

    mixins: [Translate],

    getDefaultProps() {
        return {
            icons: {},
            actions: {},
        };
    },

    render() {
        const actionList = Object.keys(this.props.actions).filter(
            menuActionKey => typeof this.props.actions[menuActionKey] === "function"
        );

        const cmStyle = {
            position: "fixed",
        };
        const {
            actions,
            target,
            activeItems,
            icons,
            showContextMenu,
            actionsDefinition,
            ...popoverProps
        } = this.props;

        return (
            <Popover
                {...popoverProps}
                open={showContextMenu}
                anchorEl={target}
                anchorOrigin={{ horizontal: "middle", vertical: "center" }}
                animated={false}
                style={cmStyle}
                animation={Paper}
            >
                <Menu className="data-table__context-menu" desktop>
                    {actionList.map(action => {
                        const iconName = icons[action] ? icons[action] : action;
                        const { options } = actionsDefinition[action];

                        return (
                            <MenuItem
                                key={action}
                                data-object-id={activeItems}
                                className={"data-table__context-menu__item"}
                                onClick={options ? undefined : () => this.handleClick(action)}
                                primaryText={this.getTranslation(action)}
                                leftIcon={
                                    <FontIcon className="material-icons">{iconName}</FontIcon>
                                }
                                rightIcon={options ? <ArrowDropRight /> : undefined}
                                menuItems={(options || []).map(option => (
                                    <MenuItem
                                        key={option}
                                        primaryText={option}
                                        onClick={() => this.handleClick(action, { year: option })}
                                    />
                                ))}
                            />
                        );
                    })}
                </Menu>
            </Popover>
        );
    },

    handleClick(action, options) {
        this.props.actions[action]({ selected: this.props.activeItems, options });
        this.props.onRequestClose && this.props.onRequestClose();
    },
});

export default MultipleDataTableContextMenu;
