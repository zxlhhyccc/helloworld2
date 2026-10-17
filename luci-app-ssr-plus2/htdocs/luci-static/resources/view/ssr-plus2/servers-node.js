'use strict';
'require view';
'require uci';
'require form';
'require ui';
'require dom';
'require fs';
'require rpc';

// 引入 crypto-js
let script = document.createElement("script");
script.type = "text/javascript";
script.src = L.resource('ssr-plus2/crypto-js.js');
document.head.appendChild(script);


// 包名
var PACKAGE_NAME = 'ssr-plus2';

// 默认分组名称
var defaultGroupName = 'default';
// 默认分组hash
var defaultGroupHash;

/**
 * 自定义 name
 * @param nodeData
 * @returns {*}
 */
function createNodeName(nodeData) {
    // 组成成字符串
    var string;
    if (nodeData && Object.keys(nodeData).length > 0) {
        // 订阅节点更新
        string = (nodeData['group_hash'] || '') +  (nodeData['protocol'] || '') + (nodeData['server'] || '') + (nodeData['server_port'] || '');
    } else {
        // 手动添加
        string = new Date().getTime() + "" + (Math.random() * 0xFFFFFF);
    }
    // 取 MD5
    return CryptoJS.MD5(string).toString();
}

/**
 * 设置 节点数据
 * @param section_id
 * @param nodeData
 */
function setNodeData(section_id, nodeData) {
    for (var name in nodeData) {
       if (name.startsWith(".")) {
           // 不能设置
           continue;
       }
       // 设置
       uci.set(PACKAGE_NAME, section_id, name, nodeData[name]);
    }
}

/**
 * 更新 节点数据
 * @param section_id
 * @param nodeData
 */
function updateNodeData(section_id, nodeData) {
    if (null != section_id) {
        // 有 section_id 新增/编辑

        // change 事件
        var changeEvent = document.createEvent("HTMLEvents").initEvent("change", true, true);
        if (!changeEvent) {
            // 创建 失败
            changeEvent = new Event("change", { bubbles: true, cancelable: true });
        }

        for (var name in nodeData) {
            if (name.startsWith(".")) {
               // 不能设置
               continue;
            }

            // 值
            var value = nodeData[name];

            // 获取 div 节点
            var targetDivElement = document.getElementById('cbid.ssr-plus2.' + section_id + '.' + name + '');
            
            // 没有值
            if (!targetDivElement) {
                continue;
            }
            
            // 目标 节点
            var targetElement = targetDivElement.getElementsByTagName('input')[0];
            
            if (!targetElement) {
                // select
                targetElement = targetDivElement.getElementsByTagName('select')[0];
            }

            // 标签名称
            var tagName = targetElement.tagName;


            if ('INPUT' === tagName && 'checkbox' === targetElement.type) {
                // Checkbox
                if (1 == value) {
                   // 选中
                    targetElement.checked = true;
                } else {
                   // 不选中
                    targetElement.checked = false;
                }

                // 触发 change 事件
                targetElement.dispatchEvent(changeEvent);
            } else {
                // 其他
                // 设置值
                targetElement.value = value;
            }

            if ('SELECT' === tagName) {
               // select
               // 触发 change 事件
               targetElement.dispatchEvent(changeEvent);
            }
        }
    } else {
        // 无 section_id 通过订阅节点更新
        // 直接 设置值
        setNodeData(uci.add(PACKAGE_NAME, 'node', createNodeName(nodeData)), nodeData);
    }
}

/**
 * 更新 节点数量
 */
function updateNodeNum() {
    // 更新 节点数量
    // 节点数量名称
    var view = document.getElementById('node_number');
    // 重新设置数量
    view.innerHTML = uci.sections(PACKAGE_NAME, 'node').length;
}

/**
 * 导入节点按钮事件
 * @param section_id
 * @param ev
 */
var importClickFunction = function (section_id, ev) {
    // 节点名称
    var importStatus = document.getElementById('import_status');

    // 弹出输入框
    var uri = prompt(_("Paste Sharing Link Here"), "");
    if (uri == null) {
        // 空
        // 用户取消
        importStatus.innerHTML = "<font style=\'color:red\'>" + _("User Cancelled.") + "</font>";
        return;
    }

    if (uri === "") {
        // 空
        // 用户取消
        importStatus.innerHTML = "<font style=\'color:red\'>" + _("Empty") + "</font>";
        return;
    }


    // 导入
    var importResult = importUri(section_id, uri);


    if (true === importResult) {
        // 导入成功
        // 获取弹出框
        // 导入成功
        importStatus.innerHTML = "<font style=\'color:green\'>" + _("Import Configuration Information Successfully.") + "</font>";
    } else {
        // 导入失败
        importStatus.innerHTML = "<font style=\'color:red\'>" + importResult + "</font>";
    }
};

// 显示延迟
function latencyShow(section_id, latency) {
    // tr
    var trEl = document.getElementById('cbi-%s-%s'.format(PACKAGE_NAME, section_id));
    // 获取 子元素
    for(var i = 0; i < trEl.children.length; i++) {
        // 子元素
        var children = trEl.children[i];
        
        if (children.dataset.name === 'latency') {
            // latency 延迟
            let col = '#ff0000';
            if (latency) {
                if (latency < 300) col = '#ff3300';
                if (latency < 200) col = '#ff7700';
                if (latency < 100) col = '#249400';
            }
            children.innerHTML = `<font style=\"color:${col}\">${(latency ? latency : "--") + " s"}</font>`;
        }
    }
}

