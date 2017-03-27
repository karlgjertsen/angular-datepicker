/*!
 * RM-DATEPICKER v1.0.0
 * http://rubymage.com
 *
 * Copyright 2015 Sergiu Ghenciu, RUBYMAGE
 * Released under the MIT license
 * https://github.com/RUBYMAGE/angular-datepicker/blob/master/LICENSE
 */

(function () {

  'use strict';

    var Module = angular.module('rmDatepicker', []);

    Module.constant('rmDatepickerConfig', {
        mondayStart: false,
        textToday: "Today",

        initState: "month",
        maxState: "decade",
        minState: "month",
        toggleState: true,

        decadeSize: 12,
        monthSize: 42, /* "auto" || fixed nr. (35 or 42) */

        min: null,
        max: null,
        format: "dd/MM/yyyy"
    });

    Module.directive("rmDatepicker", ['rmDatepickerConfig', '$compile', '$filter', '$document', '$timeout',
                            function (rmDatepickerConfig, $compile, $filter, $document, $timeout) {

        var link = function (scope, element, attrs, ngModel) {
            var conf = angular.copy(rmDatepickerConfig);

            if (scope.rmConfig) {
                for (var prop in conf)
                    if (conf.hasOwnProperty(prop))
                        if (scope.rmConfig[prop] != undefined) conf[prop] = scope.rmConfig[prop];
            }
            if (conf.min) conf.min.setHours(0, 0, 0, 0);
            if (conf.max) conf.max.setHours(23, 59, 59, 999);

            var isInput = element[0].tagName.toUpperCase() == "INPUT";
            var isReached = {
                min: false,
                max: false
            };
            var daysInMonth = function (year, month) {
                return new Date(year, month + 1, 0).getDate();
            };
            var adjustDate = function (date) {
                var date = parseInt(date, 10);
                if (!isNaN(date)) {
                    var max = daysInMonth(scope.model.getFullYear(), scope.model.getMonth());
                    if (date < 1) date = 1;
                    if (date > max) date = max;
                    scope.model.setDate(date);
                }
            };
            var gen = {
                decade: function (oDate) {
                    var Y = oDate.getFullYear(),
                        m = oDate.getMonth(),
                        d = oDate.getDate(),
                        max,
                        i = 0,
                        n = conf.decadeSize || 12; // count of years in decade
                    var aDecade = new Array(n);

                    Y = Math.floor(Y / n) * n; // begin year of current decade

                    for (; i < n; Y++, i++) {
                        max = daysInMonth(Y, m);
                        if (d > max) d = max;
                        aDecade[i] = new Date(Y, m, d, 0, 0, 0, 0);
                    }
                    return aDecade;
                },
                year: function (oDate) {
                    var Y = oDate.getFullYear(),
                        m = 0,
                        d = oDate.getDate(),
                        max;
                    var aYear = [];
                    for (; m < 12; m++) {
                        max = daysInMonth(Y, m);
                        if (d > max) d = max;
                        aYear.push(new Date(Y, m, d, 0, 0, 0, 0));
                    }
                    return aYear;
                },
                month: function (oDate) {
                    var Y = oDate.getFullYear(),
                        m = oDate.getMonth(),
                        startDate = new Date(Y, m, 1, 0, 0, 0, 0),
                        n;
                    var startPos = startDate.getDay() || 7;
                    if (scope.mondayStart) startPos = startPos - 1 || 7;

                    if (conf.monthSize == "auto")
                        n = ( startPos + daysInMonth(Y, m) < 35 ) ? 35 : 42;
                    else
                        n = conf.monthSize;

                    startDate.setDate(-startPos + 1);
                    return gen.dates(startDate, n);
                },
                dates: function (startDate, n) {
                    var aDates = new Array(n),
                        current = new Date(startDate),
                        i = 0;
                    while (i < n) {
                        aDates[i++] = new Date(current);
                        current.setDate(current.getDate() + 1);
                    }
                    return aDates;
                }
            };
            var refresh = function (state) {
                state = state || scope.state;

                if(scope.model){
                  scope.model = new Date(scope.model);
                  scope.initialDate = scope.model;
                }

                scope.aDates = gen[state](scope.initialDate);

                if (conf.min) {
                    //if(scope.aDates[0] < conf.min) scope.aDates[0].setDate( conf.min.getDate() );
                    isReached.min = scope.aDates[0] < conf.min;
                }
                if (conf.max) {
                    var oDate = scope.aDates[scope.aDates.length - 1];
                    //if(oDate > conf.max) oDate.setDate( conf.max.getDate() );
                    isReached.max = oDate > conf.max;
                }
            };
            var init = function () {
                scope.initialDate = new Date(scope.initialDate || scope.model || new Date());
                refresh();
            };

            var isBefore = function (oDate1, oDate2) {
                if (scope.state == "decade")
                    return oDate1.getFullYear() < oDate2.getFullYear();

                if (scope.state == "year") {
                    if (oDate1.getFullYear() == oDate2.getFullYear())
                        return oDate1.getMonth() < oDate2.getMonth();
                    else
                        return oDate1.getFullYear() < oDate2.getFullYear();
                }

                return oDate1 < oDate2;
            };
            scope.isOff = function (oDate) {
                if (!conf.min && !conf.max)
                    return false;
                if (conf.min && isBefore(oDate, conf.min))
                    return true;
                if (conf.max && isBefore(conf.max, oDate))
                    return true;
            };
            scope.isActive = {
                year: function (oDate) {
                  if(scope.model){
                    return oDate.getFullYear() == scope.model.getFullYear();
                  }
                  return oDate.getFullYear() == scope.initialDate.getFullYear();
                },
                month: function (oDate) {
                  if(scope.model){
                    return oDate.getMonth() == scope.model.getMonth();
                  }
                  return oDate.getMonth() == scope.initialDate.getMonth();
                },
                date: function (oDate) {
                    if(scope.model){
                        return oDate.getDate() == scope.model.getDate();
                    }
                    return oDate.getDate() == scope.initialDate.getDate();
                }
            };
            scope.isToday = function (oDate) {
                return scope.isActive.date(oDate)
                    && scope.isActive.month(oDate)
                    && scope.isActive.year(oDate);
            };

            scope.go = function (oDate) {
                if (scope.isOff(oDate)) return;

                if( isInput && scope.state == conf.minState && scope.isActive.month(oDate) ) {
                    togglePicker(false);
                }

                var m = scope.initialDate.getMonth();

                scope.model = new Date(oDate);
                scope.initialDate = scope.model;
                //
                // $timeout(function () {
                //     ngModel.$setViewValue(scope.model);
                // });
                if (conf.toggleState) scope.toggleState(1);

                if (m != scope.initialDate.getMonth()){
                  refresh();
                }
            };
            scope.now = function () {
                scope.model = new Date();
                scope.initialDate = scope.model;
                refresh();
            };
            scope.next = function (delta) {
                scope.model = scope.model || scope.initialDate;

                delta = delta || 1;

                if (delta > 0) {
                    if (isReached.max) return;
                }
                else {
                    if (isReached.min) return;
                }

                var Y = scope.model.getFullYear(),
                    m = scope.model.getMonth(),
                    d = scope.model.getDate();

                switch (scope.state) {
                    case "decade":
                        delta = delta * scope.aDates.length;
                    case "year":
                        scope.model.setFullYear(Y + delta, m, 15);
                        adjustDate(d);
                        break;
                    case "month":
                        scope.model.setMonth(m + delta, 15);
                        adjustDate(d);
                        break;
                    case "week" :
                        scope.model.setDate(d + (delta * 7));
                        break;
                }
                refresh();
            };
            scope.prev = function (delta) {
                return scope.next(-delta || -1);
            };
            scope.toggleState = function (direction) {
                direction = direction || 1;

                if (scope.state == conf.maxState && direction == -1 ||
                    scope.state == conf.minState && direction == 1) {
                    return;
                }
                scope.state = scope.aStates[scope.aStates.indexOf(scope.state) + direction];
                refresh();
            };

            scope.mondayStart = conf.mondayStart;
            scope.textToday = conf.textToday;

            scope.aStates = ["decade", "year", "month"];
            scope.state = conf.initState;


            init(); // generate initial state

            var offset = function (objElement, container) {
                var x = 0, y = 0;

                do {
                    x += objElement.offsetLeft;
                    y += objElement.offsetTop;
                    objElement = objElement.offsetParent
                } while (objElement != container);

                return {top: y, left: x};
            };
            var togglePicker = function (toggle) {
                overlay.css("display", toggle ? "block" : "none");
                calendar.css("display", toggle ? "block" : "none");
            };

            var adjustPos = function (pos, el, container) {
                var datePickerClientHeight = el.clientHeight < 100?342:el.clientHeight;
                var overspill = (pos.top + datePickerClientHeight) - container.clientHeight;
                if(overspill > 0){
                  pos.top -= (overspill + 5);
                }

                return pos;
            };

            if (isInput) {
                ngModel.$parsers.push(function (sDate) {
                  if (typeof(sDate) === 'string' ) {
                      return moment.utc(sDate, "DD/MM/YYYY").startOf('day').toDate();
                  }
                  return new Date(sDate);
                });
                ngModel.$formatters.push(function (oDate) {
                    return $filter('date')(oDate, conf.format);
                });

                var overlay = angular.element('<div class="rm-overlay" style="display:none"></div>');
                overlay.on('click', function () {
                    togglePicker(false);
                });

                var overlayContainer = element.closest(".scroll-container");
                overlayContainer.append(overlay);

                overlay.after($compile(TEMPLATE)(scope));

                var calendar = overlay.next();
                calendar.css({display: "none"});
                calendar.addClass('it-is-input');

                element.on('click', function () {
                    var el = element[0];
                    if(el.readOnly){
                        return;
                    }

                    if (window.innerWidth < 481) el.blur();
                    var pos = offset(el, overlayContainer.get(0));

                    pos.top += el.offsetHeight + 1;

                    calendar.css({top: pos.top + "px", left: pos.left + "px", display: "block"});
                    togglePicker(true);

                    adjustPos(pos, calendar.get(0), overlayContainer.get(0));
                    calendar.css({top: pos.top + "px", left: pos.left + "px"});


                    $timeout(function () {
                        refresh();
                    }, 0);
                });

                $document.on('keydown', function (e) {
                    if ([9, 13, 27].indexOf(e.keyCode) >= 0) togglePicker(false);
                });
            }
            else {
                element.append($compile(TEMPLATE)(scope));
            }
        };

        var TEMPLATE =
        '<div class="rm-datepicker" ng-class="{mondayStart: mondayStart}">' +
            '<div class="nav">' +
                '<a><i class="mi_arrow_back"></i></a>' +
                '<a class="back waves-effect" ng-click="toggleState(-1)">' +
                  '<span ng-show="state == \'decade\'">{{aDates[0].getFullYear()}} - {{aDates[aDates.length-1].getFullYear()}}</span>' +
                  '<span ng-show="state == \'year\'">{{initialDate.getFullYear()}}</span>' +
                  '<span ng-show="state == \'month\'">{{initialDate | date: \'MMMM yyyy\'}}</span>' +
                  '<span ng-show="state == \'week\'">{{initialDate | date: \'d MMMM yyyy\' }}</span>' +
                '</a>' +
                '<a class="adjacent waves-effect" ng-click="prev()"><i class="mi_keyboard_arrow_up"></i></a>' +
                '<a class="adjacent waves-effect" ng-click="next()"><i class="mi_keyboard_arrow_down"></i></a>' +
                '<a class="today waves-effect" ng-click="now()">{{textToday}}</a>' +
            '</div>' +
            '<div class="body" ng-include="\'rm-\' + state + \'.html\'"></div>' +
        '</div>' +

        '<script type="text/ng-template" id="rm-decade.html">' +
            '<div class="ng-class: state; square date">' +
                '<div ng-repeat="oDate in aDates" ng-class="{j: isActive[\'year\'](oDate), off: isOff(oDate)}">' +
                    '<a ng-click="go(oDate)" class="waves-effect"><span>{{oDate | date: \'yyyy\'}}</span></a>' +
                '</div>' +
            '</div>' +
        '</script>' +

        '<script type="text/ng-template" id="rm-year.html">' +
            '<div class="ng-class: state; square date">' +
                '<div ng-repeat="oDate in aDates" ng-class="{j: isActive[\'month\'](oDate), off: isOff(oDate)}">' +
                    '<a ng-click="go(oDate)" class="waves-effect"><span>{{oDate | date: \'MMM\'}}</span></a>' +
                '</div>' +
            '</div>' +
        '</script>' +

        '<script type="text/ng-template" id="rm-month.html">' +
            '<div class="day sunSat" ng-if="state == \'month\'">' +
                '<a ng-repeat="oDate in aDates | limitTo:7">{{oDate | date: \'EEE\'}}</a>' +
            '</div>' +
            '<div class="ng-class: state; square date">' +
                '<div ng-repeat="oDate in aDates" ng-class="{j: isActive[\'date\'](oDate), off: isOff(oDate), out: !isActive[\'month\'](oDate)}">' +
                    '<a ng-click="go(oDate);" class="waves-effect"><span>{{oDate.getDate()}}</span></a>' +
                '</div>' +
            '</div>' +
        '</script>';

        return {
            require: 'ngModel',
            scope: {
                model: '=ngModel',
                initialDate: '=?rmInitialDate',
                rmConfig: "=rmConfig"
            },
            link: link
        }
    }]);
}());
