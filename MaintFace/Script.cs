using Microsoft.CodeAnalysis;
using Microsoft.CodeAnalysis.CSharp;
using System;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;

namespace BW.Diagnostics
{
    internal class HookScript
    {
        Type _classType;

        public HookScript(string sourceCode, string className)
        {
            if (!RuntimeInformation.FrameworkDescription.ToUpper().Contains(".NET FRAMEWORK"))
                throw new Exception("Scripting is currently available only for .NET Framework applications.");

            var tree = SyntaxFactory.ParseSyntaxTree(sourceCode);
            var compilation = CSharpCompilation.Create(
                "temp.dll",
                options: new CSharpCompilationOptions(OutputKind.DynamicallyLinkedLibrary),
                syntaxTrees: new[] { tree },
                references: AppDomain.CurrentDomain.GetAssemblies()
                .Where(assembly => !assembly.IsDynamic)
                .Select(assembly => assembly.Location)
                .Where(location => !string.IsNullOrEmpty(location))
                .Select(loc => MetadataReference.CreateFromFile(loc))
                .ToArray()
                );

            var errors = compilation.GetDiagnostics().Where(diagnostic => diagnostic.Severity == DiagnosticSeverity.Error).ToList();
            if (errors.Count > 0)
            {
                string compilerErrors = "Compilation Failure: \r\n";
                foreach (var diagnostic in errors)
                {
                    compilerErrors += $"{diagnostic.ToString()}\r\n";
                }
                throw new Exception(compilerErrors);
            }

            Assembly compiledAssembly;
            using (var stream = new MemoryStream())
            {
                var compileResult = compilation.Emit(stream);
                compiledAssembly = Assembly.Load(stream.GetBuffer());
            }

            _classType = compiledAssembly.GetType(className);
        }

        public void CallStaticMethod(string methodName, object[] parms)
        {
            _classType.InvokeMember(methodName,
                BindingFlags.InvokeMethod | BindingFlags.Public | BindingFlags.Static,
                null,
                null,
                parms);
        }
    }

}
