var mouseX = 0, mouseY = 0;
document.body.addEventListener('mousemove', function (evt) {
    mouseX = evt.pageX;
    mouseY = evt.pageY;
}, false);
var EventWrapper = (function () {
    function EventWrapper(_node, _event, _handler, _capture) {
        this._node = _node;
        this._event = _event;
        this._handler = _handler;
        this._capture = _capture;
        this._node.addEventListener(this._event, this._handler, this._capture);
    }
    EventWrapper.prototype.Destroy = function () {
        this._node.removeEventListener(this._event, this._handler, this._capture);
    };
    return EventWrapper;
})();
// Heirarchical cursor setter
var cursorMouseX = 0, cursorMouseY = 0;
var cursorZIndex = 0;
function ApplyCursor(cursor, zindex) {
    var z = parseInt(zindex);
    if (cursorMouseX != mouseX || cursorMouseY != mouseY) {
        cursorMouseX = mouseX;
        cursorMouseY = mouseY;
        document.body.style.cursor = cursor;
        cursorZIndex = z;
    }
    else if (z >= cursorZIndex) {
        document.body.style.cursor = cursor;
        cursorZIndex = z;
    }
}
var regexNonSharedIndicator = new RegExp(" \\(\\*[^\\)]*\\)+");
function EscapeEdgeName(name) {
    return name.replace(regexNonSharedIndicator, ""); // Remove the last node reference
}
function RemoveFromArray(arr, value) {
    for (var i = 0; i < arr.length; i++) {
        if (arr[i] == value)
            arr.splice(i, 1);
    }
}
function FindAncestorWithClass(element, className) {
    while ((element = element.parentElement) && !element.classList.contains(className))
        ;
    return element;
}
var Stat = (function () {
    function Stat() {
    }
    return Stat;
})();
var StatSeriesEntry = (function () {
    function StatSeriesEntry(_stat, _timeStamp) {
        this._stat = _stat;
        this._timeStamp = _timeStamp;
    }
    return StatSeriesEntry;
})();
var StatSeries = (function () {
    function StatSeries() {
        this._statEntries = [];
        this._maxStats = 86400; // Keep 1 day of stats.  TODO: test
    }
    StatSeries.prototype.AddStat = function (stat, timeStamp) {
        this._statEntries.push(new StatSeriesEntry(stat, timeStamp));
        if (this._statEntries.length > this._maxStats)
            this._statEntries.splice(0, 1);
    };
    StatSeries.prototype.GetLatestStat = function () {
        if (this._statEntries.length > 0)
            return this._statEntries[this._statEntries.length - 1];
    };
    return StatSeries;
})();
var StatCollection = (function () {
    function StatCollection() {
        this._seriesList = {};
    }
    StatCollection.prototype.AddStat = function (stat, timeStamp) {
        var series = this._seriesList[stat.Name];
        if (series == null) {
            series = new StatSeries();
            this._seriesList[stat.Name] = series;
        }
        series.AddStat(stat, timeStamp);
    };
    StatCollection.prototype.GetSeries = function (name) {
        return this._seriesList[name];
    };
    return StatCollection;
})();
function AddCommas(nStr) {
    nStr += '';
    var x = nStr.split('.');
    var x1 = x[0];
    var x2 = x.length > 1 ? '.' + x[1] : '';
    var rgx = /(\d+)(\d{3})/;
    while (rgx.test(x1)) {
        x1 = x1.replace(rgx, '$1' + ',' + '$2');
    }
    return x1 + x2;
}
function GetColorForValue(value, expectedMax, expectedMin) {
    if (expectedMax == Number.MAX_VALUE && expectedMin == Number.MAX_VALUE * -1)
        return "white";
    if (expectedMin == Number.MAX_VALUE * -1) {
        expectedMin = expectedMax * -1; // guessing 0 for mid point
    }
    if (expectedMax == Number.MAX_VALUE) {
        expectedMax = expectedMin * -1; // guessing 0 for mid point
    }
    var expectedRange = expectedMax - expectedMin;
    var colorValue = (value - expectedMin) / expectedRange;
    var g = Math.max(50, Math.min(255, Math.floor((2 - (Math.abs(.5 - colorValue) * 4)) * 255))); //.5 - 1, .5 - 0, .25-.75 max
    var r = Math.max(0, Math.min(255, Math.floor((colorValue - .5) * 4 * 255))); //.5 - .75+
    var b = Math.max(0, Math.min(255, Math.floor(((1 - colorValue) - .5) * 4) * 255)); //.5 - .25-
    return "rgba(" + r + "," + g + "," + b + ",1)";
}
var InputHandler = (function () {
    function InputHandler(_canvasPresenter, _elem) {
        var _this = this;
        this._canvasPresenter = _canvasPresenter;
        this._elem = _elem;
        this.mouseIsDown = false;
        this.mouseDragged = false;
        this.mouseXGraph = 0;
        this.mouseYGraph = 0;
        this.touchIsDown = false;
        this.touchXGraph = 0;
        this.touchYGraph = 0;
        this.pinching = false;
        this.touchX2 = 0;
        this.touchY2 = 0;
        this.pinchDist = 0;
        this.pinchDistLast = 0;
        this.pinchMidX = 0;
        this.pinchMidY = 0;
        this.touchDragged = false;
        //todo: these should be destroyed if this canvas is ever destroyed
        if (window.navigator.pointerEnabled) {
            // Microsoft
            this._elem.addEventListener("pointermove", function (evt) { return _this.HandleMouseMove(evt); });
            this._elem.addEventListener("pointerdown", function (evt) { return _this.HandleMouseDown(evt); });
            this._elem.addEventListener("pointerup", function (evt) { return _this.HandleMouseUp(evt); });
            this._elem.addEventListener("pointerleave", function (evt) { return _this.HandleMouseLeave(evt); });
        }
        else {
            this._elem.addEventListener('mousedown', function (evt) { return _this.HandleMouseDown(evt); });
            this._elem.addEventListener('mouseup', function (evt) { return _this.HandleMouseUp(evt); });
            this._elem.addEventListener('mousemove', function (evt) { return _this.HandleMouseMove(evt); });
            this._elem.addEventListener('mouseleave', function (evt) { return _this.HandleMouseLeave(evt); });
            this._elem.addEventListener('touchstart', function (evt) { return _this.HandleTouchStart(evt); });
            this._elem.addEventListener('touchend', function (evt) { return _this.HandleTouchUp(evt); });
            this._elem.addEventListener('touchmove', function (evt) { return _this.HandleTouchMove(evt); });
        }
        this._elem.addEventListener('DOMMouseScroll', function (evt) { return _this.HandleScroll(evt); }); // for Firefox
        this._elem.addEventListener('mousewheel', function (evt) { return _this.HandleScroll(evt); }); // for everyone else
    }
    InputHandler.prototype.HandleMouseDown = function (evt) {
        if (evt.button == 0) {
            this.mouseIsDown = true;
            this.mouseDragged = false;
            this.GetMouseCoords(evt);
            this._canvasPresenter.HandleMouse(this.mouseXGraph, this.mouseYGraph, this.mouseIsDown, false);
            evt.preventDefault();
        }
    };
    InputHandler.prototype.HandleMouseUp = function (evt) {
        if (evt.button == 0) {
            var mouseClicked = this.mouseDragged == false && this.mouseIsDown;
            this.mouseIsDown = false;
            this.GetMouseCoords(evt);
            this._canvasPresenter.HandleMouse(this.mouseXGraph, this.mouseYGraph, this.mouseIsDown, mouseClicked);
            this.mouseDragged = false;
        }
    };
    InputHandler.prototype.HandleMouseMove = function (evt) {
        if (this.mouseIsDown) {
            this.mouseDragged = true;
            evt.preventDefault();
        }
        this.GetMouseCoords(evt);
        this._canvasPresenter.HandleMouse(this.mouseXGraph, this.mouseYGraph, this.mouseIsDown, false);
    };
    InputHandler.prototype.HandleMouseLeave = function (evt) {
        this.mouseIsDown = false;
        this.mouseDragged = false;
        this._canvasPresenter.HandleMouseLeave();
    };
    InputHandler.prototype.HandleScroll = function (evt) {
        //evt = evt ? evt : window.event;
        var direction = (evt.detail < 0 || evt.wheelDelta > 0) ? 1 : -1;
        this._canvasPresenter.IncrementScale(direction * 0.1, this.mouseXGraph, this.mouseYGraph);
    };
    InputHandler.prototype.HandleTouchStart = function (evt) {
        this.touchIsDown = true;
        this.touchDragged = false;
        this.GetTouchCoords(evt);
        this._canvasPresenter.HandleMouse(this.touchXGraph, this.touchYGraph, this.touchIsDown, false);
        evt.preventDefault();
    };
    InputHandler.prototype.HandleTouchUp = function (evt) {
        var tapped = this.touchDragged == false && this.touchIsDown;
        this.touchIsDown = false;
        this.pinching = false;
        this._canvasPresenter.HandleMouse(this.touchXGraph, this.touchYGraph, this.touchIsDown, tapped);
        this.touchDragged = false;
    };
    InputHandler.prototype.HandleTouchMove = function (evt) {
        if (this.touchIsDown) {
            this.touchDragged = true;
            evt.preventDefault();
        }
        this.GetTouchCoords(evt);
        if (this.pinching) {
            if (this.pinchDistLast > 0) {
                this._canvasPresenter.ChangeScale(this._canvasPresenter.Scale * (this.pinchDist / this.pinchDistLast), this.pinchMidX, this.pinchMidY);
            }
        }
        else
            this._canvasPresenter.HandleMouse(this.touchXGraph, this.touchYGraph, this.touchIsDown, false);
    };
    InputHandler.prototype.GetMouseCoords = function (evt) {
        var rect = this._elem.getBoundingClientRect();
        this.mouseXGraph = evt.pageX - rect.left;
        this.mouseYGraph = evt.pageY - rect.top;
    };
    InputHandler.prototype.GetTouchCoords = function (evt) {
        var rect = this._elem.getBoundingClientRect();
        var uievt = evt;
        if (uievt.targetTouches.length > 0) {
            this.touchXGraph = uievt.targetTouches[0].pageX - rect.left;
            this.touchYGraph = uievt.targetTouches[0].pageY - rect.top;
            if (uievt.targetTouches.length > 1) {
                this.touchX2 = uievt.targetTouches[1].pageX - rect.left;
                this.touchY2 = uievt.targetTouches[1].pageY - rect.top;
                this.pinchDistLast = this.pinchDist;
                this.pinchDist = Math.sqrt(((this.touchXGraph - this.touchX2) * (this.touchXGraph - this.touchX2)) +
                    ((this.touchYGraph - this.touchY2) * (this.touchYGraph - this.touchY2)));
                this.pinchMidX = (this.touchXGraph + this.touchX2) / 2;
                this.pinchMidY = (this.touchYGraph + this.touchY2) / 2;
                if (this.pinching == false)
                    this.pinchDistLast = this.pinchDist;
                this.pinching = true;
            }
        }
    };
    return InputHandler;
})();
//# sourceMappingURL=Common.js.map