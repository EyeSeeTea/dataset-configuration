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
    var LODASH_CDN = "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js";
    var JQUERY_CDN = "https://code.jquery.com/jquery-3.6.0.min.js";

    function loadScript(url, callback) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.src = url;
        script.onload = callback;
        script.onerror = function () {
            console.warn("Failed to load script from CDN: " + url);
            callback(); // Still proceed even if loading fails
        };
        document.head.appendChild(script);
    }

    // Function to ensure dependencies are loaded
    function ensureDependencies(callback) {
        var pendingLoads = 0;

        function checkComplete() {
            pendingLoads--;
            if (pendingLoads === 0) {
                callback();
            }
        }

        // Check if lodash is missing
        if (!window._) {
            pendingLoads++;
            console.log("Lodash not found, loading from CDN...");
            loadScript(LODASH_CDN, checkComplete);
        }

        // Check if jQuery is missing
        if (!window.$) {
            pendingLoads++;
            console.log("jQuery not found, loading from CDN...");
            loadScript(JQUERY_CDN, checkComplete);
        }

        // If both are already loaded, call callback immediately
        if (pendingLoads === 0) {
            callback();
        }
    }
    ensureDependencies(function () {
        var _ = window._;
        var $ = window.$;

        if (!_ || !$) {
            console.warn(
                "Dependencies (lodash or jQuery) could not be loaded. Some features may not work."
            );
            return;
        }

        _.mixin({
            cartesianProduct: function (args) {
                return _.reduce(
                    args,
                    function (a, b) {
                        return _.flatten(
                            _.map(a, function (x) {
                                return _.map(b, function (y) {
                                    return x.concat([y]);
                                });
                            }),
                            true
                        );
                    },
                    [[]]
                );
            },

            groupConsecutiveBy: function (xs, mapper) {
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
                    if (!table) return;
                    if (tableFitsInViewport(table)) return;
                    splitedTablesCount++;
                    var firstRow = table.find("tbody tr:first-child td .entryfield");
                    if (firstRow.size() === 0) return;
                    var cocIds = firstRow.get().map(input => $(input).attr("id").split("-")[1]);
                    var allCategoryOptions = table
                        .find("thead tr")
                        .get()
                        .map(tr =>
                            _.chain($(tr).find("th[scope=col]").get())
                                .map(th => [
                                    repeat(parseInt($(th).attr("colspan")), $(th).text().trim()),
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
                        group: table.find("nrcinfoheader").text().trim(),
                        categories: uniqCategories,
                        cocs: cocs,
                        rows: rows,
                        showRowTotals:
                            table.find("tbody tr:first-child td:last-child input.dataelementtotal")
                                .length > 0,
                        showColumnTotals:
                            table.find("tbody tr:last-child td:nth-child(2) input.dataelementtotal")
                                .length > 0,
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

        var buildTable = function (data, renderDataElementInfo) {
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

            return $("<table>", {
                id: "sectionTable",
                class: "sectionTable",
                cellspacing: "0",
            }).append([
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
            ]);
        };

        var tableFitsInViewport = function (table) {
            // TODO: get input size and use tableWidth
            // var tableWidth = table.width();
            return table.find("thead tr:last th").length - 1 <= 16;
        };

        var fixActionsBox = function () {
            // Button <run validation> does not fit in the box, add some more width.
            $("#completenessDiv").css("width", "+=5px");
        };

        var renumerateInputFields = function () {
            var lastIndex =
                _.chain($("[tabindex]").get())
                    .map(x => parseInt($(x).attr("tabindex")))
                    .max()
                    .value() || 0;
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

        var applyPeriodDates = function () {
            /* eslint-disable no-undef */
            const selectedPeriod = dhis2.de.getSelectedPeriod();
            if (!selectedPeriod || !selectedPeriod.startDate) return;
            const getDate = isoDate => (isoDate ? new Date(isoDate.split("T")[0]) : null);
            const getFormatDate = isoDate =>
                isoDate ? formatDate(new Date(isoDate.split("T")[0])) : null;
            const startDate = selectedPeriod.startDate;
            const periodYear = startDate.split("-")[0];
            const today = new Date();
            console.debug("applyPeriodDates", { periodDates, selectedPeriod, periodYear, today });

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
            initializeAccordion();
            initializeTabs();
        };

        var initializeIndicatorMatch = function (matchingRules) {
            matchingRules.forEach(setupRule);

            function setupRule(rule) {
                const { target, expression, sourceIds } = rule;

                const targetElements = findElementsByPattern(target);

                targetElements.forEach(targetElement => {
                    const cocId = extractCocId(targetElement.id, target);

                    const sourceElements = sourceIds
                        .map(sourceId => document.getElementById(`${sourceId}-${cocId}`))
                        .filter(el => el !== null);

                    if (sourceElements.length > 0) {
                        attachListeners(
                            sourceElements,
                            targetElement,
                            expression,
                            sourceIds,
                            cocId
                        );
                    }
                });
            }

            function setReactInputAndSave(el, value) {
                const setter = Object.getOwnPropertyDescriptor(el.__proto__, "value").set;
                setter.call(el, String(value));

                ["change", "focusout", "blur"].forEach(type =>
                    el.dispatchEvent(new Event(type, { bubbles: type !== "blur" }))
                );
                el.blur();
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
                        var result = evaluateExpression(expression, sourceIds, cocId);
                        setReactInputAndSave(targetElement, result);
                    } catch (error) {
                        console.error("Error evaluating expression:", error);
                        targetElement.value = "";
                    }
                };

                sourceElements.forEach(sourceElement => {
                    sourceElement.addEventListener("blur", updateTarget);
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
            window.addEventListener("dhis2.de.event.formLoaded", applyChangesToForm);
            applyChangesToForm();
            window.addEventListener("dhis2.de.event.periodChanged", applyPeriodDates);
        };

        var initializeAccordion = function () {
            document.addEventListener("click", function (e) {
                const heading = e.target.closest(".panel-heading");
                if (!heading) return;

                e.preventDefault();
                const isCollapsed = heading.classList.contains("collapsed");
                const targetId = heading.getAttribute("data-target");

                if (targetId) {
                    const targetElement = document.querySelector(targetId);
                    if (targetElement) {
                        if (isCollapsed) {
                            heading.classList.remove("collapsed");
                            targetElement.classList.remove("collapsed");
                        } else {
                            heading.classList.add("collapsed");
                            targetElement.classList.add("collapsed");
                        }
                    }
                }
            });
        };

        var initializeTabs = function () {
            const tabsContainer = document.getElementById("tabs");
            if (!tabsContainer) return;

            const tabLinks = tabsContainer.querySelectorAll("ul > li > button");
            const tabContents = tabsContainer.querySelectorAll('[id^="tab-"]');

            tabLinks.forEach((link, index) => {
                link.addEventListener("click", function (e) {
                    e.preventDefault();

                    tabLinks.forEach(l => l.parentElement.classList.remove("ui-tabs-active"));
                    tabContents.forEach(content => {
                        content.style.display = "none";
                    });

                    this.parentElement.classList.add("ui-tabs-active");
                    if (tabContents[index]) {
                        tabContents[index].style.display = "block";
                    }
                });
            });

            if (tabLinks.length > 0 && tabContents.length > 0) {
                tabLinks[0].parentElement.classList.add("ui-tabs-active");
                tabContents[0].style.display = "block";
                for (let i = 1; i < tabContents.length; i++) {
                    tabContents[i].style.display = "none";
                }
            }
        };

        $(init);
    });
})();
