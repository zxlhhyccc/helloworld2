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
script.src = "/luci-static/resources/view/ssr-plus2/crypto-js.js";
document.head.appendChild(script);


// 包名
var PACKAGE_NAME = 'ssr-plus2';

// 自定义 name
function createNodeName(nodeData) {
    // 组成成字符串
    var string = (nodeData['protocol'] || '') + (nodeData['server'] || '') + (nodeData['server_port'] || '') + new Date().getTime() + (Math.random() * 0xFFFFFF);
    // 取 MD5
    return CryptoJS.MD5(string).toString();
}

// 清除 节点数据
function unsetNodeData(section_id) {
    // 当前 配置
    var currentConfig = uci.get(PACKAGE_NAME, section_id);
    for (var name in currentConfig) {
       // 
       if (name.startsWith(".")) {
           // 不能删除
           continue;
       }
       
       if (name == 'group_hash') {
           // 分组 hash
           continue;
       }
       
       // 删除
       uci.unset(PACKAGE_NAME, section_id, name);
    }
}


// 设置 节点数据
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


// 更新 节点数据
function updateNodeData(section_id, nodeData) {
    if (null != section_id) {
        // 有 section_id
        // 先清空当前值
        unsetNodeData(section_id);
        // 再设置值
        setNodeData(section_id, nodeData);
    } else {
        // 直接 设置值
        setNodeData(uci.add(PACKAGE_NAME, 'node', createNodeName(nodeData)), nodeData);
    }
}


// 更新 节点数量
function updateNodeNum() {
    // 更新 节点数量
    // 节点数量名称
    var view = document.getElementById('node_number');
    // 重新设置数量
    view.innerHTML = uci.sections(PACKAGE_NAME, 'node').length;
}


// 导入节点按钮
var importClickFunction = function (section_id, ev) {
    // 节点名称
    var importStatus = document.getElementById('import_status');
    
    // 弹出输入框
    var uri = prompt(_("Paste sharing link here"), "");
    if (uri == null) {
        // 空
        // 用户取消
        importStatus.innerHTML = "<font style=\'color:red\'>" + _("User cancelled.") + "</font>";
        return;
    }
    
    if (uri == "") {
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
        var mapNode = document.querySelector('body.modal-overlay-active > #modal_overlay > .modal.cbi-modal > .cbi-map:not(.hidden)');
        
        var activeMap = dom.findClassInstance(mapNode);

        // 重新渲染
        activeMap.render();
        
        // 导入成功
        importStatus.innerHTML = "<font style=\'color:green\'>" + _("Import configuration information successfully.") + "</font>";
    } else {
        // 导入失败
        importStatus.innerHTML = "<font style=\'color:red\'>" + importResult + "</font>";
    }
};


// ping 工具
// var ping = rpc.declare({
//     object: 'luci.ssr-plus2',
//     method: 'ping',
//     params: ["domain", "port"],
//     expect: { '': {} },
//     nobatch: true
// });
var ping = rpc.declare({
    object: 'luci.ssr-plus2',
    method: 'ping',
    params: ["sectionId"],
    expect: { '': {} },
    nobatch: true
});


