/// <reference path="Common.ts"/>
class GraphNode {
    constructor(Name) {
        this.Name = Name;
        this.EdgesUp = [];
        this.EdgesDown = [];
        this.X = 0;
        this.Y = 0;
        this.MaxStep = 0;
        this.IsRoot = false;
        this.IsLeaf = false;
        this.LoopTag = false;
        this.ParamTypes = null;
    }
}
class Edge {
    constructor(Caller, Callee, AcceptableDuration) {
        this.Caller = Caller;
        this.Callee = Callee;
        this.AcceptableDuration = AcceptableDuration;
        this.Traffics = [];
        this.BiggestThreadCount = 1;
        this.Caller.EdgesDown.push(this);
        this.Callee.EdgesUp.push(this);
    }
    CalculateBezierPoints() {
        var cx, cy, cx2, cy2;
        // If flowing to itself, create a loop
        if (this.Callee == this.Caller) {
            cx = this.Caller.X + 50;
            cy = this.Caller.Y + 50;
            cx2 = this.Caller.X + 50;
            cy2 = this.Caller.Y - 50;
        }
        else if (this.Callee.MaxStep >= this.Caller.MaxStep) {
            cx = this.Caller.X + (this.Callee.X - this.Caller.X) * .333;
            cy = this.Caller.Y + (this.Callee.Y - this.Caller.Y) * .333;
            cx2 = this.Caller.X + (this.Callee.X - this.Caller.X) * .666;
            cy2 = this.Caller.Y + (this.Callee.Y - this.Caller.Y) * .666;
        }
        else if (this.Callee.MaxStep < this.Caller.MaxStep) {
            var bendX = (this.Caller.Y - this.Callee.Y) * .20;
            var bendY = (this.Caller.X - this.Callee.X) * .20;
            cx = this.Caller.X - bendX;
            cy = this.Caller.Y + bendY;
            cx2 = this.Callee.X - bendX;
            cy2 = this.Callee.Y + bendY;
        }
        return { cx: cx, cy: cy, cx2: cx2, cy2: cy2 };
    }
    GetSlope() {
        return (this.Callee.Y - this.Caller.Y) / (this.Callee.X - this.Caller.X);
    }
}
class Traffic {
    constructor(StartTime, DurationStat, MaxThreads) {
        this.StartTime = StartTime;
        this.DurationStat = DurationStat;
        this.MaxThreads = MaxThreads;
    }
}
class DirectedGraph {
    constructor(_canvas) {
        this._canvas = _canvas;
        this._inputHandler = null;
        this._canvasCtx = null;
        this._canvasBuffer = document.createElement('canvas');
        this._canvasBufferCtx = null;
        this.Nodes = {};
        this.NodeList = [];
        this.EdgeList = [];
        this.MaxPointsPerPipe = 7;
        this.MaxEdgeWidth = 3;
        this.StructureChanged = false;
        this.HeldNode = null;
        this.HeldNodeOffsetX = 0;
        this.HeldNodeOffsetY = 0;
        this.HoveredEdgeNames = [];
        this.hoveredEdgeStatAppends = [];
        this.HoveredNodeName = null;
        this.MouseX = 0;
        this.MouseY = 0;
        this.MouseDown = false;
        this.MouseClicked = false;
        this.CameraX = 0;
        this.CameraY = 0;
        this.Scale = 1.0;
        this.PrevWidth = 0;
        this.PrevHeight = 0;
        this.PrevCameraX = 0;
        this.PrevCameraY = 0;
        this.PrevScale = 0;
        this.NodeMovedSinceDraw = false;
        this.NodeHighlightChanged = false;
        this.Paused = false;
        this.Displayed = false;
        this.DebugStat = null;
        this._inputHandler = new InputHandler(this, _canvas);
        this._canvasCtx = this._canvas.getContext('2d');
        this._canvasBufferCtx = this._canvasBuffer.getContext('2d');
    }
    SetDisplayed(displayed) {
        if (this.Displayed == displayed)
            return;
        this.Displayed = displayed;
        if (this.Displayed && !this.Paused)
            this.OnPauseChanged(false);
        else if (!this.Displayed)
            this.OnPauseChanged(true);
    }
    SetPaused(paused) {
        if (this.Paused == paused)
            return;
        this.Paused = paused;
        if (this.OnPauseChanged != null) {
            this.OnPauseChanged(this.Paused);
        }
    }
    ScreenToWorld(x, y) {
        x += this.CameraX;
        y += this.CameraY;
        x /= this.Scale;
        y /= this.Scale;
        return { x: x, y: y };
    }
    WorldToScreen(x, y) {
        x *= this.Scale;
        y *= this.Scale;
        x -= this.CameraX;
        y -= this.CameraY;
        return { x: x, y: y };
    }
    HandleMouseLeave() {
        this.HoveredEdgeNames.length = 0;
        this.hoveredEdgeStatAppends.length = 0;
        this.HoveredNodeName = null;
    }
    HandleMouse(x, y, isDown, clicked) {
        var coords = this.ScreenToWorld(x, y);
        var deltaX = coords.x - this.MouseX;
        var deltaY = coords.y - this.MouseY;
        var mouseWasDown = this.MouseDown;
        this.MouseX = coords.x;
        this.MouseY = coords.y;
        this.MouseDown = isDown;
        if (clicked)
            this.MouseClicked = true;
        // Find the edge we are hovering above.
        this.HoveredEdgeNames.length = 0;
        this.hoveredEdgeStatAppends.length = 0;
        this.HoveredNodeName = null;
        for (var i = 0; i < this.NodeList.length; i++) {
            if (this.MouseX >= this.NodeList[i].X - 20 && this.MouseX <= this.NodeList[i].X + 20 &&
                this.MouseY >= this.NodeList[i].Y - 20 && this.MouseY <= this.NodeList[i].Y + 20) {
                for (var j = 0; j < this.NodeList[i].EdgesDown.length; j++) {
                    if (this.NodeList[i].EdgesDown[j].Traffics.length == 0)
                        continue; //we need traffic; todo
                    this.HoveredEdgeNames.push(this.NodeList[i].EdgesDown[j].Traffics[0].DurationStat.Name);
                    this.hoveredEdgeStatAppends.push("Threads:" + this.NodeList[i].EdgesDown[j].Traffics[0].MaxThreads.toString());
                }
                this.HoveredNodeName = this.NodeList[i].Name;
                ApplyCursor("pointer", this._canvas.style.zIndex);
                break;
            }
        }
        // Pause
        if (clicked && this.HoveredNodeName == null)
            if (x >= (this._canvas.width - 75) && x <= this._canvas.width &&
                y >= 0 && y <= 70)
                this.SetPaused(!this.Paused);
        // We are no longer holding a node
        if (!isDown) {
            this.HeldNode = null;
            return;
        }
        // Find the node we hover above and grab it
        if (this.HeldNode == null) {
            for (var i = 0; i < this.NodeList.length; i++) {
                if (Math.abs(this.NodeList[i].X - coords.x) <= 20 &&
                    Math.abs(this.NodeList[i].Y - coords.y) <= 20) {
                    this.HeldNode = this.NodeList[i];
                    this.HeldNodeOffsetX = this.HeldNode.X - coords.x;
                    this.HeldNodeOffsetY = this.HeldNode.Y - coords.y;
                    break;
                }
            }
        }
        // Snap the node to the mouse
        if (this.HeldNode != null) {
            this.HeldNode.X = coords.x + this.HeldNodeOffsetX;
            this.HeldNode.Y = coords.y + this.HeldNodeOffsetY;
            this.NodeMovedSinceDraw = true;
            // Don't hover stats while we're moving nodes
            this.HoveredEdgeNames.length = 0;
            this.hoveredEdgeStatAppends.length = 0;
            this.HoveredNodeName = null;
            return;
        }
        // Move the screen
        if (mouseWasDown && isDown) {
            this.CameraX -= deltaX;
            this.CameraY -= deltaY;
            this.MouseX -= deltaX;
            this.MouseY -= deltaY;
        }
    }
    // ensure world coord lines up with screen coord (move camera)
    LineUpPointToScreen(worldX, worldY, screenX, screenY) {
        var worldAtScreen = this.ScreenToWorld(screenX, screenY);
        this.CameraX += (worldX - worldAtScreen.x) * this.Scale;
        this.CameraY += (worldY - worldAtScreen.y) * this.Scale;
    }
    IncrementScale(delta, screenX, screenY) {
        this.ChangeScale(this.Scale + delta, screenX, screenY);
    }
    ChangeScale(scale, screenX, screenY) {
        var worldCoords = this.ScreenToWorld(screenX, screenY);
        this.Scale = scale;
        this.LineUpPointToScreen(worldCoords.x, worldCoords.y, screenX, screenY);
    }
    TryAddToGrid(node, grid, cellDim) {
        var x = Math.floor(node.X / cellDim);
        var y = node.MaxStep;
        node.Y = y * cellDim;
        var key = x.toString() + "." + y.toString();
        if (grid[key] == null) {
            grid[key] = node;
            node.X = cellDim * x + (cellDim / 2);
            return true;
        }
        return false;
    }
    RemoveFromGrid(node, grid, cellDim) {
        var x = Math.floor(node.X / cellDim);
        var y = node.MaxStep;
        var key = x.toString() + "." + y.toString();
        if (grid[key] == node) {
            grid[key] = null;
        }
    }
    FitToGrid(node, grid, cellDim) {
        if (this.TryAddToGrid(node, grid, cellDim) == false) {
            for (var o = 1; o < 1024; o++) {
                node.X += o * cellDim;
                if (this.TryAddToGrid(node, grid, cellDim))
                    break;
                node.X -= o * cellDim;
                if (node.X - (o * cellDim) < 0)
                    continue; //don't add to the left of the canvas
                node.X -= o * cellDim;
                if (this.TryAddToGrid(node, grid, cellDim))
                    break;
                node.X += o * cellDim;
            }
        }
    }
    AvgNodePositionDown(node) {
        var accum = node.X;
        var count = 1;
        for (var i = 0; i < node.EdgesDown.length; i++) {
            accum += node.EdgesDown[i].Callee.X;
            count++;
        }
        if (count == 0)
            return;
        node.X = accum / count;
    }
    AvgNodePositionUp(node) {
        var accum = node.X / 3;
        var count = 1 / 3;
        for (var i = 0; i < node.EdgesUp.length; i++) {
            accum += node.EdgesUp[i].Caller.X;
            count++;
        }
        if (count == 0)
            return;
        node.X = accum / count;
    }
    DiscoverMaxNodeDepth(node, startIndex) {
        if (node.LoopTag == true)
            return;
        node.LoopTag = true;
        node.MaxStep = Math.max(node.MaxStep, startIndex);
        for (var i = 0; i < node.EdgesDown.length; i++)
            this.DiscoverMaxNodeDepth(node.EdgesDown[i].Callee, startIndex + 1);
        node.LoopTag = false;
    }
    //DiscoverMaxMinHorizontalPosition(node: GraphNode,
    //    min: number = Number.MAX_VALUE,
    //    max: number = Number.MAX_VALUE * -1) {
    //    if (node.LoopTag == true)
    //        return; 
    //    node.LoopTag = true;
    //    min = Math.min(node.X, min);
    //    max = Math.max(node.X, max);
    //    for (var i = 0; i < node.EdgesDown.length; i++) {
    //        var pair = this.DiscoverMaxMinHorizontalPosition(node.EdgesDown[i].Callee, min, max);
    //        min = Math.min(pair.min, min);
    //        max = Math.max(pair.max, max);
    //    }
    //    node.LoopTag = false;
    //    return { min, max };
    //}
    Build(graph, ctx) {
        // Find the root nodes
        var rootNodes = [];
        for (var i = 0; i < this.NodeList.length; i++)
            if (this.NodeList[i].IsRoot)
                rootNodes.push(this.NodeList[i]);
        // for each node in every path, mark the maximum step to reach it, until end or loop
        for (var i = 0; i < this.NodeList.length; i++)
            this.NodeList[i].MaxStep = 0;
        for (var i = 0; i < rootNodes.length; i++)
            this.DiscoverMaxNodeDepth(rootNodes[i], 0);
        // Multiple threads can cause nodes to have depths less than than their parents.  FIx.
        var changed;
        do {
            changed = false;
            for (var i = 0; i < this.NodeList.length; i++)
                for (var p = 0; p < this.NodeList[i].EdgesUp.length; p++)
                    if (!this.NodeList[i].EdgesUp[p].Caller.IsLeaf)
                        if (this.NodeList[i].EdgesUp[p].Callee.MaxStep < this.NodeList[i].EdgesUp[p].Caller.MaxStep) {
                            this.NodeList[i].EdgesUp[p].Callee.MaxStep = this.NodeList[i].EdgesUp[p].Caller.MaxStep;
                            changed = true;
                        }
        } while (changed);
        // Make sure all the root nodes start at 0 depth.
        for (var i = 0; i < this.NodeList.length; i++)
            if (this.NodeList[i].IsRoot)
                this.NodeList[i].MaxStep = 0;
        // Remove gaps in the graph
        do {
            changed = false;
            for (var i = 0; i < this.NodeList.length; i++) {
                var minGap = 1000000;
                for (var p = 0; p < this.NodeList[i].EdgesUp.length; p++) {
                    var gap = (this.NodeList[i].MaxStep - this.NodeList[i].EdgesUp[p].Caller.MaxStep) - 1;
                    if (gap < 0)
                        continue;
                    minGap = Math.min(minGap, gap);
                }
                if (minGap > 0 && minGap != 1000000) {
                    this.NodeList[i].MaxStep -= minGap;
                    changed = true;
                }
            }
        } while (changed);
        // horizontal positioning:
        //  http://en.wikipedia.org/wiki/Layered_graph_drawing
        //  for each node, average it's position with it's parents.
        //  make sure the nodes are properly spaced.
        var cellDim = 75;
        var iterationCt = 12;
        this.NodeList.sort(function (a, b) {
            return a.MaxStep - b.MaxStep;
        });
        for (var i = 0; i < this.NodeList.length; i++) {
            // Start with a random position
            this.NodeList[i].X = Math.abs(this.Hash(this.NodeList[i].Name)) % 1000; //todo
        }
        var grid = {};
        for (var aveCount = 0; aveCount < iterationCt; aveCount++) {
            // Get the average root X value.  This is used to bring closer
            // the independent graphs.
            var rootXTotal = 0;
            var rootXCount = 0;
            var rootXAve = 0;
            for (var i = 0; i < this.NodeList.length; i++)
                if (this.NodeList[i].IsRoot) {
                    rootXTotal += this.NodeList[i].X;
                    rootXCount++;
                }
            if (rootXCount > 0)
                rootXAve = rootXTotal / rootXCount;
            for (var i = 0; i < this.NodeList.length; i++) {
                this.RemoveFromGrid(this.NodeList[i], grid, cellDim);
                if (this.NodeList[i].IsRoot) {
                    this.NodeList[i].X = (this.NodeList[i].X + rootXAve) * .5;
                    this.AvgNodePositionDown(this.NodeList[i]);
                }
                else
                    this.AvgNodePositionUp(this.NodeList[i]);
                this.FitToGrid(this.NodeList[i], grid, cellDim);
            }
        }
        // If a node has 2 edges with the same slope (as callee), then adjust to left or right.
        // alt: handle this above; average with the parents' right
        for (var i = 0; i < this.NodeList.length; i++) {
            for (var j = 0; j < this.NodeList[i].EdgesUp.length; j++) {
                var slope = this.NodeList[i].EdgesUp[j].GetSlope();
                for (var k = j + 1; k < this.NodeList[i].EdgesUp.length; k++) {
                    //if (this.NodeList[i].EdgesUp[k].Caller == this.NodeList[i])
                    //continue;
                    var slope2 = this.NodeList[i].EdgesUp[k].GetSlope();
                    if (slope == slope2) {
                        //todo: check an empty full spot right and left.  If none, then
                        // swap with right node.
                        var x = this.NodeList[i].X + cellDim;
                        var y = this.NodeList[i].Y;
                        var rightNode = null;
                        for (var n = 0; n < this.NodeList.length; n++) {
                            if (this.NodeList[n].X == x && this.NodeList[n].Y == y) {
                                this.NodeList[n].X = this.NodeList[i].X;
                                break;
                            }
                        }
                        this.NodeList[i].X = x;
                        break;
                    }
                }
            }
        }
        // Find the left-most node
        var minX = 0x7FFFFFFF;
        for (var i = 0; i < this.NodeList.length; i++)
            minX = Math.min(minX, this.NodeList[i].X);
        // Find the right-most node
        var maxX = 0;
        for (var i = 0; i < this.NodeList.length; i++)
            maxX = Math.max(maxX, this.NodeList[i].X);
        var center = (minX + maxX) / 2;
        // Center
        if (ctx.canvas.width - 100 > maxX) {
            for (var i = 0; i < this.NodeList.length; i++) {
                this.NodeList[i].X += ((ctx.canvas.width / 2) - center);
                this.NodeList[i].Y += 50;
            }
        }
        else {
            for (var i = 0; i < this.NodeList.length; i++) {
                this.NodeList[i].X += 50 - minX;
                this.NodeList[i].Y += 50;
            }
        }
    }
    Hash(str) {
        var hash = 2166136261; // Offset Basis
        for (var i = 0; i < str.length; i++) {
            hash = hash * 16777619; // Prime
            hash = hash ^ str.charCodeAt(i);
        }
        return hash;
    }
    AddTraffic(callerName, callerVarsOverridden, callerScript, calleeName, calleeVarsOverridden, calleeScript, isRoot, isLeaf, traffic) {
        var edge = this.GetEdge(callerName, calleeName);
        if (edge == null) {
            this.StructureChanged = true;
            var callerNode = this.Nodes[callerName];
            if (callerNode == null) {
                callerNode = new GraphNode(callerName);
                this.Nodes[callerNode.Name] = callerNode;
                this.NodeList.push(callerNode);
            }
            callerNode.IsRoot = isRoot;
            var calleeNode = this.Nodes[calleeName];
            if (calleeNode == null) {
                calleeNode = new GraphNode(calleeName);
                this.Nodes[calleeNode.Name] = calleeNode;
                this.NodeList.push(calleeNode);
            }
            calleeNode.IsLeaf = isLeaf;
            edge = new Edge(callerNode, calleeNode, traffic.DurationStat.ExpectedMaxNumber);
            this.EdgeList.push(edge);
        }
        if (traffic.MaxThreads > edge.BiggestThreadCount)
            edge.BiggestThreadCount = traffic.MaxThreads;
        if (edge.Caller.VarsOverridden != callerVarsOverridden ||
            edge.Caller.Script != callerScript ||
            edge.Callee.VarsOverridden != calleeVarsOverridden ||
            edge.Callee.Script != calleeScript)
            this.NodeHighlightChanged = true;
        edge.Caller.VarsOverridden = callerVarsOverridden;
        edge.Caller.Script = callerScript;
        edge.Callee.VarsOverridden = calleeVarsOverridden;
        edge.Callee.Script = calleeScript;
        edge.Traffics.push(traffic);
    }
    GetEdge(callerName, calleeName) {
        var node = this.Nodes[callerName];
        if (node == null)
            return null;
        for (var i = 0; i < node.EdgesDown.length; i++)
            if (node.EdgesDown[i].Callee.Name == calleeName)
                return node.EdgesDown[i];
        return null;
    }
    Draw() {
        var dotRadius = 3;
        if (this.StructureChanged) {
            this.Build(this._canvas, this._canvasCtx);
        }
        var graphChanged = false;
        if (this.StructureChanged ||
            this.PrevWidth != this._canvas.width ||
            this.PrevHeight != this._canvas.height ||
            this.PrevCameraX != this.CameraX ||
            this.PrevCameraY != this.CameraY ||
            this.PrevScale != this.Scale ||
            this.NodeMovedSinceDraw ||
            this.NodeHighlightChanged)
            graphChanged = true;
        this.PrevWidth = this._canvas.width;
        this.PrevHeight = this._canvas.height;
        this.PrevCameraX = this.CameraX;
        this.PrevCameraY = this.CameraY;
        this.PrevScale = this.Scale;
        this.NodeMovedSinceDraw = false;
        this.NodeHighlightChanged = false;
        if (graphChanged) {
            this._canvasBuffer.width = this._canvas.width;
            this._canvasBuffer.height = this._canvas.height;
            this._canvasBufferCtx.setTransform(1, 0, 0, 1, 0, 0);
            this._canvasBufferCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
            this._canvasBufferCtx.translate(this.CameraX * -1, this.CameraY * -1);
            this._canvasBufferCtx.scale(this.Scale, this.Scale);
            // Draw the edges
            this._canvasBufferCtx.strokeStyle = 'rgba(255,255,255,.15)';
            for (var i = 0; i < this.EdgeList.length; i++) {
                if (this.EdgeList[i].Caller.IsLeaf)
                    continue; // ignore loops for now
                var bezierPoints = this.EdgeList[i].CalculateBezierPoints();
                this.DrawEdge(this.EdgeList[i].Caller.X, this.EdgeList[i].Caller.Y, bezierPoints.cx, bezierPoints.cy, bezierPoints.cx2, bezierPoints.cy2, this.EdgeList[i].Callee.X, this.EdgeList[i].Callee.Y, this.EdgeList[i].BiggestThreadCount, dotRadius, this._canvasBufferCtx);
            }
            // Draw the nodes
            this._canvasBufferCtx.fillStyle = 'rgba(0,0,255,1)';
            for (var i = 0; i < this.NodeList.length; i++) {
                if (this.NodeList[i].Script) {
                    this._canvasBufferCtx.beginPath();
                    this._canvasBufferCtx.strokeStyle = 'rgba(255,255,0,1)';
                    this._canvasBufferCtx.arc(this.NodeList[i].X, this.NodeList[i].Y, 30, 0, Math.PI * 2);
                    this._canvasBufferCtx.stroke();
                }
                if (this.NodeList[i].VarsOverridden) {
                    this._canvasBufferCtx.beginPath();
                    this._canvasBufferCtx.strokeStyle = 'rgba(255,0,255,1)';
                    this._canvasBufferCtx.arc(this.NodeList[i].X, this.NodeList[i].Y, 23, 0, Math.PI * 2);
                    this._canvasBufferCtx.stroke();
                }
                if (this.NodeList[i].IsRoot) {
                    var grd = this._canvasBufferCtx.createRadialGradient(this.NodeList[i].X, this.NodeList[i].Y + 5, 5, this.NodeList[i].X, this.NodeList[i].Y + 5, 25);
                    grd.addColorStop(0, "rgba(0,180,180,1)");
                    grd.addColorStop(1, "black");
                    this._canvasBufferCtx.fillStyle = grd;
                    this._canvasBufferCtx.beginPath();
                    this._canvasBufferCtx.moveTo(this.NodeList[i].X - 15, this.NodeList[i].Y + 15);
                    this._canvasBufferCtx.lineTo(this.NodeList[i].X + 15, this.NodeList[i].Y + 15);
                    this._canvasBufferCtx.lineTo(this.NodeList[i].X, this.NodeList[i].Y - 15);
                    this._canvasBufferCtx.fill();
                }
                else if (this.NodeList[i].IsLeaf) {
                    var grd = this._canvasBufferCtx.createRadialGradient(this.NodeList[i].X, this.NodeList[i].Y - 5, 5, this.NodeList[i].X, this.NodeList[i].Y - 5, 25);
                    grd.addColorStop(0, "rgba(175,0,255,1)");
                    grd.addColorStop(1, "black");
                    this._canvasBufferCtx.fillStyle = grd;
                    this._canvasBufferCtx.beginPath();
                    this._canvasBufferCtx.moveTo(this.NodeList[i].X + 15, this.NodeList[i].Y - 15);
                    this._canvasBufferCtx.lineTo(this.NodeList[i].X - 15, this.NodeList[i].Y - 15);
                    this._canvasBufferCtx.lineTo(this.NodeList[i].X, this.NodeList[i].Y + 15);
                    this._canvasBufferCtx.fill();
                }
                else {
                    var grd = this._canvasBufferCtx.createRadialGradient(this.NodeList[i].X, this.NodeList[i].Y, 5, this.NodeList[i].X, this.NodeList[i].Y, 25);
                    grd.addColorStop(0, "rgba(0,100,200,1)");
                    grd.addColorStop(1, "black");
                    this._canvasBufferCtx.fillStyle = grd;
                    this._canvasBufferCtx.beginPath();
                    this._canvasBufferCtx.fillRect(this.NodeList[i].X - 15, this.NodeList[i].Y - 15, 30, 30);
                    //ctx.arc(this.NodeList[i].X, this.NodeList[i].Y, 20, 0, Math.PI * 2);
                    this._canvasBufferCtx.fill();
                }
            }
            // Draw the node names
            this._canvasBufferCtx.fillStyle = 'rgba(200,200,200,.9)';
            this._canvasBufferCtx.strokeStyle = 'rgba(0,0,0,1)';
            this._canvasBufferCtx.lineWidth = 3;
            this._canvasBufferCtx.font = "14px Arial";
            for (var i = 0; i < this.NodeList.length; i++) {
                var label = this.NodeList[i].Name;
                label = EscapeEdgeName(label);
                var offset = this._canvasBufferCtx.measureText(label).width * -.5;
                this._canvasBufferCtx.strokeText(label, this.NodeList[i].X + offset, this.NodeList[i].Y - 20);
                this._canvasBufferCtx.fillText(label, this.NodeList[i].X + offset, this.NodeList[i].Y - 20);
            }
        }
        this.StructureChanged = false;
        this._canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
        this._canvasCtx.clearRect(0, 0, this._canvas.width, this._canvas.height);
        this._canvasCtx.translate(this.CameraX * -1, this.CameraY * -1);
        this._canvasCtx.scale(this.Scale, this.Scale);
        // Draw the traffic        
        if (!this.Paused) {
            var time = (new Date()).getTime();
            for (var i = 0; i < this.EdgeList.length; i++) {
                if (this.EdgeList[i].Caller.IsLeaf)
                    continue; // ignore loops for now
                for (var t = 0; t < this.EdgeList[i].Traffics.length; t++) {
                    var travelTime = 2000; //todo: this should be the update rate * 2.
                    var style = GetColorForValue(this.EdgeList[i].Traffics[t].DurationStat.AvgNumber, this.EdgeList[i].Traffics[t].DurationStat.ExpectedMaxNumber, this.EdgeList[i].Traffics[t].DurationStat.ExpectedMinNumber);
                    this._canvasCtx.fillStyle = style;
                    var trafficTime = time - this.EdgeList[i].Traffics[t].StartTime;
                    if (trafficTime > travelTime) {
                        this.EdgeList[i].Traffics.splice(t, 1);
                        t--;
                        continue;
                    }
                    var bezierPoints = this.EdgeList[i].CalculateBezierPoints();
                    this.DrawTraffic(this.EdgeList[i].Caller.X, this.EdgeList[i].Caller.Y, bezierPoints.cx, bezierPoints.cy, bezierPoints.cx2, bezierPoints.cy2, this.EdgeList[i].Callee.X, this.EdgeList[i].Callee.Y, this.EdgeList[i].Traffics[t].DurationStat.Samples, trafficTime / travelTime, this.EdgeList[i].Traffics[t].MaxThreads, dotRadius, this._canvasCtx);
                }
            }
        }
        // Overlay the static stuff
        this._canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
        this._canvasBufferCtx.setTransform(1, 0, 0, 1, 0, 0);
        this._canvasCtx.drawImage(this._canvasBuffer, 0, 0);
        // Draw the pause icon
        if (this.Paused) {
            this._canvasCtx.rotate(Math.PI * .5);
            this._canvasCtx.scale(10, 10);
            this._canvasCtx.fillStyle = 'rgba(50,50,50,1)';
            this._canvasCtx.fillText("=", 1, (this._canvas.width - 75) / -10);
        }
        else {
            this._canvasCtx.scale(10, 10);
            this._canvasCtx.fillStyle = 'rgba(50,50,50,1)';
            this._canvasCtx.fillText(">", (this._canvas.width - 75) / 10, 7);
        }
        if (this.DebugStat != null) {
            this._canvasCtx.setTransform(1, 0, 0, 1, 0, 0);
            this._canvasCtx.fillStyle = 'rgba(255,255,255,1)';
            this._canvasCtx.fillText(this.DebugStat, 0, 20);
        }
    }
    DrawEdge(x1, y1, cx, cy, cx2, cy2, x2, y2, threadCt, radius, ctx) {
        var girth = Math.min(this.MaxEdgeWidth, threadCt);
        ctx.beginPath();
        ctx.lineWidth = girth * radius * 2;
        ctx.moveTo(x1, y1);
        //ctx.lineTo(x2, y2);
        //ctx.quadraticCurveTo(cx, cy, x2, y2);
        ctx.bezierCurveTo(cx, cy, cx2, cy2, x2, y2);
        ctx.stroke();
    }
    DrawTraffic(x1, y1, cx, cy, cx2, cy2, x2, y2, pointCount, pctDone, threadCt, radius, ctx) {
        var girth = Math.min(this.MaxEdgeWidth, threadCt);
        var ensureAccurateCount = true;
        if (pointCount > this.MaxPointsPerPipe * girth) {
            pointCount = this.MaxPointsPerPipe * girth;
            ensureAccurateCount = false;
        }
        var pointNum = 0;
        var dist = Math.abs(y2 - y1) + Math.abs(x2 - x1);
        var offsetY = ((x2 - x1) / dist) * radius * -1;
        var offsetX = ((y2 - y1) / dist) * radius;
        var divCount = Math.ceil(pointCount / girth);
        // Chose the range of points that are visible right now.
        var i = (1 - (pctDone * 2)) * divCount;
        i = Math.ceil(i);
        var end = Math.min(divCount, i + divCount);
        i = Math.max(0, i);
        for (; i < end; i++) {
            // Get the position on the line as a percentage of the line length.
            var pct = (i / divCount) + (pctDone * 2 - 1);
            // Convert from percentage to position.
            //linear:
            //var x = x1 + ((x2 - x1) * pct);
            //var y = y1 + ((y2 - y1) * pct);
            //quadratic bezier:
            //var x = (1 - pct) * (1 - pct) * x1 + 2 * (1 - pct) * pct * cx + pct * pct * x2;
            //var y = (1 - pct) * (1 - pct) * y1 + 2 * (1 - pct) * pct * cy + pct * pct * y2;
            //bezier:
            var invPct = 1 - pct;
            var x = x1 * (invPct * invPct * invPct) + cx * (3 * invPct * invPct * (1 - invPct)) + cx2 * (3 * invPct * (1 - invPct) * (1 - invPct)) + x2 * ((1 - invPct) * (1 - invPct) * (1 - invPct));
            var y = y1 * (invPct * invPct * invPct) + cy * (3 * invPct * invPct * (1 - invPct)) + cy2 * (3 * invPct * (1 - invPct) * (1 - invPct)) + y2 * ((1 - invPct) * (1 - invPct) * (1 - invPct));
            if (girth == 1) {
                ctx.beginPath();
                ctx.arc(x, y, radius, 0, Math.PI * 2, false);
                ctx.fill();
            }
            else {
                for (var g = girth / 2 * -1; g < girth / 2; g++) {
                    if (ensureAccurateCount == true) {
                        // Make sure the dot count is accurate
                        pointNum++;
                        if (pointNum > pointCount)
                            break;
                    }
                    if (dist == 0) {
                        // Handle loop to itself
                        offsetX = Math.sin(pct * 1 * Math.PI) * (g * radius * 2);
                        offsetY = Math.cos(pct * 1 * Math.PI) * (g * radius * 2);
                        ctx.beginPath();
                        ctx.arc(x + offsetX, y + offsetY, radius, 0, Math.PI * 2, false);
                        ctx.fill();
                    }
                    else {
                        // Treat as straight line
                        ctx.beginPath();
                        ctx.arc(x + (offsetX * 2 * g) + offsetX, y + (offsetY * 2 * g) + offsetY, radius, 0, Math.PI * 2, false);
                        ctx.fill();
                    }
                }
            }
        }
    }
}
//# sourceMappingURL=DirectedGraph.js.map