'use strict';
'require view';
'require uci';
'require form';
'require dom';
'require rpc';
'require poll';

'require tools.firewall as fwtool';
'require tools.widgets as widgets';
'require tools.network as nettools';

'require fs';

// 包名
var PACKAGE_NAME = 'ssr-plus2';


function renderStatus(stats) {
    var spanTemp = '<em><b style=color:%s>ShadowsocksR Plus+ %s</b></em>'
    
    if ('running' === stats) {
        // 运行中
        return spanTemp.format('green', _('RUNNING'));
    } else if('starting' === stats) {
        // 启动中
         return spanTemp.format('red', _('STARTING'));
    } else {
        // 未运行
        // inactive
        return spanTemp.format('red', _('NOT RUNNING'));
    }
}


return view.extend({
    // 获取
    callHostHints: rpc.declare({
        object: 'luci-rpc',
        method: 'getHostHints',
        expect: { '': {} }
    }),
    
    load: function() {
        return Promise.all([
            this.callHostHints(),
            uci.load(PACKAGE_NAME)
        ]);
    },

    render: function(data) {
        var hosts = data[0];
        
        
        var map, section, option;
        
        // 创建 Map
        map = new form.Map(PACKAGE_NAME, _('ShadowSocksR Plus+ Settings'), _('<h3>Support Socks5/SS/SSR/Vmess/Trojan/NaiveProxy/Vless/Hysteria/Tuic/ShadowTLS etc.</h3>'));

        // 运行状态
        section = map.section(form.TypedSection);
        // 匿名
        section.anonymous = true;
        // 渲染
        section.render = function () {
            poll.add(function () {
                fs.exec('/etc/init.d/ssr-plus2', ['status']).then(function(res) {
                    // 节点名称
                    var view = document.getElementById('run_state');
                    // 设置
                    view.innerHTML = renderStatus(res.stdout.trim());
                }).catch(function() {
                    // 节点名称
                    var view = document.getElementById('run_state');
                    // 设置
                    view.innerHTML = renderStatus();
                });
            });

            return E('fieldset', { 'class': 'cbi-section' }, [
                E('p', { 'id': 'run_state' }, E('em', {}, _('Collecting data...')))
            ]);
        };


        // 基础配置
        section = map.section(form.TypedSection, 'client');
        // 匿名
        section.anonymous = true;

        // 是否启用
        option = section.option(form.Flag, 'enable_proxy', _('Enable Proxy'), _('The Client Configuration Only Take Effect After Enable Proxy.'));
        // 默认值
        option.default = option.disabled;
        // 空是否删除
        option.rmempty = false;



        // 代理链
        section = map.section(form.GridSection, 'rule', _('Proxy Rule'));
        // 匿名
        section.anonymous = true;
        // 可添加/删除
        section.addremove = true;
        // 可排序
        section.sortable  = true;
        
        // 弹出框标题
        section.modaltitle = _('Proxy Rule');

        // 原始 保存方法
        var originHandleModalSave = section.handleModalSave;
        // 自定义 保存方法
        section.handleModalSave = function(modalMap, ev) {
            var section_id = modalMap.section;

            // 获取选中的节点
            var nodeNode = document.getElementById('cbi-%s-%s-%s'.format(PACKAGE_NAME, section_id, "node"));
            // 对象
            var nodeMap = dom.findClassInstance(nodeNode);

            // 获取列表 值
            var cfgid = nodeMap.formvalue(section_id);

            // 获取节点信息
            var nodeData = uci.get(PACKAGE_NAME, cfgid);


            // 设置表头中的值
            // 协议类型
            uci.set(PACKAGE_NAME, section_id, 'protocol', nodeData['protocol']);
            // 别名
            uci.set(PACKAGE_NAME, section_id, 'alias', nodeData['alias'] || '');
            // 端口
            uci.set(PACKAGE_NAME, section_id, 'server_port', nodeData['server_port']);
            // 是否启用
            var enable = uci.get(PACKAGE_NAME, section_id, 'enable');
            
            if (undefined == enable) {
                // 未 设置
                uci.set(PACKAGE_NAME, section_id, 'enable', '1');
            }
            
            // 调用 原始函数
            originHandleModalSave.apply(this, arguments);
        };


        // 代理协议
        option = section.option(form.Value, 'protocol', _('Proxy Protocol'));
        // 只展示在表头
        option.modalonly = false;

    
        // 别名
        option = section.option(form.Value, 'alias', _('Alias'));
        // 只展示在表头
        option.modalonly = false;


        // 端口
        option = section.option(form.Value, 'server_port', _('Port'));
        // 只展示在表头
        option.modalonly = false;


        // 启用选项
        option = section.option(form.Flag, 'enable', _('Enable'));
        // 只展示在表头
        option.modalonly = false;
        // 默认值
        option.default = option.disabled;
        // 空是否删除
        option.rmempty = false;
        // table中需要 可编辑
        option.editable = true;



        // 基本设置
        section.tab('general', _('General Settings'));
        // 不走代理的域名
        section.tab('pass', _('Bypass'));
        // 强制走代理的域名
        section.tab('force', _('Force'));

        // 节点
        option = section.taboption('general', form.ListValue, 'node', _('Node'));
        // 只展示在弹出框
        option.modalonly = true;
        // 循环 节点列表
        uci.sections(PACKAGE_NAME, 'node', function(section) {
            option.value(section['.name'], section['alias']);
        });

        
        // 内网 IP 列表选择
        option = section.taboption('general', form.DynamicList, 'proxy_device', _('Proxy Internal Device'));
        // 只展示在弹出框
        option.modalonly = true;
        
        for (var key in hosts) {
            var value = hosts[key];
            var name = value.name;
            if ( name == undefined || name == '' ) {
                continue;
            }
            // console.log(key);
            // console.log(value)
            
            // option.value(value.ipaddrs.concat(value.ip6addrs), name);
            option.value(name, name);
        }
        
        // // 过滤列表
        // var choices = fwtool.transformHostHints('ipv4', hosts);
        // // 循环 节点列表
        // for (var i = 0; i < choices[0].length; i++) {
        //     option.value(choices[0][i], choices[1][choices[0][i]]);
        // }
        // 
        // // 过滤列表
        // var choices = fwtool.transformHostHints('ipv6', hosts);
        // // 循环 节点列表
        // for (var i = 0; i < choices[0].length; i++) {
        //     option.value(choices[0][i], choices[1][choices[0][i]]);
        // }


        // 代理地址列表
        option = section.taboption('general', form.DynamicList, 'proxy_address', _('Proxy Address List'));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        //option.rmempty = false;
        // 循环 节点列表
        uci.sections(PACKAGE_NAME, 'advanced_address', function(section) {
            option.value(section['.name'], section['alias']);
        });


        // 代理节点
        option = section.taboption('general', form.DynamicList, 'proxy_node', _('Proxy Node'));
        // 只展示在弹出框
        option.modalonly = true;
        // 循环 节点列表
        uci.sections(PACKAGE_NAME, 'node', function(section) {
            option.value(section['.name'], section['alias']);
        });


        // 代理端口
        option = section.taboption('general', form.Value, 'proxy_port', _('Proxy Port'), _('Proxy Node Select Should All Port'));
        // 只展示在弹出框
        option.modalonly = true;

        option.value('', _("All Port"));
        option.value('22,53,587,465,995,993,143,80,443,853,9418', "22,53,587,465,995,993,143,80,443,853,9418");
        option.placeholder = "e.g., 80,443,8080";


        // DNS 服务器
        option = section.taboption('general', form.Value, 'dns_server', _('DNS Server'));
        // 只展示在弹出框
        option.modalonly = true;
        option.rmempty = false;
        option.datatype = "ip4addrport";

        option.value('8.8.8.8:53', _("Google Public DNS (8.8.8.8)"));
        option.value('8.8.4.4:53', _("Google Public DNS (8.8.4.4)"));
        // 默认值
        option.default = '8.8.4.4:53';


        // 过滤IPv6
        option = section.taboption('general', form.Flag, 'filter_AAAA', _('filterAAAA'), _("Close Option Ensure Proxy Node Support IPv6."));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        option.rmempty = false;
        // 默认值
        option.default = option.enabled;

        
        // 不走代理
        option = section.taboption('pass', form.DynamicList, 'pass', _('Bypass'));
        // 只展示在弹出框
        option.modalonly = true;

        
        // 强制走代理
        option = section.taboption('force', form.DynamicList, 'force', _('Force'));
        // 只展示在弹出框
        option.modalonly = true;

        
        // 渲染
        return map.render();
    },
    

    handleSaveApply: function(ev, mode) {
        return this.handleSave(ev)
            .then(uci.changes.bind(this))
            .then(async function(data) {
                if (data[PACKAGE_NAME]) {
                    // 有数据变化
                    // console.log("有数据 变化");
                    await uci.apply(60).then(async function() {
                        // 保存结束
                        // 重启
                        await fs.exec_direct("/etc/init.d/ssr-plus2", ['restart']);
                        
                        // 重新刷新页面
                        window.setTimeout(function() {
                            //UI.prototype.changes.displayStatus(false);
                            window.location = window.location.href.split('#')[0];
                        }, L.env.apply_display * 1000);
                    });
                } else{
                    // 无数据 变化
                    // console.log("无数据 变化");
                    // 重启
                    await fs.exec_direct("/etc/init.d/ssr-plus2", ['restart']);
                }
            });
    }
});