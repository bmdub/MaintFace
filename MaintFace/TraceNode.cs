using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class TraceNode
	{
		public readonly string Name;
		public readonly bool IsRoot;
		public readonly bool IsLeaf;
		public readonly TimeSpan ExpectedDuration;
		private readonly List<string> _paramTypes;
		private readonly List<ICodeObject>[] _varListsByRootType;
		private readonly bool _varsOverridable;
		private object _lock = new object();
		internal readonly ConcurrentQueue<AwaitableObject<VariableDump>> VarDumpRequests =
			new ConcurrentQueue<AwaitableObject<VariableDump>>();

		public TraceNode(string name, Type[] varTypes, bool varsOverridable, bool isRoot, bool isLeaf, TimeSpan expectedDuration)
		{
			Name = name;
			_varsOverridable = varsOverridable;
			IsRoot = isRoot;
			IsLeaf = isLeaf;
			ExpectedDuration = expectedDuration;

			_paramTypes = new List<string>();
			foreach (var type in varTypes)
			{
				if (!type.IsVisible)
					_paramTypes.Add(null);
				else
					_paramTypes.Add(type.FullName.Replace('+', '.'));
			}

			_varListsByRootType = new List<ICodeObject>[varTypes.Length];
			for (int i = 0; i < varTypes.Length; i++)
			{
				_varListsByRootType[i] =
					CodeObjectEditor.GetCodeObjectTree(varTypes[i]).ToList();
				if (_varListsByRootType[i][0] is CodeObjectRoot)
					(_varListsByRootType[i][0] as CodeObjectRoot).Name = $"Var{i + 1}";
				else if (_varListsByRootType[i][0] is CodeObjectRootEditable)
					(_varListsByRootType[i][0] as CodeObjectRootEditable).Name = $"Var{i + 1}";
			}
		}

		//private int _enableDumpVariables;
		//public int EnableDumpVariables
		//{
		//    get { return Interlocked.CompareExchange(ref _enableDumpVariables, 0, 0); }
		//    set { Interlocked.Exchange(ref _enableDumpVariables, value); }
		//}

		public void DumpVariables(object[] rootObjects)
		{
			if (VarDumpRequests.Count < 1)
				return;

			VariableDump newVariableDump = new VariableDump(Name);

			for (int i = 0; i < _varListsByRootType.Length; i++)
			{
				for (int v = 0; v < _varListsByRootType[i].Count; v++)
				{
					var codeObject = _varListsByRootType[i][v];
					string value = "";
					if (codeObject is ICodeObjectEditable)
						value = (codeObject as ICodeObjectEditable).GetValueFromRootValueAsString(rootObjects[i]);
					newVariableDump.DumpedVariables.Add(
						new DumpedVariable()
						{
							RootIndex = i,
							VarIndex = v,
							Name = codeObject.Name,
							Value = value,
							Depth = codeObject.Depth,
							Overridden = codeObject.Tag != null,
							Overridable = (codeObject is ICodeObjectEditable) && _varsOverridable
						});
				}
			}

			while (VarDumpRequests.Count > 0)
			{
				AwaitableObject<VariableDump> dumpRequest;
				if (VarDumpRequests.TryDequeue(out dumpRequest))
					dumpRequest.Value = newVariableDump;
			}
		}

		private int _overrideCount = 0;
		public int OverrideCount
		{
			get { return Interlocked.CompareExchange(ref _overrideCount, 0, 0); }
		}

		public void SetOverride(int rootIndex, int varIndex, string value)
		{
			if (!_varsOverridable)
				throw new Exception("Variables cannot be overridden");

			lock (_lock)
			{
				var codeObject = _varListsByRootType[rootIndex][varIndex];
				if (!(codeObject is ICodeObjectEditable))
					throw new Exception("Value is not editable.");

				if (codeObject.Tag == null && value != null)
					Interlocked.Increment(ref _overrideCount);
				else if (codeObject.Tag != null && value == null)
					Interlocked.Decrement(ref _overrideCount);
				codeObject.Tag = value;
			}
		}

		internal void ApplyOverrides(object[] rootObjects)
		{
			if (!_varsOverridable)
				return;
			if (OverrideCount <= 0)
				return;

			lock (_lock)
			{
				for (var i = 0; i < _varListsByRootType.Length; i++)
				{
					for (int v = 0; v < _varListsByRootType[i].Count; v++)
					{
						ICodeObjectEditable codeObject =
							_varListsByRootType[i][v] as ICodeObjectEditable;
						if (codeObject == null)
							continue;
						if (codeObject.Tag == null)
							continue;

						try
						{
							var obj = rootObjects[i];
							codeObject.SetValueFromRootValueAsString(ref obj, codeObject.Tag as string);
							rootObjects[i] = obj;
						}
						catch (Exception ex)
						{
							Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(ApplyOverrides) + ": " + ex.Message);
							codeObject.Tag = null;
							Interlocked.Decrement(ref _overrideCount);
						}
					}
				}
			}
		}

		private string _scriptSource;
		internal string ScriptSource
		{
			get
			{
				lock (_lock)
				{
					if (_scriptSource == null)
					{
						string funcSig = "";
						string refKeyword = _varsOverridable ? "ref " : "";
						for (var i = 0; i < _paramTypes.Count; i++)
						{
							if (funcSig.Length > 0) funcSig += ",\n\t\t\t";
							if (_paramTypes[i] == null)
								funcSig += refKeyword + "dynamic var" + (i + 1).ToString() + " /* " + _paramTypes[i] + " is not visible to outside assemblies. Do not use. */";
							else
								funcSig += refKeyword + _paramTypes[i] + " var" + (i + 1).ToString();
						}
						_scriptSource =
							"using System;\n" +
							"using System.Collections.Generic;\n" +
							"using System.Linq;\n" +
							"using System.Text;\n" +
							"using System.Threading.Tasks;\n" +
							"using " + typeof(MaintFace).Namespace + ";\n" +
							"\n" +
							"public static class TracePointHook\n" +
							"{\n" +
							"\tpublic static void Execute(" + funcSig + ")\n" +
							"\t{\n" +
							"\t\t\n" +
							"\t}\n" +
							"}\n";
					}

					return _scriptSource;
				}
			}
			set { lock (_lock) { _scriptSource = value; } }
		}

		private Script _script;
		private Script UserScript
		{
			get { lock (_lock) { return _script; } }
			set { lock (_lock) { _script = value; } }
		}

		internal bool HasUserScript { get { return UserScript != null; } }

		internal void SetScript(string source)
		{
			UserScript = null;
			ScriptSource = null;
			if (source == null)
				return;
			ScriptSource = source;
			Script script = new Script(source, "TracePointHook");
			UserScript = script;
		}

		internal void RunScript(object[] parms)
		{
			var script = UserScript;
			if (script != null)
			{
				try
				{
					UserScript.CallStaticMethod("Execute", parms);
				}
				catch (Exception ex)
				{
					Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(RunScript) + ": " + ex.Message);
					//UserScript = null;
				}
			}
		}
	}
}
