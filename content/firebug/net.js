/* See license.txt for terms of usage */

FBL.ns(function() { with (FBL) {

// ************************************************************************************************
// Constants

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;

const nsIWebProgressListener = Ci.nsIWebProgressListener;
const nsIWebProgress = Ci.nsIWebProgress;
const nsIRequest = Ci.nsIRequest;
const nsIChannel = Ci.nsIChannel;
const nsIHttpChannel = Ci.nsIHttpChannel;
const nsICacheService = Ci.nsICacheService;
const nsICache = Ci.nsICache;
const nsISupportsWeakReference = Ci.nsISupportsWeakReference;
const nsISupports = Ci.nsISupports;
const nsIIOService = Ci.nsIIOService;
const imgIRequest = Ci.imgIRequest;
const nsIUploadChannel = Ci.nsIUploadChannel;
const nsIXMLHttpRequest = Ci.nsIXMLHttpRequest;
const nsISeekableStream = Ci.nsISeekableStream;
const nsIURI = Ci.nsIURI;

const CacheService = Cc["@mozilla.org/network/cache-service;1"];
const ImgCache = Cc["@mozilla.org/image/cache;1"];
const IOService = Cc["@mozilla.org/network/io-service;1"];

const nsIPrefBranch2 = Ci.nsIPrefBranch2;
const PrefService = Cc["@mozilla.org/preferences-service;1"];
const prefs = PrefService.getService(nsIPrefBranch2);

const NOTIFY_ALL = nsIWebProgress.NOTIFY_ALL;

const STATE_IS_WINDOW = nsIWebProgressListener.STATE_IS_WINDOW;
const STATE_IS_DOCUMENT = nsIWebProgressListener.STATE_IS_DOCUMENT;
const STATE_IS_NETWORK = nsIWebProgressListener.STATE_IS_NETWORK;
const STATE_IS_REQUEST = nsIWebProgressListener.STATE_IS_REQUEST;

const STATE_START = nsIWebProgressListener.STATE_START;
const STATE_STOP = nsIWebProgressListener.STATE_STOP;
const STATE_TRANSFERRING = nsIWebProgressListener.STATE_TRANSFERRING;

const LOAD_BACKGROUND = nsIRequest.LOAD_BACKGROUND;
const LOAD_FROM_CACHE = nsIRequest.LOAD_FROM_CACHE;
const LOAD_DOCUMENT_URI = nsIChannel.LOAD_DOCUMENT_URI;

const ACCESS_READ = nsICache.ACCESS_READ;
const STORE_ANYWHERE = nsICache.STORE_ANYWHERE;

const NS_ERROR_CACHE_KEY_NOT_FOUND = 0x804B003D;
const NS_ERROR_CACHE_WAIT_FOR_VALIDATION = 0x804B0040;

const NS_SEEK_SET = nsISeekableStream.NS_SEEK_SET;

const observerService = CCSV("@joehewitt.com/firebug-http-observer;1", "nsIObserverService");

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

const mimeExtensionMap =
{
    "txt": "text/plain",
    "html": "text/html",
    "htm": "text/html",
    "xhtml": "text/html",
    "xml": "text/xml",
    "css": "text/css",
    "js": "application/x-javascript",
    "jss": "application/x-javascript",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "gif": "image/gif",
    "png": "image/png",
    "bmp": "image/bmp",
    "swf": "application/x-shockwave-flash",
    "flv": "video/x-flv"
};

const fileCategories =
{
    "undefined": 1,
    "html": 1,
    "css": 1,
    "js": 1,
    "xhr": 1,
    "image": 1,
    "flash": 1,
    "txt": 1,
    "bin": 1
};

const textFileCategories =
{
    "txt": 1,
    "html": 1,
    "xhr": 1,
    "css": 1,
    "js": 1
};

const binaryFileCategories =
{
    "bin": 1,
    "flash": 1
};

const mimeCategoryMap =
{
    "text/plain": "txt",
    "application/octet-stream": "bin",
    "text/html": "html",
    "text/xml": "html",
    "text/css": "css",
    "application/x-javascript": "js",
    "text/javascript": "js",
    "application/javascript" : "js",
    "image/jpeg": "image",
    "image/gif": "image",
    "image/png": "image",
    "image/bmp": "image",
    "application/x-shockwave-flash": "flash",
    "video/x-flv": "flash"
};

const binaryCategoryMap =
{
    "image": 1,
    "flash" : 1
};

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

const reIgnore = /about:|javascript:|resource:|chrome:|jar:/;
const layoutInterval = 300;
const phaseInterval = 1000;
const indentWidth = 18;
const maxPendingCheck = 200;

var cacheSession = null;
var contexts = new Array();
var panelName = "net";
var maxQueueRequests = 500;
var panelBar1 = $("fbPanelBar1");
var listeners = [];

// ************************************************************************************************

Firebug.NetMonitor = extend(Firebug.ActivableModule,
{
    clear: function(context)
    {
        // The user pressed a Clear button so, remove content of the panel...
        var panel = context.getPanel(panelName, true);
        if (panel)
            panel.clear();

        // ... and clear the network context.
        if (context.netProgress)
            context.netProgress.clear();
    },

    onToggleFilter: function(context, filterCategory)
    {
        if (!context.netProgress)
            return;

        Firebug.setPref(Firebug.prefDomain, "netFilterCategory", filterCategory);

        // The content filter has been changed. Make sure that the content
        // of the panel is updated (CSS is used to hide or show individual files).
        var panel = context.getPanel(panelName, true);
        if (panel)
        {
            panel.setFilter(filterCategory);
            panel.updateSummaries(now(), true);
        }
    },

    syncFilterButtons: function(chrome)
    {
        var button = chrome.$("fbNetFilter-" + Firebug.netFilterCategory);
        button.checked = true;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Module

    initializeUI: function()
    {
        Firebug.ActivableModule.initializeUI.apply(this, arguments);

        // Initialize max limit for logged requests.
        NetLimit.updateMaxLimit();

        // Synchronize UI buttons with the current filter.
        this.syncFilterButtons(FirebugChrome);

        // Register HTTP observer for all net-request monitoring and time measuring.
        // This is done as soon as the FB UI is loaded.
        HttpObserver.registerObserver();

        prefs.addObserver(Firebug.prefDomain, NetLimit, false);
    },

    initialize: function()
    {
        this.panelName = panelName;
        this.description = $STR("net.modulemanager.description");

        Firebug.ActivableModule.initialize.apply(this, arguments);
    },

    shutdown: function()
    {
        // Unregister HTTP observer. This is done when the FB UI is closed.
        HttpObserver.unregisterObserver();

        prefs.removeObserver(Firebug.prefDomain, this, false);
    },

    initContext: function(context, persistedState)
    {
        Firebug.ActivableModule.initContext.apply(this, arguments);

        if (FBTrace.DBG_NET)
            FBTrace.sysout("net.initContext for: " + context.window.location.href, context);

        var window = context.window;

        // Register "load" listener in order to track window load time.
        var onWindowLoadHandler = function() {
            if (context.netProgress)
                context.netProgress.post(windowLoad, [window, now()]);
            window.removeEventListener("load", onWindowLoadHandler, true);
        }
        window.addEventListener("load", onWindowLoadHandler, true);

        // Register "DOMContentLoaded" listener to track timing.
        var onContentLoadHandler = function() {
            if (context.netProgress)
                context.netProgress.post(contentLoad, [window, now()]);
            window.removeEventListener("DOMContentLoaded", onContentLoadHandler, true);
        }
        window.addEventListener("DOMContentLoaded", onContentLoadHandler, true);
    },

    reattachContext: function(browser, context)
    {
        Firebug.ActivableModule.reattachContext.apply(this, arguments);
        var chrome = context ? context.chrome : FirebugChrome;
        this.syncFilterButtons(chrome);
    },

    destroyContext: function(context)
    {
        Firebug.ActivableModule.destroyContext.apply(this, arguments);
    },

    showContext: function(browser, context)
    {
        Firebug.ActivableModule.showContext.apply(this, arguments);

        if (!context)
        {
            var tabId = Firebug.getTabIdForWindow(browser.contentWindow);
            delete contexts[tabId];
        }
    },

    loadedContext: function(context)
    {
        if (context.netProgress)
            context.netProgress.loaded = true;
    },

    onPanelActivate: function(context, init, activatedPanelName)
    {
        if (activatedPanelName != panelName)
            return;

        monitorContext(context);

        if (context.netProgress)
        {
            var panel = context.getPanel(panelName);
            context.netProgress.activate(panel);
        }

        $('fbStatusIcon').setAttribute("net", "on");

        if (!init)
            context.window.location.reload();
    },

    onPanelDeactivate: function(context, destroy, deactivatedPanelName)
    {
        if (deactivatedPanelName != panelName)
            return;

        if (context.netProgress)
            context.netProgress.activate(null);

        unmonitorContext(context);
    },

    onLastPanelDeactivate: function(context, destroy)
    {
        $('fbStatusIcon').removeAttribute("net");
    },

    onSuspendFirebug: function(context)
    {
        HttpObserver.unregisterObserver();  // safe for multiple calls
        try
        {
            if (context.browser.removeProgressListener)  // XXXjjb often false?
                context.browser.removeProgressListener(context.netProgress, NOTIFY_ALL);
        }
        catch (e)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("net.onSuspendFirebug could not removeProgressListener: ", e);
        }

        $('fbStatusIcon').removeAttribute("net");
    },

    onResumeFirebug: function(context)
    {
        HttpObserver.registerObserver();  // safe for multiple calls
        context.browser.addProgressListener(context.netProgress, NOTIFY_ALL);

        if (Firebug.NetMonitor.isEnabled(this.context))
            $('fbStatusIcon').setAttribute("net", "on");
    },

    addListener: function(listener)
    {
        listeners.push(listener);
    },

    removeListener: function(listener)
    {
        remove(listeners, listener);
    }
});

// ************************************************************************************************

function NetPanel() {}

NetPanel.prototype = domplate(Firebug.AblePanel,
{
    tableTag:
        TABLE({class: "netTable", cellpadding: 0, cellspacing: 0, onclick: "$onClick"},
            TBODY(
                TR(
                    TD({width: "18%"}),
                    TD({width: "12%"}),
                    TD({width: "12%"}),
                    TD({width: "4%"}),
                    TD({width: "54%"})
                )
            )
        ),

    fileTag:
        FOR("file", "$files",
            TR({class: "netRow $file.file|getCategory",
                $collapsed: "$file.file|hideRow",
                $hasHeaders: "$file.file|hasResponseHeaders",
                $loaded: "$file.file.loaded", $responseError: "$file.file|isError",
                $fromCache: "$file.file.fromCache", $inFrame: "$file.file|getInFrame"},
                TD({class: "netHrefCol netCol"},
                    DIV({class: "netHrefLabel netLabel",
                         style: "margin-left: $file.file|getIndent\\px"},
                        "$file.file|getHref"
                    ),
                    DIV({class: "netFullHrefLabel netHrefLabel netLabel",
                         style: "margin-left: $file.file|getIndent\\px"},
                        "$file.file.href"
                    )
                ),
                TD({class: "netStatusCol netCol"},
                    DIV({class: "netStatusLabel netLabel"}, "$file.file|getStatus")
                ),
                TD({class: "netDomainCol netCol"},
                    DIV({class: "netDomainLabel netLabel"}, "$file.file|getDomain")
                ),
                TD({class: "netSizeCol netCol"},
                    DIV({class: "netSizeLabel netLabel"}, "$file.file|getSize")
                ),
                TD({class: "netTimeCol netCol"},
                    DIV({class: "netBar"},
                        "&nbsp;",
                        DIV({class: "netResolvingBar", style: "left: $file.offset"}),
                        DIV({class: "netConnectingBar", style: "left: $file.offset"}),
                        DIV({class: "netWaitingBar", style: "left: $file.offset"}),
                        DIV({class: "netRespondedBar", style: "left: $file.offset"}),
                        DIV({class: "netContentLoadBar", style: "left: $file.offset"}),
                        DIV({class: "netWindowLoadBar", style: "left: $file.offset"}),
                        DIV({class: "netTimeBar", style: "left: $file.offset; width: $file.width"},
                            SPAN({class: "netTimeLabel"}, "$file.elapsed|formatTime")
                        )
                    )
                )
            )
        ),

    headTag:
        TR({class: "netHeadRow"},
            TD({class: "netHeadCol", colspan: 5},
                DIV({class: "netHeadLabel"}, "$doc.rootFile.href")
            )
        ),

    netInfoTag:
        TR({class: "netInfoRow"},
            TD({class: "netInfoCol", colspan: 5})
        ),

    summaryTag:
        TR({class: "netRow netSummaryRow"},
            TD({class: "netCol"},
                DIV({class: "netCountLabel netSummaryLabel"}, "-")
            ),
            TD({class: "netCol"}),
            TD({class: "netCol"}),
            TD({class: "netTotalSizeCol netCol"},
                DIV({class: "netTotalSizeLabel netSummaryLabel"}, "0KB")
            ),
            TD({class: "netTotalTimeCol netCol", colspan: 2},
                DIV({class: "netBar"},
                    DIV({class: "netCacheSizeLabel netSummaryLabel"},
                        "(",
                        SPAN("0KB"),
                        SPAN(" " + $STR("FromCache")),
                        ")"
                    ),
                    DIV({class: "netTimeBar", style: "width: 100%"},
                        SPAN({class: "netTotalTimeLabel netSummaryLabel"}, "0ms")
                    )
                )
            )
        ),

    getCategory: function(file)
    {
        var category = getFileCategory(file);
        if (category)
            return "category-" + category;

        return "";
    },

    hideRow: function(file)
    {
        return !file.loaded;
    },

    getInFrame: function(file)
    {
        return !!file.document.parent;
    },

    getIndent: function(file)
    {
        // XXXjoe Turn off indenting for now, it's confusing since we don't
        // actually place nested files directly below their parent
        //return file.document.level * indentWidth;
        return 0;
    },

    isError: function(file)
    {
        var errorRange = Math.floor(file.status/100);
        return errorRange == 4 || errorRange == 5;
    },

    summarizePhase: function(phase, rightNow)
    {
        var cachedSize = 0, totalSize = 0;

        var category = Firebug.netFilterCategory;
        if (category == "all")
            category = null;

        var fileCount = 0;
        var minTime = 0, maxTime = 0;

        for (var i=0; i<phase.files.length; i++)
        {
            var file = phase.files[i];

            if (!category || file.category == category)
            {
                if (file.loaded)
                {
                    ++fileCount;

                    if (file.size > 0)
                    {
                        totalSize += file.size;
                        if (file.fromCache)
                            cachedSize += file.size;
                    }

                    if (!minTime || file.startTime < minTime)
                        minTime = file.startTime;
                    if (file.endTime > maxTime)
                        maxTime = file.endTime;
                }
            }
        }

        var totalTime = maxTime - minTime;
        return {cachedSize: cachedSize, totalSize: totalSize, totalTime: totalTime,
                fileCount: fileCount}
    },

    getHref: function(file)
    {
        return (file.method ? file.method.toUpperCase() : "?") + " " + getFileName(file.href);
    },

    getStatus: function(file)
    {
        if (file.responseStatus && file.responseStatusText)
          return file.responseStatus + " " + file.responseStatusText;

        return " ";
    },

    getDomain: function(file)
    {
        return getPrettyDomain(file.href);
    },

    getSize: function(file)
    {
        return this.formatSize(file.size);
    },

    hasResponseHeaders: function(file)
    {
        return !!file.responseHeaders;
    },

    formatSize: function(bytes)
    {
        if (bytes == -1 || bytes == undefined)
            return "?";
        else if (bytes < 1024)
            return bytes + " B";
        else if (bytes < 1024*1024)
            return Math.ceil(bytes/1024) + " KB";
        else
            return (Math.ceil(bytes/(1024*1024))) + " MB";
    },

    formatTime: function(elapsed)
    {
        // Use formatTime util from the lib.
        return formatTime(elapsed);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    onClick: function(event)
    {
        if (isLeftClick(event))
        {
            var row = getAncestorByClass(event.target, "netRow");
            if (row)
            {
                this.toggleHeadersRow(row);
                cancelEvent(event);
            }
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    clear: function()
    {
        clearNode(this.panelNode);

        this.table = null;
        this.summaryRow = null;
        this.limitRow = null;

        this.queue = [];
        this.invalidPhases = false;
    },

    setFilter: function(filterCategory)
    {
        this.filterCategory = filterCategory;

        var panelNode = this.panelNode;
        for (var category in fileCategories)
        {
            if (filterCategory != "all" && category != filterCategory)
                setClass(panelNode, "hideCategory-"+category);
            else
                removeClass(panelNode, "hideCategory-"+category);
        }
    },

    toggleHeadersRow: function(row)
    {
        if (!hasClass(row, "hasHeaders"))
            return;

        var file = row.repObject;
        var NetInfoBody = Firebug.NetMonitor.NetInfoBody;

        toggleClass(row, "opened");
        if (hasClass(row, "opened"))
        {
            var netInfoRow = this.netInfoTag.insertRows({}, row)[0];
            var netInfoBox = NetInfoBody.tag.replace({file: file}, netInfoRow.firstChild);

            // Notify listeners so additional tabs can be created.
            dispatch(NetInfoBody.listeners, "initTabBody", [netInfoBox, file]);

            NetInfoBody.selectTabByName(netInfoBox, "Headers");
            var category = getFileCategory(row.repObject);
            if (category)
                setClass(netInfoBox, "category-" + category);
        }
        else
        {
            var netInfoRow = row.nextSibling;
            var netInfoBox = getElementByClass(netInfoRow, "netInfoBody");

            dispatch(NetInfoBody.listeners, "destroyTabBody", [netInfoBox, file]);

            row.parentNode.removeChild(netInfoRow);
        }
    },

    copyParams: function(file)
    {
        var text = getPostText(file, this.context);
        var url = reEncodeURL(file, text);
        copyToClipboard(url);
    },

    copyHeaders: function(headers)
    {
        var lines = [];
        if (headers)
        {
            for (var i = 0; i < headers.length; ++i)
            {
                var header = headers[i];
                lines.push(header.name + ": " + header.value);
            }
        }

        var text = lines.join("\r\n");
        copyToClipboard(text);
    },

    copyResponse: function(file)
    {
        var allowDoublePost = Firebug.getPref(Firebug.prefDomain, "allowDoublePost");
        if (!allowDoublePost && !file.cacheEntry)
        {
            if (!confirm("The response can be re-requested from the server, OK?"))
                return;
        }

        // The response text can be empty so, test against undefined.
        var text = (file.responseText != undefined)
            ? file.responseText
            : this.context.sourceCache.loadText(file.href, file.method, file);

        copyToClipboard(text);

        // Try to update file.cacheEntry flag.
        getCacheEntry(file, this.context.netProgress);
    },

    openRequestInTab: function(file)
    {
        var postData = null;
        if (file.postText)
        {
            var stringStream = getInputStreamFromString(file.postText);
            postData = CCIN("@mozilla.org/network/mime-input-stream;1", "nsIMIMEInputStream");
            postData.addHeader("Content-Type", "application/x-www-form-urlencoded");
            postData.addContentLength = true;
            postData.setData(stringStream);
        }

        gBrowser.selectedTab = gBrowser.addTab(file.href, null, null, postData);
    },

    stopLoading: function(file)
    {
        const NS_BINDING_ABORTED = 0x804b0002;

        file.request.cancel(NS_BINDING_ABORTED);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // extends Panel

    name: panelName,
    searchable: true,
    editable: false,

    initialize: function(context, doc)
    {
        this.queue = [];

        Firebug.Panel.initialize.apply(this, arguments);
    },

    destroy: function(state)
    {
        Firebug.Panel.destroy.apply(this, arguments);
    },

    show: function(state)
    {
        this.showToolbarButtons("fbNetButtons", true);

        var shouldShow = this.shouldShow();
        this.showToolbarButtons("fbNetButtonsFilter", shouldShow);
        if (!shouldShow)
            return;

        if (!this.filterCategory)
            this.setFilter(Firebug.netFilterCategory);

        this.layout();
        this.layoutInterval = setInterval(bindFixed(this.updateLayout, this), layoutInterval);

        if (this.wasScrolledToBottom)
            scrollToBottom(this.panelNode);
    },

    shouldShow: function()
    {
        if (Firebug.NetMonitor.isEnabled(this.context))
            return true;

        Firebug.ModuleManagerPage.show(this, Firebug.NetMonitor);

        return false;
    },

    hide: function()
    {
        this.showToolbarButtons("fbNetButtons", false);
        delete this.infoTipURL;  // clear the state that is tracking the infotip so it is reset after next show()
        this.wasScrolledToBottom = isScrolledToBottom(this.panelNode);

        clearInterval(this.layoutInterval);
        delete this.layoutInterval;
    },

    updateOption: function(name, value)
    {
        if (name == "netFilterCategory")
        {
            Firebug.NetMonitor.syncFilterButtons(this.context.chrome);
            for (var i = 0; i < TabWatcher.contexts.length; ++i)
            {
                var context = TabWatcher.contexts[i];
                Firebug.NetMonitor.onToggleFilter(context, value);
            }
        }
    },

    getOptionsMenuItems: function()
    {
        return [];
    },

    getContextMenuItems: function(nada, target)
    {
        var items = [];

        var file = Firebug.getRepObject(target);
        if (!file)
            return items;

        var object = Firebug.getObjectByURL(this.context, file.href);
        var isPost = isURLEncodedFile(file, getPostText(file, this.context));

        items.push(
            {label: "CopyLocation", command: bindFixed(copyToClipboard, FBL, file.href) }
        );

        if (isPost)
        {
            items.push(
                {label: "CopyLocationParameters", command: bindFixed(this.copyParams, this, file) }
            );
        }

        items.push(
            {label: "CopyRequestHeaders",
                command: bindFixed(this.copyHeaders, this, file.requestHeaders) },
            {label: "CopyResponseHeaders",
                command: bindFixed(this.copyHeaders, this, file.responseHeaders) }
        );

        if ( textFileCategories.hasOwnProperty(file.category) )
        {
            items.push(
                {label: "CopyResponse", command: bindFixed(this.copyResponse, this, file) }
            );
        }

        items.push(
            "-",
            {label: "OpenInTab", command: bindFixed(this.openRequestInTab, this, file) }
        );

        if (!file.loaded)
        {
            items.push(
                "-",
                {label: "StopLoading", command: bindFixed(this.stopLoading, this, file) }
            );
        }

        if (object)
        {
            var subItems = FirebugChrome.getInspectMenuItems(object);
            if (subItems.length)
            {
                items.push("-");
                items.push.apply(items, subItems);
            }
        }

        return items;
    },

    showInfoTip: function(infoTip, target, x, y)
    {
        var row = getAncestorByClass(target, "netRow");
        if (row)
        {
            if (getAncestorByClass(target, "netTimeCol"))
            {
                var infoTipURL = row.repObject.href + "-nettime";
                if (infoTipURL == this.infoTipURL)
                    return true;

                this.infoTipURL = infoTipURL;
                return this.populateTimeInfoTip(infoTip, row.repObject);
            }
            else if (hasClass(row, "category-image"))
            {
                var infoTipURL = row.repObject.href + "-image";
                if (infoTipURL == this.infoTipURL)
                    return true;

                this.infoTipURL = infoTipURL;
                return Firebug.InfoTip.populateImageInfoTip(infoTip, row.repObject.href);
            }
        }
    },

    populateTimeInfoTip: function(infoTip, file)
    {
        Firebug.NetMonitor.TimeInfoTip.tag.replace({file: file}, infoTip);
        return true;
    },

    search: function(text)
    {
        if (!text)
        {
            delete this.currentSearch;
            return false;
        }

        var row;
        if (this.currentSearch && text == this.currentSearch.text)
            row = this.currentSearch.findNext(true);
        else
        {
            function findRow(node) { return getAncestorByClass(node, "netRow"); }
            this.currentSearch = new TextSearch(this.panelNode, findRow);
            row = this.currentSearch.find(text);
        }

        if (row)
        {
            var sel = this.document.defaultView.getSelection();
            sel.removeAllRanges();
            sel.addRange(this.currentSearch.range);

            scrollIntoCenterView(row, this.panelNode);
            return true;
        }
        else
            return false;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    updateFile: function(file)
    {
        if (!file.invalid)
        {
            file.invalid = true;
            this.queue.push(file);
        }
    },

    invalidatePhase: function(phase)
    {
        if (phase && !phase.invalidPhase)
        {
            phase.invalidPhase = true;
            this.invalidPhases = true;
        }
    },

    updateLayout: function()
    {
        if (!this.queue.length)
            return;

        var scrolledToBottom = isScrolledToBottom(this.panelNode);

        this.layout();

        if (scrolledToBottom)
            scrollToBottom(this.panelNode);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    layout: function()
    {
        if (!this.queue.length || !this.context.netProgress ||
            !Firebug.NetMonitor.isEnabled(this.context))
            return;

        if (!this.table)
        {
            var limitInfo = {
                totalCount: 0,
                limitPrefsTitle: $STRF("LimitPrefsTitle", [Firebug.prefDomain+".net.logLimit"])
            };

            this.table = this.tableTag.replace({}, this.panelNode, this);
            this.limitRow = NetLimit.createRow(this.table.firstChild, limitInfo);
            this.summaryRow =  this.summaryTag.insertRows({}, this.table.lastChild.lastChild)[0];
        }

        var rightNow = now();

        this.updateRowData(rightNow);
        this.updateLogLimit(maxQueueRequests);
        this.updateTimeline(rightNow);
        this.updateSummaries(rightNow);
    },

    updateRowData: function(rightNow)
    {
        var queue = this.queue;
        this.queue = [];

        var phase;
        var newFileData = [];

        for (var i = 0; i < queue.length; ++i)
        {
            var file = queue[i];
            if (!file.phase)
              continue;

            file.invalid = false;

            phase = this.calculateFileTimes(file, phase, rightNow);

            this.updateFileRow(file, newFileData);
            this.invalidatePhase(phase);
        }

        if (newFileData.length)
        {
            var tbody = this.table.firstChild;
            var lastRow = tbody.lastChild.previousSibling;
            var row = this.fileTag.insertRows({files: newFileData}, lastRow)[0];

            for (var i = 0; i < newFileData.length; ++i)
            {
                var file = newFileData[i].file;
                row.repObject = file;
                file.row = row;
                row = row.nextSibling;
            }
        }
    },

    updateFileRow: function(file, newFileData)
    {
        var row = file.row;
        if (file.toRemove)
        {
            this.removeLogEntry(file, true);
        }
        else if (!row)
        {
            newFileData.push({
                file: file,
                offset: this.barOffset + "%",
                width: this.barWidth + "%",
                elapsed: file.loaded ? this.elapsed : -1
            });
        }
        else
        {
            var sizeLabel = row.childNodes[3].firstChild;
            sizeLabel.firstChild.nodeValue = this.getSize(file);

            var methodLabel = row.childNodes[1].firstChild;
            methodLabel.firstChild.nodeValue = this.getStatus(file);

            var hrefLabel = row.childNodes[0].firstChild;
            hrefLabel.firstChild.nodeValue = this.getHref(file);

            if (file.mimeType && !file.category)
            {
                removeClass(row, "category-undefined");
                setClass(row, "category-"+getFileCategory(file));
            }

            if (file.responseHeaders)
                setClass(row, "hasHeaders");

            if (file.fromCache)
                setClass(row, "fromCache");
            else
                removeClass(row, "fromCache");

            if (this.isError(file))
            {
                setClass(row, "responseError");

                var hrefLabel = row.firstChild.firstChild.firstChild;
                hrefLabel.nodeValue = this.getHref(file);
            }

            var timeLabel = row.childNodes[4].firstChild.lastChild.firstChild;

            if (file.loaded)
            {
                removeClass(row, "collapsed");
                setClass(row, "loaded");
                timeLabel.innerHTML = this.formatTime(this.elapsed);
            }
            else
            {
                removeClass(row, "loaded");
                timeLabel.innerHTML = "&nbsp;";
            }

            if (hasClass(row, "opened"))
            {
                var netInfoBox = row.nextSibling.firstChild.firstChild;
                Firebug.NetMonitor.NetInfoBody.updateInfo(netInfoBox, file, this.context);
            }
        }
    },

    updateTimeline: function(rightNow)
    {
        //var rootFile = this.context.netProgress.rootFile; // XXXjjb never read?
        var tbody = this.table.firstChild;

        // XXXjoe Don't update rows whose phase is done and layed out already
        var phase;
        for (var row = tbody.firstChild; row; row = row.nextSibling)
        {
            var file = row.repObject;

            // Some rows aren't associated with a file (e.g. header, sumarry).
            if (!file)
                continue;

            phase = this.calculateFileTimes(file, phase, rightNow);

            // Get bar nodes
            var resolvingBar = row.childNodes[4].firstChild.childNodes[1];
            var connectingBar = resolvingBar.nextSibling;
            var waitingBar = connectingBar.nextSibling;
            var respondedBar = waitingBar.nextSibling;
            var contentLoadBar = respondedBar.nextSibling;
            var windowLoadBar = contentLoadBar.nextSibling;
            var timeBar = windowLoadBar.nextSibling;

            // All bars starts at the beginning
            resolvingBar.style.left = connectingBar.style.left = waitingBar.style.left = 
                respondedBar.style.left = timeBar.style.left = this.barOffset + "%";

            // Sets width of all bars (using style). The width is computed according to measured timing.
            resolvingBar.style.width = this.barResolvingWidth ? this.barResolvingWidth + "%" : "1px";
            connectingBar.style.width = this.barConnectingWidth ? this.barConnectingWidth + "%" : "1px";
            waitingBar.style.width = this.barWaitingWidth + "%";
            respondedBar.style.width = this.barRespondedWidth + "%";
            timeBar.style.width = this.barWidth + "%";

            if (this.contentLoadBarOffset) {
                contentLoadBar.style.left = this.contentLoadBarOffset + "%";
                contentLoadBar.style.display = "block";
                this.contentLoadBarOffset = null;
            }

            if (this.windowLoadBarOffset) {
                windowLoadBar.style.left = this.windowLoadBarOffset + "%";
                windowLoadBar.style.display = "block";
                this.windowLoadBarOffset = null;
            }

            /*FBTrace.sysout("net.updateTimeline resolving: " + 
                resolvingBar.style.left + " : "+  resolvingBar.style.width + ", connecting: " + 
                connectingBar.style.left + " : "+  connectingBar.style.width + ", waiting: " + 
                waitingBar.style.left + " : " + waitingBar.style.width + ", time: " + 
                timeBar.style.left + " : " + timeBar.style.width + ", DOMContentLoaded: " +
                contentLoadBar.style.left + ", load: " +
                windowLoadBar.style.left, file);*/
        }
    },

    updateSummaries: function(rightNow, updateAll)
    {
        if (!this.invalidPhases && !updateAll)
            return;

        this.invalidPhases = false;

        var phases = this.context.netProgress.phases;
        if (!phases.length)
            return;

        var fileCount = 0, totalSize = 0, cachedSize = 0, totalTime = 0;
        for (var i = 0; i < phases.length; ++i)
        {
            var phase = phases[i];
            phase.invalidPhase = false;

            var summary = this.summarizePhase(phase, rightNow);
            fileCount += summary.fileCount;
            totalSize += summary.totalSize;
            cachedSize += summary.cachedSize;
            totalTime += summary.totalTime
        }

        var row = this.summaryRow;
        if (!row)
            return;

        var countLabel = row.firstChild.firstChild;
        countLabel.firstChild.nodeValue = fileCount == 1
            ? $STR("Request")
            : $STRF("RequestCount", [fileCount]);

        var sizeLabel = row.childNodes[3].firstChild;
        sizeLabel.firstChild.nodeValue = this.formatSize(totalSize);

        var cacheSizeLabel = row.lastChild.firstChild.firstChild;
        cacheSizeLabel.setAttribute("collapsed", cachedSize == 0);
        cacheSizeLabel.childNodes[1].firstChild.nodeValue = this.formatSize(cachedSize);

        var timeLabel = row.lastChild.firstChild.lastChild.firstChild;
        timeLabel.innerHTML = this.formatTime(totalTime);
    },

    calculateFileTimes: function(file, phase, rightNow)
    {
        var phases = this.context.netProgress.phases;

        if (phase != file.phase)
        {
            phase = file.phase;
            this.phaseStartTime = phase.startTime;
            this.phaseEndTime = phase.endTime ? phase.endTime : rightNow;

            // End of the first phase has to respect even the window "onload" event time, which 
            // can occur after the last received file. This sets the extent of the timeline so, 
            // the windowLoadBar is visible.
            if (phase.windowLoadTime && this.phaseEndTime < phase.windowLoadTime)
                this.phaseEndTime = phase.windowLoadTime;

            this.phaseElapsed = this.phaseEndTime - phase.startTime;
        }

        var elapsed = file.loaded ? file.endTime - file.startTime : this.phaseEndTime - file.startTime;
        this.barWidth = Math.floor((elapsed/this.phaseElapsed) * 100);
        this.barOffset = Math.floor(((file.startTime-this.phaseStartTime)/this.phaseElapsed) * 100);
        this.barResolvingWidth = Math.floor(((file.resolvingTime - file.startTime)/this.phaseElapsed) * 100); 
        this.barConnectingWidth = Math.floor(((file.connectingTime - file.startTime)/this.phaseElapsed) * 100); 
        this.barWaitingWidth = Math.floor(((file.waitingForTime - file.startTime)/this.phaseElapsed) * 100); 
        this.barRespondedWidth = Math.floor(((file.respondedTime - file.startTime)/this.phaseElapsed) * 100); 
        
        // Total request time doesn't include the time spent in queue.
        this.elapsed = elapsed - (file.waitingForTime - file.connectingTime);

        // Compute also offset for the contentLoadBar and windowLoadBar, which are 
        // displayed for the first phase.
        if (phase.contentLoadTime)
            this.contentLoadBarOffset = Math.floor(((phase.contentLoadTime-this.phaseStartTime)/this.phaseElapsed) * 100);

        if (phase.windowLoadTime)
            this.windowLoadBarOffset = Math.floor(((phase.windowLoadTime-this.phaseStartTime)/this.phaseElapsed) * 100);

        return phase;
    },

    updateLogLimit: function(limit)
    {
        var netProgress = this.context.netProgress;

        // Must be positive number;
        limit = Math.max(0, limit) + netProgress.pending.length;

        var files = netProgress.files;
        var filesLength = files.length;
        if (!filesLength || filesLength <= limit)
            return;

        // Remove old requests.
        var removeCount = Math.max(0, filesLength - limit);
        for (var i=0; i<removeCount; i++)
        {
            var file = files[0];
            this.removeLogEntry(file);

            // Remove the file occurrence from the queue.
            for (var j=0; j<this.queue.length; j++)
            {
                if (this.queue[j] == file) {
                    this.queue.splice(j, 1);
                    j--;
                }
            }
        }
    },

    removeLogEntry: function(file, noInfo)
    {
        if (!this.removeFile(file))
            return;

        if (!this.table || !this.table.firstChild)
            return;

        if (file.row)
        {
            // The file is loaded and there is a row that has to be removed from the UI.
            var tbody = this.table.firstChild;
            tbody.removeChild(file.row);
        }

        if (noInfo || !this.limitRow)
            return;

        this.limitRow.limitInfo.totalCount++;

        NetLimit.updateCounter(this.limitRow);

        //if (netProgress.currentPhase == file.phase)
        //  netProgress.currentPhase = null;
    },

    removeFile: function(file)
    {
        var netProgress = this.context.netProgress;
        var files = netProgress.files;
        var index = files.indexOf(file);
        if (index == -1)
            return false;

        var requests = netProgress.requests;
        var phases = netProgress.phases;

        files.splice(index, 1);
        requests.splice(index, 1);

        // Don't forget to remove the phase whose last file has been removed.
        var phase = file.phase;
        phase.removeFile(file);
        if (!phase.files.length)
        {
          remove(phases, phase);

          if (netProgress.currentPhase == phase)
            netProgress.currentPhase = null;
        }

        return true;
    }
});

// ************************************************************************************************

Firebug.NetMonitor.TimeInfoTip = domplate(Firebug.Rep,
{
    tag: 
        TABLE({class: "timeInfoTip"},
            TBODY(
                TR(
                    TD({class: "netResolvingBar timeInfoTipBar"}),
                    TD("$file|getResolvingTime : " + $STR("requestinfo.DNS Lookup"))
                ),
                TR(
                    TD({class: "netConnectingBar timeInfoTipBar"}),
                    TD("$file|getConnectintTime : " + $STR("requestinfo.Connecting"))
                ),
                TR(
                    TD({class: "netWaitingBar timeInfoTipBar"}),
                    TD("$file|getWaitingTime : " + $STR("requestinfo.Queuing"))
                ),
                TR(
                    TD({class: "netRespondedBar timeInfoTipBar"}),
                    TD("$file|getResponseTime : " + $STR("requestinfo.Waiting For Response"))
                ),
                TR({$loaded: "$file.loaded", 
                    $fromCache: "$file.fromCache"},
                    TD({class: "netTimeBar timeInfoTipBar"}),
                    TD("$file|getLoadingTime : " + $STR("requestinfo.Receiving Data"))
                ),
                TR(
                    TD({align: "center"},
                        DIV({class: "netContentLoadBar timeInfoTipBar"})
                    ),
                    TD("$file|getContentLoadTime : " + $STR("requestinfo.DOMContentLoaded"))
                ),
                TR(
                    TD({align: "center"},
                        DIV({class: "netWindowLoadBar timeInfoTipBar"})
                    ),
                    TD("$file|getWindowLoadTime : " + $STR("requestinfo.Load"))
                )
            )
        ),

    getResolvingTime: function(file)
    {
        return formatTime(file.resolvingTime - file.startTime);
    },

    getConnectintTime: function(file)
    {
        return formatTime(file.connectingTime - file.startTime);
    },

    getWaitingTime: function(file)
    {
        return formatTime(file.waitingForTime - file.connectingTime);
    },

    getResponseTime: function(file)
    {
        return formatTime(file.respondedTime - file.waitingForTime);
    },

    getLoadingTime: function(file)
    {
        return formatTime(file.endTime - file.respondedTime);
    },

    getWindowLoadTime: function(file)
    {
        if (!file.phase.windowLoadTime)
            return "";

        var time = file.phase.windowLoadTime - file.startTime;
        return (time > 0 ? "+" : "") + formatTime(time);
    },

    getContentLoadTime: function(file)
    {
        if (!file.phase.contentLoadTime)
            return "";

        var time = file.phase.contentLoadTime - file.startTime;
        return (time > 0 ? "+" : "") + formatTime(time);
    },
});

// ************************************************************************************************

Firebug.NetMonitor.NetLimit = domplate(Firebug.Rep,
{
    collapsed: true,

    tableTag:
        DIV(
            TABLE({width: "100%", cellpadding: 0, cellspacing: 0},
                TBODY()
            )
        ),

    limitTag:
        TR({class: "netRow netLimitRow", $collapsed: "$isCollapsed"},
            TD({class: "netCol netLimitCol", colspan: 5},
                TABLE({cellpadding: 0, cellspacing: 0},
                    TBODY(
                        TR(
                            TD(
                                SPAN({class: "netLimitLabel"},
                                    $STR("LimitExceeded")
                                )
                            ),
                            TD({style: "width:100%"}),
                            TD(
                                BUTTON({class: "netLimitButton", title: "$limitPrefsTitle",
                                    onclick: "$onPreferences"},
                                  $STR("LimitPrefs")
                                )
                            ),
                            TD("&nbsp;")
                        )
                    )
                )
            )
        ),

    isCollapsed: function()
    {
        return this.collapsed;
    },

    onPreferences: function(event)
    {
        openNewTab("about:config");
    },

    updateCounter: function(row)
    {
        removeClass(row, "collapsed");

        // Update info within the limit row.
        var limitLabel = getElementByClass(row, "netLimitLabel");
        limitLabel.firstChild.nodeValue = $STRF("LimitExceeded", [row.limitInfo.totalCount]);
    },

    createTable: function(parent, limitInfo)
    {
        var table = this.tableTag.replace({}, parent);
        var row = this.createRow(table.firstChild.firstChild, limitInfo);
        return [table, row];
    },

    createRow: function(parent, limitInfo)
    {
        var row = this.limitTag.insertRows(limitInfo, parent, this)[0];
        row.limitInfo = limitInfo;
        return row;
    },

    // nsIPrefObserver
    observe: function(subject, topic, data)
    {
        // We're observing preferences only.
        if (topic != "nsPref:changed")
          return;

        if (data.indexOf("net.logLimit") != -1)
            this.updateMaxLimit();
    },

    updateMaxLimit: function()
    {
        var value = Firebug.getPref(Firebug.prefDomain, "net.logLimit");
        maxQueueRequests =  value ? value : maxQueueRequests;
    }
});

var NetLimit = Firebug.NetMonitor.NetLimit;

// ************************************************************************************************

function NetProgress(context)
{
    this.context = context;

    var panel = null;
    var queue = [];

    this.post = function(handler, args)
    {
        if (panel)
        {
            var file = handler.apply(this, args);
            if (file)
            {
                panel.updateFile(file);

                // If the panel isn't currently visible, make sure the limit is up to date.
                if (!panel.layoutInterval)
                    panel.updateLogLimit(maxQueueRequests);

                return file;
            }
        }
        else
        {
            // The first page request is made before the initContext (known problem).
            queue.push(handler, args);
        }
    };

    this.flush = function()
    {
        for (var i=0; i<queue.length; i+=2)
            this.post(queue[i], queue[i+1]);

        queue = [];
    };

    this.activate = function(activePanel)
    {
        this.panel = panel = activePanel;
        if (panel)
            this.flush();
    };

    this.update = function(file)
    {
        if (panel)
            panel.updateFile(file);
    };

    this.clear = function()
    {
        this.requests = [];
        this.files = [];
        this.phases = [];
        this.documents = [];
        this.windows = [];

        queue = [];
        requestQueue = [];
    };

    // tabCache listener. This must be property of the object itself (not of the prototype).
    // So the FBL.dispatch method can find it (using hasOwnProperty).
    this.onStoreResponse = function(win, request, lines)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
            file.responseText = lines ? lines.join("\n") : null;
    };

    this.clear();
}

NetProgress.prototype =
{
    panel: null,
    pending: [],

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    requestedFile: function requestedFile(request, time, win, category)
    {
        var file = this.getRequestFile(request, win);
        if (file)
        {
            if (FBTrace.DBG_NET)
                FBTrace.sysout("net.requestedFile +0 " + getPrintableTime() + ", " +
                    request.URI.path, file);

            // For cached image files, we may never hear another peep from any observers
            // after this point, so we have to assume that the file is cached and loaded
            // until we get a respondedFile call later
            file.startTime = file.endTime = time;
            file.waitingForTime = time;
            file.resolvingTime = time;
            file.connectingTime = time;
            file.respondedTime = time;

            if (category && !file.category)
                file.category = category;

            file.isBackground = request.loadFlags & LOAD_BACKGROUND;

            this.awaitFile(request, file);
            this.extendPhase(file);

            return file;
        }
        else                                                                                          /*@explore*/
        {                                                                                             /*@explore*/
            if (FBTrace.DBG_NET)                                                                      /*@explore*/
                FBTrace.dumpProperties("net.requestedFile no file for request=", request);            /*@explore*/
        }                                                                                             /*@explore*/
    },

    respondedFile: function respondedFile(request, time, info)
    {
        var file = this.getRequestFile(request);
        if (file)
        {
            file.respondedTime = time;
            file.endTime = time;

            if (request.contentLength > 0)
                file.size = request.contentLength;

            if (info.responseStatus == 304)
                file.fromCache = true;
            else if (!file.fromCache)
                file.fromCache = false;

            getHttpHeaders(request, file);

            file.responseStatus = info.responseStatus;
            file.responseStatusText = info.responseStatusText;
            file.postText = info.postText;

            this.endLoad(file);
            this.arriveFile(file, request);

            if (file.fromCache)
                getCacheEntry(file, this);

            dispatch(listeners, "onLoad", [this.context, file]);

            if (FBTrace.DBG_NET)
                FBTrace.sysout("net.respondedFile +" + (now() - file.startTime) + " " +
                     getPrintableTime() + ", " + request.URI.path, file);

            return file;
        }
    },

    waitingForFile: function waitingForFile(request, time)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            if (!file.receivingStarted) 
            {
                file.waitingForTime = time;
                file.receivingStarted = true;
            }
        }

        // Don't update the UI now (optimalization).
        return null;
    },

    connectingFile: function connectingFile(request, time)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            file.connectingTime = time;
        }

        // Don't update the UI now (optimalization).
        return null;
    },

    receivingFile: function receivingFile(request, time)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            file.endTime = time;
        }

        return file;
    },

    resolvingFile: function resolvingFile(request, time)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            file.resolvingTime = time;
        }

        return file;
    },

    progressFile: function progressFile(request, progress, expectedSize, time)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            file.size = progress;
            file.expectedSize = expectedSize;
            file.endTime = time;

            //this.endLoad(file);
        }

        return file;
    },

    stopFile: function stopFile(request, time, postText, responseText)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            if (FBTrace.DBG_NET)
                FBTrace.sysout("net.stopFile +" + (now() - file.startTime) + " " + 
                    getPrintableTime() + ", " + request.URI.path, file);

            file.endTime = time;
            file.postText = postText;
            file.responseText = responseText;

            getHttpHeaders(request, file);

            this.arriveFile(file, request);

            // Don't mark this file as "loaded". Only request for which the http-on-examine-response
            // event is received is displayed within the list. This method is used by spy.
            //this.endLoad(file);

            getCacheEntry(file, this);
        }

        return file;
    },

    cacheEntryReady: function cacheEntryReady(request, file, size)
    {
        //if (FBTrace.DBG_NET)
        //    FBTrace.sysout("net.cacheEntryReady for file.href: " + file.href + "\n");

        if (size != -1)
            file.size = size;

        if (file.loaded)
        {
            getHttpHeaders(request, file);
            this.arriveFile(file, request);
            return file;
        }

        // Don't update the UI.
        return null;
    },

    removeFile: function removeFile(request, file, size)
    {
        if (file.loaded)
            return;

        if (!this.pending.length)
        {
            this.context.clearInterval(this.pendingInterval);
            delete this.pendingInterval;
        }

        file.toRemove = true;
        return file;
    },

    windowLoad: function windowLoad(window, time)
    {
        if (FBTrace.DBG_NET)
            FBTrace.sysout("net.windowLoad +? " + getPrintableTime() + ", " + 
                window.location.href, this.phases);

        if (!this.phases.length)
            return;

        // Update all requests that belong to the first phase.
        var firstPhase = this.phases[0];
        firstPhase.windowLoadTime = time;
        for (var i=0; i<firstPhase.files.length; i++)
            this.panel.updateFile(firstPhase.files[i]);

        return null;
    },

    contentLoad: function contentLoad(window, time)
    {
        if (FBTrace.DBG_NET)
            FBTrace.sysout("net.contentLoad +? " + getPrintableTime() + ", " + 
                window.location.href);

        if (!this.phases.length)
            return;

        // Update all requests that belong to the first phase.
        var firstPhase = this.phases[0];
        firstPhase.contentLoadTime = time;
        for (var i=0; i<firstPhase.files.length; i++)
            this.panel.updateFile(firstPhase.files[i]);

        return null;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    getRequestFile: function getRequestFile(request, win, noCreate)
    {
        var name = safeGetName(request);
        if (!name || reIgnore.exec(name))
            return null;

        var index = this.requests.indexOf(request);
        if (index == -1 && noCreate)
            return null;

        if (index == -1)
        {
            if (!win || getRootWindow(win) != this.context.window)
                return;

            var fileDoc = this.getRequestDocument(win);
            var isDocument = request.loadFlags & LOAD_DOCUMENT_URI && fileDoc.parent;
            var doc = isDocument ? fileDoc.parent : fileDoc;

            var file = doc.createFile(request);
            if (isDocument)
            {
                fileDoc.documentFile = file;
                file.ownDocument = fileDoc;
            }

            file.request = request;
            this.requests.push(request);
            this.files.push(file);

            return file;
        }

        // There is already a file for the reqeust so use it.
        return this.files[index];
    },

    getRequestDocument: function(win)
    {
        if (win)
        {
            var index = this.windows.indexOf(win);
            if (index == -1)
            {
                var doc = new NetDocument();
                if (win.parent != win)
                    doc.parent = this.getRequestDocument(win.parent);

                //doc.level = getFrameLevel(win);

                this.documents.push(doc);
                this.windows.push(win);

                return doc;
            }
            else
                return this.documents[index];
        }
        else
            return this.documents[0];
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    awaitFile: function(request, file)
    {
        //if (FBTrace.DBG_NET)
        //    FBTrace.sysout("net.awaitFile for file.href: " + file.href + "\n");

        this.pending.push(file);

        // XXXjoe Remove files after they have been checked N times
        if (!this.pendingInterval)
        {
            this.pendingInterval = this.context.setInterval(bindFixed(function()
            {
                for (var i = 0; i < this.pending.length; ++i)
                {
                    var file = this.pending[i];
                    if (file.pendingCount++ > maxPendingCheck)
                    {
                        this.pending.splice(i, 1);
                        --i;

                        this.post(cacheEntryReady, [request, file, 0]);
                        this.post(removeFile, [request, file, 0]);
                    }
                    else
                        waitForCacheCompletion(request, file, this);
                }
            }, this), 300);
        }
    },

    arriveFile: function(file, request)
    {
        //if (FBTrace.DBG_NET)                                                                                           /*@explore*/
        //    FBTrace.sysout("net.arriveFile for file.href="+file.href+" and request.name="+safeGetName(request)+"\n");  /*@explore*/

        var index = this.pending.indexOf(file);
        if (index != -1)
            this.pending.splice(index, 1);

        if (!this.pending.length)
        {
            this.context.clearInterval(this.pendingInterval);
            delete this.pendingInterval;
        }
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    endLoad: function(file)
    {
        if (FBTrace.DBG_NET)
            FBTrace.sysout("net.endLoad +" + (now() - file.startTime) + " " + 
                getPrintableTime() + ", " + file.request.URI.path, file);

        // Set file as loaded.
        file.loaded = true;

        // Update last finished file of the associated phase.
        file.phase.lastFinishedFile = file;
    },

    extendPhase: function(file)
    {
        if (this.currentPhase)
        {
            // If the new request has been started within a "phaseInterval" after the
            // previous reqeust has been started, associate it with the current phase;
            // otherwise create a new phase.
            var lastStartTime = this.currentPhase.lastStartTime;
            if (this.loaded && file.startTime - lastStartTime >= phaseInterval)
                this.startPhase(file);
            else
                this.currentPhase.addFile(file);
        }
        else
        {
            // If there is no phase yet, just create it.
            this.startPhase(file);
        }
    },

    startPhase: function(file)
    {
        var phase = new NetPhase(file);
        phase.initial = !this.currentPhase;

        this.currentPhase = phase;
        this.phases.push(phase);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // nsISupports

    QueryInterface: function(iid)
    {
        if (iid.equals(nsIWebProgressListener)
            || iid.equals(nsISupportsWeakReference)
            || iid.equals(nsISupports))
        {
            return this;
        }

        throw Components.results.NS_NOINTERFACE;
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
    // nsIWebProgressListener

    onStateChange: function(progress, request, flag, status)
    {
        // For image files we can't get the nsIHttpChannel (the request object is imgIRequest 
        // in such a case). So, this method is not much useful.
        var file = this.getRequestFile(request, null, true);
        if (FBTrace.DBG_NET)
            FBTrace.sysout("net.onStateChange +" + (file ? (now() - file.startTime) : "?") + " " + 
                getPrintableTime() + ", " + getStateDescription(flag) + ", " + 
                safeGetName(request), file);
    },

    onProgressChange : function(progress, request, current, max, total, maxTotal)
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            if (FBTrace.DBG_NET)
                FBTrace.sysout("net.onProgressChange +" + (now() - file.startTime) + " " + 
                    getPrintableTime() + ", " + "progress: " + current + 
                    ", expectedSize: " + max + ", " + request.URI.path, file);

            this.post(progressFile, [request, current, max, now()]);
        }
    },

    onStatusChange: function(progress, request, status, message) 
    {
        var file = this.getRequestFile(request, null, true);
        if (file)
        {
            if (FBTrace.DBG_NET)
                FBTrace.sysout("net.onStatusChange +" + (now() - file.startTime) + " " + 
                    getPrintableTime() + ", " + getStatusDescription(status) + 
                    ", " + message + ", " + request.URI.path, file);

            if (status == Ci.nsISocketTransport.STATUS_CONNECTING_TO || status == Ci.nsISocketTransport.STATUS_CONNECTED_TO)
                this.post(connectingFile, [request, now()]);
            else if (status == Ci.nsISocketTransport.STATUS_WAITING_FOR)
                this.post(waitingForFile, [request, now()]);
            else if (status == Ci.nsISocketTransport.STATUS_RECEIVING_FROM)
                this.post(receivingFile, [request, now()]);
            else if (status == Ci.nsISocketTransport.STATUS_RESOLVING)
                this.post(resolvingFile, [request, now()]);
            
        }
    },

    stateIsRequest: false,
    onLocationChange: function() {},
    onSecurityChange : function() {},
    onLinkIconAvailable : function() {},
};

var requestedFile = NetProgress.prototype.requestedFile;
var respondedFile = NetProgress.prototype.respondedFile;
var connectingFile = NetProgress.prototype.connectingFile;
var waitingForFile = NetProgress.prototype.waitingForFile;
var receivingFile = NetProgress.prototype.receivingFile;
var resolvingFile = NetProgress.prototype.resolvingFile;
var progressFile = NetProgress.prototype.progressFile;
var stopFile = NetProgress.prototype.stopFile;
var cacheEntryReady = NetProgress.prototype.cacheEntryReady;
var removeFile = NetProgress.prototype.removeFile;
var windowLoad = NetProgress.prototype.windowLoad;
var contentLoad = NetProgress.prototype.contentLoad;

// ************************************************************************************************

/**
 * A Document is a helper object that represents a document (window) on the page.
 * This object is created for main page document and for every embedded document (iframe)
 * for which a request is made.
 */
function NetDocument() { }

NetDocument.prototype =
{
    createFile: function(request)
    {
        return new NetFile(request.name, this);
    }
};

// ************************************************************************************************

/**
 * A File is a helper object that represents a file for which a request is made.
 * The document refers to it's parent document (NetDocument) through a member
 * variable.
 */
function NetFile(href, document)
{
    this.href = href;
    this.document = document
    this.pendingCount = 0;
}

NetFile.prototype =
{
    status: 0,
    files: 0,
    loaded: false,
    fromCache: false,
    size: -1,
    expectedSize: -1,
    endTime: null,
    waitingForTime: null,
    connectingTime: null,
};

Firebug.NetFile = NetFile;

// ************************************************************************************************

/**
 * A Phase is a helper object that groups requests made in the same time frame.
 * In other words, if a new requests is started within a given time (specified
 * by phaseInterval [ms]) - after previous request has been started -
 * it automatically belongs to the same phase.
 * If a request is started after this period, a new phase is created
 * and this file becomes to be the first in that phase.
 * The first phase is ended when the page finishes it's loading. Other phases
 * might be started by additional XHR made by the page.
 *
 * All phases are stored within NetProgress.phases array.
 *
 * Phases are used to compute size of the graphical timeline. The timeline
 * for each phase starts from the begining of the graph.
 */
function NetPhase(file)
{
  // Start time of the phase. Remains the same, even if the file
  // is removed from the log (due to a max limit of entries).
  // This ensures stability of the time line.
  this.startTime = file.startTime;

  // The last finished request (file) in the phase.
  this.lastFinishedFile = null;

  // Set to true if the phase needs to be updated in the UI.
  this.invalidPhase = null;

  // List of files associated with this phase.
  this.files = [];

  this.addFile(file);
}

NetPhase.prototype =
{
    addFile: function(file)
    {
        this.files.push(file);
        file.phase = this;
    },

    removeFile: function removeFile(file)
    {
        remove(this.files, file);
        file.phase = null;

        // If the last file has been removed, update the last file member.
        if (file == this.lastFinishedFile)
        {
          if (this.files.length == 0)
          {
            this.lastFinishedFile = null;
          }
          else
          {
            for (var i=0; i<this.files.length; i++) {
              if (this.lastFinishedFile.endTime < this.files[i].endTime)
                this.lastFinishedFile = this.files[i];
            }
          }
        }
    },

    get lastStartTime()
    {
      return this.files[this.files.length - 1].startTime;
    },

    get endTime()
    {
      return this.lastFinishedFile ? this.lastFinishedFile.endTime : null;
    }
};

// ************************************************************************************************
// Local Helpers

function monitorContext(context)
{
    if (!context.netProgress)
    {
        var networkContext = null;

        // Use an existing context associated with the browser tab if any
        // or create a pure new network context.
        var tabId = Firebug.getTabIdForWindow(context.window);
        networkContext = contexts[tabId];
        if (networkContext) {
          networkContext.context = context;
          delete contexts[tabId];
        }
        else {
          networkContext = new NetProgress(context);
        }

        var listener = context.netProgress = networkContext;

        if (context.sourceCache.addListener)
            context.sourceCache.addListener(networkContext);

        // This listener is used to observe downlaod progress.
        context.browser.addProgressListener(listener, NOTIFY_ALL);
    }
}

function unmonitorContext(context)
{
    var netProgress = context.netProgress;
    if (netProgress)
    {
        if (netProgress.pendingInterval)
        {
            context.clearInterval(netProgress.pendingInterval);
            delete netProgress.pendingInterval;

            netProgress.pending.splice(0, netProgress.pending.length);
        }

        if (context.sourceCache.removeListener)
            context.sourceCache.removeListener(netProgress);

        if (context.browser.docShell)
            context.browser.removeProgressListener(netProgress, NOTIFY_ALL);

        delete context.netProgress;
    }
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function initCacheSession()
{
    if (!cacheSession)
    {
        var cacheService = CacheService.getService(nsICacheService);
        cacheSession = cacheService.createSession("HTTP", STORE_ANYWHERE, true);

        // xxxHonza setting this to false makes problems with the cache. See Issue 1029.
        //cacheSession.doomEntriesIfExpired = false;
    }
}

function waitForCacheCompletion(request, file, netProgress)
{
    try
    {
        initCacheSession();
        var descriptor = cacheSession.openCacheEntry(file.href, ACCESS_READ, false);
        if (descriptor)
            netProgress.post(cacheEntryReady, [request, file, descriptor.dataSize]);

        //if (FBTrace.DBG_NET)
        //    FBTrace.sysout("waitForCacheCompletion "+(descriptor?"posted ":"no cache entry ")+file.href+"\n");
    }
    catch (exc)
    {
        if (exc.result != NS_ERROR_CACHE_WAIT_FOR_VALIDATION
            && exc.result != NS_ERROR_CACHE_KEY_NOT_FOUND)
        {
            ERROR(exc);
            netProgress.post(cacheEntryReady, [request, file, -1]);
        }
    }
}

function getCacheEntry(file, netProgress)
{
    if (FBTrace.DBG_NET)
        FBTrace.sysout("net.getCacheEntry for file.href: " + file.href + "\n");

    // Pause first because this is usually called from stopFile, at which point
    // the file's cache entry is locked
    setTimeout(function delayGetCacheEntry()
    {
        try
        {
            initCacheSession();
            if (FBTrace.DBG_NET)
                FBTrace.sysout("net.delayGetCacheEntry for file.href=" + file.href + "\n");
            cacheSession.asyncOpenCacheEntry(file.href, ACCESS_READ, {
                onCacheEntryAvailable: function(descriptor, accessGranted, status)
                {
                    if (FBTrace.DBG_NET)
                        FBTrace.sysout("net.onCacheEntryAvailable for file.href=" + file.href + "\n");

                    if (descriptor)
                    {
                        if(file.size == -1)
                        {
                            file.size = descriptor.dataSize;
                        }
                        if(descriptor.lastModified && descriptor.lastFetched &&
                            descriptor.lastModified < Math.floor(file.startTime/1000)) {
                            file.fromCache = true;
                        }
                        file.cacheEntry = [
                          { name: "Last Modified",
                            value: getDateFromSeconds(descriptor.lastModified)
                          },
                          { name: "Last Fetched",
                            value: getDateFromSeconds(descriptor.lastFetched)
                          },
                          { name: "Expires",
                            value: getDateFromSeconds(descriptor.expirationTime)
                          },
                          { name: "Data Size",
                            value: descriptor.dataSize
                          },
                          { name: "Fetch Count",
                            value: descriptor.fetchCount
                          },
                          { name: "Device",
                            value: descriptor.deviceID
                          }
                        ];

                        // Get contentType from the cache.
                        descriptor.visitMetaData({
                            visitMetaDataElement: function(key, value) {
                                if (key == "response-head")
                                {
                                    var contentType = getContentTypeFromResponseHead(value);
                                    file.mimeType = getMimeType(contentType, file.href);
                                    return false;
                                }

                                return true;
                            }
                        });

                        netProgress.update(file);
                    }
                }
            });
        }
        catch (exc)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.dumpProperties("net.delayGetCacheEntry FAILS", exc);
        }
    });
}

function getContentTypeFromResponseHead(value)
{
    var values = value.split("\r\n");
    for (var i=0; i<values.length; i++)
    {
        var option = values[i].split(": ");
        if (option[0] == "Content-Type")
            return option[1];
    }
}

function getDateFromSeconds(s)
{
    var d = new Date();
    d.setTime(s*1000);
    return d;
}

function getHttpHeaders(request, file)
{
    try
    {
        var http = QI(request, nsIHttpChannel);
        file.method = http.requestMethod;
        file.status = request.responseStatus;
        file.urlParams = parseURLParams(file.href);

        if (!file.mimeType)
            file.mimeType = getMimeType(request.contentType, request.name);

        // Disable temporarily
        if (!file.responseHeaders && Firebug.collectHttpHeaders)
        {
            var requestHeaders = [], responseHeaders = [];

            http.visitRequestHeaders({
                visitHeader: function(name, value)
                {
                    requestHeaders.push({name: name, value: value});
                }
            });
            http.visitResponseHeaders({
                visitHeader: function(name, value)
                {
                    responseHeaders.push({name: name, value: value});
                }
            });

            file.requestHeaders = requestHeaders;
            file.responseHeaders = responseHeaders;
        }
    }
    catch (exc)
    {
    }
}

function getRequestCategory(request)
{
    try
    {
        if (request.notificationCallbacks)
        {
            if (request.notificationCallbacks instanceof XMLHttpRequest)
                return "xhr";
        }
    }
    catch (exc) {}
}

function safeGetName(request)
{
    try
    {
        return request.name;
    }
    catch (exc) { }

    return null;
}

function getFileCategory(file)
{
    if (file.category)
        return file.category;

    if (!file.mimeType)
    {
        var ext = getFileExtension(file.href);
        if (ext)
            file.mimeType = mimeExtensionMap[ext.toLowerCase()];
    }

    return (file.category = mimeCategoryMap[file.mimeType]);
}

function getMimeType(mimeType, uri)
{
    if (!mimeType || !(mimeCategoryMap.hasOwnProperty(mimeType)))
    {
        var ext = getFileExtension(uri);
        if (!ext)
            return mimeType;
        else
        {
            var extMimeType = mimeExtensionMap[ext.toLowerCase()];
            return extMimeType ? extMimeType : mimeType;
        }
    }
    else
        return mimeType;
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

function now()
{
    return (new Date()).getTime();
}

function getFrameLevel(win)
{
    var level = 0;

    for (; win && (win != win.parent) && (win.parent instanceof Window); win = win.parent)
        ++level;

    return level;
}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

Firebug.NetMonitor.NetInfoBody = domplate(Firebug.Rep,
{
    listeners: [],

    tag:
        DIV({class: "netInfoBody", _repObject: "$file"},
            TAG("$infoTabs", {file: "$file"}),
            TAG("$infoBodies", {file: "$file"})
        ),

    infoTabs:
        DIV({class: "netInfoTabs"},
            A({class: "netInfoParamsTab netInfoTab", onclick: "$onClickTab",
                view: "Params",
                $collapsed: "$file|hideParams"},
                $STR("URLParameters")
            ),
            A({class: "netInfoHeadersTab netInfoTab", onclick: "$onClickTab",
                view: "Headers"},
                $STR("Headers")
            ),
            A({class: "netInfoPostTab netInfoTab", onclick: "$onClickTab",
                view: "Post",
                $collapsed: "$file|hidePost"},
                $STR("Post")
            ),
            A({class: "netInfoPutTab netInfoTab", onclick: "$onClickTab",
                view: "Put",
                $collapsed: "$file|hidePut"},
                $STR("Put")
            ),
            A({class: "netInfoResponseTab netInfoTab", onclick: "$onClickTab",
                view: "Response",
                $collapsed: "$file|hideResponse"},
                $STR("Response")
            ),
            A({class: "netInfoCacheTab netInfoTab", onclick: "$onClickTab",
               view: "Cache",
               $collapsed: "$file|hideCache"},
               $STR("Cache")
            ),
            A({class: "netInfoHtmlTab netInfoTab", onclick: "$onClickTab",
               view: "Html",
               $collapsed: "$file|hideHtml"},
               $STR("HTML")
            )
        ),

    infoBodies:
        DIV({class: "netInfoBodies"},
            TABLE({class: "netInfoParamsText netInfoText netInfoParamsTable",
                    cellpadding: 0, cellspacing: 0}, TBODY()),
            TABLE({class: "netInfoHeadersText netInfoText netInfoHeadersTable",
                    cellpadding: 0, cellspacing: 0},
                TBODY(
                    TR({class: "netInfoResponseHeadersTitle"},
                        TD({colspan: 2},
                            DIV({class: "netInfoHeadersGroup"}, $STR("ResponseHeaders"))
                        )
                    ),
                    TR({class: "netInfoRequestHeadersTitle"},
                        TD({colspan: 2},
                            DIV({class: "netInfoHeadersGroup"}, $STR("RequestHeaders"))
                        )
                    )
                )
            ),
            DIV({class: "netInfoPostText netInfoText"},
                TABLE({class: "netInfoPostTable", cellpadding: 0, cellspacing: 0},
                    TBODY()
                )
            ),
            DIV({class: "netInfoPutText netInfoText"},
                TABLE({class: "netInfoPutTable", cellpadding: 0, cellspacing: 0},
                    TBODY()
                )
            ),
            DIV({class: "netInfoResponseText netInfoText"},
                DIV({class: "loadResponseMessage"}),
                BUTTON({onclick: "$onLoadResponse"},
                    SPAN("Load Response")
                )
            ),
            DIV({class: "netInfoCacheText netInfoText"},
                TABLE({class: "netInfoCacheTable", cellpadding: 0, cellspacing: 0},
                    TBODY()
                )
            ),
            DIV({class: "netInfoHtmlText netInfoText"},
                IFRAME({class: "netInfoHtmlPreview"})
            )
        ),

    headerDataTag:
        FOR("param", "$headers",
            TR(
                TD({class: "netInfoParamName"}, "$param.name"),
                TD({class: "netInfoParamValue"}, 
                    PRE("$param|getParamValue")
                )
            )
        ),

    customTab:
        A({class: "netInfo$tabId\\Tab netInfoTab", onclick: "$onClickTab", view: "$tabId"},
            "$tabTitle"
        ),

    customBody:
        DIV({class: "netInfo$tabId\\Text netInfoText"}),

    hideParams: function(file)
    {
        return !file.urlParams || !file.urlParams.length;
    },

    hidePost: function(file)
    {
        return file.method.toUpperCase() != "POST";
    },

    hidePut: function(file)
    {
        return file.method.toUpperCase() != "PUT";
    },

    hideResponse: function(file)
    {
        return file.category in binaryFileCategories;
    },

    hideCache: function(file)
    {
        return !file.cacheEntry || file.category=="image";
    },

    hideHtml: function(file)
    {
        return (file.mimeType != "text/html") && (file.mimeType != "application/xhtml+xml");
    },

    onClickTab: function(event)
    {
        this.selectTab(event.currentTarget);
    },

    getParamValue: function(param)
    {
        // This value is inserted into PRE element and so, make sure the HTML isn't escaped (1210).
        // This is why the second parameter is true. 
        // The PRE element preserves whitespaces so they are displayed the same, as they come from 
        // the server (1194).
        return wrapText(param.value, true);
    },

    // * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

    appendTab: function(netInfoBox, tabId, tabTitle)
    {
        // Create new tab and body.
        var args = {tabId: tabId, tabTitle: tabTitle};
        this.customTab.append(args, getElementByClass(netInfoBox, "netInfoTabs"));
        this.customBody.append(args, getElementByClass(netInfoBox, "netInfoBodies"));
    },

    selectTabByName: function(netInfoBox, tabName)
    {
        var tab = getChildByClass(netInfoBox, "netInfoTabs", "netInfo"+tabName+"Tab");
        if (tab)
            this.selectTab(tab);
    },

    selectTab: function(tab)
    {
        var netInfoBox = getAncestorByClass(tab, "netInfoBody");

        var view = tab.getAttribute("view");
        if (netInfoBox.selectedTab)
        {
            netInfoBox.selectedTab.removeAttribute("selected");
            netInfoBox.selectedText.removeAttribute("selected");
        }

        var textBodyName = "netInfo" + view + "Text";

        netInfoBox.selectedTab = tab;
        netInfoBox.selectedText = getElementByClass(netInfoBox, textBodyName);

        netInfoBox.selectedTab.setAttribute("selected", "true");
        netInfoBox.selectedText.setAttribute("selected", "true");

        var file = Firebug.getRepObject(netInfoBox);
        var context = Firebug.getElementPanel(netInfoBox).context;
        this.updateInfo(netInfoBox, file, context);
    },

    updateInfo: function(netInfoBox, file, context)
    {
        if (FBTrace.DBG_NET)                                     /*@explore*/
            FBTrace.dumpProperties("updateInfo file", file);     /*@explore*/

        var tab = netInfoBox.selectedTab;
        if (hasClass(tab, "netInfoParamsTab"))
        {
            if (file.urlParams && !netInfoBox.urlParamsPresented)
            {
                netInfoBox.urlParamsPresented = true;
                this.insertHeaderRows(netInfoBox, file.urlParams, "Params");
            }
        }

        if (hasClass(tab, "netInfoHeadersTab"))
        {
            if (file.responseHeaders && !netInfoBox.responseHeadersPresented)
            {
                netInfoBox.responseHeadersPresented = true;
                this.insertHeaderRows(netInfoBox, file.responseHeaders, "Headers", "ResponseHeaders");
            }

            if (file.requestHeaders && !netInfoBox.requestHeadersPresented)
            {
                netInfoBox.requestHeadersPresented = true;
                this.insertHeaderRows(netInfoBox, file.requestHeaders, "Headers", "RequestHeaders");
            }
        }

        if (hasClass(tab, "netInfoPostTab"))
        {
            var postTextBox = getElementByClass(netInfoBox, "netInfoPostText");
            if (!netInfoBox.postPresented)
            {
                netInfoBox.postPresented  = true;

                var text = getPostText(file, context);
                if (text != undefined)
                {
                    if (isURLEncodedFile(file, text))
                    {
                        var lines = text.split("\n");
                        var params = parseURLEncodedText(lines[lines.length-1]);
                        this.insertHeaderRows(netInfoBox, params, "Post");
                    }
                    else
                    {
                        var postText = formatPostText(text);
                        if (postText)
                            insertWrappedText(postText, postTextBox);
                    }
                }
            }
        }

        if (hasClass(tab, "netInfoPutTab"))
        {
            var putTextBox = getElementByClass(netInfoBox, "netInfoPutText");
            if (!netInfoBox.putPresented)
            {
                netInfoBox.putPresented  = true;

                var text = getPostText(file, context);
                if (text != undefined)
                {
                    if (isURLEncodedFile(file, text))
                    {
                        var lines = text.split("\n");
                        var params = parseURLEncodedText(lines[lines.length-1]);
                        this.insertHeaderRows(netInfoBox, params, "Put");
                    }
                    else
                    {
                        var putText = formatPostText(text);
                        if (putText)
                            insertWrappedText(putText, putTextBox);
                    }
                }
            }
        }

        if (hasClass(tab, "netInfoResponseTab") && file.loaded && !netInfoBox.responsePresented)
        {
            var responseTextBox = getElementByClass(netInfoBox, "netInfoResponseText");
            if (file.category == "image")
            {
                netInfoBox.responsePresented = true;

                var responseImage = netInfoBox.ownerDocument.createElement("img");
                responseImage.src = file.href;

                clearNode(responseTextBox);
                responseTextBox.appendChild(responseImage, responseTextBox);
            }
            else if (!(binaryCategoryMap.hasOwnProperty(file.category)))
            {
                var allowDoublePost = Firebug.getPref(Firebug.prefDomain, "allowDoublePost");

                // If the response is in the cache get it and display it;
                // otherwise display a button, which can be used by the user
                // to re-request the response from the server.

                // xxxHonza this is a workaround, which should be removed
                // as soon as the #430155 is fixed.
                // xxxHonza: OK, #430155 is fixed this must be removed.
                if (Ci.nsITraceableChannel || allowDoublePost || file.cacheEntry)
                {
                    this.setResponseText(file, netInfoBox, responseTextBox, context);
                }
                else
                {
                    var msgBox = getElementByClass(netInfoBox, "loadResponseMessage");
                    msgBox.innerHTML = doublePostForbiddenMessage(file.href);
                }
            }
        }

        if (hasClass(tab, "netInfoCacheTab") && file.loaded && !netInfoBox.cachePresented)
        {
            netInfoBox.cachePresented = true;

            var responseTextBox = getElementByClass(netInfoBox, "netInfoCacheText");
            if (file.cacheEntry) {
                this.insertHeaderRows(netInfoBox, file.cacheEntry, "Cache");
            }
        }

        if (hasClass(tab, "netInfoHtmlTab") && file.loaded && !netInfoBox.htmlPresented)
        {
            netInfoBox.htmlPresented = true;

            var text = (file.responseText != undefined) ? file.responseText
                : context.sourceCache.loadText(file.href, file.method, file);

            var iframe = getElementByClass(netInfoBox, "netInfoHtmlPreview");
            iframe.contentWindow.document.body.innerHTML = text;
        }

        // Notify listeners about update so, content of custom tabs can be updated.
        var NetInfoBody = Firebug.NetMonitor.NetInfoBody;
        dispatch(NetInfoBody.listeners, "updateTabBody", [netInfoBox, file, context]);
    },

    setResponseText: function(file, netInfoBox, responseTextBox, context)
    {
        // The response text can be empty so, test against undefined.
        var text = (file.responseText != undefined)
            ? file.responseText
            : context.sourceCache.loadText(file.href, file.method, file);

        if (text)
            insertWrappedText(text, responseTextBox);
        else
            insertWrappedText("", responseTextBox);

        netInfoBox.responsePresented = true;

        // Try to get the data from cache and update file.cacheEntry so,
        // the response is displayed automatically the next time the
        // net-entry is expanded again.
        getCacheEntry(file, context.netProgress);
    },

    onLoadResponse: function(event)
    {
        var file = Firebug.getRepObject(event.target);
        var netInfoBox = getAncestorByClass(event.target, "netInfoBody");
        var responseTextBox = getElementByClass(netInfoBox, "netInfoResponseText");

        this.setResponseText(file, netInfoBox, responseTextBox, FirebugContext);
    },

    insertHeaderRows: function(netInfoBox, headers, tableName, rowName)
    {
        var headersTable = getElementByClass(netInfoBox, "netInfo"+tableName+"Table");
        var tbody = headersTable.firstChild;
        var titleRow = getChildByClass(tbody, "netInfo" + rowName + "Title");

        if (headers.length)
        {
            this.headerDataTag.insertRows({headers: headers}, titleRow ? titleRow : tbody);
            removeClass(titleRow, "collapsed");
        }
        else
            setClass(titleRow, "collapsed");
    },

    addListener: function(listener)
    {
        this.listeners.push(listener);
    },

    removeListener: function(listener)
    {
        remove(this.listeners, listener);
    }
});

function doublePostForbiddenMessage(url)
{
    var msg = "Firebug needs to POST to the server to get this information for url:<br/><b>" + url + "</b><br/><br/>";
    msg += "This second POST can interfere with some sites.";
    msg += " If you want to send the POST again, open a new tab in Firefox, use URL 'about:config', ";
    msg += "set boolean value 'extensions.firebug.allowDoublePost' to true<br/>";
    msg += " This value is reset every time you restart Firefox";
    msg += " This problem will disappear when https://bugzilla.mozilla.org/show_bug.cgi?id=430155 is shipped.<br/><br/>";

    if (FBTrace.DBG_CACHE)
        FBTrace.sysout(msg);

    return msg;
}

// ************************************************************************************************

function findHeader(headers, name)
{
    for (var i = 0; i < headers.length; ++i)
    {
        if (headers[i].name == name)
            return headers[i].value;
    }
}

function formatPostText(text)
{
    if (text instanceof XMLDocument)
        return getElementXML(text.documentElement);
    else
        return text;
}

function getPostText(file, context)
{
    if (!file.postText)
        file.postText = readPostTextFromPage(file.href, context);

    if (!file.postText)
        file.postText = readPostTextFromRequest(file.request, context);

    return file.postText;
}

function isURLEncodedFile(file, text)
{
    if (text && text.indexOf("Content-Type: application/x-www-form-urlencoded") != -1)
        return true;

    // The header value doesn't have to be alway exactly "application/x-www-form-urlencoded",
    // there can be even charset specified. So, use indexOf rather than just "==".
    var headerValue = findHeader(file.requestHeaders, "Content-Type");
    if (headerValue && headerValue.indexOf("application/x-www-form-urlencoded") == 0)
        return true;

    return false;
}

// ************************************************************************************************

// HTTP listener - based on firebug-http-observer component
// This observer is used for observing the first document http-on-modify-request
// and http-on-examine-response events, which are fired before the context
// is initialized (initContext method call). Without this observer this events
// would be lost and the time measuring would be wrong.
//
// This observer stores these early requests in helper array (contexts) and maps
// them to appropriate tab - initContext then uses the array in order to access it.
//-----------------------------------------------------------------------------

var HttpObserver =
{
    registered: false,

    registerObserver: function()
    {
        if (this.registered)
            return;

        observerService.addObserver(this, "firebug-http-event", false);
        this.registered = true;
    },

    unregisterObserver: function()
    {
        if (!this.registered)
            return;

        observerService.removeObserver(this, "firebug-http-event");
        this.registered = false;
    },

    /* nsIObserve */
    observe: function(subject, topic, data)
    {
        try 
        {
            if (!(subject instanceof Ci.nsIHttpChannel))
                return;

            var win = getWindowForRequest(subject);
            var context = TabWatcher.getContextByWindow(win);
            if (!Firebug.NetMonitor.isEnabled(context))
                return;

            // Some requests are not associted with any page (e.g. favicon).
            // These are ignored as Net panel shows only page requests.
            var tabId = Firebug.getTabIdForWindow(win);
            if (!(tabId && win))
                return;

            if (topic == "http-on-modify-request")
                this.onModifyRequest(subject, win, tabId, context);
            else if (topic == "http-on-examine-response")
                this.onExamineResponse(subject, win, tabId, context);
        }
        catch (err)
        {
            if (FBTrace.DBG_ERRORS)
                FBTrace.sysout("net.observe EXCEPTION", err);
        }
    },

    onModifyRequest: function(request, win, tabId, context)
    {
        var name = request.URI.asciiSpec;
        var origName = request.originalURI.asciiSpec;
        var isRedirect = (name != origName);

        // We only need to create a new context if this is a top document uri (not frames).
        if ((request.loadFlags & nsIChannel.LOAD_DOCUMENT_URI) &&
            request.loadGroup && request.loadGroup.groupObserver &&
            win == win.parent && !isRedirect)
        {
            // Create a new network context prematurely.
            if (!contexts[tabId])
            contexts[tabId] = new NetProgress(null);
        }

        var networkContext = contexts[tabId];
        if (!networkContext)
            networkContext = context ? context.netProgress : null;

        if (networkContext) 
        {
            var category = getRequestCategory(request);
            networkContext.post(requestedFile, [request, now(), win, category]);
        }
    },

    onExamineResponse: function(request, win, tabId, context)
    {
        var networkContext = contexts[tabId];
        if (!networkContext)
            networkContext = context ? context.netProgress : null;

        var info = new Object();
        info.responseStatus = request.responseStatus;
        info.responseStatusText = request.responseStatusText;
        info.postText = readPostTextFromRequest(request, context);

        if (!info.postText)
            info.postText = readPostTextFromPage(request.name, context);

        if (FBTrace.DBG_NET && info.postText)
            FBTrace.dumpProperties("net.onExamineResponse, POST data: " + info.postText, info);

        if (networkContext)
            networkContext.post(respondedFile, [request, now(), info]);
    },

	/* nsISupports */
	QueryInterface: function(iid) 
	{
        if (iid.equals(Ci.nsISupports) || 
			iid.equals(Ci.nsIObserver)) {
 		    return this;
 		}
		
		throw Cr.NS_ERROR_NO_INTERFACE;
	}
}

// ************************************************************************************************
// Helper for tracing 

function getPrintableTime()
{
    var date = new Date();
    return "(" + date.getSeconds() + ":" + date.getMilliseconds() + ")";
}

// ************************************************************************************************

Firebug.registerActivableModule(Firebug.NetMonitor);
Firebug.registerPanel(NetPanel);

// ************************************************************************************************

}});




