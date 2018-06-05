using System;
using System.ComponentModel;
using System.Diagnostics;

namespace BW.Diagnostics
{
    [EditorBrowsable(EditorBrowsableState.Never)]
	public class ManualStat : Stat
	{
		internal ManualStat(string name) : base(name) { }

        public override bool CanOverride => true;
		
		/// <summary>Sets a value to be displayed in the UI.</summary>
		public void Update<T>(T value)
        {
            ValueString = value?.ToString();
        }

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
