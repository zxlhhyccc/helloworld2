'use strict';
'require view';
'require uci';
'require form';
'require ui';
'require fs';

// 引入 crypto-js
let script = document.createElement("script");
script.type = "text/javascript";
script.src = L.resource('ssr-plus2/crypto-js.js');
document.head.appendChild(script);


// 包名
var PACKAGE_NAME = 'ssr-plus2';


function updateAdvancedAddress(cfgid) {
    // rpc 会超时(执行中断) 通过脚本运行 封装
    return fs.exec_direct('/etc/init.d/ssr-plus2', ['updateAdvancedAddress', cfgid], 'json').then(function(response) {
        // 导入结果
        var updateResult = response.result;
        
        if (!updateResult || updateResult.length == 0) {
            ui.addNotification(null, E('p', _('Unable to save contents: %s').format("")));
            return;
        }
        
        // 循环
        for (var i = 0; i < updateResult.length; i++) {
            var result = updateResult[0];
            // 别名
            var alias = result['alias'];
            // 地址
            var address = result['address'];
            // 获取 md5String
            var md5String = result['address'];
            // 结果
            var status = result['status'];
            // 描述
            var message = result['message'];
            
            if (status === 0) {
                // 成功
                ui.addNotification(null, E('p', _('Contents have been saved.') + address + md5String), 'info');
                
                // fs.exec('/etc/init.d/firewall', ['restart']);
            } else {
                // 失败
                ui.addNotification(null, E('p', _('Unable to save contents: %s').format(message)));
            }
        }
        
        // 重新刷新页面
        window.setTimeout(function() {
            //UI.prototype.changes.displayStatus(false);
            window.location = window.location.href.split('#')[0];
        }, L.env.apply_display * 1000);
        
    }).catch(function(e) {
        // 提示异常
        // ui.addNotification(null, E('p', _('update fail') + ' ' + e.message));
    });
}

return view.extend({
    load: function() {
        return Promise.all([
            uci.load(PACKAGE_NAME)
        ]);
    },

    render: function(data) {
        var map, section, option;
        
        // 创建 Map
        map = new form.Map(PACKAGE_NAME, _('Advanced Settings'));


        // 基础配置
        section = map.section(form.TypedSection, 'advanced');
        // 匿名
        section.anonymous = true;

        // 更新所有文件信息
        option = section.option(form.Button, "",  _("Update All Domain Servers"), _("Please Click Save At The Bottom Of The Page First."));
        // 样式
        option.inputstyle = "apply";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            return updateAdvancedAddress('');
        };


        // 代理列表
        section = map.section(form.GridSection, 'advanced_address');
        // 匿名
        section.anonymous = true;
        // 可添加/删除
        section.addremove = true;
        // 可排序
        section.sortable  = true;
        // 弹出框标题
        section.modaltitle = _('Node');
        
        
        // 名称
        option = section.option(form.Value, 'alias', _('Alias'));
        // 空是否删除
        option.rmempty = false;
        
        
        // 地址
        option = section.option(form.Value, 'address', _('Address'));
        // 空是否删除
        option.rmempty = false;


        // md5String
        option = section.option(form.Value, '', _('MD5'));
        // 只展示在表头
        option.modalonly = false;
        // 自定义返回
        option.cfgvalue = function (section_id) {
            var address = uci.get(PACKAGE_NAME, section_id, 'address');
            return CryptoJS.MD5(address).toString();
        };


        // 更新时间
        option = section.option(form.Value, 'update_time', _('Update Time'));
        // 只展示在表头
        option.modalonly = false;
 
        
        // 更新按钮
        option = section.option(form.Button, '', _('Update'));
        // 只展示在表头
        option.modalonly = false;
        // 需要 设置为 true
        option.editable = true;
        // 样式
        option.inputstyle = "apply";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            // 更新
            return updateAdvancedAddress(section_id);
        };


        // 渲染
        return map.render();
    },
    
    // 不展示 保存并应用 按钮
    handleSaveApply: null,
    
    // 自定义保持按钮
	handleSave: function(ev) {
        // 保存 配置
        return this.super('handleSave', arguments).then(function() {
            ui.changes.apply(true);
        });
	},
    
    handleReset: null
});