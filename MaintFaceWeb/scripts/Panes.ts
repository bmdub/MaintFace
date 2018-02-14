var sideDiv = document.getElementById('side-div');
var mainDiv = document.getElementById('main-div');
var bottomDiv = document.getElementById('bottom-div');
var pageWrapper = document.getElementById('page-wrapper');
var smallSizeMode: boolean = false;

// Set the layout
ApplyCustomLayout(<HTMLElement>(document.body));

// Bring the default tabs to front
BringTabToFront("statsContentHeader");
BringTabToFront("flowCanvasHeader");
BringTabToFront("consoleContentHeader");

// Change the mode if we are on a small screen
CheckSizeMode();

window.addEventListener("resize", function (evt) {
    CheckSizeMode();
}, false);

function CheckSizeMode() {
	if (window.innerWidth <= 640 || window.innerHeight <= 480) {
		if (smallSizeMode == false) {

			//for each item in the non-main panes, move to the main pane.
			var elems = sideDiv.getElementsByClassName("TabHeader");
			for (var i = 0; i < elems.length; i++) {
				(<HTMLElement>elems[i]).setAttribute("data-oldpane", "side-div");
				(<HTMLElement>elems[i]).setAttribute("data-oldisfront", (<HTMLElement>elems[i]).getAttribute("data-isfront"));
				MoveTabTo(<HTMLElement>elems[i--], mainDiv);
			}
			var elems = bottomDiv.getElementsByClassName("TabHeader");
			for (var i = 0; i < elems.length; i++) {
				(<HTMLElement>elems[i]).setAttribute("data-oldpane", "bottom-div");
				(<HTMLElement>elems[i]).setAttribute("data-oldisfront", (<HTMLElement>elems[i]).getAttribute("data-isfront"));
				MoveTabTo(<HTMLElement>elems[i--], mainDiv);
			}

			//set the stats tab to front.
			BringTabToFront("statsContentHeader");

			//resize the panes, storing the old sizes for later.
			sideDiv.setAttribute("data-oldCLRight", sideDiv.getAttribute("data-CLRight"));
			sideDiv.setAttribute("data-CLRight", "0");
			mainDiv.setAttribute("data-oldCLLeft", mainDiv.getAttribute("data-CLLeft"));
			mainDiv.setAttribute("data-CLLeft", "0");
			mainDiv.setAttribute("data-oldCLBottom", mainDiv.getAttribute("data-CLBottom"));
			mainDiv.setAttribute("data-CLBottom", "1");
			bottomDiv.setAttribute("data-oldCLLeft", bottomDiv.getAttribute("data-CLLeft"));
			bottomDiv.setAttribute("data-CLLeft", "0");
			bottomDiv.setAttribute("data-oldCLTop", bottomDiv.getAttribute("data-CLTop"));
			bottomDiv.setAttribute("data-CLTop", "1");

			smallSizeMode = true;
			ApplyCustomLayout(<HTMLElement>(document.body));
		}
	}
	else {
		if (smallSizeMode == true) {

			//for each item in the non-main panes, move back to the old spot.
			var elems = mainDiv.getElementsByClassName("TabHeader");
			for (var i = 0; i < elems.length; i++) {
				var oldPane = (<HTMLElement>elems[i]).getAttribute("data-oldpane");
				if (oldPane == null)
					continue;
				MoveTabTo(<HTMLElement>elems[i--], document.getElementById(oldPane));
			}

			//bring the right tabs to the front again.
			var elems2 = document.getElementsByClassName("TabHeader");
            for (var i = 0; i < elems2.length; i++)
                if ((<HTMLElement>elems2[i]).getAttribute("data-oldisfront") == "true")
                    BringTabToFront((<HTMLElement>elems2[i]).id);

			sideDiv.setAttribute("data-CLRight", sideDiv.getAttribute("data-oldCLRight"));
			mainDiv.setAttribute("data-CLLeft", mainDiv.getAttribute("data-oldCLLeft"));
			mainDiv.setAttribute("data-CLBottom", mainDiv.getAttribute("data-oldCLBottom"));
			bottomDiv.setAttribute("data-CLLeft", bottomDiv.getAttribute("data-oldCLLeft"));
			bottomDiv.setAttribute("data-CLTop", bottomDiv.getAttribute("data-oldCLTop"));

			smallSizeMode = false;
			ApplyCustomLayout(<HTMLElement>(document.body));
		}
	}
}

