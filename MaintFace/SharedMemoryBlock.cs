using System;
using System.IO;
using System.IO.MemoryMappedFiles;
using System.Linq;
using System.Runtime.Serialization.Formatters.Binary;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal class SharedMemoryBlock : IDisposable
	{
		public string Name { get; private set; }

		private Mutex _mutex;
		private MemoryMappedFile _file;
		private MemoryMappedViewAccessor _viewAccessor;
		private bool _disposed = false;

		//[StructLayout(LayoutKind.Sequential, Pack = 1)]

		public SharedMemoryBlock(string name, int maxSize, bool globalScope)
		{
			Name = name;

			string scope = globalScope ? "Global" : "Local";

			_mutex = new Mutex(false, scope + "\\" + Name + "_MUTEX");
			_file = MemoryMappedFile.CreateOrOpen(scope + "\\" + Name + "_MMF", maxSize, MemoryMappedFileAccess.ReadWrite);
			_viewAccessor = _file.CreateViewAccessor(0, maxSize, MemoryMappedFileAccess.ReadWrite);
		}

		public DisposableMutexReleaser AcquireExclusiveAccess()
		{
			try
			{
				_mutex.WaitOne();
			}
			catch (AbandonedMutexException)
			{
			}

			return new DisposableMutexReleaser(_mutex);
		}

		public class DisposableMutexReleaser : IDisposable
		{
			private readonly Mutex _mutex;

			public DisposableMutexReleaser(Mutex mutex)
			{
				_mutex = mutex;
			}

			public void Dispose()
			{
				_mutex.ReleaseMutex();
			}
		}

		public T Read<T>()
			where T : struct
		{
			T value;
			_viewAccessor.Read<T>(0, out value);
			return value;
		}

		public void Write<T>(T value)
			where T : struct
		{
			_viewAccessor.Write<T>(0, ref value);
		}

		public byte[] ReadBytes()
		{
			var length = _viewAccessor.ReadInt32(0);
			byte[] value = new byte[length];
			_viewAccessor.ReadArray<byte>(sizeof(Int32), value, 0, length);
			return value;
		}

		public void WriteBytes(byte[] value)
		{
			_viewAccessor.Write(0, value.Length);
			_viewAccessor.WriteArray<byte>(sizeof(Int32), value, 0, value.Length);
		}
		
		public T ReadSerializable<T>()
		{
			T deserializedObject;

			using (MemoryStream memoryStream = new MemoryStream(ReadBytes()))
			{
				BinaryFormatter deserializer = new BinaryFormatter();
				deserializedObject = (T)deserializer.Deserialize(memoryStream);
			}

			return deserializedObject;
		}
		
		public void WriteSerializable(object objectToSerialize)
		{
			byte[] serializedObject;

			using (MemoryStream stream = new MemoryStream())
			{
				BinaryFormatter formatter = new BinaryFormatter();
				formatter.Serialize(stream, objectToSerialize);
				serializedObject = stream.ToArray();
			}

			WriteBytes(serializedObject);
		}

		public void Dispose()
		{
			Dispose(true);
			GC.SuppressFinalize(this);
		}

		protected virtual void Dispose(bool disposing)
		{
			if (!_disposed)
			{
				if (disposing)
				{
					_viewAccessor.Dispose();
					_file.Dispose();
					_mutex.Close();
				}

				_disposed = true;
			}
		}
	}
}
