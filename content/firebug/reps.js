/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Initial Developer of the Original Code is Parakey Inc.
 *
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *     Joe Hewitt <joe@joehewitt.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var FirebugReps = FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const jsdIStackFrame = CI("jsdIStackFrame");
const jsdIScript = CI("jsdIScript");

const fbs = CCSV("@joehewitt.com/firebug;1", "nsIFireBug");

// ************************************************************************************************
// Common Tags

var OBJECTBOX = this.OBJECTBOX =
    SPAN({class: "objectBox objectBox-$className"});

var OBJECTBLOCK = this.OBJECTBLOCK =
    DIV({class: "objectBox objectBox-$className"});

var OBJECTLINK = this.OBJECTLINK =
    A({
        class: "objectLink objectLink-$className",
        _repObject: "$object"
    });

// ************************************************************************************************

this.Undefined = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("undefined"),
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "undefined",
 
    supportsObject: function(object, type)
    {
        return type == "undefined";
    }
});

// ************************************************************************************************

this.Null = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("null"),
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "null",

    supportsObject: function(object, type)
    {
        return object == null;
    }
});

// ************************************************************************************************

this.Nada = domplate(Firebug.Rep,
{
    tag: SPAN(""),
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "nada"
});

// ************************************************************************************************

this.Number = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("$object"),
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "number",

    supportsObject: function(object, type)
    {
        return type == "boolean" || type == "number";
    }
});

// ************************************************************************************************

this.String = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("&quot;$object|escapeHTML&quot;"),

    shortTag: OBJECTBOX("&quot;$object|cropString|escapeHTML&quot;"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "string",

    supportsObject: function(object, type)
    {
        return type == "string";
    }
});

// ************************************************************************************************

