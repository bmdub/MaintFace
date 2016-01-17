/// <reference path="Common.ts"/>
/// <reference path="DirectedGraph.ts"/>
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var appName = document.getElementById('appName');
var appNameContainer = document.getElementById('appNameContainer');
var maintFaceElem = document.getElementById('MaintFace');
var socketStatus = document.getElementById('status');
var perfStats = document.getElementById('perfStats');
var edgeStats = document.getElementById('edgeStats');
var manualStats = document.getElementById('manualStats');
var custombuttons = document.getElementById('custombuttons');
var messageField = document.getElementById('message');
var out_prompt = document.getElementById('out_prompt');
var in_prompt = document.getElementById('in_prompt');
var graphCanvas = document.getElementById('graphCanvas');
var graphCanvasContent = document.getElementById('graphCanvasContent');
var flowCanvas = document.getElementById('flowCanvas');
var flowCanvasContent = document.getElementById('flowCanvasContent');
var flowGraph = new DirectedGraph(flowCanvas);
var graph = new Graph(graphCanvas);
var statsPopup = null;
var instancesPopup = null;
var statCollection = new StatCollection();
var hoveredStatNames = [];
var wsUrl = window.location.href.toLowerCase();
wsUrl = wsUrl.replace("https://", "wss://");
wsUrl = wsUrl.replace("http://", "ws://");
var webSocket = new AsyncWebSocket(wsUrl, false);
in_prompt.onkeypress = function (evt) {
    if (evt.keyCode == 13)
        SubmitForm();
};
flowGraph.OnPauseChanged = function (paused) {
    var clientMessage = new ClientMessage();
    if (paused)
        clientMessage.TrafficCommand = "Pause";
    else
        clientMessage.TrafficCommand = "Continue";
    webSocket.send(clientMessage);
};
function ToggleGraphSeries(name) {
    var statSeries = statCollection.GetSeries(name);
    if (statSeries == null)
        return;
    if (graph.SeriesExists(statSeries) == false) {
        graph.AddSeries(statSeries);
        BringTabToFront("graphCanvasHeader");
    }
    else {
        graph.RemoveSeries(statSeries);
    }
}
function UpdatePopup(statNames, statExtras) {
    if (statExtras === void 0) { statExtras = null; }
    if (statNames.length == 0) {
        if (statsPopup != null)
            statsPopup.Destroy();
        statsPopup = null;
        return;
    }
    if (statsPopup == null) {
        statsPopup = new CustomPopup("", "", "rgba(0,20,40,.9)", 100, mouseX, mouseY, 10, 10);
        statsPopup.MainDiv.style.borderRadius = "";
        statsPopup.MainDiv.style.borderStyle = "solid";
        statsPopup.MainDiv.style.borderWidth = "thin";
        statsPopup.MainDiv.style.borderColor = "rgba(0,80,160,1)";
    }
    var color;
    var innerHTML = "";
    var displayCt = 0;
    for (var i = 0; i < statNames.length; i++) {
        var statSeries = statCollection.GetSeries(statNames[i]);
        if (statSeries == null)
            continue;
        var statEntry = statSeries.GetLatestStat();
        if (statEntry == null)
            continue;
        var stat = statEntry._stat;
        displayCt++;
        if (displayCt > 1)
            innerHTML += "<br/>";
        var name = EscapeEdgeName(stat.Name);
        innerHTML += name + " (" + stat.SamplesFormatted + ") <br/>";
        if (stat.ValueOverride != null)
            color = "#FF00FF";
        else
            color = GetColorForValue(stat.ValueNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
        innerHTML += "Last: <span style='color:" + color + "'>" + stat.ValueFormatted + "</span><br/>";
        if (stat.Samples > 1) {
            if (stat.MinValueFormatted != "") {
                color = GetColorForValue(stat.MinNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
                innerHTML += "Min: <span style='color:" + color + "'>" + stat.MinValueFormatted + "</span><br/>";
            }
            if (stat.AvgValueFormatted != "") {
                color = GetColorForValue(stat.AvgNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
                innerHTML += "Avg: <span style='color:" + color + "'>" + stat.AvgValueFormatted + "</span><br/>";
            }
            if (stat.MaxValueFormatted != "") {
                color = GetColorForValue(stat.MaxNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
                innerHTML += "Max: <span style='color:" + color + "'>" + stat.MaxValueFormatted + "</span><br/>";
            }
        }
        if (statExtras != null) {
            innerHTML += statExtras[i] + "<br/>";
        }
    }
    statsPopup.SetTextHtml(innerHTML);
    statsPopup.MainDiv.style.left = (mouseX + 20) + "px";
    statsPopup.MainDiv.style.top = Math.max(0, (mouseY - (statsPopup.MainDiv.clientHeight * .5))) + "px";
    statsPopup.SizeToContent();
}
function GetSideBarStat(statsElement, statName) {
    for (var i = 0; i < statsElement.childNodes.length; i++)
        if (statsElement.childNodes[i].id == statName) {
            return statsElement.childNodes[i];
        }
}
function AddStatToSideBar(statsElement, statName, overridable) {
    var elem = document.createElement("span");
    statsElement.appendChild(elem);
    elem.id = statName;
    elem.style.cursor = "pointer";
    elem.onmouseenter = function (evt) {
        elem.style.backgroundColor = "#555555";
        var index = hoveredStatNames.indexOf(name);
        if (index == -1)
            hoveredStatNames.push(statName);
    };
    elem.onmouseleave = function (evt) {
        elem.style.backgroundColor = "";
        for (;;) {
            var index = hoveredStatNames.indexOf(statName);
            if (index == -1)
                return;
            hoveredStatNames.splice(index, 1);
        }
    };
    elem.onclick = CreateStatContextMenu.bind(null, elem, statName, overridable);
    var name = EscapeEdgeName(statName);
    elem.innerHTML = name + ": <span class=\"StatValue\"></span><br/>";
    return elem;
}
function UpdateSideBarStat(elem, stat) {
    var color;
    if (stat.ValueOverride != null)
        color = "#FF00FF";
    else
        color = GetColorForValue(stat.ValueNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
    for (var i = 0; i < elem.childNodes.length; i++) {
        var valueElem = elem.childNodes[i];
        if (elem.childNodes[i].nodeType == 1) {
            if (valueElem.className == "StatValue") {
                valueElem.style.color = color;
                valueElem.textContent = stat.ValueFormatted;
                break;
            }
        }
    }
}
function HandleStatEdit(statName) {
    var promptPopup = new CustomPopup("Override Value", "", "rgba(100,100,0,.9)", 999, 0, 0, 10, 10);
    promptPopup.SetText("Enter Override Value for " + statName + ":");
    var input = promptPopup.SetInput("", "");
    var apply = promptPopup.AddButton("Apply");
    input.onkeyup = function (evt) {
        if (evt.keyCode == 13)
            apply.click();
    };
    apply.onclick = function (evt) {
        var clientMessage = new ClientMessage();
        clientMessage.StatOverride = new StatOverrideMessage();
        clientMessage.StatOverride.Name = statName;
        clientMessage.StatOverride.Value = promptPopup.getValue();
        webSocket.send(clientMessage);
        promptPopup.Destroy();
    };
    promptPopup.SetCloseX().onclick = function (evt) { return promptPopup.Destroy(); };
    promptPopup.AddButton("Cancel").onclick = function (evt) { return promptPopup.Destroy(); };
    promptPopup.AddButton("Revert").onclick = function (evt) {
        var clientMessage = new ClientMessage();
        clientMessage.StatOverride = new StatOverrideMessage();
        clientMessage.StatOverride.Name = statName;
        clientMessage.StatOverride.Value = null;
        webSocket.send(clientMessage);
        promptPopup.Destroy();
    };
    promptPopup.SizeToContent();
    promptPopup.Center(0, -100);
}
function HandleVarEdit(nodeName, varName, rootIndex, varIndex) {
    var promptPopup = new CustomPopup("Override Value", "", "rgba(100,100,0,.9)", 999, 0, 0, 10, 10);
    promptPopup.SetText("Enter Override Value for " + varName + ":");
    var input = promptPopup.SetInput("", "");
    var apply = promptPopup.AddButton("Apply");
    input.onkeyup = function (evt) {
        if (evt.keyCode == 13)
            apply.click();
    };
    apply.onclick = function (evt) {
        var clientMessage = new ClientMessage();
        clientMessage.VarOverride = new VarOverrideMessage();
        clientMessage.VarOverride.NodeName = nodeName;
        clientMessage.VarOverride.RootIndex = rootIndex;
        clientMessage.VarOverride.VarIndex = varIndex;
        clientMessage.VarOverride.Value = promptPopup.getValue();
        webSocket.send(clientMessage);
        promptPopup.Destroy();
    };
    promptPopup.SetCloseX().onclick = function (evt) { return promptPopup.Destroy(); };
    promptPopup.AddButton("Cancel").onclick = function (evt) { return promptPopup.Destroy(); };
    promptPopup.AddButton("Revert").onclick = function (evt) {
        var clientMessage = new ClientMessage();
        clientMessage.VarOverride = new VarOverrideMessage();
        clientMessage.VarOverride.NodeName = nodeName;
        clientMessage.VarOverride.RootIndex = rootIndex;
        clientMessage.VarOverride.VarIndex = varIndex;
        clientMessage.VarOverride.Value = null;
        webSocket.send(clientMessage);
        promptPopup.Destroy();
    };
    promptPopup.SizeToContent();
    promptPopup.Center();
}
function CreateStatContextMenu(elem, statName, overridable) {
    var menuPopup = new CustomPopup("", "rgba(0, 0, 0, 1)", "rgba(200, 200, 200, 1)", 999, mouseX, mouseY, 10, 10, 5);
    menuPopup.MainDiv.style.borderRadius = "";
    menuPopup.clickoutside = function (evt) { return menuPopup.Destroy(); };
    menuPopup.AddListItem("Graph", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
        .onclick = function (evt) {
        ToggleGraphSeries(statName);
        menuPopup.Destroy();
    };
    if (overridable) {
        menuPopup.AddListItem("Override", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
            .onclick = function (evt) {
            HandleStatEdit(statName);
            menuPopup.Destroy();
        };
    }
    menuPopup.SizeToContent();
}
function CreateFlowContextMenu(nodeName, statNames) {
    var menuPopup = new CustomPopup("", "rgba(0, 0, 0, 1)", "rgba(200, 200, 200, 1)", 999, mouseX, mouseY, 10, 10, 5);
    menuPopup.MainDiv.style.borderRadius = "";
    menuPopup.clickoutside = function (evt) { return menuPopup.Destroy(); };
    menuPopup.AddListItem("Variables", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
        .onclick = function (evt) {
        if (nodeName != null) {
            var varPopup = new CustomPopup(nodeName, "", "rgba(2, 61, 26, .9)", 100, mouseX, mouseY, 10, 10);
            varPopup.MainDiv.style.borderRadius = "";
            varPopup.MainDiv.style.borderStyle = "solid";
            varPopup.MainDiv.style.borderWidth = "thin";
            varPopup.MainDiv.style.borderColor = "rgba(41, 122, 74, 1)";
            varPopup.SetCloseX().onclick = function (evt) { return varPopup.Destroy(); };
            varPopup.SizeToContent();
            varPopup.BoundToScreen();
            TracePointDumpRequestLoop(nodeName, varPopup);
        }
        menuPopup.Destroy();
    };
    menuPopup.AddListItem("Script", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
        .onclick = function (evt) {
        if (nodeName != null) {
            var currentSourcePopup = new CustomPopup("Source", "black", "rgba(255,255,255,.9)", 100, 0, 0, window.innerWidth * .9, window.innerHeight * .9);
            currentSourcePopup.SetTextArea("Getting source...", "");
            currentSourcePopup.AddButton("Apply").onclick = function (evt) {
                var clientMessage = new ClientMessage();
                clientMessage.Script = new ScriptMessage();
                clientMessage.Script.NodeName = nodeName;
                clientMessage.Script.Source = currentSourcePopup.getValue();
                webSocket.send(clientMessage);
                currentSourcePopup.Destroy();
            };
            currentSourcePopup.SetCloseX().onclick = function (evt) { return currentSourcePopup.Destroy(); };
            currentSourcePopup.AddButton("Cancel").onclick = function (evt) { return currentSourcePopup.Destroy(); };
            currentSourcePopup.AddButton("Revert").onclick = function (evt) {
                //send null
                var clientMessage = new ClientMessage();
                clientMessage.Script = new ScriptMessage();
                clientMessage.Script.NodeName = nodeName;
                clientMessage.Script.Source = null;
                webSocket.send(clientMessage);
                currentSourcePopup.Destroy();
            };
            // Request current source
            var clientMessage = new ClientMessage();
            clientMessage.DumpSourceName = nodeName;
            webSocket.send(clientMessage, function (serverMessage) {
                currentSourcePopup.setValue(serverMessage.Source);
            });
        }
        menuPopup.Destroy();
    };
    for (var i = 0; i < statNames.length; i++) {
        CreateGraphNodeMenuItem(statNames[i], menuPopup);
    }
    menuPopup.SizeToContent();
}
function CreateGraphNodeMenuItem(statName, menuPopup) {
    var name = EscapeEdgeName(statName);
    menuPopup.AddListItem("Graph " + name, "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
        .onclick = function (evt) {
        ToggleGraphSeries(statName);
        menuPopup.Destroy();
    };
}
function CreateVarContextMenu(popup, nodeName, varName, rootIndex, varIndex, overridable) {
    var menuPopup = new CustomPopup("", "rgba(0, 0, 0, 1)", "rgba(200, 200, 200, 1)", 999, popup.MouseX, popup.MouseY, 10, 10, 5);
    menuPopup.MainDiv.style.borderRadius = "";
    menuPopup.clickoutside = function (evt) { return menuPopup.Destroy(); };
    if (overridable) {
        var item = menuPopup.AddListItem("Override", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)");
        item.onclick = function (evt) {
            {
                HandleVarEdit(nodeName, varName, rootIndex, varIndex);
                menuPopup.Destroy();
            }
        };
    }
    else {
        var item = menuPopup.AddListItem("(Not Overridable)", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)");
    }
    menuPopup.SizeToContent();
}
function TracePointDumpRequestLoop(nodeName, varPopup) {
    if (varPopup.Disposed)
        return;
    var clientMessage = new ClientMessage();
    clientMessage.DumpTracePointName = nodeName;
    webSocket.send(clientMessage, function (serverMessage) {
        varPopup.ClearListItems();
        for (var v = 0; v < serverMessage.VarDump.DumpedVariables.length; v++) {
            var elem = varPopup.AddListItem(serverMessage.VarDump.DumpedVariables[v].Name + ": " + serverMessage.VarDump.DumpedVariables[v].Value, "", "rgba(15, 92, 46,.9)");
            if (serverMessage.VarDump.DumpedVariables[v].Overridden == true)
                elem.style.color = "#FF00FF";
            elem.style.textIndent = (serverMessage.VarDump.DumpedVariables[v].Depth * 10).toString() + "px";
            AttachVarMenu(varPopup, elem, serverMessage.VarDump.Name, serverMessage.VarDump.DumpedVariables[v]);
        }
        varPopup.SizeToContent(true);
    });
    setTimeout(function (evt) { TracePointDumpRequestLoop(nodeName, varPopup); }, 1000);
}
// Using a function allows closure.
function AttachVarMenu(popup, elem, nodeName, dumpedVariable) {
    elem.onclick = function (evt) {
        CreateVarContextMenu(popup, nodeName, dumpedVariable.Name, dumpedVariable.RootIndex, dumpedVariable.VarIndex, dumpedVariable.Overridable);
    };
}
window.requestAnimationFrame(draw);
function draw(timestamp) {
    window.requestAnimationFrame(draw);
    if (webSocket.Connected == false)
        return;
    if (graphCanvas.width != graphCanvas.parentElement.offsetWidth ||
        graphCanvas.height != graphCanvas.parentElement.offsetHeight) {
        graphCanvas.width = graphCanvas.parentElement.offsetWidth;
        graphCanvas.height = graphCanvas.parentElement.offsetHeight;
        if (graphCanvas.width != graphCanvas.parentElement.offsetWidth)
            graphCanvas.width -= graphCanvas.parentElement.offsetWidth - graphCanvas.width;
        if (graphCanvas.height != graphCanvas.parentElement.offsetHeight)
            graphCanvas.height -= graphCanvas.parentElement.offsetHeight - graphCanvas.height;
    }
    if (flowCanvas.width != flowCanvas.parentElement.offsetWidth ||
        flowCanvas.height != flowCanvas.parentElement.offsetHeight) {
        flowCanvas.width = flowCanvas.parentElement.offsetWidth;
        flowCanvas.height = flowCanvas.parentElement.offsetHeight;
        if (flowCanvas.width != flowCanvas.parentElement.offsetWidth)
            flowCanvas.width -= flowCanvas.parentElement.offsetWidth - flowCanvas.width;
        if (flowCanvas.height != flowCanvas.parentElement.offsetHeight)
            flowCanvas.height -= flowCanvas.parentElement.offsetHeight - flowCanvas.height;
    }
    // Draw the displayed graph
    // We used to disable flow on hide, but that disables graphed flow, too.
    if (flowCanvasContent.style.display != "none") {
        //flowGraph.SetDisplayed(true);
        flowGraph.Draw();
    }
    //else
    //flowGraph.SetDisplayed(false);
    if (graphCanvasContent.style.display != "none")
        graph.Draw();
    if (hoveredStatNames.length > 0)
        UpdatePopup(hoveredStatNames);
    else {
        if (flowCanvasContent.style.display == "none")
            flowGraph.HoveredEdgeNames.length = 0;
        UpdatePopup(flowGraph.HoveredEdgeNames, flowGraph.hoveredEdgeStatAppends);
    }
    if (flowGraph.MouseClicked) {
        flowGraph.MouseClicked = false;
        if (flowGraph.HoveredNodeName != null)
            CreateFlowContextMenu(flowGraph.HoveredNodeName, flowGraph.HoveredEdgeNames);
    }
}
var StatOverrideMessage = (function (_super) {
    __extends(StatOverrideMessage, _super);
    function StatOverrideMessage() {
        _super.apply(this, arguments);
        this.Name = null;
        this.Value = null;
    }
    return StatOverrideMessage;
})(AsyncWebSocketMessage);
var VarOverrideMessage = (function (_super) {
    __extends(VarOverrideMessage, _super);
    function VarOverrideMessage() {
        _super.apply(this, arguments);
        this.NodeName = null;
        this.RootIndex = null;
        this.VarIndex = null;
        this.Value = null;
    }
    return VarOverrideMessage;
})(AsyncWebSocketMessage);
var ScriptMessage = (function (_super) {
    __extends(ScriptMessage, _super);
    function ScriptMessage() {
        _super.apply(this, arguments);
        this.NodeName = null;
        this.Source = null;
    }
    return ScriptMessage;
})(AsyncWebSocketMessage);
var ClientMessage = (function (_super) {
    __extends(ClientMessage, _super);
    function ClientMessage() {
        _super.apply(this, arguments);
        this.CustomButton = null;
        this.Command = null;
        this.StatOverride = null;
        this.DumpTracePointName = null;
        this.VarOverride = null;
        this.Script = null;
        this.DumpSourceName = null;
        this.TrafficCommand = null;
    }
    return ClientMessage;
})(AsyncWebSocketMessage);
var Instance = (function () {
    function Instance() {
        this.Name = null;
        this.Url = null;
        this.IsThis = null;
    }
    return Instance;
})();
var instances = null;
appNameContainer.onclick = function (evt) {
    if (instancesPopup != null && instancesPopup.Disposed == false)
        instancesPopup.Destroy();
    instancesPopup = new CustomPopup("MaintFace Instances", "", "rgba(75,0,0,.9)", 999, mouseX - 10, mouseY - 10, 20, 20);
    instancesPopup.MainDiv.style.borderRadius = "";
    instancesPopup.MainDiv.style.borderStyle = "solid";
    instancesPopup.MainDiv.style.borderWidth = "1px";
    instancesPopup.MainDiv.style.borderColor = "rgba(125,0,0,1)";
    instancesPopup.clickoutside = function (evt) { return instancesPopup.Destroy(); };
    if (instances == null || instances.length == 0)
        instancesPopup.AddListItem("(Unable to detect local instances)");
    else
        for (var i = 0; i < instances.length; i++) {
            var name = instances[i].Name;
            if (instances[i].IsThis)
                name += " (this)";
            var elem = instancesPopup.AddListItem(name, "", "rgba(125,0,0,1)");
            AddLocationEventHandler(elem, instances[i].Url);
        }
    instancesPopup.SizeToContent(true);
};
// This allows closure
function AddLocationEventHandler(elem, url) {
    elem.onclick = function (evt) {
        window.location = url;
    };
}
function SubmitForm(buttonName) {
    if (buttonName === void 0) { buttonName = null; }
    var clientMessage = new ClientMessage();
    clientMessage.CustomButton = buttonName;
    if (clientMessage.CustomButton == null) {
        // Console input implied
        clientMessage.Command = in_prompt.value;
        in_prompt.value = "";
    }
    //alert(message);
    webSocket.send(clientMessage);
}
webSocket.Open = function () {
    socketStatus.innerHTML = 'Connected';
    socketStatus.style.color = 'green';
};
var lastMessageTime = 0;
webSocket.Message = function (serverMessage) {
    var time = (new Date()).getTime();
    if (time - lastMessageTime < 250)
        return; // We are being flooded with messages; skip
    lastMessageTime = time;
    instances = serverMessage.Instances;
    appName.textContent = serverMessage.Name; // + " ▼"; // + " (" + instances.length.toString() + ")";
    for (var i = 0; i < serverMessage.PerfStats.length; i++) {
        var stat = serverMessage.PerfStats[i];
        statCollection.AddStat(stat, time);
        var node = GetSideBarStat(perfStats, stat.Name);
        if (node == null)
            node = AddStatToSideBar(perfStats, stat.Name, false);
        UpdateSideBarStat(node, stat);
    }
    for (var i = 0; i < serverMessage.ManualStats.length; i++) {
        var stat = serverMessage.ManualStats[i];
        statCollection.AddStat(stat, time);
        var node = GetSideBarStat(manualStats, stat.Name);
        if (node == null)
            node = AddStatToSideBar(manualStats, stat.Name, true);
        UpdateSideBarStat(node, stat);
    }
    //var b: HTMLButtonElement; b.onclick(
    custombuttons.innerHTML = "";
    for (var i = 0; i < serverMessage.CustomButtons.length; i++) {
        custombuttons.innerHTML = custombuttons.innerHTML.concat("<button style=\"margin:5px;\" onclick=\"SubmitForm(this.innerHTML);\">", serverMessage.CustomButtons[i], "</button>");
    }
    for (var i = 0; i < serverMessage.ConsoleMessages.length; i++) {
        out_prompt.innerHTML = out_prompt.innerHTML.concat(serverMessage.ConsoleMessages[i], "<br/>");
    }
    out_prompt.scrollTop = out_prompt.scrollHeight;
    for (var i = 0; i < serverMessage.Traffics.length; i++) {
        flowGraph.AddTraffic(serverMessage.Traffics[i].CallerName, serverMessage.Traffics[i].CallerVarOv, serverMessage.Traffics[i].CallerScript, serverMessage.Traffics[i].CalleeName, serverMessage.Traffics[i].CalleeVarOv, serverMessage.Traffics[i].CalleeScript, serverMessage.Traffics[i].IsRoot, serverMessage.Traffics[i].IsLeaf, new Traffic(time, serverMessage.Traffics[i].DurationStat, serverMessage.Traffics[i].MaxThreads));
        statCollection.AddStat(serverMessage.Traffics[i].DurationStat, time);
    }
};
webSocket.Close = function () {
    socketStatus.innerHTML = 'Connecting...';
    socketStatus.style.color = "red";
    setTimeout(function () {
        ReconnectLoop();
    }, 2000);
};
function ReconnectLoop() {
    try {
        // Retrying websocket connections introduces weird delays.  So use AJAX to test connectivity.
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", window.location.href + "?ping=1", false);
        xmlHttp.setRequestHeader("If-Modified-Since", "Sat, 1 Jan 2005 00:00:00 GMT");
        xmlHttp.send();
        if (xmlHttp.status == 200) {
            window.location.reload(); // Since the graph may have changed, we must reload.
        }
    }
    catch (err) {
    }
    setTimeout(function () {
        ReconnectLoop();
    }, 500);
}
//# sourceMappingURL=Client.js.map