var viewExtend = view.extend({
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
        var map, section, option;
        
        // 创建 Map
        map = new form.Map(PACKAGE_NAME, _('Servers subscription and manage'));


        // 基础配置
        section = map.section(form.TypedSection, 'server_subscribe');
        // 匿名
        section.anonymous = true;

        // 订阅链接
        option = section.option(form.DynamicList, 'subscribe_url', _('Subscribe URL'));
        // 
        //option.onchange = function(ev, section_id, values, d) {
        //  console.log("===============");
        //};
        
        // 原始 方法
        var orignHandleClick = ui.DynamicList.prototype.handleClick;
        // 自定义 点击事件
        ui.DynamicList.prototype.handleClick = function(ev) {
            if (matchesElem(ev.target, '.cbi-button-add')) {
                // 添加 按钮
                // 
                var input = ev.target.previousElementSibling;
                // 去除空格
                input.value = input.value.trim();
                // 判断是否为空
                if (!input.value.length) {
                    // 空字符串
                    return;
                }
            }
            
            // 调用原始方法
            orignHandleClick.apply(this, arguments);
        };
        


        // 节点过滤关键字
        option = section.option(form.Value, 'filter_words', _('Subscribe Filter Words'), _('Filter Words splited by /'));
        
        
        // 更新所有订阅服务器节点
        option = section.option(form.Button, "",  _("Update All Subscribe Servers"));
        // 样式
        option.inputstyle = "apply";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            // 获取列表 数据
            // 节点
            var subscribeUrlNode = document.getElementById('cbi-%s-%s-%s'.format(PACKAGE_NAME, section_id, "subscribe_url"));
            // 对象
            var subscribeUrlMap = dom.findClassInstance(subscribeUrlNode);
            
            // 获取列表 值
            var subscribeUrls = subscribeUrlMap.formvalue(section_id);
            
            // 去重
            for(var i=0; i < subscribeUrls.length; i++){
                for(var j=i+1; j < subscribeUrls.length; j++){
                    if(subscribeUrls[i].trim() == subscribeUrls[j].trim()) {
                        //第一个等同于第二个，splice方法删除第二个
                        subscribeUrls.splice(j,1);
                        j--;
                    }
                }
            }
            
            
            var tasks = [];
            // 循环
            for (var i = 0; i < subscribeUrls.length; i++) {
                var subscribeUrl = subscribeUrls[i];
                // 调用订阅
                
                tasks.push(fs.exec_direct('/etc/init.d/ssr-plus2', ['mycurl', subscribeUrl]).then(
                    ev.view.L.bind(function(subscribeUrl, response) {
                        if (response) {
                            // 有结果
                            // base64 解码
                            var decodeString = CryptoJS.enc.Base64.parse(response).toString(CryptoJS.enc.Utf8);
                            // 分割
                            var nodeArr = decodeString.trim().split('\r\n');
                            // 长度
                            var length = nodeArr.length;
                            
                            
                            // 计算md5
                            var md5 = CryptoJS.MD5(subscribeUrl);
                            // 转成字符串
                            var groupHash = md5.toString();
                            
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
                                    // ui.addNotification(null, E('p', _("Import configuration information successfully.") + '(' + subscribeUrl + ')' + '(' + node + ')'));
                                } else {
                                    // 导入失败
                                    ui.addNotification(null, E('p', importResult + '(' + subscribeUrl + ')' + '(' + node + ')'));
                                }
                            }
                        } else {
                            // 提示错误
                            ui.addNotification(null, E('p', _("Empty") + '(' + subscribeUrl + ')'));
                        }
                    }, this, subscribeUrl)
                ).catch(
                    ev.view.L.bind(function(subscribeUrl, error) {
                        // 提示错误
                        ui.addNotification(null, E('p', _('Apply request failed with status <code>%h</code>').format(error.message + '(' + subscribeUrl + ')')));
                    }, this, subscribeUrl)
                ));
            }
            
            
            // 重新设置 文字
            // ev.currentTarget.parentNode.nextElementSibling.value =  _("Update All Subscribe Servers");
            
            return Promise.all(tasks).then(ev.view.L.bind(async function() {
                // 提交数据修改 并刷新页面
                await this.map.save();
            }, this)).then(function() {
                // 更新 节点数量
                updateNodeNum();
            });
        };


        // 删除所有订阅服务器节点
        option = section.option(form.Button, "", _("Delete All Subscribe Servers"), _("Server Count") + '<span id=node_number>' + uci.sections(PACKAGE_NAME, 'node').length || 0 + '</span>');
        // 样式
        option.inputstyle = "reset";
        // 自定义事件
        option.onclick = function(ev, section_id) {
            // 删除 订阅配置
            uci.sections(PACKAGE_NAME, 'node', function(s) {
                if (s['group_hash']) {
                    // 有分组 hash
                    // 删除配置
                    uci.remove(PACKAGE_NAME, s['.name']);
                }
            });
            
            // 重新设置 文字
            // ev.currentTarget.parentNode.nextElementSibling.value =  _("Delete All Subscribe Servers");
            // 提交数据修改 并刷新页面
            return this.map.save().then(function() {
                // 更新 节点数量
                updateNodeNum();
            });
        };



        // 节点
        section = map.section(form.GridSection, 'node');
        // 匿名
        section.anonymous = true;
        // 可添加/删除
        section.addremove = true;
        // 可排序
        section.sortable  = true;
        // 弹出框标题
        section.modaltitle = _('Node');


        // 原始 配置
        var originNodeData;
        section.addModalOptions = function(modalSection, section_id, ev) {
            // 原始 配置
            originNodeData = JSON.parse(JSON.stringify(uci.get(PACKAGE_NAME, section_id)));
        };


        // 是否执行过
        var isRun = false;

        // 原始 添加方法
        var originHandleAdd = section.handleAdd;
        // 自定义 添加方法
        section.handleAdd = function(ev, name) {
            // 未执行过
            isRun = false;
            // 自定义 name
            originHandleAdd.apply(this, [ev, createNodeName([])]);
        };
        
        
        // 原始 编辑方法
        var originRenderMoreOptionsModal = section.renderMoreOptionsModal;
        // 自定义 添加方法
        section.renderMoreOptionsModal = function(section_id, ev) {
            // 未执行过
            isRun = false;
            // 执行原始方法
            originRenderMoreOptionsModal.apply(this, [section_id, ev]);
        };        
        

        // 原始 删除方法
        var originHandleRemove = section.handleRemove;
        // 自定义 删除方法
        section.handleRemove = function(section_id, ev) {
            // 调用 原始函数
            originHandleRemove.apply(this, arguments).then(function() {
                // 更新 节点数量
                updateNodeNum();
            });
        };

        
        
        // 原始 保存方法
        var originHandleModalSave = section.handleModalSave;
        // 自定义 关闭方法
        section.handleModalSave = function(/* ... */) {
            // 调用 原始函数
            originHandleModalSave.apply(this, arguments).then(L.bind(function(modalMap, ev, isSaving) {
                if (!isRun) {
                    // 未执行过
                    // this.handleModalCancel(modalMap, ev, isSaving);
                    //this.load();
                    var mapNode = this.getActiveModalMap(),
                        activeMap = dom.findClassInstance(mapNode),
                        renderTasks = activeMap.render();
                    
                    while (activeMap.parent) {
                        activeMap = activeMap.parent;
                        renderTasks = renderTasks
                            .then(L.bind(activeMap.load, activeMap))
                            .then(L.bind(activeMap.reset, activeMap));
                    }
                    
                    renderTasks.then(L.bind(this.handleModalCancel, this, modalMap, ev, isSaving));
                }
            }, this, arguments[0], arguments[1], true));
        };


        // 原始 关闭方法
        var originHandleModalCancel = section.handleModalCancel;
        // 自定义 关闭方法
        section.handleModalCancel = function(modalMap, ev, isSaving) {
            if (isRun) {
                // 已经执行过 解决 handleModalSave 多次执行
                return;
            }
            // 已经 执行过
            isRun = true;
            if (isSaving) {
                // 保存
                // 更新 节点数量
                updateNodeNum();
            } else {
                // 取消 未保存
                var section_id = modalMap.section;

                // 恢复 配置文件值
                updateNodeData(modalMap.section, originNodeData);
            }
            // 调用 原始函数
            originHandleModalCancel.apply(this, arguments);
        };



        // 导入节点
        option = section.option(form.DummyValue, "import",  _("Import"));
        // 只展示在弹出框
        option.modalonly = true;
        // 
        option.rawhtml = true;
        // 自定义返回
        option.cfgvalue = function (section_id) {
            return E([E('button', {'class': 'btn cbi-button cbi-button-apply', 'click': ui.createHandlerFn(this, importClickFunction, section_id)}, _("Import")), E('span', {"id": "import_status"})]);
        };
        

        // 具体 节点信息 为了扩展 单独方法
        createNodeInfo(section);

        
        // 渲染
        return map.render();
    },

    // 不展示 保存并应用 按钮
    handleSaveApply: null
});


// ShadowSocks 加密方式
var ss_encrypt_methods = [
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
];


// ShadowSocksR 加密方式
var ssr_encrypt_methods = [
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
];


// ShadowSocksR 协议
var ssr_protocols = [
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
];


// ShadowSocksR 混淆插件
var ssr_obfs = [
    "plain",
    "http_simple",
    "http_post",
    "random_head",
    "tls1.2_ticket_auth"
];