this.Text = domplate(Firebug.Rep,
{
    tag: OBJECTBOX("$object|escapeHTML"),

    shortTag: OBJECTBOX("$object|cropString|escapeHTML"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "text"
});

// ************************************************************************************************

this.Caption = domplate(Firebug.Rep,
{
    tag: SPAN({class: "caption"}, "$object|escapeHTML")
});

// ************************************************************************************************

this.Warning = domplate(Firebug.Rep,
{
    tag: DIV({class: "warning"}, "$object|STR")
});

// ************************************************************************************************

this.Func = domplate(Firebug.Rep,
{    
    tag: 
        OBJECTLINK("$object|summarizeFunction"),
        
    summarizeFunction: function(fn)
    {
        var fnRegex = /function ([^(]+\([^)]*\)) \{/;
        var fnText = safeToString(fn);

        var m = fnRegex.exec(fnText);
        return m ? m[1] : "function()";
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    copySource: function(fn)
    {
        copyToClipboard(safeToString(fn));
    },
    
    monitor: function(fn, script, monitored)
    {
        if (monitored)
            Firebug.Debugger.untraceFunction(fn, script, "monitor");
        else
            Firebug.Debugger.traceFunction(fn, script, "monitor");
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "function",

    supportsObject: function(object, type)
    {
        return type == "function";
    },
    
    inspectObject: function(fn, context)
    {
        var sourceLink = findSourceForFunction(fn);
        if (sourceLink)
            context.chrome.select(sourceLink);
    },

    getTooltip: function(fn)
    {
        var script = script ? script : findScriptForFunction(fn);
        if (script)
            return $STRF("Line", [script.fileName, script.baseLineNumber]);
    },
    
    getTitle: function(fn, context)
    {
        var name = fn.name ? fn.name : "function";
        return name + "()";
    },

    getContextMenuItems: function(fn, target, context, script)
    {
        var script = script ? script : findScriptForFunction(fn);
        if (!script)
            return;

        var monitored = fbs.isMonitored(script);
        var name = script ? getFunctionName(script, context) : fn.name;
        return [
            {label: "CopySource", command: bindFixed(this.copySource, this, fn) },
            "-",
            {label: $STRF("ShowCallsInConsole", [name]), nol10n: true,
             type: "checkbox", checked: monitored,
             command: bindFixed(this.monitor, this, fn, script, monitored) }
        ];
    }    
});

// ************************************************************************************************

this.jsdScript = domplate(Firebug.Rep,
{    
    copySource: function(script)
    {
        var fn = script.functionObject.getWrappedValue();
        return FirebugReps.Func.copySource(fn);
    },
    
    monitor: function(fn, script, monitored)
    {
        var fn = script.functionObject.getWrappedValue();
        return FirebugReps.Func.monitor(fn, script, monitored);
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "jsdScript",
    inspectable: false,
    
    supportsObject: function(object, type)
    {
        return object instanceof jsdIScript;
    },
    
    inspectObject: function(script, context)
    {
        var sourceLink = getSourceForScript(script);
        if (sourceLink)
            context.chrome.select(sourceLink);
    },

    getRealObject: function(script, context)
    {
        return null;
    },
    
    getTooltip: function(script)
    {
        return $STRF("Line", [script.fileName, script.baseLineNumber]);
    },
    
    getTitle: function(script, context)
    {
        var fn = script.functionObject.getWrappedValue();
        return FirebugReps.Func.getTitle(fn, context);
    },

    getContextMenuItems: function(script, target, context)
    {
        var fn = script.functionObject.getWrappedValue();

        var monitored = fbs.isMonitored(script);
        var name = getFunctionName(script, context);
        
        return [
            {label: "CopySource", command: bindFixed(this.copySource, this, script) },
            "-",
            {label: $STRF("ShowCallsInConsole", [name]), nol10n: true,
             type: "checkbox", checked: monitored,
             command: bindFixed(this.monitor, this, fn, script, monitored) }
        ];
    }    
});

// ************************************************************************************************

this.Arr = domplate(Firebug.Rep,
{
    tag:
        OBJECTBOX({_repObject: "$object"},
            SPAN({class: "arrayLeftBracket"}, "["),
            FOR("item", "$object|arrayIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({class: "arrayComma"}, "$item.delim")
            ),
            SPAN({class: "arrayRightBracket"}, "]")
        ),

    shortTag:
        OBJECTBOX({_repObject: "$object"},
            SPAN({class: "arrayLeftBracket"}, "["),
            FOR("item", "$object|shortArrayIterator",
                TAG("$item.tag", {object: "$item.object"}),
                SPAN({class: "arrayComma"}, "$item.delim")
            ),
            SPAN({class: "arrayRightBracket"}, "]")
        ),

    arrayIterator: function(array)
    {
        var items = [];
        for (var i = 0; i < array.length; ++i)
        {
            var value = array[i];
            var rep = Firebug.getRep(value);
            var tag = rep.shortTag ? rep.shortTag : rep.tag;
            var delim = (i == array.length-1 ? "" : ", ");

            items.push({object: value, tag: tag, delim: delim});
        }

        return items;
    },

    shortArrayIterator: function(array)
    {
        var items = [];
        for (var i = 0; i < array.length && i < 3; ++i)
        {
            var value = array[i];
            var rep = Firebug.getRep(value);
            var tag = rep.shortTag ? rep.shortTag : rep.tag;
            var delim = (i == array.length-1 ? "" : ", ");

            items.push({object: value, tag: tag, delim: delim});
        }
        
        if (array.length > 3)
            items.push({object: (array.length-3) + " more...", tag: FirebugReps.Caption.tag, delim: ""});

        return items;
    },

    getItemIndex: function(child)
    {
        var arrayIndex = 0;
        for (child = child.previousSibling; child; child = child.previousSibling)
        {
            if (child.repObject)
                ++arrayIndex;
        }
        return arrayIndex;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    className: "array",

    supportsObject: function(object)
    {
        return "length" in object && typeof(object.length) == "number";
    },
    
    getTitle: function(object, context)
    {
        return "[" + object.length + "]";
    }
});

// ************************************************************************************************

this.Property = domplate(Firebug.Rep,
{
    supportsObject: function(object)
    {
        return object instanceof Property;
    },
    
    getRealObject: function(prop, context)
    {
        return prop.object[prop.name];
    },
    
    getTitle: function(prop, context)
    {
        return prop.name;
    }
});

// ************************************************************************************************

this.NetFile = domplate(Firebug.Rep,
{
    supportsObject: function(object)
    {
        return object instanceof Firebug.NetFile;
    },
    
    browseObject: function(file, context)
    {
        openNewTab(file.href);
        return true;
    },
    
    getRealObject: function(file, context)
    {
        return null;
    }
});

// ************************************************************************************************

this.Except = domplate(Firebug.Rep,
{
    tag:
        OBJECTBOX({_repObject: "$object"}, "$object.message"),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    className: "exception",

    supportsObject: function(object)
    {
        return object instanceof ErrorCopy;
    }
});

// ************************************************************************************************

this.Obj = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            SPAN({class: "objectTitle"}, "$object|getTitle"),
            FOR("prop", "$object|propIterator",
                " $prop.name|escapeHTML=",
                SPAN({class: "objectPropValue"}, "$prop.value|cropString|escapeHTML")
            )
        ),
    
    propIterator: function (object)
    {
        if (!object)
            return [];
        
        var props = [];
        var len = 0;

        try
        {
            for (var name in object)
            {
                var val;
                try
                {
                    val = object[name];
                }
                catch (exc)
                {
                    continue;
                }

                var t = typeof(val);
                if (t == "boolean" || t == "number" || (t == "string" && val)
                    || (t == "object" && val && val.toString))
                {
                    var title = (t == "object")
                        ? Firebug.getRep(val).getTitle(val)
                        : val+"";

                    len += name.length + title.length + 1;
                    if (len < 50)
                        props.push({name: name, value: title});
                    else
                        break;
                }
            }
        }
        catch (exc)
        {
            // Sometimes we get exceptions when trying to read from certain objects, like
            // StorageList, but don't let that gum up the works
        }
        
        return props;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "object",

    supportsObject: function(object, type)
    {
        return true;
    }
});

// ************************************************************************************************

this.Element = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK(
            "&lt;",
            SPAN({class: "nodeTag"}, "$object.localName|toLowerCase"),
            FOR("attr", "$object|attrIterator",
                "&nbsp;$attr.localName|escapeHTML=&quot;", SPAN({class: "nodeValue"}, "$attr.nodeValue|escapeHTML"), "&quot;"
            ),
            "&gt;"
         ),

    shortTag:
        OBJECTLINK(
            SPAN({class: "$object|getVisible"},
                SPAN({class: "selectorTag"}, "$object|getSelectorTag"),
                SPAN({class: "selectorId"}, "$object|getSelectorId"),
                SPAN({class: "selectorClass"}, "$object|getSelectorClass"),
                SPAN({class: "selectorValue"}, "$object|getValue")
            )
         ),
    
     getVisible: function(elt)
     {
         return isVisible(elt) ? "" : "selectorHidden";
     },
     
     getSelectorTag: function(elt)
     {
         return elt.localName.toLowerCase();
     },
     
     getSelectorId: function(elt)
     {
         return elt.id ? ("#" + elt.id) : "";
     },
     
     getSelectorClass: function(elt)
     {
         return elt.getAttribute("class")
             ? ("." + elt.getAttribute("class").split(" ")[0])
             : "";
     },
     
     getValue: function(elt)
     {
         var value;
         if (elt instanceof HTMLImageElement)
            value = getFileName(elt.src);
        else if (elt instanceof HTMLAnchorElement)
            value = getFileName(elt.href);
        else if (elt instanceof HTMLInputElement)
            value = elt.value;
        else if (elt instanceof HTMLFormElement)
            value = getFileName(elt.action);
        else if (elt instanceof HTMLScriptElement)
            value = getFileName(elt.src);
        
        return value ? " " + cropString(value, 20) : "";
     },
     
     attrIterator: function(elt)
     {
         var attrs = [];
         var idAttr, classAttr;
         if (elt.attributes)
         {
             for (var i = 0; i < elt.attributes.length; ++i)
             {
                 var attr = elt.attributes[i];
                 if (attr.localName.indexOf("firebug-") != -1)
                    continue;
                 else if (attr.localName == "id")
                     idAttr = attr;
                else if (attr.localName == "class")
                    classAttr = attr;
                 else
                     attrs.push(attr);
             }
         }
         if (classAttr)
            attrs.splice(0, 0, classAttr);
        if (idAttr)
           attrs.splice(0, 0, idAttr);
         return attrs;
     },

     shortAttrIterator: function(elt)
     {
         var attrs = [];
         if (elt.attributes)
         {
             for (var i = 0; i < elt.attributes.length; ++i)
             {
                 var attr = elt.attributes[i];
                 if (attr.localName == "id" || attr.localName == "class")
                     attrs.push(attr);
             }
         }

         return attrs;
     },

     getHidden: function(elt)
     {
         return isVisible(elt) ? "" : "nodeHidden";
     },

     getXPath: function(elt)
     {
         return getElementTreeXPath(elt);
     },
     
     getNodeText: function(element)
     {
         var text = element.textContent;
         if (Firebug.showFullTextNodes)
            return text;
        else
            return cropString(text, 50);
     },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    copyHTML: function(elt)
    {
        var html = getElementXML(elt);
        copyToClipboard(html);
    },
    
    copyInnerHTML: function(elt)
    {
        copyToClipboard(elt.innerHTML);
    },
    
    copyXPath: function(elt)
    {
        var xpath = getElementXPath(elt);
        copyToClipboard(xpath);
    },
    
    persistor: function(context, xpath)
    {
        var elts = xpath
            ? getElementsByXPath(context.window.document, xpath)
            : null;

        return elts && elts.length ? elts[0] : null;
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "element",

    supportsObject: function(object)
    {
        return object instanceof Element;
    },

    browseObject: function(elt, context)
    {
        var tag = elt.localName.toLowerCase();
        if (tag == "script")
            openNewTab(elt.src);
        else if (tag == "link")
            openNewTab(elt.href);
        else if (tag == "a")
            openNewTab(elt.href);
        else if (tag == "img")
            openNewTab(elt.src);

        return true;
    },
    
    persistObject: function(elt, context)
    {
        var xpath = getElementXPath(elt);
        
        return bind(this.persistor, top, xpath);
    },
    
    getTitle: function(element, context)
    {
        return getElementCSSSelector(element);
    },
    
    getTooltip: function(elt)
    {
        return this.getXPath(elt);
    },
    
    getContextMenuItems: function(elt, target, context)
    {
        var monitored = areEventsMonitored(elt, null, context);
        
        return [
            {label: "CopyHTML", command: bindFixed(this.copyHTML, this, elt) },
            {label: "CopyInnerHTML", command: bindFixed(this.copyInnerHTML, this, elt) },
            {label: "CopyXPath", command: bindFixed(this.copyXPath, this, elt) },
            "-",
            {label: "ShowEventsInConsole", type: "checkbox", checked: monitored,
             command: bindFixed(toggleMonitorEvents, FBL, elt, null, monitored, context) },
            "-",
            {label: "ScrollIntoView", command: bindFixed(elt.scrollIntoView, elt) }
        ];
    }
});

// ************************************************************************************************

this.TextNode = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("&quot;$object.nodeValue|cropString|escapeHTML&quot;"),
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "textNode",

    supportsObject: function(object)
    {
        return object instanceof Text;
    }
});

// ************************************************************************************************

this.Document = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("Document ", SPAN({class: "objectPropValue"}, "$object|getLocation")),
    
    getLocation: function(doc)
    {
        return doc.location ? getFileName(doc.location.href) : "";
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "object",

    supportsObject: function(object)
    {
        return object instanceof Document || object instanceof XMLDocument;
    },
    
    browseObject: function(doc, context)
    {
        openNewTab(doc.location.href);
        return true;
    },
    
    persistObject: function(doc, context)
    {
        return this.persistor;
    },
    
    persistor: function(context)
    {
        return context.window.document;
    },
    
    getTitle: function(win, context)
    {
        return "document";
    },

    getTooltip: function(doc)
    {
        return doc.location.href;
    }    
});

