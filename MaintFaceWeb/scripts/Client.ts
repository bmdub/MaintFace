/// <reference path="Common.ts"/>
/// <reference path="DirectedGraph.ts"/>

var appName = document.getElementById('appName');
var appNameContainer = document.getElementById('appNameContainer');
var maintFaceElem = document.getElementById('MaintFace');
var socketStatus = document.getElementById('status');
var manualStats = document.getElementById('manualStats');
var custombuttons = document.getElementById('custombuttons');
var messageField = <HTMLInputElement>document.getElementById('message');
var out_prompt = document.getElementById('out_prompt');
var in_prompt = <HTMLInputElement>document.getElementById('in_prompt');
var graphCanvas = <HTMLCanvasElement>document.getElementById('graphCanvas');
var graphCanvasContent = <HTMLElement>document.getElementById('graphCanvasContent');
var flowCanvas = <HTMLCanvasElement>document.getElementById('flowCanvas');
var flowCanvasContent = <HTMLElement>document.getElementById('flowCanvasContent');
var flowGraph: DirectedGraph = new DirectedGraph(flowCanvas);
var graph: Graph = new Graph(graphCanvas);
var statsPopup: CustomPopup = null;
var instancesPopup: CustomPopup = null;
var statCollection: StatCollection = new StatCollection();
var hoveredStatNames: Array<string> = [];

var wsUrl = window.location.href.toLowerCase();
wsUrl = wsUrl.replace("https://", "wss://");
wsUrl = wsUrl.replace("http://", "ws://");
var webSocket: AsyncWebSocket = new AsyncWebSocket(wsUrl, false);

in_prompt.onkeypress = (evt) => {
	if (evt.keyCode == 13)
		SubmitForm();
}

flowGraph.OnPauseChanged = (paused) => {
	var clientMessage = new ClientMessage();
	if (paused)
		clientMessage.TrafficCommand = "Pause";
	else
		clientMessage.TrafficCommand = "Continue";
	webSocket.send(clientMessage);
}

function ToggleGraphSeries(name: string) {
    var statSeries = statCollection.GetSeries(name);
    if (statSeries == null) return;

    if (graph.SeriesExists(statSeries) == false) {
        graph.AddSeries(statSeries);
        BringTabToFront("graphCanvasHeader");
    }
    else {
        graph.RemoveSeries(statSeries);
    }
}

