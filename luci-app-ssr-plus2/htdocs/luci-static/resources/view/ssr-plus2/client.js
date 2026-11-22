'use strict';
'require view';
'require uci';
'require form';
'require dom';
'require rpc';
'require network';
'require validation';
'require poll';

'require fs';

// 引入 crypto-js
let script = document.createElement("script");
script.type = "text/javascript";
script.src = L.resource('ssr-plus2/crypto-js.js');
document.head.appendChild(script);

// 包名
var PACKAGE_NAME = 'ssr-plus2';

// 默认分组名称
var defaultGroupName = 'default';

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
    //
    callLuciDHCPLeases: rpc.declare({
        object: 'luci-rpc',
        method: 'getDHCPLeases',
        expect: { '': {} }
    }),

    // 获取
    callHostHints: rpc.declare({
        object: 'luci-rpc',
        method: 'getHostHints',
        expect: { '': {} }
    }),

    load: function() {
        return Promise.all([
            this.callLuciDHCPLeases(),
            network.getHostHints(),
            L.resolveDefault(fs.exec_direct('/usr/libexec/luci-arp'), ''),
            L.resolveDefault(fs.read('/tmp/luci-client-history.json').then(JSON.parse), {}),
            uci.load(PACKAGE_NAME)
        ]);
    },

    arpLeases: function(arp) {
        const leases = [];
        for (const line of String(arp || '').trim().split(/\n/)) {
            const fields = line.trim().split(/\s+/);
            if (fields.length != 6 || fields[5] != 'br-lan' ||
                !(parseInt(fields[2], 16) & 2) || !validation.parseIPv4(fields[0]) ||
                !/^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(fields[3]) ||
                fields[3] == '00:00:00:00:00:00' || (parseInt(fields[3].slice(0, 2), 16) & 1))
                continue;
            leases.push({ ipaddr: fields[0], macaddr: fields[3].toUpperCase(), interface: fields[5] });
        }
        return leases;
    },

    normalizeRateAddress: function(ip) {
        ip = ip.replace(/\/\d+$/, '');
        const v4 = validation.parseIPv4(ip);
        if (v4)
            return v4.join('.');
        const v6 = validation.parseIPv6(ip);
        return v6 ? v6.map(word => word.toString(16)).join(':') : null;
    },

    mergeLeases: function(leases, leases6, hints) {
        const clients = new Map();
        const owners = new Map();
        const normalizeMAC = mac => /^(?:[0-9a-f]{2}:){5}[0-9a-f]{2}$/i.test(mac || '') &&
            mac != '00:00:00:00:00:00' && !(parseInt(mac.slice(0, 2), 16) & 1)
            ? mac.toUpperCase() : null;
        const addresses = lease => [lease.ipaddr, ...L.toArray(lease.ipaddrs),
            lease.ip6addr, ...L.toArray(lease.ip6addrs)].filter(Boolean);
        const addOwner = (ip, mac) => {
            const address = this.normalizeRateAddress(ip);
            if (!address || !mac)
                return;
            if (!owners.has(address))
                owners.set(address, new Set());
            owners.get(address).add(mac);
        };
        for (const [mac, host] of Object.entries(hints.hosts || {}))
            for (const ip of [...L.toArray(host.ipaddrs || host.ipv4), ...L.toArray(host.ip6addrs || host.ipv6)])
                addOwner(ip, normalizeMAC(mac));
        for (const lease of [...leases, ...leases6])
            for (const ip of addresses(lease))
                addOwner(ip, normalizeMAC(lease.macaddr));

        for (const [family, list] of [[4, leases], [6, leases6]]) {
            for (const lease of list) {
                let mac = normalizeMAC(lease.macaddr);
                if (!mac) {
                    const matches = new Set();
                    for (const ip of addresses(lease))
                        for (const owner of owners.get(this.normalizeRateAddress(ip)) || [])
                            matches.add(owner);
                    if (matches.size == 1)
                        mac = matches.values().next().value;
                }
                // DUID/IAID only deduplicate the same unidentified lease and its history;
                // they never join it to a different IPv4 record based on hostname.
                const unknown = lease.duid ? [family, lease.duid.toLowerCase(), lease.iaid?.toLowerCase(), lease.interface] :
                    addresses(lease).length ? [family, ...addresses(lease).map(ip => this.normalizeRateAddress(ip))] : null;
                const key = mac || (unknown ? JSON.stringify(unknown) : Symbol());
                if (!clients.has(key))
                    clients.set(key, { macaddr: mac, hostname: lease.hostname,
                        ipaddrs: [], ip6addrs: [], interfaces: [], leases: [], leases6: [], activeAddresses: [] });
                const client = clients.get(key);
                client.hostname ||= lease.hostname;
                if (lease.interface && !client.interfaces.includes(lease.interface))
                    client.interfaces.push(lease.interface);
                const ips = family == 4 ? client.ipaddrs : client.ip6addrs;
                for (const ip of addresses(lease)) {
                    const address = this.normalizeRateAddress(ip);
                    if (address && !lease._historical && !client.activeAddresses.includes(address))
                        client.activeAddresses.push(address);
                    if (address && !ips.some(value => this.normalizeRateAddress(value) == address))
                        ips.push(ip);
                }
                const records = family == 4 ? client.leases : client.leases6;
                if (!lease._historical && !records.some(record => family == 4 ? record.ipaddr == lease.ipaddr :
                    record.duid?.toLowerCase() == lease.duid?.toLowerCase() && record.iaid == lease.iaid))
                    records.push(Object.assign({}, lease, { macaddr: mac }));
            }
        }
        for (const client of clients.values()) {
            const current = { macaddr: client.macaddr, ipaddrs: client.activeAddresses };
            client.rateAddresses = client.activeAddresses.length ? this.clientAddresses(current, hints) : [];
        }
        return Array.from(clients.values());
    },

    clientAddresses: function(lease, hints) {
        if (lease.rateAddresses)
            return lease.rateAddresses;
        const host = hints.hosts?.[lease.macaddr?.toUpperCase()] || {};
        return Array.from(new Set([
            lease.ipaddr, ...L.toArray(lease.ipaddrs), lease.ip6addr, ...L.toArray(lease.ip6addrs),
            ...L.toArray(host.ipaddrs || host.ipv4), ...L.toArray(host.ip6addrs || host.ipv6)
        ].filter(Boolean).map(ip => this.normalizeRateAddress(ip)).filter(Boolean)));
    },

    render: function([dhcp_leases, host_hints, arp, history]) {
        // luci/modules/luci-mod-status/htdocs/luci-static/resources/view/status/include/40_dhcp.js
        const arpClients = this.arpLeases(arp);
        const leases = [...(Array.isArray(dhcp_leases.dhcp_leases) ? dhcp_leases.dhcp_leases : []),
            ...arpClients,
            ...(Array.isArray(history?.dhcp_leases) ? history.dhcp_leases : []).map(lease => ({ ...lease, _historical: true }))];
        const leases6 = [...(Array.isArray(dhcp_leases.dhcp6_leases) ? dhcp_leases.dhcp6_leases : []),
            ...(Array.isArray(history?.dhcp6_leases) ? history.dhcp6_leases : []).map(lease => ({ ...lease, _historical: true }))];

        
        const clients = this.mergeLeases(leases, leases6, host_hints);
        
        const machints = host_hints.getMACHints(false);
        
        // alert(JSON.stringify(clients));

        // 获取订阅服务器 数据
        var subscribe = uci.sections(PACKAGE_NAME, 'subscribe');
        // 插入默认节点
        subscribe.splice(0, 0, {"alias": _("Default Group"), "url": "", "user_agent": ""});
        
        var subscribeMap = {};
        for (var i = 0; i < subscribe.length; i++) {
            var item = subscribe[i];
            // 名称
            var name = item['.name'] || defaultGroupName;
            // 别名
            var alias = item['alias'];
            
            // 计算md5 并 转成字符串
            var groupHash = CryptoJS.MD5(name).toString();
            
            subscribeMap[groupHash] = alias;
        }


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
            uci.set(PACKAGE_NAME, section_id, 'alias', (subscribeMap[nodeData['group_hash']] || _("Default Group")) + '_' + (nodeData['alias'] || ''));
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
            option.value(section['.name'], (subscribeMap[section['group_hash']] || _("Default Group")) + '_' + section['protocol'] + '_' + section['alias']);
        });


        // 内网 IP 列表选择
        option = section.taboption('general', form.DynamicList, 'proxy_device', _('Proxy Internal Device'));
        // 只展示在弹出框
        option.modalonly = true;
        
        clients.map(client => {
            // alert(JSON.stringify(client));
            const hint = machints.find(h => h[0].toUpperCase() == client.macaddr);
			const host = client.hostname || hint?.[1];
            
            option.value(client.macaddr, host + '(' + client.ipaddrs?.[0] + ')');
        });


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
        option.default = '8.8.8.8:53';


        // 过滤IPv6
        option = section.taboption('general', form.Flag, 'filter_AAAA', _('filterAAAA'), _("Close Option Ensure Proxy Node Support IPv6."));
        // 只展示在弹出框
        option.modalonly = true;
        // 空是否删除
        option.rmempty = false;
        // 默认值
        option.default = option.enabled;

        
        // 不走代理
        option = section.taboption('pass', form.DynamicList, 'pass', _('Bypass'), _("Sample: google, it will delete all contents that contain 'google'."));
        // 只展示在弹出框
        option.modalonly = true;

        
        // 强制走代理
        option = section.taboption('force', form.DynamicList, 'force', _('Force'), _("Sample: google.com."));
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