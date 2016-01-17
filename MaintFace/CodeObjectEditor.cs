using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;

namespace BW.Diagnostics
{
	internal static class CodeObjectEditor
    {
        // warning: this may not be future-proof / cross-platform
        private static bool IsBackingField(FieldInfo field)
        {
            return field.Name.Contains('<');
        }

        // this allows us to get private fields of the base classes
        private static IEnumerable<FieldInfo> GetFields(Type type, BindingFlags bindingFlags)
        {
            var fields = type.GetFields(bindingFlags);

            if (type.BaseType != null)
                return fields.Concat(GetFields(type.BaseType, bindingFlags ^ BindingFlags.Public));
            else
                return fields;
        }

        // this allows us to get private fields of the base classes
        private static IEnumerable<PropertyInfo> GetProperties(Type type, BindingFlags bindingFlags)
        {
            var properties = type.GetProperties(bindingFlags);

            if (type.BaseType != null)
                return properties.Concat(GetProperties(type.BaseType, bindingFlags ^ BindingFlags.Public));
            else
                return properties;
        }

        public static IEnumerable<ICodeObject> GetCodeObjectTree(Type objType)
        {
            ICodeObject rootCodeObject;
			
            bool convertible = typeof(IConvertible).IsAssignableFrom(objType);
            if (convertible)
                rootCodeObject = new CodeObjectRootEditable(objType);
            else
                rootCodeObject = new CodeObjectRoot(objType);;

            yield return rootCodeObject;

            var printedTypes = new Stack<Type>();
            printedTypes.Push(objType);
            foreach (var codeObjectValuePair in GetCodeObjectTree(rootCodeObject, objType, printedTypes, 1))
                yield return codeObjectValuePair;
        }

        //todo: try/catch around GetValue() areas, so we will continue if there is a problem
        private static IEnumerable<ICodeObject> GetCodeObjectTree(ICodeObject parentCodeObject, Type objType, Stack<Type> seenTypes, int depth)
        {
            // Stop crawling at System assemblies.
            // Todo: there may be more namespaces.
            if (objType.Namespace?.StartsWith("System") == true)
                yield break;
            //var attribute = objType.Assembly.GetCustomAttributes(typeof(AssemblyProductAttribute), false)[0] as AssemblyProductAttribute;
            //var isFrameworkAssembly = (attribute.Product == "Microsoft® .NET Framework");
            //if (isFrameworkAssembly)
            //    yield break;

            var bindingFlags = BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static;

            var properties = GetProperties(objType, bindingFlags);
            foreach (PropertyInfo property in properties)
            {
                if (seenTypes.Contains(property.PropertyType))
                    continue; // Recursion detected

                if (property.GetIndexParameters().Length > 0)
                    continue; // Ignore indexed properties

                ICodeObject codeObject;
                if (typeof(IConvertible).IsAssignableFrom((property.PropertyType)))
                    codeObject = new CodeObjectStringConvertible(property, parentCodeObject, depth);
                else
                    codeObject = new CodeObject(property, parentCodeObject, depth);
                yield return codeObject;
                
                seenTypes.Push(property.PropertyType);
                try
                {
                    foreach (var pair in GetCodeObjectTree(codeObject, property.PropertyType, seenTypes, depth + 1))
                        yield return pair;
                }
                finally
                {
                    seenTypes.Pop();
                }
            }

            var fields = GetFields(objType, bindingFlags);
            foreach (var field in fields)
            {
                if (IsBackingField(field))
                    continue;

                if (seenTypes.Contains(field.FieldType))
                    continue; // Recursion detected

                ICodeObject codeObject;
                if (typeof(IConvertible).IsAssignableFrom((field.FieldType)))
                    codeObject = new CodeObjectStringConvertible(field, parentCodeObject, depth);                    
                else
                    codeObject = new CodeObject(field, parentCodeObject, depth);
                yield return codeObject;

                seenTypes.Push(field.FieldType);
                try
                {
                    foreach (var pair in GetCodeObjectTree(codeObject, field.FieldType, seenTypes, depth + 1))
                        yield return pair;
                }
                finally
                {
                    seenTypes.Pop();
                }
            }
        }
    }

	internal interface ICodeMemberAccessor
    {
        string Name { get; }
        Type Type { get; }
        object GetValue(object parentObject);
        void SetValue(ref object parentObject, object value);
    }

	internal class CodePropertyAccessor : ICodeMemberAccessor
    {
        private PropertyInfo _propertyInfo;

        public CodePropertyAccessor(PropertyInfo propertyInfo)
        {
            _propertyInfo = propertyInfo;
        }

        public string Name { get { return _propertyInfo.Name; } }

        public Type Type { get { return _propertyInfo.PropertyType; } }

        public object GetValue(object parentObject)
        {
            return _propertyInfo.GetValue(parentObject);
        }

        public void SetValue(ref object parentObject, object value)
        {
            _propertyInfo.SetValue(parentObject, value);
        }
    }

    internal class CodeFieldAccessor : ICodeMemberAccessor
    {
        private FieldInfo _fieldInfo;

        public CodeFieldAccessor(FieldInfo fieldInfo)
        {
            _fieldInfo = fieldInfo;
        }

        public string Name { get { return _fieldInfo.Name; } }

        public Type Type { get { return _fieldInfo.FieldType; } }

        public object GetValue(object parentObject)
        {
            return _fieldInfo.GetValue(parentObject);
        }

        public void SetValue(ref object parentObject, object value)
        {
            _fieldInfo.SetValue(parentObject, value);
        }
    }

