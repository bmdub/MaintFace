
window.addEventListener("resize", function (evt) {
    ApplyCustomLayout(<HTMLElement>(document.body));
}, false);

function ApplyCustomLayout(elem: HTMLElement, lastElem: HTMLElement = null) {

    var fillWidth = false;
    var fillHeight = false;

    if (elem.getAttribute("data-CLFill") == "true") {
        fillWidth = true;
        fillHeight = true;
    }
    else if (elem.getAttribute("data-CLFillWidth") == "true") {
        fillWidth = true;
    }
    else if (elem.getAttribute("data-CLFillHeight") == "true") {
        fillHeight = true;
    }

    if (fillWidth) {

        var leftAdjust = 0;
        var siblingsStr = elem.getAttribute("data-CLAddSibWidth");
        if (siblingsStr != null) {
            var siblings = siblingsStr.split(",");
            for (var i = 0; i < siblings.length; i++) {
                var sibling = document.getElementById(siblings[i]);
                leftAdjust += sibling.offsetHeight;
            }
        }

        var widthAdjust = 0;
        var siblingsStr = elem.getAttribute("data-CLSubSibWidth");
        if (siblingsStr != null) {
            var siblings = siblingsStr.split(",");
            for (var i = 0; i < siblings.length; i++) {
                var sibling = document.getElementById(siblings[i]);
                widthAdjust -= sibling.offsetHeight;
            }
        }

        var parentLeft, parentWidth;
        if (lastElem == null) {
            parentLeft = 0;
            parentWidth = window.innerWidth;
        }
        else {
            parentLeft = lastElem.offsetLeft;
            parentWidth = lastElem.offsetWidth;
        }

        var leftPct = 0;
        var leftStr = elem.getAttribute("data-CLLeft");
        if (leftStr != null)
            leftPct = parseFloat(leftStr);

        var rightPct = 1;
        var rightStr = elem.getAttribute("data-CLRight");
        if (rightStr != null)
            rightPct = parseFloat(rightStr);

        var newLeft = parentLeft + (leftPct * parentWidth);
        var newWidth = (parentLeft + (rightPct * parentWidth)) - newLeft;

        newLeft += leftAdjust;
        newWidth -= leftAdjust;
        newWidth += widthAdjust;

        elem.style.left = newLeft.toString() + "px";
        elem.style.width = newWidth.toString() + "px";

        if (elem.className == 'TabHeaderContainer')
            if (newLeft + newWidth > window.innerWidth)
                alert((newLeft + newWidth).toString() + "," + window.innerWidth.toString());
    }

    if (fillHeight) {

        var topAdjust = 0;
        var siblingsStr = elem.getAttribute("data-CLAddSibHeight");
        if (siblingsStr != null) {
            var siblings = siblingsStr.split(",");
            for (var i = 0; i < siblings.length; i++) {
                var sibling = document.getElementById(siblings[i]);
                topAdjust += sibling.offsetHeight;
            }
        }

        var heightAdjust = 0;
        var siblingsStr = elem.getAttribute("data-CLSubSibHeight");
        if (siblingsStr != null) {
            var siblings = siblingsStr.split(",");
            for (var i = 0; i < siblings.length; i++) {
                var sibling = document.getElementById(siblings[i]);
                heightAdjust -= sibling.offsetHeight;
            }
        }

        var parentTop, parentHeight;
        if (lastElem == null) {
            parentTop = 0;
            parentHeight = window.innerHeight;
        }
        else {
            parentTop = lastElem.offsetTop;
            parentHeight = lastElem.offsetHeight;
        }

        var topPct = 0;
        var topStr = elem.getAttribute("data-CLTop");
        if (topStr != null)
            topPct = parseFloat(topStr);

        var bottomPct = 1;
        var bottomStr = elem.getAttribute("data-CLBottom");
        if (bottomStr != null)
            bottomPct = parseFloat(bottomStr);

        var newTop = parentTop + (topPct * parentHeight);
        var newHeight = (parentTop + (bottomPct * parentHeight)) - newTop;

        newTop += topAdjust;
        newHeight -= topAdjust;
        newHeight += heightAdjust;
		//newHeight -= 5;

        elem.style.top = newTop.toString() + "px";
        elem.style.height = newHeight.toString() + "px";
    }

    // Base our dimensions on the last filled element, not the immediate parent.
    if (fillWidth || fillHeight)
        lastElem = elem;

    for (var i = 0; i < elem.childNodes.length; i++)
        if (elem.childNodes[i].nodeType == 1)
            ApplyCustomLayout(<HTMLElement>(elem.childNodes[i]), lastElem);
}