// 创建 节点信息
function createNodeInfo(section) {
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
    // option.value('shadowtls', _('ShadowTLS'));
    // Hysteria2
    option.value('hysteria2', _('Hysteria2'));
    


    // 别名
    option = section.option(form.Value, 'alias', _('Alias'));



    // 服务器地址
    option = section.option(form.Value, 'server', _('Server'));
    // 空是否删除
    option.rmempty = false;
    // host类型
    option.datatype = "host"



    // 服务器端口
    option = section.option(form.Value, 'server_port', _('Server Port'));
    // 空是否删除
    option.rmempty = false;
    // 端口类型
    option.datatype = "port";



    //  Ping 延迟
    option = section.option(form.DummyValue, 'ping', _('Ping Latency'));
    // 只展示表格
    option.modalonly = false;
    option.rawhtml = true;
    // 自定义返回
    option.cfgvalue = function(section_id) {
        // 域名
        // var domain = uci.get(PACKAGE_NAME, section_id, 'server');
        // 端口
        // var port = uci.get(PACKAGE_NAME, section_id, 'server_port')

        // Promise.all([fs.exec_direct('/etc/init.d/ssr-plus2', ['myping', section_id])]).then(
        //     L.bind(function(section_id, response) {
        //         // ping 值
        //         // console.log(response);
        //         var ping = response[0].trim();
        //         // console.log(section_id + "======================" + response);
        //         // tr
        //         var trNode = document.getElementById('cbi-%s-%s'.format(PACKAGE_NAME, section_id));
        //         // 获取 子元素
        //         for(var i = 0; i < trNode.children.length; i++) {
        //             // 子元素
        //             var children = trNode.children[i];
        //             
        //             if (children.dataset.name === 'ping') {
        //                 // ping 延迟
        //                 let col = '#ff0000';
        //                 if (ping) {
        //                     if (ping < 300) col = '#ff3300';
        //                     if (ping < 200) col = '#ff7700';
        //                     if (ping < 100) col = '#249400';
        //                 }
        //                 children.innerHTML = `<font style=\"color:${col}\">${(ping ? ping : "--") + " s"}</font>`;
        //             }
        //         }
        //     }, this, section_id)
        // ).catch(
        //     L.bind(function(section_id, error) {
        //         // 提示错误
        //         // ui.addNotification(null, E('p', _('Apply request failed with status <code>%h</code>').format(error.message + '(' + subscribeUrl + ')')));
        //     }, this, section_id)
        // )

        // console.log(section_id);
        // Promise.all([ping(domain, parseInt(port))]).then(function(section_id, response) {
        //     // ping 值
        //     var ping = response[0].ping;
        //     // tr
        //     var trNode = document.getElementById('cbi-%s-%s'.format(PACKAGE_NAME, section_id));
        //     // 获取 子元素
        //     for(var i = 0; i < trNode.children.length; i++) {
        //         // 子元素
        //         var children = trNode.children[i];
        //         
        //         if (children.dataset.name === 'ping') {
        //             // ping 延迟
        //             let col = '#ff0000';
        //             if (ping) {
        //                 if (ping < 300) col = '#ff3300';
        //                 if (ping < 200) col = '#ff7700';
        //                 if (ping < 100) col = '#249400';
        //             }
        //             children.innerHTML = `<font style=\"color:${col}\">${(ping ? ping : "--") + " ms"}</font>`;
        //         }
        //     }
        // }.bind(this, section_id));

        // console.log(section_id);
        // Promise.all([ping(section_id)]).then(function(section_id, response) {
        //     // console.log(response);
        //     // ping 值
        //     var ping = response[0].ping.trim();
        //     // tr
        //     var trNode = document.getElementById('cbi-%s-%s'.format(PACKAGE_NAME, section_id));
        //     // 获取 子元素
        //     for(var i = 0; i < trNode.children.length; i++) {
        //         // 子元素
        //         var children = trNode.children[i];
        //         
        //         if (children.dataset.name === 'ping') {
        //             // ping 延迟
        //             let col = '#ff0000';
        //             if (ping) {
        //                 if (ping < 300) col = '#ff3300';
        //                 if (ping < 200) col = '#ff7700';
        //                 if (ping < 100) col = '#249400';
        //             }
        //             children.innerHTML = `<font style=\"color:${col}\">${(ping ? ping : "--") + " s"}</font>`;
        //         }
        //     }
        // }.bind(this, section_id));
        
        return "";
    };


    
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



    // ============================ ss  start
    ssNodeInfo(section);
    // ============================ ss  end



    // ============================ ssr  start
    ssrNodeInfo(section);
    // ============================ ssr  end


    
    // ============================ vmess  start
    vmessNodeInfo(section);
    // ============================ vmess  end



    // ============================ trojan  start
    trojanNodeInfo(section);
    // ============================ trojan  end



    // ============================ naiveProxy  start

    // ============================ naiveProxy  end



    // ============================ vless  start
    vlessNodeInfo(section);
    // ============================ vless  end



    // ============================ hysteria  start
    hysteriaNodeInfo(section);
    // ============================ hysteria  end


    // ============================ tuic  start
    tuicNodeInfo(section);
    // ============================ tuic  end 



    // ============================ shadowtls  start
    shadowtlsNodeInfo(section);
    // ============================ shadowtls  end 



    // ============================ hysteria2  start
    hysteria2NodeInfo(section);
    // ============================ hysteria2  end
    
    
    // TCP 快速打开
    option = section.option(form.Flag, "fast_open", _("TCP Fast Open"), _("Enabling TCP Fast Open Requires Server Support."));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "ss");
    option.depends("protocol", "ssr");
    option.depends("protocol", "trojan");
    
}

