using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace BW.Diagnostics
{
    public static partial class MaintFace
    {
        struct Command
        {
            public string Name { get; private set; }
            public Delegate Delegate { get; private set; }

            public Command(string name, Delegate del)
            {
                Name = name;
                Delegate = del;
            }
        }

        // todo: way to get command list
        static ConcurrentDictionary<string, Command> _commandHandlers = new ConcurrentDictionary<string, Command>();

        public static void CommandReceivedByName(string commandName, Func<string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);
        public static void CommandReceivedByName(string commandName, Func<string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string, string> action) => HandleDelegate(commandName, action);

        public static string GetCommandList()
        {
            StringBuilder stringBuilder = new StringBuilder();

            foreach (var command in _commandHandlers.ToArray().Select(kvp => kvp.Value))
            {
                stringBuilder.Append(command.Name);
                foreach (var arg in command.Delegate.Method.GetParameters())
                    stringBuilder.Append($" {arg.Name}");
                stringBuilder.AppendLine();
            }

            return stringBuilder.ToString();
        }

        internal static bool HaveCommandHandlersByName => _commandHandlers.Count > 0;

        static string FormatCommandName(string commandName) => commandName.Trim().ToUpperInvariant();

        static void HandleDelegate(string commandName, Delegate del)
        {
            if (commandName.Contains(' ')) throw new ArgumentException("Name cannot have spaces.");

            _commandHandlers[FormatCommandName(commandName)] = new Command(commandName, del);
        }

        internal static string HandleCommandByName(string line)
        {
            var tokens = ParseCommandLine(line).ToList();
            if (tokens.Count == 0)
                throw new ArgumentException("No commands entered.");

            var commandName = tokens[0];
            var args = tokens.GetRange(1, tokens.Count - 1).Select(arg => (object)arg).ToArray();

            if (_commandHandlers.TryGetValue(FormatCommandName(commandName), out Command command))
                return command.Delegate.DynamicInvoke(args) as string;
            else
                throw new ArgumentException("Command not found: " + commandName);
        }

        static IEnumerable<string> ParseCommandLine(string line)
        {
            bool inQuotes = false;
            int start = 0;
            int i = 0;
            for (; i < line.Length; i++)
            {
                if (!inQuotes && char.IsWhiteSpace(line[i]))
                {
                    if (i > start)
                        yield return line.Substring(start, i - start);

                    start = i + 1;
                }
                else if (line[i] == '\"' || line[i] == '\'')
                {
                    inQuotes = !inQuotes;

                    if (i > start)
                        yield return line.Substring(start, i - start);

                    start = i + 1;
                }
            }
            if (start < i)
                yield return line.Substring(start, i - start);
        }
    }
}