function UpdatePopup(statNames: Array<string>, statExtras: Array<string> = null) {

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
        if (statSeries == null) continue;
        var statEntry = statSeries.GetLatestStat();
        if (statEntry == null) continue;
        var stat = statEntry._stat;

        displayCt++;
        if (displayCt > 1)
            innerHTML += "<br/>";

        var name = EscapeEdgeName(stat.Name);
        innerHTML += name + " (" + stat.SamplesFormatted + "/s) <br/>";

        if (stat.ValueOverride != null) color = "#FF00FF";
        else color = GetColorForValue(stat.ValueNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
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

function GetSideBarStat(statsElement: HTMLElement, statName: string) {
    for (var i = 0; i < statsElement.childNodes.length; i++)
        if ((<HTMLSpanElement>statsElement.childNodes[i]).id == statName) {
            return <HTMLSpanElement>statsElement.childNodes[i];
        }
}

function AddStatToSideBar(statsElement: HTMLElement, statName: string, overridable: boolean) {
    var elem = document.createElement("span");
    statsElement.appendChild(elem);
    elem.id = statName;
	elem.style.cursor = "pointer";
    elem.onmouseenter = (evt) => {
		elem.style.backgroundColor = "#555555";

		var index = hoveredStatNames.indexOf(name);
		if (index == -1)
			hoveredStatNames.push(statName);
	}
    elem.onmouseleave = (evt) => {
		elem.style.backgroundColor = "";

		for (; ;) {
			var index = hoveredStatNames.indexOf(statName);
			if (index == -1) return;
			hoveredStatNames.splice(index, 1);
		}
	}
    elem.onclick = CreateStatContextMenu.bind(null, elem, statName, overridable);
    var name = EscapeEdgeName(statName);
    elem.innerHTML = name + ": <span class=\"StatValue\"></span><br/>";

    return elem;
}

function UpdateSideBarStat(elem: HTMLSpanElement, stat: Stat) {
    var color;
    if (stat.ValueOverride != null) color = "#FF00FF";
    else color = GetColorForValue(stat.ValueNumber, stat.ExpectedMaxNumber, stat.ExpectedMinNumber);
    for (var i = 0; i < elem.childNodes.length; i++) {
        var valueElem = <HTMLElement>elem.childNodes[i];
        if (elem.childNodes[i].nodeType == 1) {
            if (valueElem.className == "StatValue") {
                valueElem.style.color = color;
                valueElem.textContent = stat.ValueFormatted;
                break;
            }
        }
    }
}

function HandleStatEdit(statName: string) {

	var promptPopup = new CustomPopup("Override Value", "", "rgba(100,100,0,.9)", 999, 0, 0, 10, 10);
	promptPopup.SetText("Enter Override Value for " + statName + ":");
	var input = promptPopup.SetInput("", "");
	var apply = promptPopup.AddButton("Apply");
	input.onkeyup = (evt) => {
		if (evt.keyCode == 13)
			apply.click();
	}
	apply.onclick = (evt) => {
		var clientMessage = new ClientMessage();
		clientMessage.StatOverride = new StatOverrideMessage();
		clientMessage.StatOverride.Name = statName;
		clientMessage.StatOverride.Value = promptPopup.getValue();
		webSocket.send(clientMessage);
		promptPopup.Destroy();
	};
	promptPopup.SetCloseX().onclick = (evt) => promptPopup.Destroy();
	promptPopup.AddButton("Cancel").onclick = (evt) => promptPopup.Destroy();
	promptPopup.AddButton("Revert").onclick = (evt) => {
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

function HandleVarEdit(nodeName: string, varName: string, rootIndex: number, varIndex: number) {

	var promptPopup = new CustomPopup("Override Value", "", "rgba(100,100,0,.9)", 999, 0, 0, 10, 10);
	promptPopup.SetText("Enter Override Value for " + varName + ":")
	var input = promptPopup.SetInput("", "");
	var apply = promptPopup.AddButton("Apply");
	input.onkeyup = (evt) => {
		if (evt.keyCode == 13)
			apply.click();
	}
	apply.onclick = (evt) => {
		var clientMessage = new ClientMessage();
		clientMessage.VarOverride = new VarOverrideMessage();
		clientMessage.VarOverride.NodeName = nodeName;
		clientMessage.VarOverride.RootIndex = rootIndex;
		clientMessage.VarOverride.VarIndex = varIndex;
		clientMessage.VarOverride.Value = promptPopup.getValue();
		webSocket.send(clientMessage);
		promptPopup.Destroy();
	};
	promptPopup.SetCloseX().onclick = (evt) => promptPopup.Destroy();
	promptPopup.AddButton("Cancel").onclick = (evt) => promptPopup.Destroy();
	promptPopup.AddButton("Revert").onclick = (evt) => {
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

function CreateStatContextMenu(elem: HTMLSpanElement, statName: string, overridable: boolean) {

	var menuPopup = new CustomPopup("", "rgba(0, 0, 0, 1)", "rgba(200, 200, 200, 1)", 999, mouseX, mouseY, 10, 10, 5);
	menuPopup.MainDiv.style.borderRadius = "";
	menuPopup.clickoutside = (evt) => menuPopup.Destroy();

	menuPopup.AddListItem("Graph", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
	.onclick = (evt) => {
		ToggleGraphSeries(statName);
		menuPopup.Destroy();
	}

	if (overridable) {
		menuPopup.AddListItem("Override", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
		.onclick = (evt) => {
			HandleStatEdit(statName);
			menuPopup.Destroy();
		}
	}

	menuPopup.SizeToContent();
}

function CreateFlowContextMenu(nodeName: string, statNames: Array<string>) {
	var menuPopup = new CustomPopup("", "rgba(0, 0, 0, 1)", "rgba(200, 200, 200, 1)", 999, mouseX, mouseY, 10, 10, 5);
	menuPopup.MainDiv.style.borderRadius = "";
	menuPopup.clickoutside = (evt) => menuPopup.Destroy();

	menuPopup.AddListItem("Variables", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
	.onclick = (evt) => {
        if (nodeName != null) {
			var varPopup = new CustomPopup(nodeName, "", "rgba(2, 61, 26, .9)", 100, mouseX, mouseY, 10, 10);
			varPopup.MainDiv.style.borderRadius = "";
			varPopup.MainDiv.style.borderStyle = "solid";
			varPopup.MainDiv.style.borderWidth = "thin";
			varPopup.MainDiv.style.borderColor = "rgba(41, 122, 74, 1)";
			varPopup.SetCloseX().onclick = (evt) => varPopup.Destroy();
			varPopup.SizeToContent();
			varPopup.BoundToScreen();
            TracePointDumpRequestLoop(nodeName, varPopup);
        }
		menuPopup.Destroy();
	}

	menuPopup.AddListItem("Script", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
	.onclick = (evt) => {
		if (nodeName != null) {
			var currentSourcePopup =
				new CustomPopup("Source", "black", "rgba(255,255,255,.9)", 100, 0, 0, window.innerWidth * .9, window.innerHeight * .9);
			currentSourcePopup.SetTextArea("Getting source...", "");
			currentSourcePopup.AddButton("Apply").onclick = (evt) => {
				var clientMessage = new ClientMessage();
				clientMessage.Script = new ScriptMessage();
				clientMessage.Script.NodeName = nodeName;
				clientMessage.Script.Source = currentSourcePopup.getValue();
				webSocket.send(clientMessage);

				currentSourcePopup.Destroy();
			}
			currentSourcePopup.SetCloseX().onclick = (evt) => currentSourcePopup.Destroy();
			currentSourcePopup.AddButton("Cancel").onclick = (evt) => currentSourcePopup.Destroy();
			currentSourcePopup.AddButton("Revert").onclick = (evt) => {
				//send null
				var clientMessage = new ClientMessage();
				clientMessage.Script = new ScriptMessage();
				clientMessage.Script.NodeName = nodeName;
				clientMessage.Script.Source = null;
				webSocket.send(clientMessage);

				currentSourcePopup.Destroy();
			}

			// Request current source
			var clientMessage = new ClientMessage();
			clientMessage.DumpSourceName = nodeName;
			webSocket.send(clientMessage, (serverMessage) => {
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

function CreateGraphNodeMenuItem(statName: string, menuPopup: CustomPopup) {
    var name = EscapeEdgeName(statName);
	menuPopup.AddListItem("Graph " + name, "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)")
	.onclick = (evt) => {
        ToggleGraphSeries(statName);
		menuPopup.Destroy();
	}
}

function CreateVarContextMenu(popup: CustomPopup, nodeName: string, varName: string, rootIndex: number, varIndex: number, overridable: boolean) {

	var menuPopup = new CustomPopup("", "rgba(0, 0, 0, 1)", "rgba(200, 200, 200, 1)", 999, popup.MouseX, popup.MouseY, 10, 10, 5);
	menuPopup.MainDiv.style.borderRadius = "";
	menuPopup.clickoutside = (evt) => menuPopup.Destroy();

	if (overridable) {
		var item = menuPopup.AddListItem("Override", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)");
		item.onclick = (evt) => {
			{
				HandleVarEdit(nodeName, varName, rootIndex, varIndex);
				menuPopup.Destroy();
			}
		}
	}
	else {
		var item = menuPopup.AddListItem("(Not Overridable)", "rgba(200, 200, 200, 1)", "rgba(0, 0, 0, 1)");
	}

	menuPopup.SizeToContent();
}

function TracePointDumpRequestLoop(nodeName: string, varPopup: CustomPopup) {
	if (varPopup.Disposed)
		return;
	var clientMessage = new ClientMessage();
	clientMessage.DumpTracePointName = nodeName;
	webSocket.send(clientMessage, (serverMessage) => {
		varPopup.ClearListItems();
		for (var v = 0; v < serverMessage.VarDump.DumpedVariables.length; v++) {
			var elem = varPopup.AddListItem(
				serverMessage.VarDump.DumpedVariables[v].Name + ": " + serverMessage.VarDump.DumpedVariables[v].Value,
				"", "rgba(15, 92, 46,.9)");
			if (serverMessage.VarDump.DumpedVariables[v].Overridden == true)
				elem.style.color = "#FF00FF";
			elem.style.textIndent = (serverMessage.VarDump.DumpedVariables[v].Depth * 10).toString() + "px";
			AttachVarMenu(varPopup, elem, serverMessage.VarDump.Name, serverMessage.VarDump.DumpedVariables[v]);
		}
		varPopup.SizeToContent(true);
	});

	setTimeout((evt) => { TracePointDumpRequestLoop(nodeName, varPopup); }, 1000);
}

// Using a function allows closure.
function AttachVarMenu(popup: CustomPopup, elem: HTMLElement, nodeName: string, dumpedVariable) {
	elem.onclick = (evt) => {
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

class StatOverrideMessage extends AsyncWebSocketMessage {
	Name = null;
	Value = null;
}
class VarOverrideMessage extends AsyncWebSocketMessage {
	NodeName = null;
	RootIndex = null;
	VarIndex = null;
	Value = null;
}
class ScriptMessage extends AsyncWebSocketMessage {
	NodeName = null;
	Source = null;
}
class ClientMessage extends AsyncWebSocketMessage {
	CustomButton = null;
	Command = null;
	StatOverride = null;
	DumpTracePointName = null;
	VarOverride = null;
	Script = null;
	DumpSourceName = null;
	TrafficCommand = null;
}

// This allows closure
function AddLocationEventHandler(elem: HTMLElement, url: any) {
	elem.onclick = (evt) => {
		window.location.href = url;
	}
}

function SubmitForm(buttonName: string = null) {
	var clientMessage = new ClientMessage();
	clientMessage.CustomButton = buttonName;
	if (clientMessage.CustomButton == null) {
		// Console input implied
		clientMessage.Command = in_prompt.value;
		in_prompt.value = "";
		//in_prompt.focus();
	}
	//alert(message);
	webSocket.send(clientMessage);
}

webSocket.Open = () => {
	socketStatus.innerHTML = 'Connected';
	socketStatus.style.color = 'green';
};

var lastMessageTime = 0;

webSocket.Message = (serverMessage) => {
	var time = (new Date()).getTime();
	if (time - lastMessageTime < 250)
		return; // We are being flooded with messages; skip
	lastMessageTime = time;
    
    appName.textContent = serverMessage.Name;

	for (var i = 0; i < serverMessage.ManualStats.length; i++) {
		var stat = <Stat>serverMessage.ManualStats[i];
		statCollection.AddStat(stat, time);
		var node = GetSideBarStat(manualStats, stat.Name);
		if (node == null) node = AddStatToSideBar(manualStats, stat.Name, true);
		UpdateSideBarStat(node, stat);
	}
	//var b: HTMLButtonElement; b.onclick(
	custombuttons.innerHTML = "";
	for (var i = 0; i < serverMessage.CustomButtons.length; i++) {
		custombuttons.innerHTML = custombuttons.innerHTML.concat(
			"<button style=\"margin:5px;\" onclick=\"SubmitForm(this.innerHTML);\">", serverMessage.CustomButtons[i], "</button>");
	}
	for (var i = 0; i < serverMessage.ConsoleMessages.length; i++) {
		out_prompt.innerHTML = out_prompt.innerHTML.concat(serverMessage.ConsoleMessages[i], "<br/>");
	}
	out_prompt.scrollTop = out_prompt.scrollHeight;

	for (var i = 0; i < serverMessage.Traffics.length; i++) {
		flowGraph.AddTraffic(serverMessage.Traffics[i].CallerName,
			serverMessage.Traffics[i].CallerVarOv,
			serverMessage.Traffics[i].CallerScript,
			serverMessage.Traffics[i].CalleeName,
			serverMessage.Traffics[i].CalleeVarOv,
			serverMessage.Traffics[i].CalleeScript,
			serverMessage.Traffics[i].IsRoot,
			serverMessage.Traffics[i].IsLeaf,
			new Traffic(time,
				serverMessage.Traffics[i].DurationStat,
				serverMessage.Traffics[i].MaxThreads));
		statCollection.AddStat(serverMessage.Traffics[i].DurationStat, time);
	}
}

webSocket.Close = () => {
	socketStatus.innerHTML = 'Connecting...';
	socketStatus.style.color = "red";
	setTimeout(() => {
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
		//console.log(err);
	}

	setTimeout(() => {
		ReconnectLoop();
	}, 500);
}