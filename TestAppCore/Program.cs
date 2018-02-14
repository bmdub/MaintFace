using System;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Net;
using System.Threading;
using BW.Diagnostics;

namespace TestApp
{
    class Program
    {
        static void Main(string[] args)
        {
            //MaintFace.Start("My App", "http://localhost:12121/MyApp/");

            MaintFace.Start("My App", "http://localhost:12121/MyApp/", MaintFaceOptions.EnableButtons | MaintFaceOptions.EnableCommands | MaintFaceOptions.EnableCodeInjection | MaintFaceOptions.EnableVariableOverride, AuthenticationSchemes.Basic);
            MaintFace.AuthenticateUser += MaintFace_AuthenticateUser;

            // Wait 3 Seconds for a browser connection. If none, then open a browser window to this instance.
            MaintFace.OpenBrowserAfter(TimeSpan.FromSeconds(3));



            MaintFace.Stats["My Stat"].Update("good");

            int myValue = 7;
            MaintFace.Stats["My Value"].UpdateByRef(ref myValue);
            MaintFace.Stats["My Value"].ExpectedMaxNumber = 10;
            MaintFace.Stats["My Value"].ExpectedMinNumber = 5;
            MaintFace.Stats["My Value"].NumberFormat = "#,##0.##";
            MaintFace.Stats["My Value"].NumberFormatAction = (double value) => { return value + "s"; };

            MaintFace.Buttons["My Button"].Pressed += My_Button_Pressed;

            Trace.WriteLine("Trace message test.");
            Debug.Write("Debug message test.");
            MaintFace.WriteConsoleMessage("A console message");
            MaintFace.CommandReceived += MaintFace_CommandReceived;

            int someValue = 5;
            Random rand = new Random();

            for (; ; )
            {
                var proc = Process.GetCurrentProcess();
                var mem = proc.WorkingSet64;
                var cpu = proc.TotalProcessorTime;
                MaintFace.Stats["mem"].Update(mem);
                MaintFace.Stats["cpu"].Update(cpu.Ticks);



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
        }

        private static void MaintFace_CommandReceived(object sender, CommandReceivedEventArgs e)
        {
            Console.WriteLine("Command: " + e.Command);

            // To Do: Process the command.

            e.Response = "ok";
        }

        private static void My_Button_Pressed(object sender, ButtonPressedEventArgs e)
        {
            Console.WriteLine("Button pressed: " + e.ButtonName);

            // To Do: Handle the button press.
        }

        private static void MaintFace_AuthenticateUser(object sender, AuthEventArgs e)
        {
            if (e.User.Identity is HttpListenerBasicIdentity)
            {
                // We are using Basic Authentication.
                // To Do: Check username/password here.

                e.Authenticated = true;
            }
        }
    }
}
