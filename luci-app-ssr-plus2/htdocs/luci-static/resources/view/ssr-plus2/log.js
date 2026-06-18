'use strict';
'require view';
'require fs';
'require ui';

var globalFile="/var/log/ssr-plus2.log";
var globalLineCount=10;

// 文件列表变动
function logFileChange(event) {
    // 获取 选择的文件
    globalFile = event.target.options[event.target.selectedIndex].value;
    
    // 读取
    readFile(globalFile, globalLineCount);
}

// 最后行数变动
function tailLineCountChange(event) {
    // 获取 选择的文件
    globalLineCount = event.target.options[event.target.selectedIndex].value;
    
    // 读取
    readFile(globalFile, globalLineCount);
}

// 读取文件
function readFile(file, lineCount) {
    // 读取
    readFileAsync(file, lineCount).then(function(data) {
        // 日志文本
        var view = document.getElementById('log_textarea');
        // 日志文本
        view.innerHTML = data;
    }).catch(function(e) {console.log(e);});
}

// 异步读取
function readFileAsync(file, lineCount) {
    // 读取
    return fs.exec_direct('/etc/init.d/ssr-plus2', ["readLog", file, lineCount]);
}


// 清空文件
function clearLog() {
    // 清空文件
    fs.write(globalFile,'').then(function() {
        // 清空文本框
        // 节点名称
        var view = document.getElementById('log_textarea');
        // 设置
        view.innerHTML = '';
    }).catch(function() {
        // 提示异常
        ui.addNotification(null, E('p', _('Clear Logs Fail.')));
    });
}

return view.extend({
    load: function() {
        return Promise.all([
            fs.exec_direct('/etc/init.d/ssr-plus2', ["list", "/tmp/ssr-plus2/*.out"]), readFileAsync(globalFile, globalLineCount)
        ]);
    },

    render: function(data) {
        // 分割
        var fileArr = data[0].trim().split('\n');
        // 插入
        fileArr.splice(0, 0, '/var/log/ssr-plus2.log');
        
        var fileOptionArr = [];
        for(var i = 0; i < fileArr.length; i++) {
            fileOptionArr.push(E('option', { 'value': fileArr[i], 'selected': null}, [ fileArr[i] ]));
        }
        
        var tailArr = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 150, 200, 300, 400, 500];
        // 
        var tailOptionArr = [];
        for(var i = 0; i < tailArr.length; i++) {
            tailOptionArr.push(E('option', { 'value': tailArr[i], 'selected': null}, [ tailArr[i] ]));
        }
        
        
        return E([
            E("label", {}, [_("Log File List")]),
            E("select", {'class': 'cbi-value-field', 'change': logFileChange}, fileOptionArr),
            E("button", {'class': 'cbi-button cbi-button-reset cbi-value-field', 'click': clearLog}, _("Clear Logs")),
            E("p"),
            E("label", {}, [_("Tail Line Count")]),
            E("select", {'class': 'cbi-value-field', 'change': tailLineCountChange}, tailOptionArr),
            E("p"),
            E('p', {}, E('textarea', {'id': 'log_textarea', 'style': 'width:100%', 'rows': 25 }, [ data[1] != null ? data[1].trim() : '' ]))
        ]);
    },
    
    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});