function BringTabToFront(tabHeaderId: string) {
    var tabHeader = document.getElementById(tabHeaderId);
    var tabContentId = tabHeader.getAttribute("data-tabcontentid");
    var tabContent = document.getElementById(tabContentId);

    // Hide the other tabs
    for (var i = 0; i < tabHeader.parentElement.childNodes.length; i++) {
        var elem = <HTMLElement>tabHeader.parentElement.childNodes.item(i);
        if (elem.id == tabHeaderId) continue;
        if (elem.nodeType != 1) continue; //Text
        elem.style.backgroundColor = "#333333";
		elem.setAttribute("data-isfront", "false");
    }
    for (var i = 0; i < tabContent.parentElement.childNodes.length; i++) {
        var elem = <HTMLElement>tabContent.parentElement.childNodes.item(i);
        if (elem.id == tabContentId) continue;
        if (elem.nodeType != 1) continue; //Text
        elem.setAttribute("data-olddisplay", elem.style.display);
        elem.style.display = "none";
    }

    // Unhide the current tab    
    tabHeader.style.backgroundColor = "#555555";
	tabHeader.setAttribute("data-isfront", "true");

    var oldDisplay = tabContent.getAttribute("data-olddisplay");
    if (oldDisplay == null || oldDisplay == "none") oldDisplay = "";
    tabContent.style.display = oldDisplay;

    ApplyCustomLayout(<HTMLElement>(document.body));
}

function MoveTabTo(tabHeader: HTMLElement, paneElem: HTMLElement) {
    var tabContentId = tabHeader.getAttribute("data-tabcontentid");
    var tabContent = document.getElementById(tabContentId);
    var tabHeaderContainer = paneElem.getElementsByClassName("TabHeaderContainer").item(0);
    var tabContentContainer = paneElem.getElementsByClassName("TabContentContainer").item(0);

    var oldTabHeaderParent = tabHeader.parentElement;
    tabHeader.parentElement.removeChild(tabHeader);
    for (var i = 0; i < oldTabHeaderParent.childNodes.length; i++) {
        if (oldTabHeaderParent.childNodes.item(i).nodeType != 1) continue;
        BringTabToFront((<HTMLElement>oldTabHeaderParent.childNodes.item(i)).id);
        break;
    }
    tabHeaderContainer.appendChild(tabHeader);
    tabContent.parentElement.removeChild(tabContent);
    tabContentContainer.appendChild(tabContent);
}

function HandleTabHeaderDrop(paneElem: HTMLElement, event: DragEvent) {
    event.preventDefault();
    var tabHeaderId = event.dataTransfer.getData("text/plain");
    var tabHeader = document.getElementById(tabHeaderId);

	MoveTabTo(tabHeader, paneElem);

    BringTabToFront(tabHeaderId);

    // Set as first tab
    if (tabHeader.parentElement.childElementCount > 1)
        tabHeader.parentElement.insertBefore(tabHeader, tabHeader.parentElement.childNodes.item(0));
}

var sideBarResizeHover = false;
var grabbingSideBar = false;
var bottomBarResizeHover = false;
var grabbingBottomBar = false;

pageWrapper.addEventListener('mousedown', function (evt) {
    if (sideBarResizeHover)
        grabbingSideBar = true;
    if (bottomBarResizeHover)
        grabbingBottomBar = true;
}, false);

document.body.addEventListener('mouseup', function (evt) {
    grabbingSideBar = false;
    grabbingBottomBar = false;
}, false);

pageWrapper.addEventListener('mousemove', function (evt) {

	ApplyCursor("default", pageWrapper.style.zIndex);

	if (evt.pageX >= sideDiv.offsetLeft + sideDiv.offsetWidth - 5 &&
		evt.pageX <= sideDiv.offsetLeft + sideDiv.offsetWidth + 5) {
		ApplyCursor("ew-resize", pageWrapper.style.zIndex);
        sideBarResizeHover = true;
        evt.preventDefault(); //prevent text highlighting
    }
    else if (evt.pageY >= mainDiv.offsetTop + mainDiv.offsetHeight - 5 &&
		evt.pageY <= mainDiv.offsetTop + mainDiv.offsetHeight + 5) {
		ApplyCursor("ns-resize", pageWrapper.style.zIndex);
        bottomBarResizeHover = true;
        evt.preventDefault(); //prevent text highlighting
    }
    else {
        sideBarResizeHover = false;
        bottomBarResizeHover = false;
    }

    if (grabbingSideBar) {
        sideDiv.style.width = mouseX + "px";
        mainDiv.style.width = (window.innerWidth - mouseX).toString() + "px";
        mainDiv.style.left = mouseX + "px";
        bottomDiv.style.width = mainDiv.style.width;
        bottomDiv.style.left = mouseX + "px";

        sideDiv.setAttribute("data-CLRight", (mouseX / window.innerWidth).toString());
        mainDiv.setAttribute("data-CLLeft", (mouseX / window.innerWidth).toString());
        bottomDiv.setAttribute("data-CLLeft", (mouseX / window.innerWidth).toString());

        ApplyCustomLayout(<HTMLElement>(document.body));

        evt.preventDefault(); //prevent text highlighting
    }
    if (grabbingBottomBar) {
        mainDiv.style.height = mouseY + "px";
        bottomDiv.style.height = (window.innerHeight - mouseY).toString() + "px";
        bottomDiv.style.top = mouseY + "px";

        mainDiv.setAttribute("data-CLBottom", (mouseY / window.innerHeight).toString());
        bottomDiv.setAttribute("data-CLTop", (mouseY / window.innerHeight).toString());

        ApplyCustomLayout(<HTMLElement>(document.body));

        evt.preventDefault(); //prevent text highlighting
    }
}, false);
