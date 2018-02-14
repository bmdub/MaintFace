## MaintFace
MaintFace is a simple-to-use and lightweight web-based maintenance interface for .NET applications. You can use MaintFace to view information about and interact with your application. 

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






```CSharp
```


![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/graphing1.png)
![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/tracepoints1.png)
![alt text](https://raw.githubusercontent.com/bmdub/MaintFace/master/image/tracepoints2.png)
