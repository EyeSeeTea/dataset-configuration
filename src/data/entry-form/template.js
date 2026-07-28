var $ = window.$;
var periodDates = {};
var indicatorMatching = [];

/* eslint-disable no-unused-vars */
function setPeriodDates(periodDates_) {
    periodDates = periodDates_;
}

function setIndicatorMatching(indicatorMatching_) {
    indicatorMatching = indicatorMatching_;
}

(function () {
    // Reason: the v42 data entry app no longer exposes lodash to custom forms
    const last = xs => xs[xs.length - 1];

    const range = n => Array.from(Array(n), (_value, index) => index);

    const uniq = xs => Array.from(new Set(xs));

    const max = xs => (xs.length === 0 ? undefined : xs.reduce((a, b) => Math.max(a, b)));

    const zip = arrays =>
        range(max(arrays.map(array => array.length)) ?? 0).map(index =>
            arrays.map(array => array[index])
        );

    const isEqual = (a, b) =>
        Array.isArray(a) && Array.isArray(b)
            ? a.length === b.length && a.every((x, index) => isEqual(x, b[index]))
            : a === b;

    // Groups adjacent items sharing the same mapped key: [a1, a2, b1] -> [[a1, a2], [b1]]
    const groupConsecutiveBy = (xs, mapper = x => x) =>
        xs.reduce((groups, x) => {
            const lastGroup = last(groups);
            return lastGroup && isEqual(mapper(last(lastGroup)), mapper(x))
                ? [...groups.slice(0, -1), [...lastGroup, x]]
                : [...groups, [x]];
        }, []);

    const groupCocsByCategory = (cocs, categoryIndex) =>
        groupConsecutiveBy(cocs, coc => coc.cos.slice(0, categoryIndex + 1));

    var debugElapsed = (label, fn) => {
        var start = new Date().getTime();
        fn();
        var elapsed = new Date().getTime() - start;
        console.debug(`[elapsed] ${label}: ${elapsed} ms`);
    };

    var loadCss = function (url) {
        $("<link/>", {
            rel: "stylesheet",
            type: "text/css",
            href: url,
        }).appendTo(document.head);
    };

    var loadJs = function (url, cb) {
        $.getScript(url, cb);
    };

    var repeat = function (times, n) {
        return Array.from(Array(times), () => n);
    };

    var splitWideTables = function () {
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
                var cocIds = firstRow.get().map(input => $(input).attr("id").split("-")[1]);
                var allCategoryOptions = table
                    .find("thead tr")
                    .get()
                    .map(tr =>
                        $(tr)
                            .find("th[scope=col]")
                            .get()
                            .flatMap(th =>
                                repeat(parseInt($(th).attr("colspan")), $(th).text().trim())
                            )
                    );

                var categoryOptions = zip(allCategoryOptions);
                var uniqCategories = allCategoryOptions.map(categoryOptions =>
                    uniq(categoryOptions)
                );
                if (categoryOptions.length !== cocIds.length) {
                    alert("Error: parsing of form failed");
                }
                var cocs = zip([categoryOptions, cocIds]).map(pair => ({
                    cos: pair[0],
                    id: pair[1],
                }));

                var rows = table
                    .find("tbody tr")
                    .get()
                    .map($)
                    .flatMap(tr => {
                        const td = tr.find("td:first-child");
                        const tdId = td.attr("id");
                        if (!tdId) return [];

                        const valuesByCocId = Object.fromEntries(
                            tr
                                .find("td .entryfield")
                                .get()
                                .map($)
                                .map(input => {
                                    const cocId = input.attr("id").split("-")[1];
                                    return [cocId, { td: input.parent("td"), coc: cocId }];
                                })
                        );

                        return [
                            {
                                de: {
                                    id: tdId.split("-")[0],
                                    name: td.text().trim(),
                                    td: td,
                                },
                                valuesByCocId: valuesByCocId,
                            },
                        ];
                    });

                var data = {
                    group: table.find("nrcinfoheader").text().trim(),
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

    var splitTables = function (data, options) {
        var categoryIndex = options.categoryIndex;
        var nCategories = data.categories.length;
        var renderDataElementInfo = options.tableIndex === 0;
        var table = buildTable(data, renderDataElementInfo);

        if (categoryIndex >= nCategories - 1 || tableFitsInViewport(table)) {
            return [table];
        } else {
            return groupCocsByCategory(data.cocs, categoryIndex).flatMap(
                (splitCocs, splitTableIndex) =>
                    splitTables(
                        { ...data, cocs: splitCocs },
                        {
                            categoryIndex: categoryIndex + 1,
                            tableIndex: options.tableIndex + splitTableIndex,
                        }
                    )
            );
        }
    };

    var buildTable = function (data, renderDataElementInfo) {
        var getValues = row => data.cocs.map(coc => row.valuesByCocId[coc.id]);
        var nCategories = data.categories.length;
        var categoryThsList = range(nCategories).map(categoryIndex =>
            groupCocsByCategory(data.cocs, categoryIndex).map(group => {
                var label = group[0].cos[categoryIndex];
                return $("<th>", {
                    class: "nrcdataheader",
                    colspan: group.length,
                    scope: "col",
                }).text(label);
            })
        );

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

    var tableFitsInViewport = function (table) {
        // TODO: get input size and use tableWidth
        // var tableWidth = table.width();
        return table.find("thead tr:last th").size() - 1 <= 16;
    };

    var fixActionsBox = function () {
        // Button <run validation> does not fit in the box, add some more width.
        $("#completenessDiv").css("width", "+=5px");
    };

    var renumerateInputFields = function () {
        // Reason: a non-numeric tabindex would otherwise poison max to NaN, collapsing lastIndex to 0
        var lastIndex =
            max(
                $("[tabindex]")
                    .get()
                    .map(x => parseInt($(x).attr("tabindex")))
                    .filter(tabIndex => !Number.isNaN(tabIndex))
            ) || 0;
        $("#contentDiv .entryfield").each((i, input) =>
            $(input).attr("tabindex", lastIndex + i + 1)
        );
    };

    var highlightDataElementRows = function () {
        var setClass = function (ev, className, isActive) {
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

    var setTabsVisibility = function (type, isDateOutsidePeriod, info) {
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

    var formatDate = function (date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return [day, month, year].join("/");
    };

    // Reason: v42 never populates dhis2.de.periodChoices, so getSelectedPeriod() always returns
    // undefined. currentPeriodId and #selectedPeriodId are both supported by its legacy shim.
    var getSelectedPeriodYear = function () {
        /* eslint-disable no-undef */
        const periodId =
            (window.dhis2 && dhis2.de && dhis2.de.currentPeriodId) || $("#selectedPeriodId").val();
        return periodId ? String(periodId).slice(0, 4) : undefined;
    };

    var applyPeriodDates = function () {
        const periodYear = getSelectedPeriodYear();
        if (!periodYear) return;
        const getDate = isoDate => (isoDate ? new Date(isoDate.split("T")[0]) : null);
        const getFormatDate = isoDate =>
            isoDate ? formatDate(new Date(isoDate.split("T")[0])) : null;
        const today = new Date();
        console.debug("applyPeriodDates", { periodDates, periodYear, today });

        ["output", "outcome"].forEach(type => {
            const obj = (periodDates[type] || {})[periodYear];
            const isDateOutsidePeriod =
                obj !== undefined &&
                ((obj.start && today < getDate(obj.start)) ||
                    (obj.end && today > getDate(obj.end)));
            let info;
            if (isDateOutsidePeriod) {
                const ns = {
                    from: getFormatDate(obj.start) || "-",
                    to: getFormatDate(obj.end) || "-",
                };
                info = `${ns.from} -> ${ns.to}`;
            }

            setTabsVisibility(type, isDateOutsidePeriod, info);
        });
    };

    var applyChangesToForm = function () {
        if (!$("#tabs").hasClass("dataset-configuration-custom-form")) return;

        applyPeriodDates();
        debugElapsed("Split tables", splitWideTables);
        highlightDataElementRows();
        renumerateInputFields();
        fixActionsBox();
        initializeIndicatorMatch(indicatorMatching);
    };

    var initializeIndicatorMatch = function (matchingRules) {
        matchingRules.forEach(setupRule);

        function setupRule(rule) {
            const { target, expression, sourceIds } = rule;

            const targetElements = findElementsByPattern(target);

            targetElements.forEach(targetElement => {
                const cocId = extractCocId(targetElement.id, target);

                targetElement.disabled = true;
                targetElement.setAttribute("data-indicator-match-target", "true");

                const sourceElements = sourceIds
                    .map(sourceId => document.getElementById(`${sourceId}-${cocId}`))
                    .filter(el => el !== null);

                if (sourceElements.length > 0) {
                    attachListeners(sourceElements, targetElement, expression, sourceIds, cocId);
                }
            });
        }

        function findElementsByPattern(dataElementId) {
            const pattern = `input[id^="${dataElementId}-"]`;
            return Array.from(document.querySelectorAll(pattern));
        }

        function extractCocId(fullId, dataElementId) {
            return fullId.replace(`${dataElementId}-`, "");
        }

        function attachListeners(sourceElements, targetElement, expression, sourceIds, cocId) {
            const updateTarget = () => {
                try {
                    const result = evaluateExpression(expression, sourceIds, cocId);
                    targetElement.value = result;

                    targetElement.dispatchEvent(new Event("change", { bubbles: true }));
                } catch (error) {
                    console.error("Error evaluating expression:", error);
                    targetElement.value = "";
                }
            };

            sourceElements.forEach(sourceElement => {
                sourceElement.addEventListener("change", updateTarget);
                sourceElement.addEventListener("input", debounce(updateTarget, 300));
            });
        }

        function evaluateExpression(expression, sourceIds, cocId) {
            const sourceValues = sourceIds.map(sourceId => {
                const element = document.getElementById(`${sourceId}-${cocId}`);
                if (!element) return null;

                const value = element.value;
                if (!value || value.trim() === "") return null;

                const numValue = parseFloat(value);
                return isNaN(numValue) ? null : numValue;
            });

            if (sourceValues.includes(null)) {
                return "";
            }

            const processedExpression = sourceIds.reduce((acc, sourceId, index) => {
                const value = sourceValues[index];
                const placeholder = `#{${sourceId}}`;
                return acc.replace(new RegExp(escapeRegExp(placeholder), "g"), value);
            }, expression);

            return safeEval(processedExpression);
        }

        function safeEval(expression) {
            if (!expression || expression.trim() === "") {
                return null;
            }
            if (!/^[0-9+\-*/.() ]+$/.test(expression)) {
                throw new Error("Invalid expression characters");
            }

            try {
                return new Function(`return ${expression}`)();
            } catch (error) {
                console.error("Expression evaluation failed:", expression, error);
                return 0;
            }
        }

        function escapeRegExp(string) {
            return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }
    };

    var init = function () {
        if (window.datasetConfigurationCustomFormLoaded) return;
        window.datasetConfigurationCustomFormLoaded = true;
        $(document).on("dhis2.de.event.formLoaded", applyChangesToForm);
        applyChangesToForm();
        $("#selectedPeriodId").change(applyPeriodDates);
        loadJs("../dhis-web-commons/bootstrap/js/bootstrap.min.js");
        loadCss("../dhis-web-commons/bootstrap/css/bootstrap.min.css");
        // Reason: the v42 data entry app no longer loads FontAwesome, used for the accordion arrows
        loadCss("../dhis-web-commons/font-awesome/css/font-awesome.min.css");
    };

    $(init);
})();
