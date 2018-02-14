## MaintFace


### Features:
* Web UI - Accessible from a browser, with no need for IIS.
* View/graph performance counters.
* View/graph/override variables.
* View execution flow using user-defined trace points.
* Inject code at specified trace points.
* View Debug/Trace/other messages.
* Add buttons that fire events from within the application.
* Send string commands to the application.

![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/introduction1.png)

### Starting MaintFace

```CSharp
using BW.Diagnostics;
``` 
Just call the static Start() method with your app name and desired URL endpoint:  
```CSharp
MaintFace.Start("My App", "http://localhost:12121/MyApp/");
``` 
(Note: To use an endpoint other than "localhost", you must either: Run your program with administrative privileges, or reserve the URL using netsh.) 
<br/><br/>

You may also want to have a browser window open automatically, if no connections are detected after a short period of time: 
```CSharp
MaintFace.OpenBrowserAfter(TimeSpan.FromSeconds(3));
``` 
<br/>

It's recommended that you only enable features that you need. You can override the default MaintFaceOptions to accomplish this. For example:  
```CSharp
#if DEBUG
MaintFace.Start("My App", "http://localhost:12121/MyApp/", MaintFaceOptions.EnableButtons | MaintFaceOptions.EnableCommands);
#endif
``` 
This ensures that MaintFace only runs in Debug builds, and excludes features such as variable overriding and code injection. 
<br/><br/>

To start MaintFace with authentication enabled, specify an authentication scheme: 
```CSharp
MaintFace.Start("My App", "http://localhost:12121/MyApp/", MaintFaceOptions.All, System.Net.AuthenticationSchemes.Basic);
MaintFace.AuthenticateUser += MaintFace_AuthenticateUser; 
```
Handling the AuthenticateUser event is mandatory for Basic Authentication. Here is what a AuthenticateUser event handler might look like: 
```CSharp
private static void MaintFace_AuthenticateUser(object sender, AuthEventArgs e)
{
	if (e.User.Identity is HttpListenerBasicIdentity)
	{
		// We are using Basic Authentication.
		// To Do: Check username/password here.
 
		e.Authenticated = true;
	}
} 
```
<br/>
**Disclaimer: MaintFace allows modification of your application as well as insight into possibly sensitive information. If there is any chance of MaintFace being exposed outside of a local dev machine, it's crucial that you enable SSL together with Authentication. Use MaintFace at your own risk.**

### Custom Stats

In addition to performance counters, custom values can be displayed on the side bar. Unlike perf counters, these values must be updated manually. To add or update values to the side bar: 
```CSharp
MaintFace.Stats["My Value"].Update(myValue); 
```

To allow the value to be overridden from the maintenance interface: 
```CSharp
MaintFace.Stats["My Value"].UpdateByRef(ref myValue);
```
 
Values can be overridden by clicking on the corresponding side-bar entry in the UI.

### Buttons

Custom buttons can be added to MaintFace to allow interaction with the application. To add a button: 
```CSharp
MaintFace.Buttons["My Button"].Pressed += My_Button_Pressed; 
```

For example, a button press event handler:
```CSharp
private static void My_Button_Pressed(object sender, ButtonPressedEventArgs e)
{
	// To Do: Handle the button press.
	Console.WriteLine("Button pressed: " + e.ButtonName);
} 
```
Note: because button events fire on their own threads, synchronization may be necessary.

## Trace Points

Trace points allow the programmer to define significant points in a program's flow, which MaintFace can then use to depict execution flow in real-time. To set a trace point: 
```CSharp
MaintFace.TracePoint("Start");
```
<br/>

Other parameters can be used to control how a trace point is depicted in the graph. For example, to ensure a trace point has only one parent trace point (using duplication): 
```CSharp
MaintFace.TracePoint("Init", isSharedNode: false);
``` 
<br/>

To ensure that a trace point node does not show outward flow: 
```CSharp
MaintFace.TracePoint("Finished", isEndPoint: true); 
```
<br/>

To add temperature(color) to inter-point traffic, enter a duration range as so: 
```CSharp
MaintFace.TracePoint("Init", expectedMaxDuration: TimeSpan.FromMilliseconds(50)); 
```
<br/>

A trace point region can be used to depict execution flow going into and out of a code block. Shown in the graph are two trace points: One for entrance, and one for exit from scope. Trace point regions are be useful for situations when an operation has multiple exit points. 
```CSharp
using (MaintFace.TracePointRegion("First Op"))
{
	// Do work here
}
``` 
<br/>

To allow MaintFace to show sampled variables at a given trace point, you must pass the variables into trace point: 
```CSharp
MaintFace.TracePoint("Task A", job); 
```
Up to 4 items may be passed in to any given trace point. A tuple can be created to wrap more items if necessary.
<br/><br/>

To allow variables to be overridden via the UI, you must use: 
```CSharp
MaintFace.TracePointByRef("Task A", ref job);
```
<br/>
 
By clicking on a node, you are given the option to view/override variables: 
![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/tracepoints1.png)

By clicking on a node, you are also given the option to inject code into any given trace point, allowing for deeper	debugging and logging from within a certain point in the application: 
![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/tracepoints2.png)

### Trace Points - Sample Code

```CSharp
int someValue = 5;
Random rand = new Random();
for (;;)
{
	MaintFace.TracePointByRef("Start", ref someValue);
 
	if (rand.Next(0, 2) == 1)
		MaintFace.TracePointByRef("Config", ref someValue);
 
	MaintFace.TracePointByRef("Init", ref someValue, expectedMaxDuration: TimeSpan.FromMilliseconds(50));
			
	Task.Run(() =>
	{
		for (int i = 0; i < 2; i++)
			MaintFace.TracePointByRef("Task B", ref someValue);
	});
 
	Thread.Sleep(rand.Next(0, 75));
	MaintFace.TracePointByRef("Task C", ref someValue, expectedMaxDuration: TimeSpan.FromMilliseconds(1));
 
	if (rand.Next(0, 2) == 1)
		continue;
 
	MaintFace.TracePoint("Finished", someValue, isEndPoint: true);
}
```

### Graphing

Perf counters, custom stats, and trace point flow can be graphed on the UI. Click on a stat or trace point to see graphing options. Note: only numeric stats are graphable. 
![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/graphing1.png)

### Console

From the console tab, Trace, Debug, and other messages will be shown. 
```CSharp
Trace.WriteLine("Trace message test.");
Debug.Write("Debug message test.");
MaintFace.WriteConsoleMessage("A console message");
``` 

In addition, the command prompt allows you to send commands to your application. You can handle these commands as so: 
```CSharp
MaintFace.CommandReceived += MaintFace_CommandReceived; 
```
Note: As with button events, these command events will fire on their own threads, which may necessitate synchronization.