// ************************************************************************************************

this.StyleSheet = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("StyleSheet ", SPAN({class: "objectPropValue"}, "$object|getLocation")),
    
    getLocation: function(styleSheet)
    {
        return getFileName(styleSheet.href);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    copyURL: function(styleSheet)
    {
        copyToClipboard(styleSheet.href);
    },

    openInTab: function(styleSheet)
    {
        openNewTab(styleSheet.href);
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "object",

    supportsObject: function(object)
    {
        return object instanceof CSSStyleSheet;
    },
    
    browseObject: function(styleSheet, context)
    {
        openNewTab(styleSheet.href);
        return true;
    },
    
    persistObject: function(styleSheet, context)
    {
        return bind(this.persistor, top, styleSheet.href);
    },
    
    getTooltip: function(styleSheet)
    {
        return styleSheet.href;
    },
    
    getContextMenuItems: function(styleSheet, target, context)
    {
        return [
            {label: "CopyLocation", command: bindFixed(this.copyURL, this, styleSheet) },
            "-",
            {label: "OpenInTab", command: bindFixed(this.openInTab, this, styleSheet) }
        ];
    },

    persistor: function(context, href)
    {
        return getStyleSheetByHref(href, context);
    }    
});

// ************************************************************************************************

this.Window = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK("Window ", SPAN({class: "objectPropValue"}, "$object|getLocation")),
    
    getLocation: function(win)
    {
        return win.location ? getFileName(win.location.href) : "";
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "object",

    supportsObject: function(object)
    {
        return object instanceof Window;
    },
    
    browseObject: function(win, context)
    {
        openNewTab(win.location.href);
        return true;
    },
    
    persistObject: function(win, context)
    {
        return this.persistor;
    },
    
    persistor: function(context)
    {
        return context.window;
    },
    
    getTitle: function(win, context)
    {
        return "window";
    },
    
    getTooltip: function(win)
    {
        return win.location.href;
    }    
});

