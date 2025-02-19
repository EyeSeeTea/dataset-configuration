var _ = window._;
var $ = window.$;
var periodDates = {};

/* eslint-disable no-unused-vars */
function setPeriodDates(periodDates_) {
    periodDates = periodDates_;
}

(function() {
    _.mixin({
        cartesianProduct: function(args) {
            return _.reduce(
                args,
                function(a, b) {
                    return _.flatten(
                        _.map(a, function(x) {
                            return _.map(b, function(y) {
                                return x.concat([y]);
                            });
                        }),
                        true
                    );
                },
                [[]]
            );
        },

        groupConsecutiveBy: function(xs, mapper) {
            mapper = mapper || _.identity;
            var reducer = (acc, x) => {
                if (_.isEmpty(acc)) {
                    return acc.concat([[x]]);
                } else {
                    var last = _.last(acc);
                    if (_.isEqual(mapper(_.last(last)), mapper(x))) {
                        last.push(x);
                        return acc;
                    } else {
                        return acc.concat([[x]]);
                    }
                }
            };
            return _(xs).reduce(reducer, []);
        },
    });

    var debugElapsed = (label, fn) => {
        var start = new Date().getTime();
        fn();
        var elapsed = new Date().getTime() - start;
        console.debug(`[elapsed] ${label}: ${elapsed} ms`);
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

    var repeat = function(times, n) {
        return Array.from(Array(times), () => n);
    };

    var splitWideTables = function() {
        var splitedTablesCount = 0;
        var createTablesCount = 0;

        $(".sectionTable")
            .get()
            .map($)
            .forEach((table, _count) => {
                if (tableFitsInViewport(table)) return;
                splitedTablesCount++;
                var firstRow = table.find("tbody tr:first-child td .entryfield");
                if (firstRow.size() === 0) return;
                var cocIds = firstRow.get().map(
                    input =>
                        $(input)
                            .attr("id")
                            .split("-")[1]
                );
                var allCategoryOptions = table
                    .find("thead tr")
                    .get()
                    .map(tr =>
                        _.chain(
                            $(tr)
                                .find("th[scope=col]")
                                .get()
                        )
                            .map(th => [
                                repeat(
                                    parseInt($(th).attr("colspan")),
                                    $(th)
                                        .text()
                                        .trim()
                                ),
                            ])
                            .flatten()
                            .value()
                    );

                var categoryOptions = _.zip.apply(null, allCategoryOptions);
                var uniqCategories = allCategoryOptions.map(categoryOptions =>
                    _.uniq(categoryOptions)
                );
                if (categoryOptions.length !== cocIds.length) {
                    alert("Error: parsing of form failed");
                }
                var cocs = _.zip(categoryOptions, cocIds).map(pair => ({
                    cos: pair[0],
                    id: pair[1],
                }));

                var rows = _.chain(table.find("tbody tr").get())
                    .map($)
                    .map(tr => {
                        var td = tr.find("td:first-child");
                        var tdId = td.attr("id");

                        if (tdId) {
                            var deId = tdId.split("-")[0];
                            var deName = td.text().trim();
                            var valuesByCocId = _.chain(tr.find("td .entryfield").get())
                                .map($)
                                .map(input => {
                                    var cocId = input.attr("id").split("-")[1];
                                    return [cocId, { td: input.parent("td"), coc: cocId }];
                                })
                                .object()
                                .value();
                            return {
                                de: { id: deId, name: deName, td: td },
                                valuesByCocId: valuesByCocId,
                            };
                        } else {
                            return null;
                        }
                    })
                    .compact()
                    .value();

                var data = {
                    group: table
                        .find("nrcinfoheader")
                        .text()
                        .trim(),
                    categories: uniqCategories,
                    cocs: cocs,
                    rows: rows,
                    showRowTotals:
                        table
                            .find("tbody tr:first-child td:last-child input.dataelementtotal")
                            .size() > 0,
                    showColumnTotals:
                        table
                            .find("tbody tr:last-child td:nth-child(2) input.dataelementtotal")
                            .size() > 0,
                };

                var newTables = splitTables(data, { categoryIndex: 0, tableIndex: 0 });
                createTablesCount += newTables.length;
                table.replaceWith($("<div>").append(newTables));
            });

        console.log(
            "Split tables: " + splitedTablesCount + ", tables created: " + createTablesCount
        );
    };

    var splitTables = function(data, options) {
        var categoryIndex = options.categoryIndex;
        var nCategories = data.categories.length;
        var renderDataElementInfo = options.tableIndex === 0;
        var table = buildTable(data, renderDataElementInfo);

        if (categoryIndex >= nCategories - 1 || tableFitsInViewport(table)) {
            return [table];
        } else {
            return _.chain(data.cocs)
                .groupConsecutiveBy(coc => coc.cos.slice(0, categoryIndex + 1))
                .map((splitCocs, splitTableIndex) =>
                    splitTables(_.extend({}, data, { cocs: splitCocs }), {
                        categoryIndex: categoryIndex + 1,
                        tableIndex: options.tableIndex + splitTableIndex,
                    })
                )
                .flatten(1)
                .value();
        }
    };

    var buildTable = function(data, renderDataElementInfo) {
        var getValues = row => data.cocs.map(coc => row.valuesByCocId[coc.id]);
        var nCategories = data.categories.length;
        var categoryThsList = _.range(nCategories).map(categoryIndex => {
            return _.chain(data.cocs)
                .groupConsecutiveBy(coc => coc.cos.slice(0, categoryIndex + 1))
                .map(group => {
                    var label = group[0].cos[categoryIndex];
                    return $("<th>", {
                        class: "nrcdataheader",
                        colspan: group.length,
                        scope: "col",
                    }).text(label);
                })
                .value();
        });

        return $("<table>", { id: "sectionTable", class: "sectionTable", cellspacing: "0" }).append(
            [
                $("<thead>").append(
                    categoryThsList.map((categoryThs, index) =>
                        $("<tr>").append(
                            $("<th>", { class: "nrcinfoheader" }).html(
                                renderDataElementInfo && index === 0 ? data.group : "&nbsp;"
                            ),
                            categoryThs,
                            index === 0 && data.showRowTotals
                                ? $("<th>", {
                                      class: "nrctotalheader",
                                      rowspan: nCategories,
                                      verticalAlign: "top",
                                  }).text("Total")
                                : null
                        )
                    )
                ),
                $("<tbody>").append(
                    data.rows.map(row => {
                        // id = "row-DE-COC1-COC2-.."
                        var rowTotalId = ["row", row.de.id]
                            .concat(getValues(row).map(val => val.coc))
                            .join("-");
                        var rowTotal = $("<input>", {
                            class: "dataelementtotal",
                            type: "text",
                            disabled: "",
                            id: rowTotalId,
                        });
                        var cssClass = [
                            "derow",
                            "de-" + row.de.id,
                            renderDataElementInfo ? "primary" : "secondary",
                        ].join(" ");
                        return $("<tr>", { class: cssClass }).append(
                            $("<td>", { class: "nrcindicatorName" })
                                .css("opacity", renderDataElementInfo ? 1 : 0)
                                .html(row.de.name),
                            getValues(row).map(val => val.td.clone()),
                            data.showRowTotals ? $("<td>").append(rowTotal) : null
                        );
                    }),

                    data.showColumnTotals
                        ? $("<tr>").append(
                              $("<td>", { class: "nrcindicatorName" }).text(
                                  renderDataElementInfo ? "Total" : ""
                              ),
                              getValues(data.rows[0]).map(val =>
                                  $("<td>").append(
                                      $("<input>", {
                                          class: "dataelementtotal",
                                          type: "text",
                                          id: "col-" + val.coc,
                                          disabled: "",
                                      })
                                  )
                              )
                          )
                        : null
                ),
            ]
        );
    };

    var tableFitsInViewport = function(table) {
        // TODO: get input size and use tableWidth
        // var tableWidth = table.width();
        return table.find("thead tr:last th").size() - 1 <= 16;
    };

    var fixActionsBox = function() {
        // Button <run validation> does not fit in the box, add some more width.
        $("#completenessDiv").css("width", "+=5px");
    };

    var renumerateInputFields = function() {
        var lastIndex =
            _.chain($("[tabindex]").get())
                .map(x => parseInt($(x).attr("tabindex")))
                .max()
                .value() || 0;
        $("#contentDiv .entryfield").each((i, input) =>
            $(input).attr("tabindex", lastIndex + i + 1)
        );
    };

    var highlightDataElementRows = function() {
        var setClass = function(ev, className, isActive) {
            var tr = $(ev.currentTarget);
            var de_class = (tr.attr("class") || "")
                .split(" ")
                .filter(cl => cl.startsWith("de-"))[0];
            if (de_class) {
                var deId = de_class.split("-")[1];
                var el = $(".de-" + deId);
                el.toggleClass(className, isActive);
                if (tr.hasClass("secondary")) {
                    var opacity = isActive ? 1 : 0;
                    tr.find(".nrcindicatorName")
                        .clearQueue()
                        .delay(500)
                        .animate({ opacity: opacity }, 100);
                }
            }
        };

        $("tr.derow")
            .mouseover(ev => setClass(ev, "hover", true))
            .mouseout(ev => setClass(ev, "hover", false))
            .focusin(ev => setClass(ev, "focus", true))
            .focusout(ev => setClass(ev, "focus", false));
    };

    var setTabsVisibility = function(type, isDateOutsidePeriod, info) {
        const tabContents = $(".type-" + type);

        if (isDateOutsidePeriod) {
            tabContents.find(".in-period").hide();
            tabContents.find(".out-of-period").show();
            tabContents.find(".out-of-period .info").text(info);
        } else {
            tabContents.find(".in-period").show();
            tabContents.find(".out-of-period").hide();
        }
    };

    var applyPeriodDates = function() {
        /* eslint-disable no-undef */
        const selectedPeriod = dhis2.de.getSelectedPeriod();
        if (!selectedPeriod || !selectedPeriod.startDate) return;
        const getDate = isoDate => (isoDate ? new Date(isoDate.split("T")[0]) : null);
        const getFormatDate = isoDate =>
            isoDate ? formatDate(new Date(isoDate.split("T")[0]), "dd/MM/yyyy") : null;
        const startDate = selectedPeriod.startDate;
        const periodYear = startDate.split("-")[0];
        const today = new Date();
        console.debug("applyPeriodDates", { periodDates, selectedPeriod, periodYear, today });

        ["output", "outcome"].forEach(type => {
            const obj = (periodDates[type] || {})[periodYear];
            const isDateOutsidePeriod =
                obj !== undefined && ((obj.start && today < getDate(obj.start)) || (obj.end && today > getDate(obj.end)));
            let info;
            if (isDateOutsidePeriod){
                const ns = { from: getFormatDate(obj.start) || "-", to: getFormatDate(obj.end) || "-" };
                info = `${ns.from} -> ${ns.to}`;
            }

            setTabsVisibility(type, isDateOutsidePeriod, info);
        });
    };

    var applyChangesToForm = function() {
        if (!$("#tabs").hasClass("dataset-configuration-custom-form")) return;

        applyPeriodDates();
        debugElapsed("Split tables", splitWideTables);
        highlightDataElementRows();
        renumerateInputFields();
        fixActionsBox();
    };

    var init = function() {
        if (window.datasetConfigurationCustomFormLoaded) return;
        window.datasetConfigurationCustomFormLoaded = true;
        $(document).on("dhis2.de.event.formLoaded", applyChangesToForm);
        applyChangesToForm();
        $("#selectedPeriodId").change(applyPeriodDates);
        loadJs("../dhis-web-commons/bootstrap/js/bootstrap.min.js");
        loadCss("../dhis-web-commons/bootstrap/css/bootstrap.min.css");
    };

    $(init);
})();
