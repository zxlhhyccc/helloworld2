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

/**
 * 填充0
 * @param num
 */
function pad(num) {
    return num.toString().padStart(2, '0');
}

/**
 * 格式化时间
 */
function formatDateTime() {
    var date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` + `
            ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * 更新时间
 * @param section_id
 * @param updateAll
 * @param isSuccess
 */
function updateTime(section_id, updateAll, isSuccess) {
    // tr
    var trEl = document.getElementById('cbi-%s-%s'.format(PACKAGE_NAME, section_id));
    // 获取 子元素
    for(var i = 0; i < trEl.children.length; i++) {
        // 子元素
        var children = trEl.children[i];
        
        if (isSuccess && children.dataset.name === 'update_time') {
            // 更新时间
            children.innerHTML = formatDateTime();
        }
        if (updateAll && (children.dataset.name === 'update')) {
            // 更新所有 按钮 触发 完成事件
            children.getElementsByTagName("button")[0].dispatchEvent(new Event('clickComplete'));
        }
    }
}

/**
 * 更新数据
 * @param ev
 * @param section_id
 */
function updateAdvancedAddress(ev, section_id) {
    // rpc 会超时(执行中断) 通过脚本运行 封装
    return fs.exec_direct('/etc/init.d/ssr-plus2', ['updateAdvancedAddress', section_id], 'json').then(L.bind(function(section_id, updateAll, response) {
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
            // 结果
            var status = result['status'];
            // 描述
            var message = result['message'];
            
            if (status === 0) {
                // 成功
                // ui.addNotification(null, E('p', _('Contents have been saved.') + address), 'info');
                
                // fs.exec('/etc/init.d/firewall', ['restart']);
                
                // 更新 时间
                updateTime(section_id, updateAll, true);
            } else {
                // 失败
                ui.addNotification(null, E('p', _('Unable to save contents: %s').format(message)));
                
                // 更新 时间
                updateTime(section_id, updateAll, false);
            }
        }

        
    }, this, section_id, ev.detail.updateAll || false)).catch(L.bind(function(section_id, updateAll, e) {
        // 提示异常
        // ui.addNotification(null, E('p', _('Update Fail') + ' ' + e.message));
        // 更新 时间
        updateTime(section_id, updateAll);
    }, this, section_id, ev.detail.updateAll || false));
}

/**
 * 自定义 name
 * @param nodeData
 * @returns {*}
 */
function createNodeName(nodeData) {
    // 组成成字符串
    var string = "";
    if (nodeData && Object.keys(nodeData).length > 0) {
        // 订阅节点更新
        for(var key in nodeData) {
            if('alias' === key) {
                continue;
            }
            string = string + (nodeData[key] || '');
        }
    } else {
        // 手动添加
        string = new Date().getTime() + "" + (Math.random() * 0xFFFFFF);
    }
    // 取 MD5
    return CryptoJS.MD5(string).toString();
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
            var task = [];

            // 外层 div
            const advancedAddress = document.getElementById('cbi-%s-%s'.format(PACKAGE_NAME, 'advanced_address'));

            if (advancedAddress) {
                // 获取 表格
                const activeTable = advancedAddress.querySelector('table');
                if (activeTable) {
                    // 行
                    const trs = activeTable.querySelectorAll('tr');
                    // 循环
                    trs.forEach((trEl, index) => {
                        for(var i = 0; i < trEl.children.length; i++) {
                            // 子元素
                            var children = trEl.children[i];
                            
                            if (children.dataset.name === 'update') {
                                // 延迟 检测 按钮
                                const checkButton = children.querySelector("button");
                                if (checkButton && !checkButton.disabled) {
                                    // 存在按钮 且当前没有在执行 触发事件
                                    // 使用 异步任务
                                    task.push(new Promise((resolve) => {
                                        // 使用 自定义 事件名称 在 updateAdvancedAddress 方法 会触发
                                        checkButton.addEventListener('clickComplete', (event) => {
                                            resolve(event);
                                        }/* , {once: true}*/);
                                    }));
                                    // 延迟 触发
                                    setTimeout(() => {
                                        // 再次判断 防止 手动点击
                                        if (checkButton.disabled) {
                                            // 已经 检测中 主动发送完成事件
                                            checkButton.dispatchEvent(new Event('clickComplete'));
                                        } else {
                                            checkButton.dispatchEvent(new CustomEvent('click', {detail: {updateAll: true}}));
                                        }
                                    }, 1000 * (index - 1));
                                }
                            }
                        }
                    });
                }
            }

            // 返回
            return Promise.all(task);            
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
        option = section.option(form.Value, '', _('File Name'));
        // 只展示在表头
        option.modalonly = false;
        // 自定义返回
        option.cfgvalue = function (section_id) {
            return uci.get(PACKAGE_NAME, section_id, '.name');
        };


        // 更新时间
        option = section.option(form.Value, 'update_time', _('Update Time'));
        // 只展示在表头
        option.modalonly = false;
 
        
        // 更新按钮
        option = section.option(form.Button, 'update', _('Update'));
        // 只展示在表头
        option.modalonly = false;
        // 需要 设置为 true
        option.editable = true;
        // 样式
        option.inputstyle = "apply";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            // 更新
            return updateAdvancedAddress(ev, section_id);
        };


        // 原始 添加方法
        var originHandleAdd = section.handleAdd;
        // 自定义 添加方法
        section.handleAdd = function(ev, name) {
            // 自定义 name
            originHandleAdd.apply(this, [ev, createNodeName([])]);
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