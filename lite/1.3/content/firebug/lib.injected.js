FBL.ns(function() { with (FBL) {
// ************************************************************************************************

//----------------------------------------------------------------------------
// Injected Chrome
//----------------------------------------------------------------------------
FBL.UI = 
{
    CSS: '.fbToolbarSeparator{overflow:hidden;border:1px solid;border-color:transparent #fff transparent #777;height:7px;margin-top:11px;float:left;}.fbBtnInspectActive{background:#aaa;color:#fff !important;}html,body{margin:0;padding:0;overflow:hidden;background:#fff;font-family:Lucida Grande,Tahoma,sans-serif;font-size:11px;}.clear{clear:both;}#fbChrome{position:fixed;overflow:hidden;height:100%;width:100%;border-collapse:collapse;background:#fff;}#fbTop{height:50px;}#fbToolbar{position:absolute;z-index:5;width:100%;top:0;background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) #eee 0 0;height:27px;font-size:11px;}#fbPanelBars{top:27px;position:absolute;z-index:8;width:100%;background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) #d9d9d9 0 -27px;height:23px;}#fbContent{height:100%;vertical-align:top;}#fbBottom{height:18px;background:#fff;}#fbToolbarIcon{float:left;padding:5px 5px 0;}#fbToolbarIcon a{display:block;height:20px;width:20px;background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) #eee 0 -134px;text-decoration:none;cursor:default;}#fbToolbarButtons{float:left;padding:5px 2px 0 5px;}#fbToolbarButtons span{margin:0;padding:0;}#fbToolbarButtons a{text-decoration:none;display:block;float:left;color:#000;margin:1px;padding:3px 7px 3px;cursor:default;}#fbToolbarButtons a:hover{color:#333;margin:0;border:1px solid #fff;border-bottom:1px solid #bbb;border-right:1px solid #bbb;}#fbStatusBar{float:left;padding:9px 6px 0;}#fbStatusBar span{color:#808080;cursor:default;padding:0 4px 0 0;}#fbStatusBar span a{text-decoration:none;color:black;cursor:default;}#fbStatusBar span a:hover{color:blue;}#mainButtons{position:absolute;right:4px;top:7px;z-index:11;}#fbPanelBar1{width:255px; z-index:8;left:0;white-space:nowrap;background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) #d9d9d9 0 -27px;position:absolute;left:4px;}#fbPanelBar2Box{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) #d9d9d9 0 -27px;position:absolute;height:23px;width:300px; z-index:9;right:0;}#fbPanelBar2{position:absolute;width:290px; height:23px;padding-left:10px;}#fbPanelBox1,#fbPanelBox2{max-height:inherit;height:100%;font-size:11px;}#fbPanelBox2{background:#fff;}#fbPanelBox2{width:300px;background:#fff;}* html #fbPanel1{position:absolute;}#fbPanel2{padding-left:6px;background:#fff;}.hide{overflow:hidden !important;position:fixed !important;display:none !important;visibility:hidden !important;}#fbCommand{height:18px;}#fbCommandBox{position:absolute;width:100%;height:18px;bottom:0;overflow:hidden;z-index:9;background:#fff;border:0;border-top:1px solid #ccc;}#fbCommandIcon{position:absolute;color:#00f;top:2px;left:7px;display:inline;font:11px Monaco,monospace;z-index:10;}#fbCommandLine{position:absolute;width:100%;top:0;left:0;border:0;margin:0;padding:2px 0 2px 32px;font:11px Monaco,monospace;z-index:9;}#fbBottom[fixFirefox]{position:fixed;bottom:0;left:0;width:100%;z-index:10;}#fbBottom[fixFirefox] #fbCommand{display:block;}div.fbFitHeight{padding:0 1px;max-height:inherit;height:100%;overflow:auto;}#mainButtons a{font-size:1px;width:16px;height:16px;display:block;float:left;text-decoration:none;cursor:default;}#close{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) 0 -119px;}#close:hover{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) -16px -119px;}#detach{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) -32px -119px;}#detach:hover{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) -48px -119px;}.tab{text-decoration:none;display:block;float:left;width:auto;float:left;cursor:default;font-family:Lucida Grande,Tahoma,sans-serif;font-size:11px;font-weight:bold;height:23px;color:#565656;}.fbPanelBar span{display:block;float:left;}.fbPanelBar .tabL,.fbPanelBar .tabR{height:23px;width:8px;}.fbPanelBar .tabText{padding:4px 1px 0;}.tab:hover{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) 0 -73px;}.tab:hover .tabL{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) -16px -96px;}.tab:hover .tabR{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) -24px -96px;}.selectedTab{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) #e5e5e5 0 -50px !important;color:#000;}.selectedTab .tabL{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) 0 -96px !important;}.selectedTab .tabR{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/sprite.png) -8px -96px !important;}#fbHSplitter{position:absolute;left:0;top:0;width:100%;height:5px;overflow:hidden;cursor:n-resize !important;background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/pixel_transparent.gif);z-index:9;}.fbVSplitter{background:#eee;color:#000;border:1px solid #777;border-width:0 1px;width:4px;cursor:e-resize;overflow:hidden;right:294px;text-decoration:none;z-index:9;position:absolute;height:100%;top:27px;}div.lineNo{font:11px Monaco,monospace;float:left;display:inline;position:relative;margin:0;padding:0 5px 0 20px;background:#eee;color:#888;border-right:1px solid #ccc;text-align:right;}pre.nodeCode{font:11px Monaco,monospace;margin:0;padding-left:10px;overflow:hidden;}.nodeControl{margin-top:3px;margin-left:-14px;float:left;width:9px;height:9px;overflow:hidden;cursor:default;background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/tree_open.gif);}div.nodeMaximized{background:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/tree_close.gif);}div.objectBox-element{padding:1px 3px;}.objectBox-selector{cursor:default;}.selectedElement{background:highlight;color:#fff !important;}.selectedElement span{color:#fff !important;}@media screen and (-webkit-min-device-pixel-ratio:0){.selectedElement{background:#316AC5;color:#fff !important;}}.logRow *{font-size:11px;}.logRow{position:relative;border-bottom:1px solid #D7D7D7;padding:2px 4px 1px 6px;background-color:#FFFFFF;}.logRow-command{font-family:Monaco,monospace;color:blue;}.objectBox-string,.objectBox-text,.objectBox-number,.objectBox-function,.objectLink-element,.objectLink-textNode,.objectLink-function,.objectBox-stackTrace,.objectLink-profile{font-family:Monaco,monospace;}.objectBox-null{padding:0 2px;border:1px solid #666666;background-color:#888888;color:#FFFFFF;}.objectBox-string{color:red;white-space:pre;}.objectBox-number{color:#000088;}.objectBox-function{color:DarkGreen;}.objectBox-object{color:DarkGreen;font-weight:bold;font-family:Lucida Grande,sans-serif;}.objectBox-array{color:#000;}.logRow-info,.logRow-error,.logRow-warning{background:#fff no-repeat 2px 2px;padding-left:20px;padding-bottom:3px;}.logRow-info{background-image:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/infoIcon.png);}.logRow-warning{background-color:cyan;background-image:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/warningIcon.png);}.logRow-error{background-color:LightYellow;background-image:url(http://fbug.googlecode.com/svn/trunk/lite/1.3/skin/classic/errorIcon.png);color:#f00;}.errorMessage{vertical-align:top;color:#f00;}.objectBox-sourceLink{position:absolute;right:4px;top:2px;padding-left:8px;font-family:Lucida Grande,sans-serif;font-weight:bold;color:#0000FF;}.logRow-group{background:#EEEEEE;border-bottom:none;}.logGroup{background:#EEEEEE;}.logGroupBox{margin-left:24px;border-top:1px solid #D7D7D7;border-left:1px solid #D7D7D7;}.selectorTag,.selectorId,.selectorClass{font-family:Monaco,monospace;font-weight:normal;}.selectorTag{color:#0000FF;}.selectorId{color:DarkBlue;}.selectorClass{color:red;}.objectBox-element{font-family:Monaco,monospace;color:#000088;}.nodeChildren{padding-left:26px;}.nodeTag{color:blue;cursor:pointer;}.nodeValue{color:#FF0000;font-weight:normal;}.nodeText,.nodeComment{margin:0 2px;vertical-align:top;}.nodeText{color:#333333;}.nodeComment{color:DarkGreen;}.log-object{}.property{position:relative;clear:both;height:15px;}.propertyNameCell{vertical-align:top;float:left;width:28%;position:absolute;left:0;z-index:0;}.propertyValueCell{float:right;width:68%;background:#fff;position:absolute;padding-left:5px;display:table-cell;right:0;z-index:1;}.propertyName{font-weight:bold;}.FirebugPopup{height:100% !important;}.FirebugPopup #mainButtons{display:none !important;}.FirebugPopup #mainButtons{display:none !important;}.FirebugPopup #fbHSplitter{display:none !important;}.FirebugPopup #fbCommandBox{height:18px !important;}',
    HTML: '<table id="fbChrome" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td id="fbTop" colspan="2"><div id="mainButtons"><a id="detach" href="javascript:FB.detach()">&nbsp;</a><a id="close" href="javascript:FB.close()">&nbsp;</a></div><div id="fbHSplitter">&nbsp;</div><div id="fbToolbar"><span id="fbToolbarIcon"><a title="Firebug Lite Homepage" href="http://getfirebug.com/lite.html">&nbsp;</a></span><span id="fbToolbarButtons"><span><a id="fbBtnInspect" href="javascript:FB.startInspecting(this)">Inspect</a></span><span id="fbConsole_ToolbarButtons"><span><a href="javascript:FB.clear()">Clear</a></span></span><span id="fbHTML_ToolbarButtons"><span><a href="#">Edit</a></span></span></span><span class="fbToolbarSeparator"></span><span id="fbStatusBar"><span id="fbHTML_StatusBar"><span><a href="#"><b>body</b></a></span><span>&lt;</span><span><a href="#">html</a></span></span></span></div><div id="fbPanelBars"><div id="fbPanelBar1" class="fbPanelBar"><a id="tc" class="tab selectedTab" href="javascript:FB.showTab(0)"><span class="tabL"></span><span class="tabText">Console</span><span class="tabR"></span></a><a id="th" class="tab" href="javascript:FB.showTab(1)"><span class="tabL"></span><span class="tabText">HTML</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">CSS</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">Script</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">DOM</span><span class="tabR"></span></a></div><div id="fbPanelBar2Box" class="hide"><div id="fbPanelBar2" class="fbPanelBar"><a class="tab selectedTab" href="javascript:void(0);"><span class="tabL"></span><span class="tabText">Style</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">Layout</span><span class="tabR"></span></a><a class="tab" href="javascript:void(0)"><span class="tabL"></span><span class="tabText">DOM</span><span class="tabR"></span></a></div></div></div></td></tr><tr id="fbContent"><td id="fbPanelBox1"><div id="fbPanel1" class="fbFitHeight"><div id="fbConsole"></div><div id="fbHTML"></div></div></td><td id="fbPanelBox2" class="hide"><div id="fbVSplitter" class="fbVSplitter">&nbsp;</div><div id="fbPanel2" class="fbFitHeight"><div id="fbHTML_Style"></div><div id="fbHTML_Layout"></div><div id="fbHTML_DOM"></div></div></td></tr><tr id="fbBottom"><td id="fbCommand" colspan="2"><div id="fbCommandBox"><div id="fbCommandIcon">&gt;&gt;&gt;</div><input id="fbCommandLine" name="fbCommandLine" type="text"/></div></td></tr></tbody></table>'
    
};

// ************************************************************************************************
}});
