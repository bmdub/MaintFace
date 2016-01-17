using Microsoft.CSharp;
using System;
using System.CodeDom.Compiler;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
    internal class Script
    {
        private static CSharpCodeProvider _CSCodeProvider;
        private Assembly _assembly;
        private Type _classType;

        static Script()
        {
            _CSCodeProvider = new CSharpCodeProvider(new Dictionary<string, string> { { "CompilerVersion", GetCurrentDotNETVersion() } });
        }

        private static string GetCurrentDotNETVersion()
        {
            return "v" + System.Environment.Version.Major.ToString() + "." + System.Environment.Version.Minor.ToString();
        }

        public Script(string sourceCode, string className)
        {
            List<Type> types = new List<Type>();

            CompilerResults compileResults = null;
            CompilerParameters compilerParameters = new CompilerParameters();

            compilerParameters.GenerateInMemory = true;
            compilerParameters.GenerateExecutable = false;
            compilerParameters.TreatWarningsAsErrors = true;
            compilerParameters.CompilerOptions = "/optimize";

            //Get the assemblies used by the current process.
            List<string> assemblyPaths = new List<string>();

            //compilerParameters.ReferencedAssemblies.Add(System.Reflection.Assembly.GetExecutingAssembly().Location);
            var assemblies = AppDomain.CurrentDomain.GetAssemblies();
            foreach (var assembly in assemblies)
            {
                compilerParameters.ReferencedAssemblies.Add(assembly.Location);
            }

            //compile
            compileResults = _CSCodeProvider.CompileAssemblyFromSource(compilerParameters, sourceCode);

            //check for compile errors
            if (compileResults.Errors.HasErrors)
            {
                string compilerErrors = "Compilation Failure: \r\n";
                foreach (CompilerError err in compileResults.Errors)
                {
                    compilerErrors += err.ErrorText + "(Line:" + err.Line.ToString() + ", Column:" + err.Column.ToString() + ")\r\n";
                }

                throw new Exception(compilerErrors);
            }

            _assembly = compileResults.CompiledAssembly;
            _classType = _assembly.GetType(className);
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