	internal interface ICodeObject
    {
        string Name { get; }
        int Depth { get; }
        Type Type { get; }
        object Tag { get; set; }
        object GetValueFromRootValue(object rootObject);
        void GetCodeObjectChain(List<ICodeObject> chain);
    }

	internal interface ICodeObjectEditable : ICodeObject
    {
        string GetValueFromRootValueAsString(object rootObj);
        void SetValueFromRootValueAsString<T>(ref T rootObj, string value);
    }

	internal class CodeObjectRoot : ICodeObject
    {
        public string Name { get; set; } = null;
        public int Depth { get { return 0; } }
        public Type Type { get; private set; }
        public object Tag { get; set; }

        public CodeObjectRoot(Type type)
        {
            Type = type;
        }

        public object GetValueFromRootValue(object rootObject)
        {
            return rootObject;
        }

        public void GetCodeObjectChain(List<ICodeObject> chain)
        {
            chain.Add(this);
        }
    }

	internal class CodeObjectRootEditable : ICodeObjectEditable
    {
        public string Name { get; set; } = null;
        public int Depth { get { return 0; } }
        public Type Type { get; private set; }
        public object Tag { get; set; }

        public CodeObjectRootEditable(Type type)
        {
            Type = type;
        }

        public object GetValueFromRootValue(object rootObject)
        {
            return rootObject;
        }

        public string GetValueFromRootValueAsString(object rootObj)
        {
            return Convert.ChangeType(rootObj, typeof(string)) as string;
        }

        public void SetValueFromRootValueAsString<T>(ref T rootObj, string value)
        {
            rootObj = (T)Convert.ChangeType(value, Type);
        }

        public void GetCodeObjectChain(List<ICodeObject> chain)
        {
            chain.Add(this);
        }
    }

	internal class CodeObject : ICodeObject
    {
        protected ICodeMemberAccessor _codeMemberAccessor;
        public int Depth { get; private set; }
        public ICodeObject ParentElement { get; private set; }
        public object Tag { get; set; }

        private CodeObject(ICodeObject parentElement, int depth)
        {
            Depth = depth;
            ParentElement = parentElement;
        }

        public CodeObject(PropertyInfo propertyInfo, ICodeObject parentElement, int depth)
            : this(parentElement, depth)
        {
            _codeMemberAccessor = new CodePropertyAccessor(propertyInfo);
        }

        public CodeObject(FieldInfo fieldInfo, ICodeObject parentElement, int depth)
            : this(parentElement, depth)
        {
            _codeMemberAccessor = new CodeFieldAccessor(fieldInfo);
        }

        public string Name { get { return _codeMemberAccessor.Name; } }

        public Type Type { get { return _codeMemberAccessor.Type; } }

        public void SetValueFromRootValue(ref object rootObject, object value)
        {
            if (ParentElement == null)
                return; // We could set the value of rootObject here, but that would be useless.

            List<ICodeObject> codeObjectChain = new List<ICodeObject>();
            GetCodeObjectChain(codeObjectChain);

            object parentValue = rootObject;
            List<object> valueChain = new List<object>();
            for (int i = 0; i < codeObjectChain.Count - 1; i++)
            {
                if (codeObjectChain[i] is CodeObject)
                    parentValue = (codeObjectChain[i] as CodeObject).GetValueFromParentValue(parentValue);

                valueChain.Add(parentValue);
            }

            // Set the value, along with the parent(s) values if they are value types.
            valueChain.Add(value);
            for (int i = codeObjectChain.Count - 1; i >= 0; i--)
            {
                parentValue = null;
                if (i > 0) parentValue = valueChain[i - 1];
                if (codeObjectChain[i] is CodeObject)
                    (codeObjectChain[i] as CodeObject).SetValueFromParentValue(ref parentValue, valueChain[i]);
                if (i == 0) break;
                if (!codeObjectChain[i - 1].Type.IsValueType)
                    break;
            }
        }

        public void GetCodeObjectChain(List<ICodeObject> chain)
        {
            if (ParentElement != null)
                ParentElement.GetCodeObjectChain(chain);
            chain.Add(this);
        }

        public object GetValueFromRootValue(object rootObject)
        {
            if (ParentElement == null)
                return rootObject;

            object parentObject = ParentElement.GetValueFromRootValue(rootObject);

            return GetValueFromParentValue(parentObject);
        }

        public object GetValueFromParentValue(object parentObject)
        {
			if (parentObject == null)
				return null;
            return _codeMemberAccessor.GetValue(parentObject);
        }

        public void SetValueFromParentValue(ref object parentObject, object value)
        {
            _codeMemberAccessor.SetValue(ref parentObject, value);
        }
    }

	internal class CodeObjectStringConvertible : CodeObject, ICodeObjectEditable
    {
        public CodeObjectStringConvertible(PropertyInfo propertyInfo, ICodeObject parentElement, int depth)
            : base(propertyInfo, parentElement, depth)
        { }

        public CodeObjectStringConvertible(FieldInfo fieldInfo, ICodeObject parentElement, int depth)
            : base(fieldInfo, parentElement, depth)
        { }

        public string GetValueFromRootValueAsString(object rootObj)
        {
            return Convert.ChangeType(GetValueFromRootValue(rootObj), typeof(string)) as string;
        }

        public void SetValueFromRootValueAsString<T>(ref T rootObj, string value)
        {
            object wrapper = rootObj;
            SetValueFromRootValue(ref wrapper, Convert.ChangeType(value, Type));
            rootObj = (T)wrapper;
        }

        public string GetValueFromParentValueAsString(object parentObject)
        {
            return Convert.ChangeType(_codeMemberAccessor.GetValue(parentObject), typeof(string)) as string;
        }
    }
}