// ss 节点信息
function ssNodeInfo(section) {
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
    for (let i = 0; i < ss_encrypt_methods.length; i++) {
        option.value(ss_encrypt_methods[i]);
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
    option.depends({"ss_plugin" : "custom"});



    // Shadowsocks 插件参数
    option = section.option(form.Value, "ss_plugin_opts", _("Plugin Opts"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"ss_enable_plugin": "1"});
}

// ssr 节点信息
function ssrNodeInfo(section) {
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
    for (let i = 0; i < ssr_encrypt_methods.length; i++) {
        option.value(ssr_encrypt_methods[i]);
    }

    
    // ShadowsocksR 协议
    option = section.option(form.ListValue, "ssr_protocol", _("Protocol"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "ssr");

    // 循环展示
    for (let i = 0; i < ssr_protocols.length; i++) {
        option.value(ssr_protocols[i]);
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
    for (let i = 0; i < ssr_obfs.length; i++) {
        option.value(ssr_obfs[i]);
    }


    // ShadowsocksR 混淆插件参数
    option = section.option(form.Value, "ssr_obfs_param", _("Obfs param (optional)"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "ssr");
}

// vmess 节点信息
function vmessNodeInfo(section) {
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



    // 旧配置
    option = section.option(form.ListValue, "vmess_stream_network", _("Transport"));
    // 只展示在弹出框
    option.modalonly = true;

    option.value("tcp", _("TCP"));
    option.value("kcp", _("mKCP"));
    option.value("ws", _("WebSocket"));
    option.value("http", _("HTTP/2"));
    option.value("quic", _("Quic"));
    option.value("domainsocket", _("DomainSocket"));
    option.value("grpc", _("gRPC"));
    option.value("hysteria", _("Hysteria2"));

    // 依赖
    option.depends("protocol", "vmess");



        // tcp 特定配置
        option = section.option(form.Flag, "vmess_stream_network_tcp_accept_proxy_protocol", _("AcceptProxyProtocol"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "tcp");


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
        option = section.option(form.Value, "vmess_stream_network_kcp_mtu", _("Mtu"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Value, "vmess_stream_network_kcp_tti", _("Tti"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Value, "vmess_stream_network_kcp_uplink_capacity", _("UplinkCapacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Value, "vmess_stream_network_kcp_downlink_capacity", _("DownlinkCapacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Flag, "vmess_stream_network_kcp_congestion", _("Congestion"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Value, "vmess_stream_network_kcp_read_buffer_size", _("ReadBufferSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Value, "vmess_stream_network_kcp_write_buffer_size", _("WriteBufferSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.ListValue, "vmess_stream_network_kcp_header_type", _("Header Type"));
        // 只展示在弹出框
        option.modalonly = true;
        
        option.value("tcp");
        option.value("srtp");
        option.value("utp");
        option.value("wechat-video");
        option.value("dtls");
        option.value("wireguard");
        
        // 依赖
        option.depends("vmess_stream_network", "kcp");


        option = section.option(form.Value, "vmess_stream_network_kcp_seed", _("Seed"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "kcp");



        // ws 特定配置
        option = section.option(form.Flag, "vmess_stream_network_ws_accep_proxy_protocol", _("AcceptProxyProtocol"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "ws");


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



        // http 特定配置
        option = section.option(form.Value, "vmess_stream_network_http_host", _("Host"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "http");


        option = section.option(form.Value, "vmess_stream_network_http_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "http");


        option = section.option(form.Value, "vmess_stream_network_http_method", _("Method"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "http");


        option = section.option(form.Value, "vmess_stream_network_http_headers", _("Headers"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "http");



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


        option = section.option(form.ListValue, "vmess_stream_network_quic_headers_type", _("Header Type"));
        // 只展示在弹出框
        option.modalonly = true;
        
        option.value("tcp");
        option.value("srtp");
        option.value("utp");
        option.value("wechat-video");
        option.value("dtls");
        option.value("wireguard");
        // 依赖
        option.depends("vmess_stream_network", "quic");



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


        // grpc 特定配置
        option = section.option(form.Value, "vmess_stream_network_grpc_service_name", _("ServiceName"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "grpc");


        // hysteria 特定配置
        option = section.option(form.Value, "vmess_stream_network_hysteria_password", _("Password"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hysteria");


        option = section.option(form.Flag, "vmess_stream_network_hysteria_use_udp_extension", _("Use udp extension"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hysteria");


        option = section.option(form.Value, "vmess_stream_network_hysteria_congestion_type", _("Congestion Type"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hysteria");


        option = section.option(form.Value, "vmess_stream_network_hysteria_congestion_up_mbps", _("Congestion up_mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hysteria");


        option = section.option(form.Value, "vmess_stream_network_hysteria_congestion_down_mbps", _("Congestion down_mbps"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vmess_stream_network", "hysteria");




    // v5 配置
//    option = section.option(form.ListValue, "vmess_stream_transport", _("Transport"));
//    // 只展示在弹出框
//    option.modalonly = true;
//
//    option.value("tcp", _("TCP"));
//    option.value("ws", _("WebSocket"));
//    option.value("kcp", _("mKCP"));
//    option.value("grpc", _("gRPC"));
//    option.value("quic", _("Quic"));
//    option.value("meek", _("Meek"));
//    option.value("httpupgrade", _("HTTPUpgrade"));
//    option.value("hysteria", _("Hysteria2"));
//    // option.value("mekya", _("mekya"));
//    // option.value("tlsmirror", _("TLSMirror"));
//
//    // 依赖
//    option.depends("protocol", "vmess");




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
    option = section.option(form.Flag, "vmess_stream_tls_disable_system_root", _("Disable System Root"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vmess_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vmess_stream_tls_certificates", _("Certificates"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vmess_stream_security": "tls", "vmess_stream_tls_disable_system_root": "1"});


    // 
    option = section.option(form.Flag, "vmess_stream_tls_verify_client_certificate", _("verifyClientCertificate"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vmess_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vmess_stream_tls_pinned_peer_certificate_chain_sha256", _("pinnedPeerCertificateChainSha256"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vmess_stream_security": "tls"});
 





    // Mux
    // 
    option = section.option(form.Flag, "vmess_mux_enable", _("Mux"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "vmess");


    // concurrency
    // 
    option = section.option(form.Value, "vmess_mux_concurrency", _("Mux"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"protocol": "vmess", "vmess_mux_enable": "1"});
}

// vless 节点信息
function vlessNodeInfo(section) {
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
    option.value("xtls-rprx-vision");
    option.value("xtls-rprx-vision-udp443");
    // 依赖
    option.depends("protocol", "vless");


    

    option = section.option(form.ListValue, "vless_stream_network", _("Transport"));
    // 只展示在弹出框
    option.modalonly = true;

    option.value("raw", _("RAW"));
    option.value("xhttp", _("XHTTP"));
    option.value("kcp", _("mKCP"));
    option.value("ws", _("WebSocket"));
    option.value("grpc", _("gRPC"));
    option.value("httpupgrade", _("HTTPUpgrade"));
    option.value("hysteria", _("Hysteria2"));

    // 依赖
    option.depends("protocol", "vless");



        // raw/tcp 特定配置
        option = section.option(form.Flag, "vless_stream_network_tcp_accept_proxy_protocol", _("AcceptProxyProtocol"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "raw");


        option = section.option(form.ListValue, "vless_stream_network_tcp_type", _("Type"));
        // 只展示在弹出框
        option.modalonly = true;

        option.value("none", _("None"));
        option.value("http", _("HTTP"));
        // 依赖
        option.depends("vless_stream_network", "raw");


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


        option = section.option(form.Value, "vless_stream_network_xhttp_mode", _("Mode"));
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
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_tti", _("Tti"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_uplink_capacity", _("UplinkCapacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_downlink_capacity", _("DownlinkCapacity"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Flag, "vless_stream_network_kcp_congestion", _("Congestion"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_read_buffer_size", _("ReadBufferSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");


        option = section.option(form.Value, "vless_stream_network_kcp_write_buffer_size", _("WriteBufferSize"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "kcp");



        // ws 特定配置
        option = section.option(form.Flag, "vless_stream_network_ws_accep_proxy_protocol", _("AcceptProxyProtocol"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "ws");


        option = section.option(form.Value, "vless_stream_network_ws_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "ws");


        option = section.option(form.Value, "vless_stream_network_ws_host", _("Host"));
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
        // 依赖
        option.depends("vless_stream_network", "grpc"); 


        option = section.option(form.Value, "vless_stream_network_grpc_health_check_timeout", _("Health Check Timeout"));
        // 只展示在弹出框
        option.modalonly = true;
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
        // 依赖
        option.depends("vless_stream_network", "grpc"); 

        
        
        
        // http/2 特定配置
        option = section.option(form.Flag, "vless_stream_network_http_accep_proxy_protocol", _("AcceptProxyProtocol"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "httpupgrade");


        option = section.option(form.Value, "vless_stream_network_http_path", _("Path"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "httpupgrade");


        option = section.option(form.Value, "vless_stream_network_http_host", _("host"));
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
        option = section.option(form.Value, "vless_stream_network_hysteria_version", _("Version"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_auth", _("Auth"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");



        option = section.option(form.Value, "vless_stream_network_hysteria_up", _("Up"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_down", _("Down"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_udphop_port", _("Port"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_udphop_interval", _("Interval"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");



        option = section.option(form.Value, "vless_stream_network_hysteria_init_stream_receive_window", _("InitStreamReceiveWindow"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_max_stream_receive_window", _("MaxStreamReceiveWindow"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");



        option = section.option(form.Value, "vless_stream_network_hysteria_init_connection_receive_window", _("InitConnectionReceiveWindow"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_max_connection_receive_window", _("MaxConnectionReceiveWindow"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_max_idle_timeout", _("MaxIdleTimeout"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Value, "vless_stream_network_hysteria_keep_alive_period", _("KeepAlivePeriod"));
        // 只展示在弹出框
        option.modalonly = true;
        // 依赖
        option.depends("vless_stream_network", "hysteria");


        option = section.option(form.Flag, "vless_stream_network_hysteria_disable_path_mtu_discovery", _("disablePathMTUDiscovery"));
        // 只展示在弹出框
        option.modalonly = true;
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
    option = section.option(form.Value, "vless_stream_tls_verify_peer_cert_by_name", _("VerifyPeerCertByName"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});

    // 
    option = section.option(form.Flag, "vless_stream_tls_reject_unknown_sni", _("RejectUnknownSni"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"}); 


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
    option = section.option(form.Value, "vless_stream_tls_min_version", _("minVersion"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_max_version", _("maxVersion"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_cipher_suites", _("CipherSuites"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Flag, "vless_stream_tls_disable_system_root", _("DisableSystemRoot"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_certificates", _("Certificates"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls", "vless_stream_tls_disable_system_root": "1"});


    // 
    option = section.option(form.Flag, "vless_stream_tls_enable_ssession_resumption", _("EnableSessionResumption"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_fingerprint", _("Fingerprint"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_pinned_peer_cert_sha256", _("PinnedPeerCertSha256"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});
 

    // 
    option = section.option(form.Value, "vless_stream_tls_curve_preferences", _("CurvePreferences"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_master_key_log", _("MasterKeyLog"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_ech_server_keys", _("EchServerKeys"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_ech_config_list", _("EchConfigList"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});


    // 
    option = section.option(form.Value, "vless_stream_tls_ech_force_query", _("EchForceQuery"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "tls"});




    // reality
    // 
    option = section.option(form.Flag, "vless_stream_reality_show", _("Show"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});

    // 
    // option = section.option(form.Value, "vless_stream_reality_target", _("Target"));
    // // 只展示在弹出框
    // option.modalonly = true;
    // // 依赖
    // option.depends({"vless_stream_security": "reality"});

    // 
    option = section.option(form.Flag, "vless_stream_reality_xver", _("xver"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"}); 


    // 
    option = section.option(form.Value, "vless_stream_reality_server_names", _("ServerNames"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_private_key", _("PrivateKey"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_min_client_ver", _("MinClientVer"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_max_client_ver", _("MaxClientVer"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_max_time_diff", _("MaxTimeDiff"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_short_ids", _("ShortIds"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_mldsa65Seed", _("mldsa65Seed"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_limit_fallback_upload_after_bytes", _("LimitFallbackUpload afterBytes"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});

    // 
    option = section.option(form.Value, "vless_stream_reality_limit_fallback_upload_bytes_per_sec", _("LimitFallbackUpload bytesPerSec"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});

    // 
    option = section.option(form.Value, "vless_stream_reality_limit_fallback_upload_burst_bytes_per_sec", _("LimitFallbackUpload burstBytesPerSec"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


    // 
    option = section.option(form.Value, "vless_stream_reality_limit_fallback_download_after_bytes", _("LimitFallbackDownload afterBytes"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});

    // 
    option = section.option(form.Value, "vless_stream_reality_limit_fallback_download_bytes_per_sec", _("LimitFallbackDownload bytesPerSec"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});

    // 
    option = section.option(form.Value, "vless_stream_reality_limit_fallback_download_burst_bytes_per_sec", _("LimitFallbackDownload burstBytesPerSec"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"vless_stream_security": "reality"});


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








    // Mux
    // 
    option = section.option(form.Flag, "vless_mux_enable", _("Mux"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "vless");


    // concurrency
    // 
    option = section.option(form.Value, "vless_mux_concurrency", _("Mux"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends({"protocol": "vless", "vless_mux_enable": "1"});





}

// trojan 节点信息
function trojanNodeInfo(section) {
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
}


// hysteria 节点信息
function hysteriaNodeInfo(section) {
    var option;

    // 
    option = section.option(form.Value, "hysteria_up", _("UP mbps"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "hysteria");


    // 
    option = section.option(form.Value, "hysteria_down", _("Down mbps"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "hysteria");
}


// tuic 节点信息
function tuicNodeInfo(section) {
    var option;


}


// shadowtls 节点信息
function shadowtlsNodeInfo(section) {
    var option;


}


// hysteria2 节点信息
function hysteria2NodeInfo(section) {
    var option;

    // 跳跃端口
    // 
    option = section.option(form.Value, "hysteria2_port_range", _("Port Range"), _("1,2/1-10/1,2-5,9"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "hysteria2");    


    // 
    option = section.option(form.Value, "hysteria2_up", _("UP mbps"));
    // 只展示在弹出框
    option.modalonly = true;
    // 依赖
    option.depends("protocol", "hysteria2");


    // 
    option = section.option(form.Value, "hysteria2_down", _("Down mbps"));
    // 只展示在弹出框
    option.modalonly = true;
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
    
    
    
}


// 导入链接
// 返回true:导入成功;否则返回错误描述
function importUri(section_id, uri, groupHash) {
    //一些奇葩的链接用"&amp;"当做"&"，"#"前后带空格
    uri = uri.replace(/&([a-zA-Z]+);/g, '&').replace(/\s*#\s*/, '#').trim();

    // 分割
    var arr = uri.split('://');
    
    if (2 != arr.length) {
        return _("Invalid format.");
    }
    
    // 导入返回
    var importResult;
    // 匹配
    switch (arr[0]) {
        case "socks5":
            importResult = importSocks5(section_id, arr[1], groupHash);
            break;
        case "ss":
            importResult = importShadowSocks(section_id, arr[1], groupHash);
            break;
        case "ssr":
            importResult = importShadowSocksR(section_id, arr[1], groupHash);
            break;
        case "vmess":
            importResult = importVmess(section_id, arr[1], groupHash);
            break;
        case "trojan":
            importResult = importTrojan(section_id, arr[1], groupHash);
            break;
        case "naiveproxy":
            importResult = importNaiveproxy(section_id, arr[1], groupHash);
            break;
        case "vless":
            importResult = importVless(section_id, arr[1], groupHash);
            break;
        case "hysteria":
            importResult = importHysteria(section_id, arr[1], groupHash);
            break;
        case "tuic":
            importResult = importTuic(section_id, arr[1], groupHash);
            break;
        case "shadowtls":
            importResult = importShadowTLS(section_id, arr[1], groupHash);
            break;
        case "hy2":
        case "hysteria2":
            importResult = importHysteria2(section_id, arr[1], groupHash);
            break;
        default:
            // 错误格式
            importResult = _("Invalid format.");
            break;
    }
    
    // 返回结果
    return importResult;
}


// 导入 socks5 节点
function importSocks5(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    // 临时变量
    var url, alias = "", server, port, username, password;
    var sipIndex = rawUrl.indexOf("@");
    // 别名 分割
    var aliasIndex = rawUrl.indexOf("#");
    if (aliasIndex > 0) {
        // 有别名
        url = rawUrl.substr(0, aliasIndex);
        // 别名
        alias = rawUrl.substr(aliasIndex + 1);
    } else {
        // 没有别名
        url = rawUrl;
    }
    
    // socks5://base64(username:password)@host:port
    // 取出信息
    var strArr = url.match(/(([a-zA-Z0-9=]+)@)?(.*):([0-9]+)/);
    
    // 编码后信息
    var base64String = strArr[2];
    if (base64String) {
        // 有用户名 和 密码
        // 解码
        var info = CryptoJS.enc.Base64.parse(base64String).toString(CryptoJS.enc.Utf8);
        // 分割
        var infoArr = info.split(':');

        // 用户名
        username = infoArr[0] || '';
        // 密码
        password = infoArr[1] || '';
        
        nodeData['auth_enable'] = 1;
    }

    
    // 服务器地址
    server = strArr[3];
    // 端口
    port = strArr[4];
    
    // 值
    // 协议类型
    nodeData['protocol'] = 'socks5';
    // 别名
    nodeData['alias'] = alias;
    // 地址
    nodeData['server'] = parseServer(server);
    // 端口
    nodeData['server_port'] = port;
    // 用户名
    nodeData['username'] = username || "";
    // 密码
    nodeData['password'] = password || "";
 
    
    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 ShadowSocks 节点
function importShadowSocks(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    // 临时变量
    var url, alias = "", server, port, password, method, plugin, pluginOpts;
    var sipIndex = rawUrl.indexOf("@");
    // 别名 分割
    var aliasIndex = rawUrl.indexOf("#");
    if (aliasIndex > 0) {
        // 有别名
        url = rawUrl.substr(0, aliasIndex);
        // 别名
        alias = rawUrl.substr(aliasIndex + 1);
    } else {
        // 没有别名
        url = rawUrl;
    }
    
    
    if (/^[a-zA-Z0-9=]+@.*:[0-9]+(\/\?|\?)?.*/.test(url)) {
        // ss://base64(method:password)@host:port/?plugin=
        // ss://base64(method:password:iv:key)@host:port?shadow-tls=
        // 取出信息
        var strArr = url.match(/([a-zA-Z0-9=]+)@(.*):([0-9]+)(\/\?|\?)?(.*)/);

        // 编码后信息
        var base64String = strArr[1];
        // 解码
        var info = CryptoJS.enc.Base64.parse(base64String).toString(CryptoJS.enc.Utf8);
        // 分割
        var infoArr = info.split(':');

        // 加密方法
        method = infoArr[0] || 'none';
        // 密码
        password = infoArr[1] || '';
        // iv
        var iv = infoArr[2] || '';
        // key
        //var key = infoArr[3] || '';
        
        
        // 服务器地址
        server = strArr[2];
        // 端口
        port = strArr[3];
        // 参数
        var params = strArr[5];
        
        if (params) {
            // 有参数

            // 处理 插件信息
            var pluginInfo = params.match(/plugin=([^&]+)/);
            if (pluginInfo) {
                // ss://base64(method:password)@host:port/?plugin=
                var pluginParams = decodeURIComponent(pluginInfo[1]).split(";");
                // 插件名称
                plugin = pluginParams.shift();
                // 插件参数
                pluginOpts = pluginParams.length > 0 ? pluginParams.join(";") : "";
            } else {
                // ss://base64(method:password:iv:key)@host:port?shadow-tls=
                // = 分割
                var paramsArr = params.split('=');
                
                // 插件名称
                plugin = paramsArr.shift();
                
                // 插件参数
                // 参数解码
                var pluginParams = b64decsafe(paramsArr[0]);
                // 转成 JSON
                var pluginParamsJson = JSON.parse(pluginParams);
                // 
                var pluginParamsArr = [];
                for (let key in pluginParamsJson) {
                    pluginParamsArr.push(key + "=" + pluginParamsJson[key]);
                }
                pluginOpts = pluginParamsArr.length > 0 ? pluginParamsArr.join(";") : "";
            }
        }
    } else {
        // ss://base64(method:password@host:port)
        // 解码
        var info = b64decsafe(url);
        // @ 分割
        var infoArr = info.split('@');
        
        // : 分割
        var oneArr = infoArr[0].split(':');
        var twoArr = infoArr[1].split(':');
         

        // 加密方法
        method = oneArr[0] || 'none';
        // 密码
        password = oneArr[1] || '';
        // 服务器地址
        server = twoArr[0];
        // 端口
        port = twoArr[1]; 
    }
    // 设置值
    
    // 值
    // 协议类型
    nodeData['protocol'] = 'ss';
    // 地址
    nodeData['server'] = parseServer(server);
    // 端口
    nodeData['server_port'] = port;
    // 密码
    nodeData['password'] = password || "";
    // 加密方法
    nodeData['ss_encrypt_method'] = method
    // 插件
    if (plugin && plugin !== "none") {
        // 设置 enable_plugin 为 true
        nodeData['ss_enable_plugin'] = "1";
        // 插件名称
        nodeData['ss_plugin'] = plugin || "none";
        // 插件参数
        if (pluginOpts !== undefined) {
            nodeData['ss_plugin_opts'] = pluginOpts || "";
        }
    } else {
        // 不使用插件
        nodeData['ss_enable_plugin'] = "0";
    }
    
    // 别名
    if (alias !== undefined) {
        nodeData['alias'] = decodeURI(alias);
    }
    
    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 ShadowSocksR 节点
function importShadowSocksR(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    // 临时变量
    var url, alias = "", server, port, password, method, plugin, pluginOpts, param = "";
    
    // 解码
    var decodeString = CryptoJS.enc.Base64url.parse(rawUrl).toString(CryptoJS.enc.Utf8).replace(/#.*/, "").trim();
    
    var ploc = decodeString.indexOf("/?");
    if (ploc > 0) {
        url = decodeString.substr(0, ploc);
        param = decodeString.substr(ploc + 2);
    }
    
    // 正则验证
    var ssm = url.match(/^(.+):([^:]+):([^:]*):([^:]+):([^:]*):([^:]+)/);
    if (!ssm || ssm.length < 7) return false;
    
    var pdict = {};
    if (param.length > 2) {
        var a = param.split('&');
        for (var i = 0; i < a.length; i++) {
            var b = a[i].split('=');
            pdict[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
        }
    }
    
    
    // 值
    // 协议类型
    nodeData['protocol'] = 'ssr';
    // 地址
    nodeData['server'] = parseServer(ssm[1]);
    // 端口
    nodeData['server_port'] = ssm[2];
    // 密码
    nodeData['password'] = CryptoJS.enc.Base64.parse(ssm[6]).toString(CryptoJS.enc.Utf8);
    // ssr 加密方式
     nodeData['ssr_encrypt_method'] = ssm[4];
    // ssr 协议
    nodeData['ssr_protocol'] = ssm[3];
    // ssr 协议参数
    nodeData['ssr_protocol_param'] = dictvalue(pdict, 'protoparam');
    // ssr obfs
    nodeData['ssr_obfs'] = ssm[5];
    // ssr obfs参数
    nodeData['ssr_obfs_param'] = dictvalue(pdict, 'obfsparam');
    
    if (pdict.tfo === "1") {
        // 设置 fast_open 为 true
        nodeData['fast_open'] = 1;
    }
    
    var rem = pdict['remarks'];
    
    if (typeof (rem) != 'undefined' && rem != '' && rem.length > 0) {
        nodeData['alias'] = CryptoJS.enc.Base64url.parse(rem).toString(CryptoJS.enc.Utf8);
    }
    
    
    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 vmess 节点
function importVmess(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    
    // 解码
    var decodeString = CryptoJS.enc.Base64.parse(rawUrl).toString(CryptoJS.enc.Utf8).replace(/#.*/, "").trim();
    
    // 转换
    var ssm = JSON.parse(decodeString);
    
    // 值
    // 协议类型
    nodeData['protocol'] = 'vmess';
    // 别名
    nodeData['alias'] = ssm.ps;
    // 地址
    nodeData['server'] = parseServer(ssm.add);
    // 端口
    nodeData['server_port'] = ssm.port;

    // 
    nodeData['vmess_id'] = ssm.id;
    // 
    nodeData['vmess_alter_id'] = ssm.aid || "0";
    // 
    nodeData['vmess_stream_network'] = ["xhttp", "splithttp"].includes(ssm.net) ? "xhttp" : (["tcp", "raw"].includes(ssm.net) ? "tcp" : (ssm.net || "tcp"));
    
    
    if (nodeData['vmess_stream_network'] === 'xhttp') {
        // xray 特定配置
        // // 
        // nodeData['vmess_xhttp_mode'] = ssm.mode || "auto";
        // // 
        // nodeData['vmess_common_host'] = ssm.host;
        // // 
        // nodeData['vmess_common_path'] = ssm.path;
        // 
        // if (ssm.extra !== "" && ssm.extra !== undefined) {
        //     // 
        //     nodeData['vmess_xhttp_enable_extra'] = 1;
        //     // 
        //     nodeData['vmess_xhttp_extra'] = ssm.extra;
        // }
    }


    if (nodeData['vmess_stream_network'] === 'tcp') {
        // 
        nodeData['vmess_stream_network_tcp_type'] = ssm.type;

        if (ssm.type === "http") {
            // 
            nodeData['vmess_stream_network_tcp_request_path'] = ssm.path;
            // 
            nodeData['vmess_stream_network_tcp_request_headers'] =  '{"Host": ["' + ssm.host + '"]}';
        }
    }


    if (nodeData['vmess_stream_network'] == "kcp") {
        // 
        nodeData['vmess_stream_network_kcp_seed'] = ssm.path || "";
    }


    if (nodeData['vmess_stream_network'] == "ws") {
        // 
        nodeData['vmess_stream_network_ws_path'] = ssm.path;
        // 
        nodeData['vmess_stream_network_ws_headers'] = '{"Host": "' + ssm.host + '"}';
    }

    // HTTP 2
    if (nodeData['vmess_stream_network'] == "http") {
        // 
        nodeData['vmess_stream_network_http_host'] = ssm.host;
        // 
        nodeData['vmess_stream_network_http_path'] = ssm.path;
    }


    if (nodeData['vmess_stream_network'] == "quic") {
        // 
        nodeData['vmess_stream_network_quic_security'] = ssm.securty;
        // 
        nodeData['vmess_stream_network_quic_key'] = ssm.key;
    }


    if (nodeData['vmess_stream_network'] == "h2") {
        
    }

    
    if (ssm.tls == "tls") {
        // 
        nodeData['vmess_stream_tls'] = 1;
        
        if (ssm.host !== "" && ssm.host !== undefined) {
            // 
            nodeData['vmess_stream_tls_server_name'] = ssm.sni || ssm.host;
        }
        
        if (ssm.alpn !== "" && ssm.alpn !== undefined) {
            // 
            nodeData['vmess_stream_tls_alpn'] = ssm.alpn;
        }        


        var allowInsecureValue = ssm.allowInsecure || ssm.allowlnsecure || ssm.insecure || ssm['skip-cert-verify'];
        if (allowInsecureValue === "1" || allowInsecureValue === "true") {
            // 
            nodeData['vmess_stream_tls_allow_insecure'] = 1;
        }
    }

    if (ssm.mux !== undefined) {
        // 
        nodeData['vmess_mux'] = 1;
    }


    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 trojan 节点
function importTrojan(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    // 临时变量
    var url, params;
    
    
    try {
        url = new URL("http://" + rawUrl);
        params = url.searchParams;
    } catch(e) {
        alert(e);
        return;
    }
    
    
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
    
    if (nodeData['trojan_tls_sni'] != '') {
        // 开启 TLS
        nodeData['trojan_tls'] = 1;
    }

    
    var allowInsecureValue = params.get("allowInsecure") || params.get("allowinsecure") || params.get("insecure");
    if (allowInsecureValue === "1" || allowInsecureValue === "true") {
        // 开启 TLS
        nodeData['trojan_tls'] = 1;
        // 
        nodeData['trojan_allow_insecure'] = 1;
    }

    if (params.get("tfo") === "1") {
        // 
        nodeData['fast_open'] = 1;
    }
    

    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 naiveproxy 节点
function importNaiveproxy(section_id, rawUrl, groupHash) {


    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 vless 节点
function importVless(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    // 临时变量
    var url, params;
    
    
    try {
        url = new URL("http://" + rawUrl);
        params = url.searchParams;
    } catch(e) {
        alert(e);
        return;
    }
    
    
    // 值
    // 协议类型
    nodeData['protocol'] = 'vless';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "80";
    

    // 
    nodeData['vless_id'] = url.username;
    // 
    nodeData['vless_encryption'] = params.get("encryption") || "none";
    // 
    nodeData['vless_flow'] = params.get("flow") || "none";


    // 
    nodeData['vless_stream_network'] = params.get("type") === "http" ? "httpupgrade" : 
                                (["xhttp", "splithttp"].includes(params.get("type")) ? "xhttp" : 
                                (["tcp", "raw"].includes(params.get("type")) ? "raw" : (params.get("type") || "raw")));

    
    if (nodeData['vless_stream_network'] === 'raw') {
        nodeData['vless_stream_network_tcp_type'] = params.get("headerType") || "none";
        
        if (nodeData['vless_stream_network_tcp_type'] === "http") {
            nodeData['vless_stream_network_tcp_request_path'] = '["' + params.get("path") ? decodeURIComponent(params.get("path")) : "/" + '"]';
            
            if (params.get("host")) {
                nodeData['vless_stream_network_tcp_request_headers'] = '{"Host": ["' + decodeURIComponent(params.get("host")) + '"]}';
            }
        }
    }
    
    
    if (nodeData['vless_stream_network'] === 'xhttp') {
        nodeData['vless_stream_network_xhttp_mode'] = params.get("mode") || "auto";
        
        nodeData['vless_stream_network_xhttp_path'] = params.get("path") ? decodeURIComponent(params.get("path")) : "/";
        
        nodeData['vless_stream_network_xhttp_host'] = params.get("host") ? decodeURIComponent(params.get("host")) : "";
        
        if (params.get("extra") && params.get("extra").trim() !== "") {
            
            nodeData['vless_stream_network_xhttp_enable_extra'] = 1;
            
            nodeData['vless_stream_network_xhttp_extra'] = params.get("extra") || "";
        }
        
        
        if (params.get("tfo") === "1") {
            nodeData['fast_open'] = 1;
        }
    }


    if (nodeData['vless_stream_network'] === 'kcp') {
        // params.get("headerType")
        // params.get("host")
        // params.get("seed")
    }


    if (nodeData['vless_stream_network'] === 'ws') {
        nodeData['vless_stream_network_ws_path'] = params.get("path") ? decodeURIComponent(params.get("path")) : "/";
        
        nodeData['vless_stream_network_ws_host'] = params.get("host") ? decodeURIComponent(params.get("host")) : "";
    }


    if (nodeData['vless_stream_network'] === 'grpc') {
        nodeData['vless_stream_network_grpc_service_name'] = params.get("serviceName") || "";
        
        // nodeData['vless_stream_network_grpc_mode'] = params.get("mode") || "gun";
    }


    if (nodeData['vless_stream_network'] === 'httpupgrade') {
        nodeData['vless_stream_network_http_path'] = params.get("path") ? decodeURIComponent(params.get("path")) : "/";
        
        nodeData['vless_stream_network_http_host'] = params.get("host") ? decodeURIComponent(params.get("host")) : "";
    }


    if (nodeData['vless_stream_network'] === 'hysteria') {
        // nodeData['vless_stream_network_http_path'] = params.get("path") ? decodeURIComponent(params.get("path")) : "/";
        
        // nodeData['vless_stream_network_http_host'] = params.get("host") ? decodeURIComponent(params.get("host")) : "";
    }



    // 
    nodeData['vless_stream_security'] = params.get("security");

    
    if (nodeData['vless_stream_security'] === 'tls') {
        // 
        nodeData['vless_stream_tls_server_name'] = params.get("sni") || "";

        // 
        nodeData['vless_stream_tls_verify_peer_cert_by_name'] = params.get("vcn") || "";

        var allowInsecureValue = params.get("allowInsecure") || params.get("insecure");
        if (allowInsecureValue === "1" || allowInsecureValue === "true") {
            // 
            nodeData['vless_stream_tls_allow_insecure'] = 1;
        }

        nodeData['vless_stream_tls_alpn'] = params.get("alpn") || '["h2", "http/1.1"]';
        
        
        nodeData['vless_stream_tls_fingerprint'] = params.get("fp") || "";
        
        
        nodeData['vless_stream_tls_pinned_peer_cert_sha256'] = params.get("pcs") || "";
        
        // 
        nodeData['vless_stream_tls_ech_config_list'] = params.get("ech") || "";
    }


    if (nodeData['vless_stream_security'] === 'reality') {
        
        nodeData['vless_stream_reality_fingerprint'] = params.get("fp") || "";
        
        nodeData['vless_stream_reality_server_name'] = params.get("sni") || "";
        
        // 旧称 publicKey
        nodeData['vless_stream_reality_password'] = params.get("pbk") ? decodeURIComponent(params.get("pbk")) : "";
        
        nodeData['vless_stream_reality_short_id'] = params.get("sid") || "";
        
        nodeData['vless_stream_reality_mldsa65_verify'] = params.get("pqv") || "";
        
        nodeData['vless_stream_reality_spider_x'] = params.get("spx") ? decodeURIComponent(params.get("spx")) : "";
    }



    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}

// 导入 hysteria 节点
function importHysteria(section_id, rawUrl, groupHash) {



    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 tuic 节点
function importTuic(section_id, rawUrl, groupHash) {



    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 shadowtls 节点
function importShadowTLS(section_id, rawUrl, groupHash) {



    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


// 导入 hysteria2 节点
function importHysteria2(section_id, rawUrl, groupHash) {
    // 节点数据
    var nodeData = {};
    // 临时变量
    var url, params;
    
    
    try {
        url = new URL("http://" + rawUrl);
        params = url.searchParams;
    } catch(e) {
        alert(e);
        return;
    }


    // 值
    // 协议类型
    nodeData['protocol'] = 'hysteria2';
    // 别名
    nodeData['alias'] = url.hash ? decodeURIComponent(url.hash.slice(1)) : "";
    // 地址
    nodeData['server'] = parseServer(url.hostname);
    // 端口
    nodeData['server_port'] = url.port || "443";
    
    // 跳跃端口
    if (params.get("mport")) {
        nodeData['hysteria2_port_range'] = params.get("mport") || ""
    }
    
    
    // 密码
    nodeData['password'] = decodeURIComponent(url.username);
    // 上行
    nodeData['hysteria2_up'] = (params.get("upmbps") && params.get("upmbps").match(/\d+/)) ? params.get("upmbps").match(/\d+/)[0] : "";
    // 下行
    nodeData['hysteria2_down'] = (params.get("downmbps") && params.get("downmbps").match(/\d+/)) ? params.get("downmbps").match(/\d+/)[0] : "";
    
    
    // TLS
    if (params.get("sni")) {
        nodeData['hysteria2_tls'] = 1;
        
        nodeData['hysteria2_tls_sni'] = params.get("sni") || "";
    }
    
    var allowInsecureValue = params.get("allowInsecure") || params.get("insecure");
    if (allowInsecureValue === "1" || allowInsecureValue === "true") {
        nodeData['hysteria2_tls'] = 1;
        
        nodeData['hysteria2_allow_insecure'] = 1;
    }



    // Transport
    
    
    
    // Obfs
    if (params.get("obfs") && params.get("obfs") !== "none") {
        nodeData['hysteria2_obfs'] = 1;
        
        nodeData['hysteria2_obfs_type'] = params.get("obfs");
        nodeData['hysteria2_obfs_password'] = params.get("obfs-password") || params.get("obfs_password");
    }


    if (groupHash) {
        // 有分组 hash
        nodeData['group_hash'] = groupHash;
    }
    
    // 更新数据
    updateNodeData(section_id, nodeData);
    
    // 返回成功
    return true;
}


function dictvalue(d, key) {
    var v = d[key];
    if (typeof (v) == 'undefined' || v == '') return '';
    return CryptoJS.enc.Base64url.parse(v).toString(CryptoJS.enc.Utf8);
}

/**
* 处理服务器地址<br>
* 主要去除IPv6地址的前后[]
*/
function parseServer(server) {
    /* 如果带 []，再去掉 [] */
    if (server[0] === "[" && server[server.length - 1] === "]") {
        server = server.slice(1, -1);
    }

    return server;
}


return viewExtend;