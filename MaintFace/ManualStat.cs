using System;
using System.ComponentModel;
using System.Diagnostics;

namespace BW.Diagnostics
{
    [EditorBrowsable(EditorBrowsableState.Never)]
	public class ManualStat : Stat
	{
		internal ManualStat(string name) : base(name) { }

		public override bool CanOverride { get { return true; } }

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(byte value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref byte value)
		{
			try
			{
				if (ValueOverride != null) value = (byte)Convert.ChangeType(ValueOverride, typeof(byte));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(sbyte value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref sbyte value)
		{
			try
			{
				if (ValueOverride != null) value = (sbyte)Convert.ChangeType(ValueOverride, typeof(sbyte));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(Int16 value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref Int16 value)
		{
			try
			{
				if (ValueOverride != null) value = (Int16)Convert.ChangeType(ValueOverride, typeof(Int16));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(UInt16 value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref UInt16 value)
		{
			try
			{
				if (ValueOverride != null) value = (UInt16)Convert.ChangeType(ValueOverride, typeof(UInt16));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(Int32 value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref Int32 value)
		{
			try
			{
				if (ValueOverride != null) value = (Int32)Convert.ChangeType(ValueOverride, typeof(Int32));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(UInt32 value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref UInt32 value)
		{
			try
			{
				if (ValueOverride != null) value = (UInt32)Convert.ChangeType(ValueOverride, typeof(UInt32));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(Int64 value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref Int64 value)
		{
			try
			{
				if (ValueOverride != null) value = (Int64)Convert.ChangeType(ValueOverride, typeof(Int64));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(UInt64 value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref UInt64 value)
		{
			try
			{
				if (ValueOverride != null) value = (UInt64)Convert.ChangeType(ValueOverride, typeof(UInt64));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(float value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref float value)
		{
			try
			{
				if (ValueOverride != null) value = (float)Convert.ChangeType(ValueOverride, typeof(float));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(double value) { ValueNumber = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref double value)
		{
			try
			{
				if (ValueOverride != null) value = (double)Convert.ChangeType(ValueOverride, typeof(double));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(decimal value) { ValueNumber = (double)value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref decimal value)
		{
			try
			{
				if (ValueOverride != null) value = (decimal)Convert.ChangeType(ValueOverride, typeof(decimal));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}

		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(string value) { ValueString = value; }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef(ref string value)
		{
			try
			{
				if (ValueOverride != null) value = (string)Convert.ChangeType(ValueOverride, typeof(string));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
		}
		
		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update(IConvertible value) { ValueString = value.ToString(); }
		/// <summary>Sets a value to be displayed in the UI, or overrides the value with a value from the UI.</summary>
		public void UpdateByRef<T>(ref T value) where T : IConvertible
		{
			try
			{
				if (ValueOverride != null) value = (T)Convert.ChangeType(ValueOverride, typeof(T));
			}
			catch (Exception ex)
			{
				Trace.WriteLine(nameof(MaintFace) + " Error: " + nameof(Update) + ": " + ex.Message);
				ValueOverride = null;
			}
			Update(value);
        }
    }
}