// ************************************************************************************************

this.Event = domplate(Firebug.Rep,
{
    tag: TAG("$copyEventTag", {object: "$object|copyEvent"}),

    copyEventTag:
        OBJECTLINK("$object|summarizeEvent"),

    summarizeEvent: function(event)
    {
        var info = [event.type, ' '];
        
        var eventFamily = getEventFamily(event.type);
        if (eventFamily == "mouse")
            info.push("clientX=", event.clientX, ", clientY=", event.clientY);
        else if (eventFamily == "key")
            info.push("charCode=", event.charCode, ", keyCode=", event.keyCode);

        return info.join("");
    },

    copyEvent: function(event)
    {
        return new EventCopy(event);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 
    
    className: "object",

    supportsObject: function(object)
    {
        return object instanceof Event || object instanceof EventCopy;
    },
    
    getTitle: function(event, context)
    {
        return "Event " + event.type;
    }
});

// ************************************************************************************************

this.SourceLink = domplate(Firebug.Rep,
{
    tag:
        OBJECTLINK({$collapsed: "$object|hideSourceLink"}, "$object|getSourceLinkTitle"),
    
    hideSourceLink: function(sourceLink)
    {
        return sourceLink ? sourceLink.href.indexOf(Firebug.CommandLine.evalScript) != -1 : true;
    },

    getSourceLinkTitle: function(sourceLink)
    {
        if (!sourceLink)
            return "";
        
        var fileName = cropString(getFileName(sourceLink.href), 17);
        return $STRF("Line", [fileName, sourceLink.line]);
    },
     
    copyLink: function(sourceLink)
    {
        copyToClipboard(sourceLink.href);
    },
     
    openInTab: function(sourceLink)
    {
        openNewTab(sourceLink.href);
    },
     
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "sourceLink",

    supportsObject: function(object)
    {
        return object instanceof SourceLink;
    },
    
    getTooltip: function(sourceLink)
    {
        return sourceLink.href;
    },
    
    inspectObject: function(sourceLink, context)
    {
        if (sourceLink.type == "js")
        {
            var scriptFile = getScriptFileByHref(sourceLink.href, context);
            if (scriptFile)
                return context.chrome.select(sourceLink);
        }
        else if (sourceLink.type == "css")
        {
            var stylesheet = getStyleSheetByHref(sourceLink.href, context);
            if (stylesheet)
            {
                var panel = context.getPanel("stylesheet");
                if (panel && panel.getRuleByLine(stylesheet, sourceLink.line))
                    return context.chrome.select(sourceLink);
            }
        }

        // Fallback is to just open the view-source window on the file
        viewSource(sourceLink.href, sourceLink.line);
    },
    
    browseObject: function(sourceLink, context)
    {
        openNewTab(sourceLink.href);        
        return true;
    },
    
    getContextMenuItems: function(sourceLink, target, context)
    {
        return [
            {label: "CopyLocation", command: bindFixed(this.copyLink, this, sourceLink) },
            "-",
            {label: "OpenInTab", command: bindFixed(this.openInTab, this, sourceLink) }
        ];
    }    
});

// ************************************************************************************************

this.SourceFile = domplate(this.SourceLink,
{
    tag:
        OBJECTLINK({$collapsed: "$object|hideSourceLink"}, "$object|getSourceLinkTitle"),
    
    persistor: function(context, href)
    {
        return getScriptFileByHref(href, context);
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "sourceFile",

    supportsObject: function(object)
    {
        return object instanceof SourceFile;
    },
    
    persistObject: function(sourceFile)
    {
        return bind(this.persistor, top, sourceFile.href);
    },

    browseObject: function(sourceLink, context)
    {
    },

    getTooltip: function(sourceFile)
    {
        return sourceFile.href;
    }    
});

// ************************************************************************************************

this.StackFrame = domplate(Firebug.Rep,
{
    tag:
        OBJECTBLOCK(
            A({class: "objectLink", _repObject: "$object.fn"}, "$object|getCallName"),
            "(",
            FOR("arg", "$object|argIterator",
                TAG("$arg.tag", {object: "$arg.value"}),
                SPAN({class: "arrayComma"}, "$arg.delim")
            ),
            ")",
            SPAN({class: "objectLink-sourceLink objectLink"}, "$object|getSourceLinkTitle")
        ),
    
    getCallName: function(frame)
    {
        return getFunctionName(frame.script, frame.context);
    },
    
    getSourceLinkTitle: function(frame)
    {
        var fileName = cropString(getFileName(frame.href), 17);
        return $STRF("Line", [fileName, frame.lineNo]);
    },

    argIterator: function(frame)
    {
        if (!frame.args)
            return [];
        
        var items = [];

        for (var i = 0; i < frame.args.length; ++i)
        {
            var arg = frame.args[i];
            
            var rep = Firebug.getRep(arg.value);
            var tag = rep.shortTag ? rep.shortTag : rep.tag;
            
            var delim = (i == frame.args.length-1 ? "" : ", ");

            items.push({name: arg.name, value: arg.value, tag: tag, delim: delim});
        }

        return items;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "stackFrame",

    supportsObject: function(object)
    {
        return object instanceof StackFrame;
    }    
});

// ************************************************************************************************

this.StackTrace = domplate(Firebug.Rep,
{
    tag:
        FOR("frame", "$object.frames",
            TAG(this.StackFrame.tag, {object: "$frame"})
        ),

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "stackTrace",

    supportsObject: function(object)
    {
        return object instanceof StackTrace;
    }
});

// ************************************************************************************************

this.jsdStackFrame = domplate(Firebug.Rep,
{
    inspectable: false,
    
    supportsObject: function(object)
    {
        return object instanceof jsdIStackFrame;
    },
        
    getTitle: function(frame, context)
    {
        return getFunctionName(frame.script, context);
    },

    getTooltip: function(frame, context)
    {
        return $STRF("Line", [frame.script.fileName, frame.line]);
    },

    getContextMenuItems: function(frame, target, context)
    {
        var fn = frame.script.functionObject.getWrappedValue();
        return FirebugReps.Func.getContextMenuItems(fn, target, context, frame.script);
    }    
});

// ************************************************************************************************

this.ErrorMessage = domplate(Firebug.Rep,
{
    tag:
        OBJECTBOX({
                $hasTwisty: "$object|hasStackTrace",
                $hasBreakSwitch: "$object|hasBreakSwitch",
                $breakForError: "$object|hasErrorBreak",
                _repObject: "$object",
                _stackTrace: "$object|getLastErrorStackTrace",
                onclick: "$onToggleError"},
        
            DIV({class: "errorTitle"},
                "$object.message|getMessage|escapeHTML"
            ),
            DIV({class: "errorTrace"}),
            DIV({class: "errorSourceBox errorSource-$object|getSourceType"},
                IMG({class: "errorBreak", src:"blank.gif", title: "Break on this error"}),
                SPAN({class: "errorSource"}, "$object|getLine|escapeHTML")
            ),
            TAG(this.SourceLink.tag, {object: "$object|getSourceLink"})
        ),

    getLastErrorStackTrace: function()
    {
        var trace = Firebug.errorStackTrace;
        Firebug.errorStackTrace = null;
        return trace;
    },

    hasStackTrace: function(error)
    {
        var fromCommandLine = error.href.indexOf(Firebug.CommandLine.evalScript) != -1;
        return !fromCommandLine && Firebug.errorStackTrace;
    },

    hasBreakSwitch: function(error)
    {
        return error.href && error.lineNo > 0;
    },

    hasErrorBreak: function(error)
    {
        return fbs.hasErrorBreakpoint(error.href, error.lineNo);
    },
    
    getMessage: function(message)
    {
        var re = /\[Exception... "(.*?)" nsresult:/;
        var m = re.exec(message);
        return m ? m[1] : message;
    },
    
    getLine: function(error)
    {
        if (error.category == "js")
        {
            if (error.source)
                return cropString(error.source, 80);
            else if (error.href && error.href.indexOf(Firebug.CommandLine.evalScript) == -1)
                return cropString(error.getSourceLine(), 80);
        }
    },

    getSourceLink: function(error)
    {
        var ext = error.category == "css" ? "css" : "js";
        return error.lineNo ? new SourceLink(error.href, error.lineNo, ext) : null;
    },

    getSourceType: function(error)
    {
        // Errors occurring inside of HTML event handlers look like "foo.html (line 1)" 
        // so let's try to skip those
        if (error.source)
            return "syntax";
        else if (error.lineNo == 1 && getFileExtension(error.href) != "js")
            return "none";
        else if (error.category == "css")
            return "none";
        else if (!error.href || !error.lineNo)
            return "none";
        else
            return "exec";
    },

    onToggleError: function(event)
    {
        var target = event.currentTarget;
        if (hasClass(event.target, "errorBreak"))
        {
            this.breakOnThisError(target.repObject);
        }
        else if (hasClass(event.target, "errorSource"))
        {
            var panel = Firebug.getElementPanel(event.target);
            this.inspectObject(target.repObject, panel.context);
        }
        else if (hasClass(event.target, "errorTitle"))
        {
            var traceBox = target.childNodes[1];
            toggleClass(target, "opened");

            if (hasClass(target, "opened"))
            {
                if (target.stackTrace)
                    FirebugReps.StackTrace.tag.append({object: target.stackTrace}, traceBox);
            }
            else
                clearNode(traceBox);
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    copyError: function(error)
    {
        var message = [
            this.getMessage(error.message),
            error.href,
            "Line " +  error.lineNo
        ];
        copyToClipboard(message.join("\n"));
    },
    
    breakOnThisError: function(error)
    {
        if (this.hasErrorBreak(error))
            Firebug.Debugger.clearErrorBreakpoint(error.href, error.lineNo);
        else
            Firebug.Debugger.setErrorBreakpoint(error.href, error.lineNo);
    },
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "errorMessage",
    inspectable: false,
    
    supportsObject: function(object)
    {
        return object instanceof ErrorMessage;
    },

    inspectObject: function(error, context)
    {
        var sourceLink = this.getSourceLink(error);
        context.chrome.select(sourceLink);
    },

    getContextMenuItems: function(error, target, context)
    {
        var breakOnThisError = this.hasErrorBreak(error);

        var items = [
            {label: "CopyError", command: bindFixed(this.copyError, this, error) }
        ];
        
        if (error.category == "css")
        {
            items.push(
                "-",
                {label: "BreakOnThisError", type: "checkbox", checked: breakOnThisError,
                 command: bindFixed(this.breakOnThisError, this, error) },

                optionMenu("BreakOnAllErrors", "breakOnErrors")
            );
        }
        
        return items;
    }    
});

// ************************************************************************************************

this.Assert = domplate(Firebug.Rep,
{
    tag:
        DIV(
            DIV({class: "errorTitle"}),
            DIV({class: "assertDescription"})
        ),
    
    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * 

    className: "assert",

    inspectObject: function(error, context)
    {
        var sourceLink = this.getSourceLink(error);
        context.chrome.select(sourceLink);
    },

    getContextMenuItems: function(error, target, context)
    {
        var breakOnThisError = this.hasErrorBreak(error);
        
        return [
            {label: "CopyError", command: bindFixed(this.copyError, this, error) },
            "-",
            {label: "BreakOnThisError", type: "checkbox", checked: breakOnThisError,
             command: bindFixed(this.breakOnThisError, this, error) },
            {label: "BreakOnAllErrors", type: "checkbox", checked: Firebug.breakOnErrors,
             command: bindFixed(this.breakOnAllErrors, this, error) }            
        ];
    }    
});

// ************************************************************************************************

this.SourceText = domplate(Firebug.Rep,
{
    tag:
        DIV(
            "$object|getHTML"
        ),
    
    getHTML: function(sourceText)
    {
        return getSourceLines(sourceText.lines);
    }
});

// ************************************************************************************************

Firebug.registerRep(
    this.Undefined,
    this.Null,
    this.Number,
    this.String,
    this.Func,
    this.Window,
    this.ErrorMessage,
    this.Element,
    this.TextNode,
    this.Document,
    this.StyleSheet,
    this.Event,
    this.SourceLink,
    this.SourceFile,
    this.StackTrace,
    this.StackFrame,
    this.jsdStackFrame,
    this.jsdScript,
    this.NetFile,
    this.Property,
    this.Except,
    this.Arr
);

Firebug.setDefaultRep(this.Obj);

}});

// ************************************************************************************************
