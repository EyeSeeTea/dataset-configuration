/*

    Groups tabs dynamically in dhis-web-dataentry on form load. You usually use this content
    script as a custom Javascript in the <Custom JS/CSS> app.

    Requirements:
        - Dataset sections must have hierarchical names: "SECTION@THEME@GROUP".

    Actions:
        - Sections are grouped into a single tab.
        - Themes without a section are grouped as collapsible elements.
        - Groups within a theme are grouped.
*/

(function() {

var runOnMutation = function(contentEl, callback) {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
    if (!MutationObserver) throw "Mutation is not supported by this browser";
    var hasChildrenState = contentEl.children().size() > 0;
    var observer = new MutationObserver(function() {
        var hasChildrenCurrent = contentEl.children().size() > 0;
        if (!hasChildrenState && hasChildrenCurrent) {
            callback();
        }
        hasChildrenState = hasChildrenCurrent;
    });

    observer.observe(contentEl.get(0), {subtree: true, childList: true});
};

var loadCss = function(url) {
    $("<link/>", {
        rel: "stylesheet",
        type: "text/css",
        href: url,
    }).appendTo(document.head);
};

var loadJs = function(url, cb) {
    $.getScript(url, cb);
};

var injectCss = function(styles) {
    $("<style/>", {type: "text/css"}).text(styles).appendTo(document.head);
};

var emptyField = "__undefined";

var separator = "@";

var getTag = function(el, name) {
    var idx = {section: 0, theme: 1, group: 2}[name];
    return $(el).text().split(separator)[idx] || emptyField;
};

var getTabContents = function(tab) {
    return $("#" + $(tab).attr("aria-controls"));
};

var getThemeHeader = function(title, target) {
    return (
        $("<div/>").addClass("panel-heading").attr({"data-target": "#" + target, "data-toggle": "collapse"}).append(
            $("<h5/>").addClass("panel-title accordion-toggle").append(
                $("<a/>").addClass("nrc-panel-title").text(title)
            )
        )
    );
};

var processGroupedTab = function(tabsByTheme, sectionName) {
    var groupedContents =
        $("<ul/>").addClass("list-unstyled").append(
            _.map(tabsByTheme, (tabsByGroup, themeName) => {
                var hasThemeHeader = _.size(tabsByTheme) > 1;
                var themeNameTitle = themeName !== emptyField ? themeName : "Default";
                var subsectionKey = (sectionName + "-" + themeName).replace(/ /g, "");

                return $("<li/>").addClass("panel panel-default").append(
                    hasThemeHeader ? getThemeHeader(themeNameTitle, subsectionKey) : $("<span/>"),
                    $("<div/>").attr("id", subsectionKey).addClass("panel-collapse collapse in").append(
                        _.map(tabsByGroup, (elementsInGroup, groupName) => {
                            var showGroupTitle = _.size(tabsByGroup) > 1 && groupName !== emptyField;

                            return $("<div/>").append(
                                showGroupTitle ? $("<h4/>").text(groupName) : $("<span/>"),
                                $("<div/>").append(_.map(elementsInGroup, (tab) => {
                                    return getTabContents(tab).clone().children();
                                }))
                            );
                        })
                    )
                );
            })
        );

    var tabs = _($("#tabs li").toArray())
        .select(el => $(el).text().split(separator)[0] === sectionName);
    var mainTab = $(tabs[0]);

    getTabContents(mainTab).html(groupedContents);
    mainTab.find("a").text(sectionName);
    $(tabs.slice(1)).remove();
};

var getGroupedTabs = function() {
    return _.chain($("#tabs li").toArray())
        .groupBy(el => getTag(el, "section"))
        .map((elementInSection, sectionName) => {
            var tabsByTheme = _.chain(elementInSection)
                .groupBy(el => getTag(el, "theme"))
                .map((elementsInTheme, themeName) => {
                    var tabsByGroup = _.groupBy(elementsInTheme, el => getTag(el, "group"));
                    return [themeName, tabsByGroup];
                })
                .object()
                .value();
            return [sectionName, tabsByTheme];
        })
        .object()
        .value();
};

var groupSubsections = function() {
    _.each(getGroupedTabs(), processGroupedTab);
};

var init = function() {
    var contentDiv = $("#contentDiv");
    var isDataEntryPage = dhis2.de.updateIndicators && contentDiv.length > 0;

    if (isDataEntryPage) {
        console.log("data-entry-contentscript: init");
        runOnMutation(contentDiv, () => {
            groupSubsections();
        });

        loadJs("../dhis-web-commons/bootstrap/js/bootstrap.min.js");
        loadCss("../dhis-web-commons/bootstrap/css/bootstrap.min.css");
    }
};

$(init);

})();