var globalThis, filterWordsRegExp;
var viewExtend = view.extend({
    
    // 选中节点pane id
    subscribeActivePaneId: null,
    
    // 获取
    callFileExec: rpc.declare({
        object: 'file',
        method: 'exec',
        params: ['command', 'params', 'env'],
        nobatch: true
    }),
    
    load: function() {
        return Promise.all([
            uci.load(PACKAGE_NAME)
        ]);
    },

    // 自定义保持按钮
    handleSave: function(ev) {
        // 保存 配置
        return this.super('handleSave', arguments).then(function() {
            ui.changes.apply(true);
        });
    },

    render: function(data) {
        globalThis = this;
        // 默认分组hash
        defaultGroupHash = CryptoJS.MD5(defaultGroupName).toString();

        var map, section, option;

        // 创建 Map
        map = new form.Map(PACKAGE_NAME, _('Servers subscription and manage'));



        // 订阅链接信息
        section = map.section(form.GridSection, 'subscribe');
        // 匿名
        section.anonymous = true;
        // 可添加/删除
        section.addremove = true;
        // 可排序
        section.sortable  = true;
        // 弹出框标题
        section.modaltitle = _('Subscribe URL');

        // 别名
        // 用户代理
        option = section.option(form.Value, 'alias', _('Alias'));
        // 空是否删除
        option.rmempty = false;

        // 链接
        option = section.option(form.Value, 'url', _('Subscribe URL'));
        // 空是否删除
        option.rmempty = false;
        
        // 用户代理
        option = section.option(form.Value, 'user_agent', _('User Agent'));


        // 启用选项
        option = section.option(form.Flag, 'enable', _('Enable'));
        // 默认值
        option.default = option.enabled;
        // 空是否删除
        option.rmempty = false;
        // table中需要 可编辑
        option.editable = true;


        // 原始 删除方法
        var originSubscribeHandleRemove = section.handleRemove;
        // 自定义 删除方法
        section.handleRemove = function(section_id, ev) {
            var name = uci.get(PACKAGE_NAME, section_id, '.name');
            // 计算md5 并 转成字符串
            var groupHash = CryptoJS.MD5(name).toString();
            uci.sections(PACKAGE_NAME, 'node', function(s) {
                if (s['group_hash'] && s['group_hash'] === groupHash) {
                    // 有分组 hash 且 相同
                    // 删除配置
                    uci.remove(PACKAGE_NAME, s['.name']);
                }
            });
            
            // 调用 原始函数
            originSubscribeHandleRemove.apply(this, arguments).then(function() {
                // 更新 节点数量
                updateNodeNum();
            });
        };




        // 基础配置
        section = map.section(form.TypedSection, 'server_subscribe');
        // 匿名
        section.anonymous = true;

        // 节点过滤关键字
        option = section.option(form.Value, 'filter_words', _('Subscribe Filter Words'), _('Filter Words Split By /.'));
        
        // 更新所有订阅服务器节点
        option = section.option(form.Button, "",  _("Update All Subscribe Servers"));
        // 样式
        option.inputstyle = "apply";
        // 自定义事件
        option.onclick = async function(ev, section_id) {
            // 获取订阅服务器 数据
            var subscribe = uci.sections(PACKAGE_NAME, 'subscribe');
            // 过滤关键字
            var filterWords = uci.get(PACKAGE_NAME, section_id, 'filter_words') || '';
            if (filterWords) {
                // 存在
                filterWordsRegExp = new RegExp('(' + filterWords.replaceAll('/', '|') + ')');
            } else {
                // 不存在
                filterWordsRegExp = null;
            }
            var needHandleSave = false;
            var tasks = [];
            // 循环
            for (var i = 0; i < subscribe.length; i++) {
                var item = subscribe[i];
                // 名称
                var name = item['.name'] || defaultGroupName;
                // 别名
                var alias = item['alias'];
                // 地址
                var subscribeUrl = item['url'];
                // user agent
                var userAgent = item['user_agent'] || '';
                // 是否启用
                var enable = item['enable'] || '';                
                if ('1' !== enable) {
                    // 未启用
                    ui.addNotification(null, E('p', _("Subscribe Url Not Enable.") + '(' + alias + ')'));
                    continue;
                }
                var needSave = false;
                // 调用订阅
                await fs.exec_direct('/etc/init.d/ssr-plus2', ['mycurl', subscribeUrl, userAgent]).then(
                    ev.view.L.bind(async function(name, alias, response) {
                        // 去除前后各空格
                        response = response.trim();
                        if (response) {
                            // 有结果
                            // base64 解码
                            var decodeString = CryptoJS.enc.Base64.parse(response).toString(CryptoJS.enc.Utf8);
                            // 分割
                            var nodeArr = decodeString.trim().split('\r\n');
                            // 长度
                            var length = nodeArr.length;                            
                            // 计算md5 并 转成字符串
                            var groupHash = CryptoJS.MD5(name).toString();
                            
                            if (length > 0) {
                                // 有节点数据
                                // 删除 旧数据
                                uci.sections(PACKAGE_NAME, 'node', function(s) {
                                    // 分组 hash
                                    var nodeGroupHash = s['group_hash']
                                    if (groupHash === nodeGroupHash) {
                                        // 相同 分组
                                        // 删除配置
                                        uci.remove(PACKAGE_NAME, s['.name']);
                                        needSave = true;
                                    }
                                });
                            }

                            for (var i = 0; i < length; i++) {
                                // 节点信息
                                var node = nodeArr[i];
                                // console.log(node);                                
                                if ('' === node) {
                                    // 空字符串
                                    continue;
                                }
                                // 导入
                                var importResult = importUri(null, node, groupHash);                                
                                if (true === importResult) {
                                    // 导入成功
                                    needSave = true;
                                    // ui.addNotification(null, E('p', _("Import Configuration Information Successfully.") + '(' + alias + ')' + '(' + node + ')'));
                                } else {
                                    // 导入失败
                                    ui.addNotification(null, E('p', importResult + '(' + alias + ')'));
                                }
                            }
                            if (needSave) {
                                // 提交数据 避免一次性提交(如果有多个订阅 数据过多 一次性提交会失败)
                                await uci.save();
                            }
                        } else {
                            // 提示错误
                            ui.addNotification(null, E('p', _("Empty") + '(' + alias + ')'));
                        }
                    }, this, name, alias)
                ).catch(
                    ev.view.L.bind(function(alias, error) {
                        // 提示错误
                        ui.addNotification(null, E('p', _('Apply request failed with status <code>%h</code>').format(error.message + '(' + alias + ')')));
                    }, this, alias)
                );
                needHandleSave = needHandleSave || needSave;
            }
            if (needHandleSave) {
                return globalThis.super('handleSave', ev).then(function() {
                    ui.changes.apply(true);
                });
            }
        };

        // 删除所有订阅服务器节点
        option = section.option(form.Button, "", _("Delete All Subscribe Servers"), _("Server Count") + '<span id=node_number>' + uci.sections(PACKAGE_NAME, 'node').length || 0 + '</span>');
        // 样式
        option.inputstyle = "reset";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            // 删除 订阅配置
            uci.sections(PACKAGE_NAME, 'node', function(s) {
                if (s['group_hash'] && s['group_hash'] !== defaultGroupHash) {
                    // 有分组 hash 且 不是 默认分组
                    // 删除配置
                    uci.remove(PACKAGE_NAME, s['.name']);
                }
            });

            // 提交数据修改 并刷新页面
            return this.map.save().then(function() {
                // 更新 节点数量
                updateNodeNum();
            });
        };

        // 延迟检测
        option = section.option(form.Button, "", _("Latency Check"));
        // 样式
        option.inputstyle = "apply";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            // 获取 表格
            const activePane = document.getElementById(globalThis.subscribeActivePaneId);
            if (activePane) {
                const activePaneTable = activePane.querySelector('table');
                if (activePaneTable) {
                    const trs = activePaneTable.querySelectorAll('tr');
                    trs.forEach((trEl, index) => {
                        for(var i = 0; i < trEl.children.length; i++) {
                            // 子元素
                            var children = trEl.children[i];
                            
                            if (children.dataset.name === 'check') {
                                // 延迟 检测 按钮
                                const checkButton = children.querySelector("button");
                                if (checkButton) {
                                    // 触发事件
                                    setTimeout(() => checkButton.dispatchEvent(new Event('click')), 1000 * index)
                                }
                            }
                        }
                    });
                }
            }
        }


        // 分组信息
        // 获取订阅服务器 数据
        var subscribe = uci.sections(PACKAGE_NAME, 'subscribe');
        // 插入默认节点
        subscribe.splice(0, 0, {"alias": _("Default Group"), "url": "", "user_agent": ""});
        
        
        section = map.section(form.TypedSection, 'server_subscribe');
        // 匿名
        section.anonymous = true;


        for (var i = 0; i < subscribe.length; i++) {
            var item = subscribe[i];
            // 名称
            var name = item['.name'] || defaultGroupName;
            // 别名
            var alias = item['alias'];
            // 地址
            // var subscribeUrl = item['url'];
            // user agent
            // var userAgent = item['user_agent'] || '';


            // 计算md5 并 转成字符串
            var groupHash = CryptoJS.MD5(name).toString();


            // 创建 tab
            section.tab(name, alias);
            
            // 创建 选项
            option = section.taboption(name, form.SectionValue, '__' + name + '__', form.GridSection, 'node', null, _(''));
            
            // 获取 subsection
            var subSection = option.subsection;

            // 匿名
            subSection.anonymous = true;
            // 可添加/删除
            subSection.addremove = true;
            // 可排序
            subSection.sortable  = true;
            // 弹出框标题
            subSection.modaltitle = _('Node');

            // 显示过滤器
            subSection.filter = L.bind(function(name, groupHash, section_id, index, section_ids) {
                // 获取 分组hash
                var nodeGroupHash = uci.get(PACKAGE_NAME, section_id, 'group_hash');
                if (defaultGroupName === name) {
                    // 默认分组
                    if (!nodeGroupHash) {
                        // 不存在 分组
                        return true;
                    }
                }
                // 返回比较值
                return groupHash === nodeGroupHash;
            }, subSection, name, groupHash);


            // 
            subSection.addModalOptions = function(modalSection, section_id, ev) {
                
            };


            // 原始 添加方法
            var originHandleAdd = subSection.handleAdd;
            // 自定义 添加方法
            subSection.handleAdd = function(ev, name) {
                // 自定义 name
                originHandleAdd.apply(this, [ev, createNodeName([])]);
            };


            // 原始 删除方法
            var originHandleRemove = subSection.handleRemove;
            // 自定义 删除方法
            subSection.handleRemove = function(section_id, ev) {
                // 调用 原始函数
                originHandleRemove.apply(this, arguments).then(function() {
                    // 更新 节点数量
                    updateNodeNum();
                });
            };


            // 原始 关闭方法
            var originHandleModalCancel = subSection.handleModalCancel;
            // 自定义 关闭方法
            subSection.handleModalCancel = function(modalMap, ev, isSaving) {
                if (isSaving) {
                    // 保存
                    // 更新 节点数量
                    updateNodeNum();
                }
                // 调用 原始函数
                originHandleModalCancel.apply(this, arguments);
            };



            // 导入节点
            option = subSection.option(form.DummyValue, "import",  _("Import"));
            // 只展示在弹出框
            option.modalonly = true;
            // 
            option.rawhtml = true;
            // 自定义返回
            option.cfgvalue = function(section_id) {
                return E([E('button', {'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, importClickFunction, section_id)}, _("Import")), E('span', {"id": "import_status"})]);
            };


            
            // 分组
            option = subSection.option(form.ListValue, 'group_hash', _('group'));
            // 只展示在弹出框
            option.modalonly = true;
            
            // 列表值
            for (var j = 0; j < subscribe.length; j++) {
                var tempItem = subscribe[j];
                // 名称
                var tempName = tempItem['.name'] || defaultGroupName;
                // 别名
                var tempAlias = tempItem['alias'];
                
                option.value(CryptoJS.MD5(tempName).toString(), tempAlias);
            }
            
            // 设置默认值
            // forcewrite 和 cfgvalue 需要配合使用
            option.forcewrite = true;
            option.cfgvalue = L.bind(function(groupHash, section_id) {
                var nodeGroupHash = uci.get(PACKAGE_NAME, section_id, 'group_hash');
                if (nodeGroupHash) {
                    // 存在
                    return nodeGroupHash;
                } else {
                    // 不存在
                    return groupHash;
                }
            }, option, groupHash);


            // 具体 节点信息 为了扩展 单独方法
            this.createNodeInfo(subSection, groupHash);
        }

        
        // 渲染
        return map.render().then(function(mapEl) {
            // 获取 tab 元素
            const tabGroups = mapEl.querySelectorAll('.cbi-map-tabbed, .cbi-section-node-tabbed');
            // 循环
            for (let i = 0; i < tabGroups.length; i++) {
                // 添加事件监听
                tabGroups[i].childNodes.forEach(pane => {
                    pane.addEventListener('cbi-tab-active', function(ev) {
                        // 当前pane id
                        globalThis.subscribeActivePaneId = ev.target.id;
                    });
                });
            }
            // 返回
            return mapEl;
        });
    },

    // 不展示 保存并应用 按钮
    handleSaveApply: null,

    // 不展示 重置 按钮
    handleReset: null,

    /**
     * 创建 节点信息
     * @param section
     * @param groupHash
     */
    createNodeInfo: function (section, groupHash) {
        var option;
        // 类型
        option = section.option(form.ListValue, 'protocol', _('Proxy Protocol'));

        // socks5
        option.value('socks5', _('Socks5'));
        // ShadowSocks
        option.value('ss', _('ShadowSocks'));
        // ShadowsocksR
        option.value('ssr', _('ShadowsocksR'));
        // Vmess
        option.value('vmess', _('Vmess'));
        // Trojan
        option.value('trojan', _('Trojan'));
        // Naiveproxy
        option.value('naiveproxy', _('Naiveproxy'));
        // Vless
        option.value('vless', _('Vless'));
        // Hysteria
        option.value('hysteria', _('Hysteria'));
        // Tuic
        option.value('tuic', _('Tuic'));
        // ShadowTLS
        option.value('shadowtls', _('ShadowTLS'));
        // Hysteria2
        option.value('hysteria2', _('Hysteria2'));
        // Hysteria2
        option.value('anytls', _('AnyTLS'));


        // 别名
        option = section.option(form.Value, 'alias', _('Alias'));
        // 空是否删除
        option.rmempty = false;


        // 服务器地址
        option = section.option(form.Value, 'server', _('Server'));
        // 空是否删除
        option.rmempty = false;
        // host类型
        option.datatype = "host";


        // 服务器端口
        option = section.option(form.Value, 'server_port', _('Server Port'));
        // 空是否删除
        option.rmempty = false;
        // 端口类型
        option.datatype = "port";


        //  延迟
        option = section.option(form.DummyValue, 'latency', _('Latency'));
        // 只展示表格
        option.modalonly = false;
        option.rawhtml = true;
        // 自定义返回
        option.cfgvalue = function (section_id) {
            // 域名
            // var domain = uci.get(PACKAGE_NAME, section_id, 'server');
            // 端口
            // var port = uci.get(PACKAGE_NAME, section_id, 'server_port')

            // 获取 分组hash
            var nodeGroupHash = uci.get(PACKAGE_NAME, section_id, 'group_hash');

            if (!nodeGroupHash) {
                // 存在
                if (groupHash !== nodeGroupHash) {
                    // 不同分组 不显示
                    return "";
                }
            }
            // 注释 原因 大量请求 会造成切换到其他页面卡顿(有大量的请求在后台执行)
            // fs.exec_direct('/etc/init.d/ssr-plus2', ['latency', section_id]).then(L.bind(function(section_id, data) {
            //     // console.log(section_id)
            //     // console.log(data)
            //     var latency = (data[0] || '').trim();
            //     // 显示延迟
            //     latencyShow(section_id, latency);
            // }, this, section_id)).catch(L.bind(function(section_id, e) {
            //     // 显示延迟
            //     latencyShow(section_id);
            // }, this, section_id));

            return "";
        };


        // 延迟 检测按钮
        option = section.option(form.Button, 'check', _('Check'));
        // 只展示表格
        option.modalonly = false;
        // 样式
        option.inputstyle = "apply";
        // table中需要 可编辑
        option.editable = true;
        // 自定义事件
        option.onclick = function (ev, section_id) {
            return globalThis.callFileExec('/etc/init.d/ssr-plus2', ['latency', section_id]).then(L.bind(function (section_id, data) {
                // console.log(section_id)
                // console.log(data)
                var latency = (data.stdout || '').trim();
                // 显示延迟
                latencyShow(section_id, latency);
            }, this, section_id)).catch(L.bind(function (section_id, e) {
                // 显示延迟
                latencyShow(section_id);
            }, this, section_id));
        }


        // 开启验证
        option = section.option(form.Flag, 'auth_enable', _('Enable Authentication'));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        option.rmempty = false;
        // 依赖
        option.depends("protocol", "socks5");
        option.depends("protocol", "naiveproxy");


        // 用户名
        option = section.option(form.Value, "username", _("Username"));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        option.rmempty = false;
        // 依赖
        option.depends({protocol: "socks5", auth_enable: "1"});
        option.depends({protocol: "naiveproxy", auth_enable: "1"});
        option.depends("protocol", "tuic");


        // 密码
        option = section.option(form.Value, "password", _("Password"));
        // 只展示在弹出框
        option.modalonly = true;
        // 密码
        option.password = true;
        // 空是否删除
        option.rmempty = false;
        // 依赖
        option.depends({protocol: "socks5", auth_enable: "1"});
        option.depends("protocol", "ss");
        option.depends("protocol", "ssr");
        option.depends("protocol", "trojan");
        option.depends({protocol: "naiveproxy", auth_enable: "1"});
        option.depends("protocol", "hysteria");
        option.depends("protocol", "tuic");
        option.depends("protocol", "shadowtls");
        option.depends("protocol", "hysteria2");
        option.depends("protocol", "anytls");


        // ============================ ss  start
        this.ssNodeInfo(section);
        // ============================ ss  end


        // ============================ ssr  start
        this.ssrNodeInfo(section);
        // ============================ ssr  end


        // ============================ vmess  start
        this.vmessNodeInfo(section);
        // ============================ vmess  end


        // ============================ trojan  start
        this.trojanNodeInfo(section);
        // ============================ trojan  end


        // ============================ naiveProxy  start

        // ============================ naiveProxy  end


        // ============================ vless  start
        this.vlessNodeInfo(section);
        // ============================ vless  end


        // ============================ hysteria  start
        this.hysteriaNodeInfo(section);
        // ============================ hysteria  end


        // ============================ tuic  start
        this.tuicNodeInfo(section);
        // ============================ tuic  end


        // ============================ shadowtls  start
        this.shadowtlsNodeInfo(section);
        // ============================ shadowtls  end


        // ============================ hysteria2  start
        this.hysteria2NodeInfo(section);
        // ============================ hysteria2  end


        // ============================ anytls  start
        this.anytlsNodeInfo(section);
        // ============================ anytls  end


        // TCP 快速打开
        option = section.option(form.Flag, "fast_open", _("TCP Fast Open"), _("Enabling TCP Fast Open Requires Server Support."));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "ss");
        option.depends("protocol", "ssr");
        option.depends("protocol", "trojan");
    },

    /**
     * ShadowSocks 加密方式
     */
    ss_encrypt_methods: [
        // -- aead
        "aes-128-gcm",
        "aes-192-gcm",
        "aes-256-gcm",
        "chacha20-ietf-poly1305",
        "xchacha20-ietf-poly1305",
        // -- aead 2022
        "2022-blake3-aes-128-gcm",
        "2022-blake3-aes-256-gcm",
        "2022-blake3-chacha20-poly1305"
        // -- stream
        /**
         "table",
         "rc4",
         "rc4-md5",
         "aes-128-cfb",
         "aes-192-cfb",
         "aes-256-cfb",
         "aes-128-ctr",
         "aes-192-ctr",
         "aes-256-ctr",
         "bf-cfb",
         "camellia-128-cfb",
         "camellia-192-cfb",
         "camellia-256-cfb",
         "salsa20",
         "chacha20",
         "chacha20-ietf"*/
    ],

    /**
     * ss 节点信息
     * @param section
     */
    ssNodeInfo: function (section) {
        var option;

        // ShadowSocks 加密方式
        option = section.option(form.ListValue, "ss_encrypt_method", _("Encrypt Method"));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        option.rmempty = false;
        // 依赖
        option.depends("protocol", "ss");

        // 无
        option.value("none", _("None"));
        // 循环展示
        for (let i = 0; i < this.ss_encrypt_methods.length; i++) {
            option.value(this.ss_encrypt_methods[i]);
        }

        // Shadowsocks 插件
        // 启用插件按钮
        option = section.option(form.Flag, 'ss_enable_plugin', _('Enable Plugin'));
        // 只展示在弹出框
        option.modalonly = true;
        // 默认值
        option.default = option.disabled;
        // 依赖
        option.depends("protocol", "ss");


        // Shadowsocks 插件列表
        option = section.option(form.ListValue, "ss_plugin", _("Plugin"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("obfs-local", _("obfs-local"));

        option.value("v2ray-plugin", _("v2ray-plugin"));

        option.value("xray-plugin", _("xray-plugin"));

        option.value("shadow-tls", _("shadow-tls"));

        option.value("custom", _("Custom"));

        // 依赖
        option.depends({"ss_enable_plugin": "1"});


        // Shadowsocks 自定义插件
        option = section.option(form.Value, "ss_custom_plugin", _("Custom Plugin Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 提示
        option.placeholder = "/path/to/custom-plugin"
        // 依赖
        option.depends({"ss_plugin": "custom"});


        // Shadowsocks 插件参数
        option = section.option(form.Value, "ss_plugin_opts", _("Plugin Opts"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"ss_enable_plugin": "1"});
    },

    /**
     * ShadowSocksR 加密方式
     */
    ssr_encrypt_methods: [
        "rc4-md5",
        "rc4-md5-6",
        "rc4",
        "table",
        "aes-128-cfb",
        "aes-192-cfb",
        "aes-256-cfb",
        "aes-128-ctr",
        "aes-192-ctr",
        "aes-256-ctr",
        "bf-cfb",
        "camellia-128-cfb",
        "camellia-192-cfb",
        "camellia-256-cfb",
        "cast5-cfb",
        "des-cfb",
        "idea-cfb",
        "rc2-cfb",
        "seed-cfb",
        "salsa20",
        "chacha20",
        "chacha20-ietf"
    ],

    /**
     * ShadowSocksR 协议
     */
    ssr_protocols: [
        "origin",
        "verify_deflate",
        "auth_sha1_v4",
        "auth_aes128_sha1",
        "auth_aes128_md5",
        "auth_chain_a",
        "auth_chain_b",
        "auth_chain_c",
        "auth_chain_d",
        "auth_chain_e",
        "auth_chain_f"
    ],

    /**
     * ShadowSocksR 混淆插件
     */
    ssr_obfs: [
        "plain",
        "http_simple",
        "http_post",
        "random_head",
        "tls1.2_ticket_auth"
    ],

    /**
     * ssr 节点信息
     * @param section
     */
    ssrNodeInfo: function (section) {
        var option;

        // ShadowsocksR 加密方式
        option = section.option(form.ListValue, "ssr_encrypt_method", _("Encrypt Method"));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        option.rmempty = false;
        // 依赖
        option.depends("protocol", "ssr");

        // 无
        option.value("none", _("None"));
        // 循环展示
        for (let i = 0; i < this.ssr_encrypt_methods.length; i++) {
            option.value(this.ssr_encrypt_methods[i]);
        }


        // ShadowsocksR 协议
        option = section.option(form.ListValue, "ssr_protocol", _("Protocol"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "ssr");

        // 循环展示
        for (let i = 0; i < this.ssr_protocols.length; i++) {
            option.value(this.ssr_protocols[i]);
        }


        // ShadowsocksR 协议参数
        option = section.option(form.Value, "ssr_protocol_param", _("Protocol param (optional)"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "ssr");


        // ShadowsocksR 混淆插件
        option = section.option(form.ListValue, "ssr_obfs", _("Obfs"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "ssr");
        // 循环展示
        for (let i = 0; i < this.ssr_obfs.length; i++) {
            option.value(this.ssr_obfs[i]);
        }


        // ShadowsocksR 混淆插件参数
        option = section.option(form.Value, "ssr_obfs_param", _("Obfs param (optional)"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "ssr");
    },

    /**
     * vmess 节点信息
     * @param section
     */
    vmessNodeInfo: function (section) {
        var option;


        //
        option = section.option(form.Value, "vmess_id", _("ID"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "vmess");


        //
        option = section.option(form.Value, "vmess_alter_id", _("Alter ID"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "vmess");


        //
        option = section.option(form.ListValue, "vmess_security", _("Security"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("aes-128-gcm");
        option.value("chacha20-poly1305");
        option.value("auto");
        option.value("none");
        option.value("zero");

        // 依赖
        option.depends("protocol", "vmess");


        option = section.option(form.ListValue, "vmess_stream_network", _("Network(Transport)"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("tcp", _("TCP"));
        // kcp/mkcp
        option.value("mkcp", _("mKCP"));
        // ws/websocket
        option.value("ws", _("WebSocket"));
        // h2/http
        option.value("h2", _("HTTP/2"));
        // ds/domainsocket
        option.value("domainsocket", _("DomainSocket"));
        // quic
        option.value("quic", _("Quic"));
        // gun/grpc
        option.value("grpc", _("gRPC"));
        // hy2/hysteria2
        option.value("hy2", _("Hysteria2"));

        // 依赖
        option.depends("protocol", "vmess");


        // tcp 特定配置
        option = section.option(form.ListValue, "vmess_stream_network_tcp_type", _("Type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none", _("None"));
        option.value("http", _("HTTP"));
        // 依赖
        option.depends("vmess_stream_network", "tcp");


            option = section.option(form.Value, "vmess_stream_network_tcp_request_version", _("Request Version"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_request_method", _("Request Method"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_request_path", _("Request Path"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_request_headers", _("Request Headers"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_response_version", _("Response Version"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_response_status", _("Response Status"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_response_reason", _("Response Reason"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vmess_stream_network_tcp_response_headers", _("Response headers"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vmess_stream_network_tcp_type", "http");


        // mKCP 特定配置
        option = section.option(form.Value, "vmess_stream_network_mkcp_mtu", _("Mtu"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "range(576, 1460)";
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Value, "vmess_stream_network_mkcp_tti", _("Tti"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "range(10, 100)";
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Value, "vmess_stream_network_mkcp_uplink_capacity", _("UplinkCapacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Value, "vmess_stream_network_mkcp_downlink_capacity", _("DownlinkCapacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Flag, "vmess_stream_network_mkcp_congestion", _("Congestion"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Value, "vmess_stream_network_mkcp_read_buffer_size", _("ReadBufferSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Value, "vmess_stream_network_mkcp_write_buffer_size", _("WriteBufferSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.ListValue, "vmess_stream_network_mkcp_header_type", _("Header Type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none");
        option.value("srtp");
        option.value("utp");
        option.value("wechat-video");
        option.value("dtls");
        option.value("wireguard");

        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        option = section.option(form.Value, "vmess_stream_network_mkcp_seed", _("Seed"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "mkcp");


        // ws 特定配置
        // option = section.option(form.Flag, "vmess_stream_network_ws_accep_proxy_protocol", _("AcceptProxyProtocol"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends("vmess_stream_network", "ws");


        option = section.option(form.Value, "vmess_stream_network_ws_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "ws");


        option = section.option(form.Value, "vmess_stream_network_ws_headers", _("Headers"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "ws");


        option = section.option(form.Value, "vmess_stream_network_ws_max_early_data", _("MaxEarlyData"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "ws");


        option = section.option(form.Flag, "vmess_stream_network_ws_use_browser_forwarding", _("UseBrowserForwarding"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "ws");


        option = section.option(form.Value, "vmess_stream_network_ws_early_data_header_name", _("EarlyDataHeaderName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "ws");


        //
        option = section.option(form.Flag, "vmess_stream_network_ws_parse_x_forwarded_for", _("ParseXForwardedFor"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "ws");


        // h2/http 特定配置
        option = section.option(form.Value, "vmess_stream_network_h2_host", _("Host"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "h2");


        option = section.option(form.Value, "vmess_stream_network_h2_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "h2");


        option = section.option(form.Value, "vmess_stream_network_h2_method", _("Method"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "h2");


        option = section.option(form.Value, "vmess_stream_network_h2_headers", _("Headers"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "h2");


        //
        option = section.option(form.Flag, "vmess_stream_network_h2_parse_x_forwarded_for", _("ParseXForwardedFor"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "h2");


        // domainsocket 特定配置
        option = section.option(form.Value, "vmess_stream_network_domainsocket_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "domainsocket");


        option = section.option(form.Flag, "vmess_stream_network_domainsocket_abstract", _("Abstract"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "domainsocket");


        option = section.option(form.Flag, "vmess_stream_network_domainsocket_padding", _("Padding"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "domainsocket");


        // quic 特定配置
        option = section.option(form.ListValue, "vmess_stream_network_quic_security", _("Quic Security"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none");
        option.value("aes-128-gcm");
        option.value("chacha20-poly1305");

        // 依赖
        option.depends("vmess_stream_network", "quic");


        option = section.option(form.Value, "vmess_stream_network_quic_key", _("Key"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "quic");


        option = section.option(form.ListValue, "vmess_stream_network_quic_header_type", _("Header Type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none");
        option.value("srtp");
        option.value("utp");
        option.value("wechat-video");
        option.value("dtls");
        option.value("wireguard");
        // 依赖
        option.depends("vmess_stream_network", "quic");


        // grpc 特定配置
        //
        option = section.option(form.Value, "vmess_stream_network_grpc_service_name", _("ServiceName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        //
        option = section.option(form.Value, "vmess_stream_network_grpc_idle_timeout", _("IdleTimeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        //
        option = section.option(form.Value, "vmess_stream_network_grpc_health_check_timeout", _("HealthCheckTimeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        //
        option = section.option(form.Flag, "vmess_stream_network_grpc_permit_without_stream", _("PermitWithoutStream"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        //
        option = section.option(form.Value, "vmess_stream_network_grpc_initial_windows_size", _("InitialWindowsSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        //
        option = section.option(form.Flag, "vmess_stream_network_grpc_parse_x_forwarded_for", _("ParseXForwardedFor"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        // hy2/hysteria2 特定配置
        option = section.option(form.Value, "vmess_stream_network_hy2_password", _("Password"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hy2");


        option = section.option(form.Flag, "vmess_stream_network_hy2_use_udp_extension", _("Use udp extension"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hy2");


        option = section.option(form.Flag, "vmess_stream_network_hy2_ignore_client_bandwidth", _("Ignore Client Bandwidth"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hy2");


        option = section.option(form.ListValue, "vmess_stream_network_hy2_congestion_type", _("Congestion Type"));
        option.value("reno");
        option.value("bbr");
        option.value("brutal");
        option.value("force-brutal");

        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hy2");


        option = section.option(form.Value, "vmess_stream_network_hy2_congestion_up_mbps", _("Congestion up mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "hy2");


        option = section.option(form.Value, "vmess_stream_network_hy2_congestion_down_mbps", _("Congestion down mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vmess_stream_network", "hy2");


        //
        option = section.option(form.ListValue, "vmess_stream_security", _("Security"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none", _("none"));
        option.value("tls", _("TLS"));

        // 依赖
        option.depends("protocol", "vmess");


        // TLS
        //
        option = section.option(form.Value, "vmess_stream_tls_server_name", _("ServerName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vmess_stream_security": "tls"});

        //
        option = section.option(form.Value, "vmess_stream_tls_alpn", _("alpn"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vmess_stream_security": "tls"});

        //
        option = section.option(form.Flag, "vmess_stream_tls_allow_insecure", _("AllowInsecure"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vmess_stream_security": "tls"});


        //
        // option = section.option(form.Flag, "vmess_stream_tls_disable_system_root", _("Disable System Root"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls"});


        // 需要 证书文件
        // option = section.option(form.Value, "vmess_stream_tls_certificates", _("Certificates"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls", "vmess_stream_tls_disable_system_root": "1"});


        //
        // option = section.option(form.Flag, "vmess_stream_tls_verify_client_certificate", _("verifyClientCertificate"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls"});


        //
        // option = section.option(form.Value, "vmess_stream_tls_pinned_peer_certificate_chain_sha256", _("pinnedPeerCertificateChainSha256"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls"});


        //
        // option = section.option(form.Flag, "vmess_stream_tls_enable_session_resumption", _("Enable Session Resumption"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls"});


        //
        // option = section.option(form.Value, "vmess_stream_tls_ech_config", _("ECH Config"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls"});


        //
        // option = section.option(form.Value, "vmess_stream_tls_ech_doh_server", _("ECH DOH Server"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vmess_stream_security": "tls"});
    },

    /**
     * trojan 节点信息
     * @param section
     */
    trojanNodeInfo: function (section) {
        var option;

        // TLS
        option = section.option(form.Flag, "trojan_tls", _("Enable TLS"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "trojan");

        //
        option = section.option(form.Value, "trojan_tls_sni", _("SNI"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("trojan_tls", "1");


        //
        option = section.option(form.Flag, "trojan_allow_insecure", _("AllowInsecure"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("trojan_tls", "1");
    },

    /**
     * vless 节点信息
     * @param section
     */
    vlessNodeInfo: function (section) {
        var option;

        //
        option = section.option(form.Value, "vless_id", _("ID"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "vless");


        //
        option = section.option(form.Value, "vless_encryption", _("encryption"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "vless");

        //
        option = section.option(form.ListValue, "vless_flow", _("Flow"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("");
        option.value("xtls-rprx-direct");
        option.value("xtls-rprx-vision");
        option.value("xtls-rprx-vision-udp443");
        // 依赖
        option.depends("protocol", "vless");


        option = section.option(form.ListValue, "vless_stream_network", _("Transport"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("tcp", _("RAW/TCP"));
        option.value("xhttp", _("XHTTP/SplitHTTP"));
        option.value("kcp", _("KCP"));
        option.value("ws", _("WebSocket"));
        option.value("grpc", _("GRPC"));
        option.value("httpupgrade", _("HTTPUpgrade"));
        option.value("hysteria", _("Hysteria"));

        // 依赖
        option.depends("protocol", "vless");


        // raw/tcp 特定配置
        // option = section.option(form.Flag, "vless_stream_network_tcp_accept_proxy_protocol", _("AcceptProxyProtocol"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends("vless_stream_network", "tcp");


        option = section.option(form.ListValue, "vless_stream_network_tcp_type", _("Type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none", _("None"));
        option.value("http", _("HTTP"));
        // 依赖
        option.depends("vless_stream_network", "tcp");


            option = section.option(form.Value, "vless_stream_network_tcp_request_version", _("Request Version"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_request_method", _("Request Method"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_request_path", _("Request Path"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_request_headers", _("Request Headers"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_response_version", _("Response Version"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_response_status", _("Response Status"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_response_reason", _("Response Reason"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


            option = section.option(form.Value, "vless_stream_network_tcp_response_headers", _("Response Headers"));
            // 只展示在弹出框
            option.modalonly = true;
            // 依赖
            option.depends("vless_stream_network_tcp_type", "http");


        // XHTTP 特定配置
        option = section.option(form.Value, "vless_stream_network_xhttp_host", _("Host"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "xhttp");


        option = section.option(form.Value, "vless_stream_network_xhttp_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "xhttp");


        option = section.option(form.ListValue, "vless_stream_network_xhttp_mode", _("Mode"));

        option.value("auto");
        option.value("packet-up");
        option.value("stream-up");
        option.value("stream-one");

        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "xhttp");


        option = section.option(form.Flag, "vless_stream_network_xhttp_enable_extra", _("Enable Extra"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "xhttp");


        option = section.option(form.Value, "vless_stream_network_xhttp_extra", _("Extra"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network_xhttp_enable_extra", "1");


        // mKCP 特定配置
        option = section.option(form.Value, "vless_stream_network_kcp_mtu", _("Mtu"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "min(21)";
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_tti", _("Tti"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "range(10, 100)";
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_uplink_capacity", _("Uplink Capacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_downlink_capacity", _("Downlink Capacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_cwnd_multiplier", _("CwndMultiplier"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_max_sending_window", _("MaxSendingWindow"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.ListValue, "vless_stream_network_kcp_header_type", _("Header Type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none");
        option.value("dns");
        option.value("srtp");
        option.value("utp");
        option.value("wechat");
        option.value("dtls");
        option.value("wireguard");

        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_seed", _("Seed"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");


        // ws 特定配置
        // option = section.option(form.Flag, "vless_stream_network_ws_accep_proxy_protocol", _("AcceptProxyProtocol"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends("vless_stream_network", "ws");


        option = section.option(form.Value, "vless_stream_network_ws_host", _("Host"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "ws");


        option = section.option(form.Value, "vless_stream_network_ws_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "ws");


        option = section.option(form.Value, "vless_stream_network_ws_headers", _("Headers"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "ws");


        option = section.option(form.Value, "vless_stream_network_ws_heartbeat_period", _("HeartbeatPeriod"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "ws");


        // grpc 特定配置
        option = section.option(form.Value, "vless_stream_network_grpc_authority", _("Authority"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Value, "vless_stream_network_grpc_service_name", _("ServiceName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Flag, "vless_stream_network_grpc_multi_mode", _("MultiMode"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Value, "vless_stream_network_grpc_user_agent", _("User Agent"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Value, "vless_stream_network_grpc_idle_timeout", _("Idle Timeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "min(0)";
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Value, "vless_stream_network_grpc_health_check_timeout", _("Health Check Timeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "min(0)";
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Flag, "vless_stream_network_grpc_permit_without_stream", _("Permit Without Stream"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "grpc");


        option = section.option(form.Value, "vless_stream_network_grpc_initial_windows_size", _("Initial windows size"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "min(0)";
        // 依赖
        option.depends("vless_stream_network", "grpc");


        // httpupgrade 特定配置
        // option = section.option(form.Flag, "vless_stream_network_http_accep_proxy_protocol", _("AcceptProxyProtocol"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends("vless_stream_network", "httpupgrade");


        option = section.option(form.Value, "vless_stream_network_http_host", _("host"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "httpupgrade");


        option = section.option(form.Value, "vless_stream_network_http_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "httpupgrade");


        option = section.option(form.Value, "vless_stream_network_http_headers", _("Headers"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "httpupgrade");


        // hysteria 特定配置
        option = section.option(form.Value, "vless_stream_network_hysteria_auth", _("Auth"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_udp_idle_timeout", _("UDP Idle Timeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "range(2,600)";
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.ListValue, "vless_stream_network_hy2_congestion_type", _("Congestion Type"));
        option.value("reno");
        option.value("bbr");
        option.value("brutal");
        option.value("force-brutal");

        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hy2_congestion_up_mbps", _("Congestion up mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hy2_congestion_down_mbps", _("Congestion down mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_masquerade_type", _("Masquerade Type"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_masquerade_dir", _("Masquerade Dir"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_masquerade_url", _("Masquerade Url"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Flag, "vless_stream_network_hysteria_masquerade_rewrite_host", _("Masquerade RewriteHost"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Flag, "vless_stream_network_hysteria_masquerade_x_forwarded", _("Masquerade XForwarded"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Flag, "vless_stream_network_hysteria_masquerade_insecure", _("Masquerade Insecure"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_masquerade_content", _("Masquerade Content"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_masquerade_headers", _("Masquerade Headers"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_masquerade_status_code", _("Masquerade StatusCode"));
        // 只展示在弹出框
        option.modalonly = true;
        // 数据验证
        option.datatype = "uinteger";
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        //
        option = section.option(form.ListValue, "vless_stream_security", _("Security"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none", _("none"));
        option.value("tls", _("TLS"));
        option.value("reality", _("REALITY"));

        // 依赖
        option.depends("protocol", "vless");


        // TLS
        //
        option = section.option(form.Value, "vless_stream_tls_server_name", _("ServerName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "tls"});

        //
        // option = section.option(form.Value, "vless_stream_tls_verify_peer_cert_by_name", _("VerifyPeerCertByName"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        // option = section.option(form.Flag, "vless_stream_tls_reject_unknown_sni", _("RejectUnknownSni"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});


        //
        option = section.option(form.Flag, "vless_stream_tls_allow_insecure", _("AllowInsecure"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "tls"});


        //
        option = section.option(form.Value, "vless_stream_tls_alpn", _("alpn"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "tls"});


        //
        // option = section.option(form.Value, "vless_stream_tls_min_version", _("minVersion"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_max_version", _("maxVersion"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_cipher_suites", _("CipherSuites"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Flag, "vless_stream_tls_disable_system_root", _("DisableSystemRoot"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_certificates", _("Certificates"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls", "vless_stream_tls_disable_system_root": "1"});
        //
        //
        //
        // option = section.option(form.Flag, "vless_stream_tls_enable_ssession_resumption", _("EnableSessionResumption"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});


        //
        option = section.option(form.Value, "vless_stream_tls_fingerprint", _("Fingerprint"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "tls"});


        //
        // option = section.option(form.Value, "vless_stream_tls_pinned_peer_cert_sha256", _("PinnedPeerCertSha256"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_curve_preferences", _("CurvePreferences"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_master_key_log", _("MasterKeyLog"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_ech_server_keys", _("EchServerKeys"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_ech_config_list", _("EchConfigList"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});
        //
        //
        //
        // option = section.option(form.Value, "vless_stream_tls_ech_force_query", _("EchForceQuery"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "tls"});


        // reality
        //
        // option = section.option(form.Flag, "vless_stream_reality_show", _("Show"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // option = section.option(form.Value, "vless_stream_reality_target", _("Target"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});

        //
        // option = section.option(form.Flag, "vless_stream_reality_xver", _("xver"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_server_names", _("ServerNames"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_private_key", _("PrivateKey"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_min_client_ver", _("MinClientVer"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_max_client_ver", _("MaxClientVer"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_max_time_diff", _("MaxTimeDiff"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_short_ids", _("ShortIds"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_mldsa65Seed", _("mldsa65Seed"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_limit_fallback_upload_after_bytes", _("LimitFallbackUpload afterBytes"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_limit_fallback_upload_bytes_per_sec", _("LimitFallbackUpload bytesPerSec"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_limit_fallback_upload_burst_bytes_per_sec", _("LimitFallbackUpload burstBytesPerSec"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_limit_fallback_download_after_bytes", _("LimitFallbackDownload afterBytes"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_limit_fallback_download_bytes_per_sec", _("LimitFallbackDownload bytesPerSec"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});
        //
        // //
        // option = section.option(form.Value, "vless_stream_reality_limit_fallback_download_burst_bytes_per_sec", _("LimitFallbackDownload burstBytesPerSec"));
        // // 只展示在弹出框
        // option.modalonly = true;
        // // 依赖
        // option.depends({"vless_stream_security": "reality"});


        //
        option = section.option(form.Value, "vless_stream_reality_fingerprint", _("Fingerprint"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "reality"});


        //
        option = section.option(form.Value, "vless_stream_reality_server_name", _("ServerName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "reality"});


        //
        option = section.option(form.Value, "vless_stream_reality_password", _("Password"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "reality"});


        //
        option = section.option(form.Value, "vless_stream_reality_short_id", _("ShortId"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "reality"});


        //
        option = section.option(form.Value, "vless_stream_reality_mldsa65_verify", _("mldsa65Verify"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "reality"});


        //
        option = section.option(form.Value, "vless_stream_reality_spider_x", _("SpiderX"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends({"vless_stream_security": "reality"});
    },

    /**
     * hysteria 节点信息
     * @param section
     */
    hysteriaNodeInfo: function (section) {
        var option;

        //
        option = section.option(form.ListValue, "hysteria_protocol", _("Hysteria Protocol"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("udp");
        option.value("wechat-video");
        option.value("faketcp");
        // 依赖
        option.depends("protocol", "hysteria");

        //
        option = section.option(form.Value, "hysteria_up_mbps", _("UP mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        option.datatype = "uinteger";
        // 依赖
        option.depends("protocol", "hysteria");

        //
        option = section.option(form.Value, "hysteria_down_mbps", _("Down mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        option.datatype = "uinteger";
        // 依赖
        option.depends("protocol", "hysteria");

        //
        option = section.option(form.Value, "hysteria_obfs_password", _("obfs password"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria");

        //
        option = section.option(form.Value, "hysteria_server_name", _("Server Name"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria");

        //
        option = section.option(form.Flag, "hysteria_allow_insecure", _("Allow Insecure"));
        option.rmempty = false;
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria");
    },

    /**
     * tuic 节点信息
     * @param section
     */
    tuicNodeInfo: function (section) {
        var option;

        //
        option = section.option(form.ListValue, "tuic_congestion_control", _("Congestion Control"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("cubic");
        option.value("newreno");
        option.value("bbr");
        option.value("bbr3");

        // 依赖
        option.depends("protocol", "tuic");

        //
        option = section.option(form.ListValue, "tuic_udp_relay_mode", _("UDP Relay Mode"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("native");
        option.value("quic");

        // 依赖
        option.depends("protocol", "tuic");


        //
        option = section.option(form.Flag, "tuic_zero_rtt_handshake", _("Zero RTT Handshake"));
        // 空是否删除
        option.rmempty = false;
        // 默认值
        option.default = option.enabled;
        // 只展示在弹出框
        option.modalonly = true;

        // 依赖
        option.depends("protocol", "tuic");


        //
        option = section.option(form.Value, "tuic_alpn", _("alpn"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "tuic");

        //
        option = section.option(form.Flag, "tuic_allow_insecure", _("Allow Insecure"));
        option.rmempty = false;
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "tuic");

        //
        option = section.option(form.Value, "tuic_sni", _("sni"));
        option.rmempty = false;
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("tuic_allow_insecure", "1");


    },

    /**
     * shadowtls 节点信息
     * @param section
     */
    shadowtlsNodeInfo: function (section) {
        var option;


    },

    /**
     * hysteria2 节点信息
     * @param section
     */
    hysteria2NodeInfo: function (section) {
        var option;

        // 跳跃端口
        //
        option = section.option(form.Value, "hysteria2_port_range", _("Port Range"), _("1,2/1-10/1,2-5,9"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria2");


        //
        option = section.option(form.Value, "hysteria2_up_mbps", _("UP mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        option.datatype = "uinteger";
        // 依赖
        option.depends("protocol", "hysteria2");


        //
        option = section.option(form.Value, "hysteria2_down_mbps", _("Down mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        option.datatype = "uinteger";
        // 依赖
        option.depends("protocol", "hysteria2");


        // TLS
        option = section.option(form.Flag, "hysteria2_tls", _("Enable TLS"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria2");

        //
        option = section.option(form.Value, "hysteria2_tls_sni", _("SNI"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("hysteria2_tls", "1");

        //
        option = section.option(form.Flag, "hysteria2_allow_insecure", _("Allow Insecure"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("hysteria2_tls", "1");


        // Transport
        option = section.option(form.Flag, "hysteria2_transport", _("Enable Transport"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria2");

        //
        option = section.option(form.ListValue, "hysteria2_transport_type", _("Transport type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("udp");

        // 依赖
        option.depends("hysteria2_transport", "1");

        //
        option = section.option(form.Value, "hysteria2_transport_hopInterval", _("Transport hopInterval"));
        // 只展示在弹出框
        option.modalonly = true;
        option.datatype = "min(5)"
        // 依赖
        option.depends("hysteria2_transport", "1");


        // obfs
        option = section.option(form.Flag, "hysteria2_obfs", _("Enable obfs"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "hysteria2");

        //
        option = section.option(form.ListValue, "hysteria2_obfs_type", _("Obfs type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("salamander");

        // 依赖
        option.depends("hysteria2_obfs", "1");

        //
        option = section.option(form.Value, "hysteria2_obfs_password", _("Obfs password"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("hysteria2_obfs", "1");
    },

    /**
     * anytls 节点信息
     * @param section
     */
    anytlsNodeInfo: function (section) {
        var option;

        // 空闲会话检查间隔
        option = section.option(form.Value, "anytls_idle_session_check_interval", _("idle_session_check_interval"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "anytls");


        // 空闲会话超时时间
        option = section.option(form.Value, "anytls_idle_session_timeout", _("idle_session_timeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "anytls");


        // 最小空闲会话数
        option = section.option(form.Value, "anytls_min_idle_session", _("min_idle_session"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "anytls");


        //
        option = section.option(form.Value, "anytls_server_name", _("Server Name"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "anytls");


        // Allow Insecure
        option = section.option(form.Flag, "anytls_allow_insecure", _("Allow Insecure"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "anytls");


        //
        option = section.option(form.Value, "anytls_client_metadata", _("Client Metadata"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("protocol", "anytls");
    },
});

/**
 * 导入链接
 * @param section_id
 * @param uri        链接
 * @param groupHash  分组hash
 * @returns {boolean|string} true:导入成功
 *                           否则返回错误描述
 */
function importUri(section_id, uri, groupHash) {
    //一些奇葩的链接用"&amp;"当做"&"，"#"前后带空格
    uri = uri.replace(/&([a-zA-Z]+);/g, '&').replace(/\s*#\s*/, '#').trim();

    // 分割
    var arr = uri.split('://');

    if (2 !== arr.length) {
        return _("Invalid Format.");
    }

    // 返回 节点数据
    var nodeData;
    // 匹配
    switch (arr[0]) {
        case "socks5":
            nodeData = importSocks5(arr[1]);
            break;
        case "ss":
            nodeData = importShadowSocks(arr[1]);
            break;
        case "ssr":
            nodeData = importShadowSocksR(arr[1]);
            break;
        case "vmess":
            nodeData = importVmess(arr[1]);
            break;
        case "trojan":
            nodeData = importTrojan(arr[1]);
            break;
        case "naive+https":
        case "naiveproxy":
            nodeData = importNaiveproxy(arr[1]);
            break;
        case "vless":
            nodeData = importVless(arr[1]);
            break;
        case "hysteria":
            nodeData = importHysteria(arr[1]);
            break;
        case "tuic":
            nodeData = importTuic(arr[1]);
            break;
        case "shadowtls":
            nodeData = importShadowTLS(arr[1]);
            break;
        case "hy2":
        case "hysteria2":
            nodeData = importHysteria2(arr[1]);
            break;
        case "anytls":
            nodeData = importAnyTLS(arr[1]);
            break;
        default:
            // 错误格式
            break;
    }


    if (nodeData && Object.keys(nodeData).length > 0) {
        // 返回 数据
        // 过滤 名称
        var filterResult = filterAlias(nodeData['alias']);

        if (filterResult) {
            // 需要 过滤
            return filterResult;
        }

        if (groupHash) {
            // 有分组 hash
            nodeData['group_hash'] = groupHash;
        }

        // 更新数据
        updateNodeData(section_id, nodeData);
        // 返回成功
        return true;
    } else {
        // 没有 数据返回
        return _("Invalid Format.");
    }
}

/**
 * 名称过滤 错误描述 需要删除 null 保留
 * @param alias
 * @returns {null|string}
 */
function filterAlias(alias) {
    if (filterWordsRegExp) {
        // 存在 过滤关键字
        if(filterWordsRegExp.exec(alias)) {
            // 匹配到
            return _("Filter Words Filter Out") + '(' + alias + ')';
        } else {
            // 未匹配到
            return null;
        }
    }
    // 默认保留
    return null;
}

/**
 * 转换为URL对象 方便取值
 * @param rawUrl
 * @returns {undefined|URL}
 */
function toURL(rawUrl) {
    try {
        var url = new URL("https://" + rawUrl);

        if (url.hostname) {
            // 有 hostname
            // 查询 位置
            var index = rawUrl.toLowerCase().indexOf(url.hostname);
            // 设置
            url.originHostname = rawUrl.substring(index, index + url.hostname.length);

            Object.defineProperty(url, 'hostname', {
                get() {
                    // console.log('读取了 hostname 属性');
                    return url.originHostname;
                }
            });
        }
        // 返回
        return url;
        // return new CustomUrl("https://" + rawUrl);
    } catch (e) {
        console.log(e);
        return undefined;
    }
}

/**
 * 处理服务器地址
 * 主要去除IPv6地址的前后[]
 * @param server 服务器地址
 * @returns {*} 处理后的服务器地址
 */
function parseServer(server) {
    // 如果带 [] 再去掉 []
    if (server[0] === "[" && server[server.length - 1] === "]") {
        return server.slice(1, -1);
    }
    // 返回原始值
    return server;
}

/**
 * 自定义分割 只分割一次
 * @param string 要分割的字符串
 * @param split  分割符合
 * @returns {string[]|*[]}
 */
function customSplit(string, split) {
    // 查找
    var index = string.indexOf(split);
    if (-1 === index) {
        // 没有查找到
        return [string];
    }

    // 查找到
    return [string.substring(0, index), string.substring(index + 1)];
}

/**
 * base64字符串解码
 * @param base64String 要解码的base64字符串
 * @param urlSafe      安全编码 不传非安全编码
 * @returns {undefined|*}
 */
function base64Decode(base64String, urlSafe) {
    try {
        var decode
        if (base64String.indexOf("%") !== -1) {
            // 是从URL对象获取的 解码一次
            decode = decodeURIComponent(base64String);
        } else {
            decode = base64String;
        }
        // 返回
        return CryptoJS.enc.Base64url.parse(decode, urlSafe ? urlSafe : false).toString(CryptoJS.enc.Utf8);
    } catch (e) {
        console.log(e);
        // 返回错误
        return undefined;
    }
}

/**
 * 将值转换为checkbox对应的值<br>
 * 将字符串 1 或 true 转换为 1
 */
function convertToCheckBoxValue(value) {
    if (value === "1" || value === "true") {
        //
        return 1;
    } else {
        return 0;
    }
}

/**
 * 导入 socks5 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importSocks5(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    var authEnable = 0, username, password;
    // 处理用户名和密码
    if (url.password) {
        // 普通 格式
        username = url.username;
        password = url.password;
        // 启用 认证
        authEnable = 1;
    } else if (url.username) {
        // 只有 用户名 base64 编码后的
        // 解码
        var auth = base64Decode(url.username);
        if (!auth) {
            return undefined;
        }
        // 分割
        var authInfo = customSplit(auth, ':');
        // 用户名
        username = authInfo[0] || '';
        // 密码
        password = authInfo[1] || '';
        // 启用 认证
        authEnable = 1;
    }

    // 节点数据
    var nodeData = {};

    // 协议类型
    nodeData['protocol'] = 'socks5';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || 80;
    // 是否启用 认证
    nodeData['auth_enable'] = authEnable;
    // 用户名
    nodeData['username'] = username || "";
    // 密码
    nodeData['password'] = password || "";

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 ShadowSocks 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importShadowSocks(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    // 临时变量
    var alias = url.hash ? decodeURIComponent(url.hash.substring(1)) : '';
    var server, port, method, password, plugin, pluginOpts;

    if (-1 !== rawUrl.indexOf("@")) {
        // ss://method:password@host:port/?plugin=
        // ss://base64(method:password)@host:port/?plugin=
        // ss://base64(method:password:iv:key)@host:port?shadow-tls=
        server = parseServer(url.hostname);
        port = url.port || 80;

        if (url.password) {
            // ss://method:password@host:port/?plugin=
            // 加密方式
            method = url.username;
            // 密码
            password = url.password;
        } else {
            // ss://base64(method:password)@host:port/?plugin=
            // ss://base64(method:password:iv:key)@host:port?shadow-tls=
            // 解码
            var auth = base64Decode(url.username);
            if (!auth) {
                return undefined;
            }
            // 分割
            var authInfo = customSplit(auth, ':');
            // 加密方式
            method = authInfo[0] || 'none';
            // 密码
            password = authInfo[1] || '';
        }

        if (url.searchParams.size > 0) {
            // 有参数
            var rawPlugin = url.searchParams.get('plugin');
            if (rawPlugin) {
                //
                var pluginParams = customSplit(rawPlugin, ";");
                // 插件名称
                plugin = pluginParams[0];
                // 插件参数
                pluginOpts = pluginParams[1] || "";
            } else {
                // ss://base64(method:password:iv:key)@host:port?shadow-tls=
            }
        }
    } else {
        // ss://base64(method:password@host:port)
        // 解码
        var decode = base64Decode(url.hostname);
        // 再 转URL
        var decodeUrl = toURL(decode);
        if (!decodeUrl) {
            return undefined;
        }

        server = parseServer(decodeUrl.hostname);
        port = decodeUrl.port || 80;

        // 加密方式
        method = decodeUrl.username || "none";
        // 密码
        password = decodeUrl.password || "";
    }

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'ss';
    // 别名
    nodeData['alias'] = alias;
    // 地址
    nodeData['server'] = server;
    // 端口
    nodeData['server_port'] = port;
    // 密码
    nodeData['password'] = password || "";
    // 加密方法
    nodeData['ss_encrypt_method'] = method || 'none';
    // 插件
    if (plugin && plugin !== "none") {
        // 设置 enable_plugin 为 true
        nodeData['ss_enable_plugin'] = 1;
        // 插件名称
        nodeData['ss_plugin'] = plugin || "none";
        // 插件参数
        nodeData['ss_plugin_opts'] = pluginOpts || "";
    } else {
        // 不使用插件
        nodeData['ss_enable_plugin'] = 0;
    }

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 ShadowSocksR 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importShadowSocksR(rawUrl) {
    // 解码
    var decodeString = base64Decode(rawUrl, true);
    if (!decodeString) {
        return undefined;
    }

    // host:port:auth_chain_a:chacha20-ietf:tls1.2_ticket_auth:password/?obfsparam=&remarks=U1NS6IqC54K5
    decodeString = decodeString.replace(/#.*/, "").trim();

    // 临时变量
    var url, params;

    var ploc = decodeString.indexOf("/?");
    if (ploc !== -1) {
        url = decodeString.substring(0, ploc);
        params = decodeString.substring(ploc + 2);
    } else {
        url = decodeString;
    }

    // 正则验证
    var ssm = url.match(/^(.+):([^:]+):([^:]*):([^:]+):([^:]*):([^:]+)/);
    if (!ssm || ssm.length < 7) return undefined;

    // 处理参数
    var paramDict = {};
    if (params.length > 2) {
        // 分割
        var items = params.split('&');
        for (var i = 0; i < items.length; i++) {
            var b = items[i].split('=');
            paramDict[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
        }
    }

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'ssr';
    // 地址
    nodeData['server'] = parseServer(ssm[1]);
    // 端口
    nodeData['server_port'] = ssm[2];
    // 密码
    nodeData['password'] = base64Decode(ssm[6]);
    // ssr 加密方式
    nodeData['ssr_encrypt_method'] = ssm[4];
    // ssr 协议
    nodeData['ssr_protocol'] = ssm[3];
    // ssr 协议参数
    nodeData['ssr_protocol_param'] = paramDict['protoparam'] ? base64Decode(paramDict['protoparam']) : "";
    // ssr obfs
    nodeData['ssr_obfs'] = ssm[5];
    // ssr obfs参数
    nodeData['ssr_obfs_param'] = paramDict['obfsparam'] ? base64Decode(paramDict['obfsparam']) : "";

    if (paramDict['tfo'] === "1") {
        // 设置 fast_open 为 true
        nodeData['fast_open'] = 1;
    } else {
        nodeData['fast_open'] = 0;
    }

    var remarks = paramDict['remarks'];
    if (remarks) {
        nodeData['alias'] = base64Decode(remarks);
    }

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 vmess 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importVmess(rawUrl) {
    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'vmess';

    var jsonData = {};

    // vmess://base64({"v":2,"ps":"vmess节点","add":"host","port":"port"})
    // vmess://base64(auto:uuid@host:port)?remark=&alterId=
    if (rawUrl.indexOf("?") !== -1) {
        // vmess://base64(auto:uuid@host:port)?remark=&alterId=
        // 转换为URL对象
        var url = toURL(rawUrl);
        if (!url) {
            return undefined;
        }

        // 将 参数 转换为 json 格式
        url.searchParams.forEach(function (value, key) {
            jsonData[key] = value;
        });

        // 解码
        var decode = base64Decode(url.username);
        // 转换为URL对象
        var decodeUrl = toURL(decode);
        if (!decodeUrl) {
            return undefined;
        }

        // 别名
        nodeData['alias'] = jsonData["remark"] || "";
        // 地址
        nodeData['server'] = parseServer(decodeUrl.hostname);
        // 端口
        nodeData['server_port'] = decodeUrl.port;
        //
        nodeData['vmess_id'] = decodeUrl.password;
        //
        nodeData['vmess_alter_id'] = jsonData["alterId"] || "0";
        // 加密方式
        nodeData['vmess_security'] = decodeUrl.username;
    } else {
        // vmess://base64({"v":2,"ps":"vmess节点","add":"host","port":"port"})
        // 解码
        var decodeString = base64Decode(rawUrl);
        if (!decodeString) {
            return undefined;
        }
        // 转换
        jsonData = JSON.parse(decodeString);

        // 别名
        nodeData['alias'] = jsonData['ps'] || "";
        // 地址
        nodeData['server'] = parseServer(jsonData["add"]);
        // 端口
        nodeData['server_port'] = jsonData["port"];

        //
        nodeData['vmess_id'] = jsonData["id"];
        //
        nodeData['vmess_alter_id'] = jsonData["aid"] || "0";
        // 加密方式
        nodeData['vmess_security'] = jsonData["scy"] || 'auto';
    }

    // 传输方式
    var stream_network = jsonData["net"] || jsonData["obfs"] || "tcp";

    if (["tcp"].includes(stream_network) || (jsonData["obfs"] && ("http" === stream_network))) {
        // 此处 使用 http 是因为 v2Board/Xboard 覆盖了 jsonData["obfs"] 值
        nodeData['vmess_stream_network'] = "tcp";
        //
        nodeData['vmess_stream_network_tcp_type'] = jsonData["type"] || jsonData["obfs"] || 'none';
        if (jsonData["type"] === "http") {
            //
            nodeData['vmess_stream_network_tcp_request_path'] = jsonData["path"] || '';
            //
            const host = jsonData["host"] || jsonData["obfsParam"]
            if (host) {
                nodeData['vmess_stream_network_tcp_request_headers'] = '{"Host": ["' + host + '"]}';
            } else {
                nodeData['vmess_stream_network_tcp_request_headers'] = '';
            }
        }

    } else if (["mkcp"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "mkcp";
        //
        nodeData['vmess_stream_network_mkcp_seed'] = jsonData["path"] || "";
    } else if (["ws", "websocket"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "ws";
        //
        nodeData['vmess_stream_network_ws_path'] = jsonData["path"] || '';
        //
        const host = jsonData["host"] || jsonData["obfsParam"]
        if (host) {
            //
            nodeData['vmess_stream_network_ws_headers'] = '{"Host": "' + host + '"}';
        }
    } else if (["h2", "httpupgrade"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "h2";
        //
        nodeData['vmess_stream_network_h2_host'] = jsonData["host"] || jsonData["obfsParam"] || '';
        //
        nodeData['vmess_stream_network_h2_path'] = jsonData["path"] || '';
    } else if (["domainsocket"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "domainsocket"

    } else if (["quic"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "quic";
        //
        nodeData['vmess_stream_network_quic_security'] = jsonData["securty"] || "";
        //
        nodeData['vmess_stream_network_quic_key'] = jsonData["key"] || '';
    } else if (["grpc"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "grpc";

        nodeData['vmess_stream_network_grpc_service_name'] = jsonData["path"] || '';
    } else if (["hy2"].includes(stream_network)) {
        nodeData['vmess_stream_network'] = "hy2";

    } else {
        // 其他  vmess 本身 没有 建议不要配置
        return undefined;
    }

    if (jsonData["tls"] === "tls") {
        nodeData['vmess_stream_security'] = 'tls';
        //
        nodeData['vmess_stream_tls_server_name'] = jsonData["sni"] || jsonData["peer"] || '';
        //
        nodeData['vmess_stream_tls_alpn'] = jsonData["alpn"] || '';
        //
        var allowInsecureValue = jsonData['allowInsecure'] || jsonData['insecure'] || jsonData['skip-cert-verify'];
        nodeData['vmess_stream_tls_allow_insecure'] = convertToCheckBoxValue(allowInsecureValue);
    } else {
        nodeData['vmess_stream_security'] = 'none';
    }

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 trojan 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importTrojan(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    // 临时变量
    var params = url.searchParams;

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'trojan';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "80";
    // 密码
    nodeData['password'] = decodeURIComponent(url.username);
    // 
    nodeData['trojan_tls_sni'] = params.get("peer") || params.get("sni") || '';

    if (nodeData['trojan_tls_sni'] !== '') {
        // 开启 TLS
        nodeData['trojan_tls'] = 1;
    } else {
        nodeData['trojan_tls'] = 0;
    }


    // 
    var allowInsecureValue = params.get("allowInsecure") || params.get("allowinsecure") || params.get("insecure");
    allowInsecureValue = convertToCheckBoxValue(allowInsecureValue);

    if (allowInsecureValue === 1) {
        // 开启 TLS
        nodeData['trojan_tls'] = 1;

        nodeData['trojan_allow_insecure'] = allowInsecureValue;
    }


    if (params.get("tfo") === "1") {
        // 
        nodeData['fast_open'] = 1;
    } else {
        nodeData['fast_open'] = 0;
    }

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 naiveproxy 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importNaiveproxy(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'naiveproxy';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "80";

    if (url.username) {
        // 是否启用 认证
        nodeData['auth_enable'] = 1;

        // 用户名
        nodeData['username'] = url.username
        // 密码
        nodeData['password'] = url.password;
    } else {
        // 是否启用 认证
        nodeData['auth_enable'] = 0;
    }

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 vless 节点
 * @param rawUrl
 * @returns {{}}
 */
function importVless(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'vless';

    var jsonData = {};

    if (url.username) {
        // // vless://uuid@server:port?a=&b=
        // 别名
        nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
        // 地址
        nodeData['server'] = parseServer(url.hostname);
        // 端口
        nodeData['server_port'] = url.port || "80";

        //
        nodeData['vless_id'] = url.username;

        // 参数转 json
        url.searchParams.forEach(function (value, key) {
            jsonData[key] = value;
        });
    } else {
        // vless://base64_encode("auto:uuid@server:port")?a=&b=
        // 解码
        var decode = base64Decode(url.hostname);
        if (!decode) {
            return undefined;
        }
        // 转 URL
        var decodeUrl = toURL(decode);
        if (!decodeUrl) {
            return undefined;
        }

        // 地址
        nodeData['server'] = parseServer(decodeUrl.hostname);
        // 端口
        nodeData['server_port'] = decodeUrl.port || "80";

        //
        nodeData['vless_id'] = decodeUrl.password;

        // 参数转 json
        url.searchParams.forEach(function (value, key) {
            jsonData[key] = value;
        });

        // 别名
        nodeData['alias'] = jsonData['remark'] ? decodeURIComponent(jsonData['remark']) : "";
    }

    //
    nodeData['vless_encryption'] = jsonData["encryption"] || "none";
    //
    nodeData['vless_flow'] = jsonData["flow"] || "";

    var xtls = jsonData["xtls"];
    if (xtls) {
        // 新 格式参数
        if (xtls === "1") {
            nodeData['vless_flow'] = 'xtls-rprx-direct';
        } else if (xtls === "2") {
            nodeData['vless_flow'] = 'xtls-rprx-vision';
        }
    }

    // 传输方式
    var stream_network = jsonData["type"] || jsonData["obfs"] || "tcp";


    if (["tcp"].includes(stream_network) || (jsonData["obfs"] && ("http" === stream_network))) {
        // 此处 使用 http 是因为 v2Board/Xboard 覆盖了 jsonData["obfs"] 值
        nodeData['vless_stream_network'] = "tcp";

        nodeData['vless_stream_network_tcp_type'] = jsonData["headerType"] || jsonData["obfs"] || "none";

        if (nodeData['vless_stream_network_tcp_type'] === "http") {
            nodeData['vless_stream_network_tcp_request_path'] = jsonData["path"] || "";

            const host = jsonData["host"] || jsonData["obfsParam"];
            if (host) {
                nodeData['vless_stream_network_tcp_request_headers'] = '{"Host": ["' + host + '"]}';
            } else {
                nodeData['vless_stream_network_tcp_request_headers'] = '';
            }
        }

    } else if (["xhttp", "splithttp"].includes(stream_network)) {
        nodeData['vless_stream_network'] = "xhttp";

        nodeData['vless_stream_network_xhttp_host'] = jsonData["host"] || jsonData["obfsParam"] || '';
        nodeData['vless_stream_network_xhttp_path'] = jsonData["path"] || '';
        nodeData['vless_stream_network_xhttp_mode'] = jsonData["mode"] || 'auto';

        if (jsonData['extra']) {
            nodeData['vless_stream_network_xhttp_enable_extra'] = 1;

            nodeData['vless_stream_network_xhttp_extra'] = jsonData['extra'];
        } else {
            nodeData['vless_stream_network_xhttp_enable_extra'] = 0;
            nodeData['vless_stream_network_xhttp_extra'] = '';
        }
    } else if (["kcp"].includes(stream_network) || (jsonData["type"] && (["none", "dns", "srtp", "utp", "wechat", "dtls", "wireguard"].includes(stream_network)))) {
        // 此处 使用 none, dns, srtp, utp, wechat, dtls, wireguard 是因为 v2Board/Xboard 覆盖了 jsonData["type"] 值
        nodeData['vless_stream_network'] = "kcp";

        nodeData['vless_stream_network_kcp_header_type'] = jsonData["type"] || 'none';
        nodeData['vless_stream_network_kcp_seed'] = jsonData["path"] || '';
    } else if (["ws", "websocket"].includes(stream_network)) {
        nodeData['vless_stream_network'] = "ws";

        nodeData['vless_stream_network_ws_host'] = jsonData["host"] || jsonData["obfsParam"] || '';
        nodeData['vless_stream_network_ws_path'] = jsonData["path"] || '';
    } else if (["grpc"].includes(stream_network)) {
        nodeData['vless_stream_network'] = "grpc";

        nodeData['vless_stream_network_grpc_service_name'] = jsonData["path"] || jsonData["host"] || jsonData["serviceName"];
    } else if (["h2", "httpupgrade"].includes(stream_network)) {
        nodeData['vless_stream_network'] = "httpupgrade";

        nodeData['vless_stream_network_http_host'] = jsonData["host"] || jsonData["obfsParam"] || '';
        nodeData['vless_stream_network_http_path'] = jsonData["path"] || '';
    } else if (["hysteria"].includes(stream_network)) {
        nodeData['vless_stream_network'] = "hysteria";

    } else {
        // 其他  vless 本身 没有 建议不要配置
        return undefined;
    }

    //
    nodeData['vless_stream_security'] = jsonData["security"] || 'none';

    if (jsonData["tls"] === "1") {
        if (jsonData["pbk"] || jsonData["sid"] || jsonData["spx"]) {
            // 有 这些参数 认为 是 reality
            nodeData['vless_stream_security'] = 'reality';
        } else {
            nodeData['vless_stream_security'] = 'tls';
        }
    }

    if (nodeData['vless_stream_security'] === 'tls') {
        //
        nodeData['vless_stream_tls_server_name'] = jsonData["sni"] || jsonData["peer"] || "";

        nodeData['vless_stream_tls_allow_insecure'] = convertToCheckBoxValue(jsonData["allowInsecure"] || jsonData["insecure"]);

        nodeData['vless_stream_tls_fingerprint'] = jsonData["fp"] || "";
    }

    if (nodeData['vless_stream_security'] === 'reality') {
        nodeData['vless_stream_reality_fingerprint'] = jsonData["fp"] || "";

        nodeData['vless_stream_reality_server_name'] = jsonData["sni"] || "";

        // 旧称 publicKey
        nodeData['vless_stream_reality_password'] = jsonData["pbk"] || "";

        nodeData['vless_stream_reality_short_id'] = jsonData["sid"] || "";

        nodeData['vless_stream_reality_mldsa65_verify'] = jsonData["pqv"] || "";

        nodeData['vless_stream_reality_spider_x'] = jsonData["spx"] || "";
    }

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 hysteria 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importHysteria(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    var params = url.searchParams;

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'hysteria';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "80";
    // 密码
    nodeData['password'] = params.get("auth") || '';

    nodeData['hysteria_protocol'] = params.get("protocol") || '';

    nodeData['hysteria_up_mbps'] = params.get("upmbps") || '';

    nodeData['hysteria_down_mbps'] = params.get("downmbps") || '';

    nodeData['hysteria_obfs_password'] = params.get("obfsParam") || '';

    nodeData['hysteria_server_name'] = params.get("peer") || '';

    nodeData['hysteria_allow_insecure'] = convertToCheckBoxValue(params.get("insecure") || '');


    // 返回节点数据
    return nodeData;
}

/**
 * 导入 tuic 节点
 * @param rawUrl
 * @returns {{}|undefined}
 */
function importTuic(rawUrl) {
    // tuic://uuid:password@host:port?sni=xxx&alpn=xxx&congestion_controller=xxx&udp_relay_mode=xxx#别名
    // tuic://{$addr}:{$server['port']}?{$query}#{$name}
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    var params = url.searchParams;

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'tuic';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "80";

    if (url.username) {
        // tuic://uuid:password@host:port?sni=xxx&alpn=xxx&congestion_controller=xxx&udp_relay_mode=xxx#别名
        // 用户名
        nodeData['username'] = url.username || '';
        // 密码
        nodeData['password'] = url.password || '';
    } else {
        // tuic://{$addr}:{$server['port']}?{$query}#{$name}

        // 用户名
        nodeData['username'] = params.get("uuid") || '';
        // 密码
        nodeData['password'] = params.get("password") || params.get("token") || '';
    }

    nodeData['tuic_congestion_control'] = params.get("congestion_control") || 'cubic';

    nodeData['tuic_udp_relay_mode'] = params.get("udp-relay-mode") || 'native';

    // nodeData['tuic_zero_rtt_handshake'] = ;

    nodeData['tuic_alpn'] = params.get("alpn") || '';

    nodeData['tuic_sni'] = params.get("sni") || '';

    nodeData['tuic_allow_insecure'] = convertToCheckBoxValue(params.get("insecure") || '');

    // 返回节点数据
    return nodeData;
}

/**
 * 导入 shadowtls 节点
 * @param rawUrl
 * @returns {{}}
 */
function importShadowTLS(rawUrl) {
    // 节点数据
    var nodeData = {};


    // 返回节点数据
    return nodeData;
}

/**
 * 导入 hysteria2 节点
 * @param rawUrl
 * @returns {{}}
 */
function importHysteria2(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    var params = url.searchParams;

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'hysteria2';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "443";
    // 密码
    nodeData['password'] = decodeURIComponent(url.username);

    // 跳跃端口
    nodeData['hysteria2_port_range'] = params.get("mport") || ""

    // 上行
    nodeData['hysteria2_up_mbps'] = (params.get("upmbps") && params.get("upmbps").match(/\d+/)) ? params.get("upmbps").match(/\d+/)[0] : "";
    // 下行
    nodeData['hysteria2_down_mbps'] = (params.get("downmbps") && params.get("downmbps").match(/\d+/)) ? params.get("downmbps").match(/\d+/)[0] : "";


    // TLS
    var tls_sni = params.get("sni") || params.get("peer") || "";
    nodeData['hysteria2_tls_sni'] = tls_sni;

    nodeData['hysteria2_tls'] = convertToCheckBoxValue(params.get("sni"));
    if (tls_sni !== '') {
        nodeData['hysteria2_tls'] = 1;
    }

    var allowInsecureValue = convertToCheckBoxValue(params.get("allowInsecure") || params.get("insecure"));
    nodeData['hysteria2_allow_insecure'] = allowInsecureValue;

    if (allowInsecureValue === 1) {
        nodeData['hysteria2_tls'] = 1;
    }

    // Transport


    // Obfs
    var obfs_password = params.get("obfs-password") || params.get("obfs_password") || "";
    nodeData['hysteria2_obfs_password'] = obfs_password;

    if (params.get("obfs") && params.get("obfs") !== "none") {
        nodeData['hysteria2_obfs'] = 1;
        nodeData['hysteria2_obfs_type'] = params.get("obfs");
    } else {
        nodeData['hysteria2_obfs'] = 0;
    }
    if (obfs_password !== "") {
        nodeData['hysteria2_obfs'] = 1;
    }


    // 返回节点数据
    return nodeData;
}

/**
 * 导入 AnyTLS 节点
 * @param rawUrl
 * @returns {{}}
 */
function importAnyTLS(rawUrl) {
    // 转换为URL对象
    var url = toURL(rawUrl);
    if (!url) {
        return undefined;
    }

    var params = url.searchParams;

    // 节点数据
    var nodeData = {};

    // 值
    // 协议类型
    nodeData['protocol'] = 'anytls';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "443";

    // 密码
    nodeData['password'] = decodeURIComponent(url.username);


    // 空闲会话检查间隔
    nodeData['anytls_idle_session_check_interval'] = params.get("idle_session_check_interval");

    // 空闲会话超时时间
    nodeData['anytls_idle_session_timeout'] = params.get("idle_session_timeout");

    // 最小空闲会话数
    nodeData['anytls_min_idle_session'] = params.get("min_idle_session");

    // ServerName
    nodeData['anytls_server_name'] = params.get("sni") || "";

    var allowInsecureValue = params.get("allowInsecure") || params.get("insecure");
    allowInsecureValue = convertToCheckBoxValue(allowInsecureValue);
    nodeData['anytls_allow_insecure'] = allowInsecureValue;

    nodeData['anytls_client_metadata'] = params.get("client_metadata") || "";

    // 返回节点数据
    return nodeData;
}

// 返回
return viewExtend;