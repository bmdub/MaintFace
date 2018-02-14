using Newtonsoft.Json;
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

	[EditorBrowsable(EditorBrowsableState.Never)]
	public abstract class Stat
	{
		public readonly string Name;

		protected object _lock = new object();
		private double _cumulativeNumber;
		private bool _countable = false;

		internal Stat(string name)
		{
			Name = name;
			NumberFormat = "#,##0.##";
			NumberFormatAction = null;
			ExpectedMaxNumber = double.MaxValue;
			ExpectedMinNumber = double.MinValue;
		}

		public abstract bool CanOverride { get; }

		private double _expectedMinNumber;
		/// <summary>The threshold at which this stat is considered 'too small'.</summary>
		public double ExpectedMinNumber
		{
			get { lock (_lock) { return _expectedMinNumber; } }
			set { lock (_lock) { _expectedMinNumber = value; } }
		}

		private double _expectedMaxNumber;
		/// <summary>The threshold at which this stat is considered 'too large'.</summary>
		public double ExpectedMaxNumber
		{
			get { lock (_lock) { return _expectedMaxNumber; } }
			set { lock (_lock) { _expectedMaxNumber = value; } }
		}

		private int _samples;
		/// <summary>Gets the number of times this value has been set in the current period.</summary>
		public int Samples
		{
			get { lock (_lock) { return _samples; } }
			internal set { lock (_lock) { _samples = value; } }
		}

		private double _minNumber;
		/// <summary>Gets the minimum value set in the current period.</summary>
		public double MinNumber
		{
			get { lock (_lock) { return _minNumber; } }
			internal set { lock (_lock) { _minNumber = value; } }
		}

		private double _maxNumber;
		/// <summary>Gets the maximum value set in the current period.</summary>
		public double MaxNumber
		{
			get { lock (_lock) { return _maxNumber; } }
			internal set { lock (_lock) { _maxNumber = value; } }
		}

		private double _avgNumber;
		/// <summary>Gets the average value set in the current period.</summary>
		public double AvgNumber
		{
			get { lock (_lock) { return _avgNumber; } }
			internal set { lock (_lock) { _avgNumber = value; } }
		}

		private double _valueNumber;
		/// <summary>Gets the last numeric value.</summary>
		public double ValueNumber
		{
			get
			{
				lock (_lock)
				{
					return _valueNumber;
				}
			}
			protected set
			{
				lock (_lock)
				{
					_samples++;
					_countable = true;
					_valueNumber = value;
					_cumulativeNumber += value;
					_minNumber = Math.Min(_minNumber, value);
					_maxNumber = Math.Max(_maxNumber, value);
					_avgNumber = _cumulativeNumber / (double)_samples;
				}
			}
		}

		private string _valueString = null;
		/// <summary>Gets the last string value.</summary>
		public string ValueString
		{
			get { lock (_lock) { return _valueString; } }
			protected set
			{
				lock (_lock)
				{
					_samples++;
					_countable = false;
					_valueString = value;
				}
			}
		}

		private string _valueOverride = null;
		/// <summary>Gets the overriden value set by the UI.</summary>
		public string ValueOverride
		{
			get { lock (_lock) { return _valueOverride; } }
			internal set { lock (_lock) { _valueOverride = value; } }
		}

		internal void Reset()
		{
			lock (_lock)
			{
				_samples = 0;
				_cumulativeNumber = 0;
				_minNumber = double.MaxValue;
				_maxNumber = double.MinValue;
			}
		}

		/// <summary>Gets the last value as a formatted string.</summary>
		public string ValueFormatted
		{
			get
			{
				lock (_lock)
				{
					if (_valueString != null)
						return _valueString;
					else
						return FormatValue(ValueNumber);
				}
			}
		}

		/// <summary>Gets the number of times this value has been set in the current period.</summary>
		public string SamplesFormatted { get { return Samples.ToString("#,##0.##"); } }
		/// <summary>Gets the minimum value set in the current period.</summary>
		public string MinValueFormatted { get { return _countable ? FormatValue(MinNumber) : ""; } }
		/// <summary>Gets the maximum value set in the current period.</summary>
		public string MaxValueFormatted { get { return _countable ? FormatValue(MaxNumber) : ""; } }
		/// <summary>Gets the average value in the current period.</summary>
		public string AvgValueFormatted { get { return _countable ? FormatValue(AvgNumber) : ""; } }

		private Func<double, string> _formatAction;
		/// <summary>Specifies a custom action to format the value for display.</summary>
		[JsonIgnore]
		public Func<double, string> NumberFormatAction
		{
			get { lock (_lock) { return _formatAction; } }
			set { lock (_lock) { _formatAction = value; } }
		}

		private string _format;
		/// <summary>Format string used to transform the value for display. Used in .ToString()</summary>
		[JsonIgnore]
		public string NumberFormat
		{
			get { lock (_lock) { return _format; } }
			set { lock (_lock) { _format = value; } }
		}

		private IFormatProvider _formatProvider;
		/// <summary>Format string used to transform the value for display. Used in .ToString()</summary>
		[JsonIgnore]
		public IFormatProvider NumberFormatProvider
		{
			get { lock (_lock) { return _formatProvider; } }
			set { lock (_lock) { _formatProvider = value; } }
		}

		private string FormatValue(double value)
		{
			var formatAction = NumberFormatAction;
			var format = NumberFormat;
			var formatProvider = NumberFormatProvider;

			if (formatAction != null)
				return formatAction(value);
			else if (format != null)
			{
				if (formatProvider != null)
					return value.ToString(format, formatProvider);
				else
					return value.ToString(format);
			}
			if (formatProvider != null)
				return value.ToString(formatProvider);
			else
				return value.ToString();
		}
	}
}
