Imports System
Imports System.Threading.Tasks
Imports System.Diagnostics
Imports System.Net
Imports System.Threading
Imports BW.Diagnostics

Namespace TestApp

    Class Program

        Private Shared Sub Main(ByVal args As String())

            MaintFace.Start("My App", "http://*:12121/MyApp/", MaintFaceOptions.EnableButtons Or MaintFaceOptions.EnableCommands Or MaintFaceOptions.EnableCodeInjection Or MaintFaceOptions.EnableVariableOverride, AuthenticationSchemes.Basic)
            AddHandler MaintFace.AuthenticateUser, AddressOf MaintFace_AuthenticateUser

            ' Wait 3 Seconds for a browser connection. If none, then open a browser window to this instance.
            MaintFace.OpenBrowserAfter(TimeSpan.FromSeconds(3))

            MaintFace.Stats("My Stat").Update("good")

            Dim myValue As Integer = 7
            MaintFace.Stats("My Value").UpdateByRef(myValue)
            MaintFace.Stats("My Value").ExpectedMaxNumber = 10
            MaintFace.Stats("My Value").ExpectedMinNumber = 5
            MaintFace.Stats("My Value").NumberFormat = "#,##0.##"
            MaintFace.Stats("My Value").NumberFormatAction = Function(ByVal value As Double) value & "s"

            AddHandler MaintFace.Buttons("My Button").Pressed, AddressOf My_Button_Pressed

            Trace.WriteLine("Trace message test.")
            Debug.Write("Debug message test.")
            MaintFace.WriteConsoleMessage("A console message")
            AddHandler MaintFace.CommandReceived, AddressOf MaintFace_CommandReceived

            Dim someValue As Integer = 5
            Dim rand As Random = New Random()

            While True
                MaintFace.TracePointByRef("Start", someValue)

                If rand.[Next](0, 2) = 1 Then MaintFace.TracePointByRef("Config", someValue)

                MaintFace.TracePointByRef("Init", someValue, expectedMaxDuration:=TimeSpan.FromMilliseconds(50))

                Task.Run(Function()
                             For i As Integer = 0 To 2 - 1
                                 MaintFace.TracePointByRef("Task B", someValue)
                             Next
                         End Function)

                Thread.Sleep(rand.[Next](0, 75))

                MaintFace.TracePointByRef("Task C", someValue, expectedMaxDuration:=TimeSpan.FromMilliseconds(1))

                If rand.[Next](0, 2) = 1 Then Continue While

                MaintFace.TracePoint("Finished", someValue, isEndPoint:=True)
            End While
        End Sub

        Private Shared Sub MaintFace_CommandReceived(ByVal sender As Object, ByVal e As CommandReceivedEventArgs)
            Console.WriteLine("Command: " & e.Command)
            e.Response = "ok"
        End Sub

        Private Shared Sub My_Button_Pressed(ByVal sender As Object, ByVal e As ButtonPressedEventArgs)
            Console.WriteLine("Button pressed: " & e.ButtonName)
        End Sub

        Private Shared Sub MaintFace_AuthenticateUser(ByVal sender As Object, ByVal e As AuthEventArgs)
            If TypeOf e.User.Identity Is HttpListenerBasicIdentity Then
                e.Authenticated = True
            End If
        End Sub
    End Class
End Namespace